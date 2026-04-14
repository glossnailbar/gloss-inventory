/**
 * Gloss Inventory - Barcode Scanner Operations
 *
 * Fast barcode lookup and inventory operations.
 */

import { type Product, type ProductVariant, STORES } from '../schema';
import { queryByIndex } from '../database';
import { getProductWithInventory } from './products';

export interface ScannedItem {
  type: 'product' | 'variant';
  product: Product;
  variant?: ProductVariant;
  barcode: string;
}

/**
 * Scan a barcode and return matching item
 * Searches products, then variants
 */
export async function scanBarcode(
  organizationId: string,
  barcode: string
): Promise<ScannedItem | null> {
  const cleanBarcode = barcode.trim();

  // 1. Try exact match on products
  const products = await queryByIndex<Product>(
    STORES.products,
    'by_barcode',
    [organizationId, cleanBarcode]
  );

  const product = products.find(
    (p) => p.barcode === cleanBarcode && !p.deleted_at
  );

  if (product) {
    return {
      type: 'product',
      product,
      barcode: cleanBarcode,
    };
  }

  // 2. Try variants
  const variants = await queryByIndex<ProductVariant>(
    STORES.product_variants,
    'by_barcode',
    cleanBarcode
  );

  const activeVariant = variants.find(
    (v) => v.barcode === cleanBarcode && !v.deleted_at
  );

  if (activeVariant) {
    // Get parent product
    const parent = await queryByIndex<Product>(
      STORES.products,
      'by_local_id',
      activeVariant.product_id
    );

    if (parent.length > 0 && !parent[0].deleted_at) {
      return {
        type: 'variant',
        product: parent[0],
        variant: activeVariant,
        barcode: cleanBarcode,
      };
    }
  }

  return null;
}

/**
 * Quick stock check by barcode
 * Returns product with current inventory
 */
export async function quickStockCheck(
  organizationId: string,
  barcode: string
): Promise<{
  item: ScannedItem;
  total_quantity: number;
  by_location: Array<{
    location_id: string;
    location_name: string;
    quantity: number;
  }>;
} | null> {
  const item = await scanBarcode(organizationId, barcode);
  if (!item) return null;

  const productWithInventory = await getProductWithInventory(item.product.local_id);
  if (!productWithInventory) return null;

  // Get location names (would need to query locations table)
  // Simplified for now
  const by_location = productWithInventory.inventory.map((level) => ({
    location_id: level.location_id,
    location_name: level.location_id, // TODO: lookup actual name
    quantity: level.quantity_on_hand,
  }));

  return {
    item,
    total_quantity: productWithInventory.total_quantity,
    by_location,
  };
}

/**
 * Batch scan multiple barcodes
 */
export async function batchScan(
  organizationId: string,
  barcodes: string[]
): Promise<{
  found: ScannedItem[];
  not_found: string[];
}> {
  const found: ScannedItem[] = [];
  const not_found: string[] = [];

  for (const barcode of barcodes) {
    const item = await scanBarcode(organizationId, barcode);
    if (item) {
      found.push(item);
    } else {
      not_found.push(barcode);
    }
  }

  return { found, not_found };
}

/**
 * Generate barcode from product data
 * Simple UPC-E format for internal use
 */
export function generateInternalBarcode(
  categoryCode: string,
  sequence: number
): string {
  // Format: GLOSS-XX-NNNNNN (e.g., GLOSS-NP-000001)
  const paddedSequence = sequence.toString().padStart(6, '0');
  return `GLOSS-${categoryCode}-${paddedSequence}`;
}

/**
 * Validate barcode format
 */
export function isValidBarcode(barcode: string): boolean {
  // Accept various formats
  // UPC: 12 digits
  // EAN-13: 13 digits
  // Internal: GLOSS-XX-NNNNNN
  // Code 128: Any reasonable length

  const clean = barcode.trim();

  if (/^\d{12}$/.test(clean)) return true; // UPC-A
  if (/^\d{13}$/.test(clean)) return true; // EAN-13
  if (/^GLOSS-[A-Z]{2}-\d{6}$/.test(clean)) return true; // Internal
  if (clean.length >= 8 && clean.length <= 32) return true; // Generic

  return false;
}

/**
 * Suggest next barcode for category
 */
export async function suggestNextBarcode(
  organizationId: string,
  categoryCode: string
): Promise<string> {
  // Query all products to find max sequence
  const { getAllFromStore } = await import('../database');
  const allProducts = await getAllFromStore<Product>(STORES.products);

  const orgProducts = allProducts.filter(
    (p) =>
      p.organization_id === organizationId &&
      p.barcode?.startsWith(`GLOSS-${categoryCode}-`)
  );

  let maxSequence = 0;

  for (const product of orgProducts) {
    if (product.barcode) {
      const match = product.barcode.match(/GLOSS-${categoryCode}-(\d{6})/);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSequence) {
          maxSequence = seq;
        }
      }
    }
  }

  return generateInternalBarcode(categoryCode, maxSequence + 1);
}
