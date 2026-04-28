/**
 * Gloss Inventory - Product Operations
 *
 * CRUD operations for products with optimistic updates and sync queue.
 */

import {
  type Product,
  type ProductVariant,
  type InventoryLevel,
  type Vendor,
  STORES,
} from '../schema';
import {
  getFromStore,
  getAllFromStore,
  queryByIndex,
  putToStore,
  deleteFromStore,
  generateLocalId,
  getDatabase,
} from '../database';
import { queueCreate, queueUpdate, queueDelete } from '../sync-queue';

// ============ CREATE ============

export interface CreateProductInput {
  name: string;
  category_id: string | null;
  organization_id: string;
  vendor_id?: string;
  sku?: string;
  barcode?: string;
  description?: string;
  unit_of_measure?: string;
  reorder_point?: number;
  reorder_quantity?: number;
  max_level?: number;
  unit_cost?: number;
  purchase_link?: string;
  brand?: string;
  origin?: string;
  tags?: string;
  item_size?: string;
  price_per?: number;
  pcs_per_box?: number;
  attribute1_name?: string;
  attribute1_value?: string;
  attribute2_name?: string;
  attribute2_value?: string;
  attribute3_name?: string;
  attribute3_value?: string;
  is_retail?: boolean;
  is_backbar?: boolean;
  is_professional_only?: boolean;
  has_variants?: boolean;
  expiration_tracking?: boolean;
  image_url?: string;
  image_url2?: string;
  image_url3?: string;
  created_by?: string;
}

/**
 * Create a new product (optimistic + sync queue)
 */
export async function createProduct(
  input: CreateProductInput,
  locationQuantities?: { location_id: string; quantity: number }[]
): Promise<Product> {
  const now = new Date().toISOString();
  const localId = generateLocalId();

  const product: Product = {
    id: null,
    local_id: localId,
    sync_status: 'pending',
    sync_version: 1,
    name: input.name,
    category_id: input.category_id,
    organization_id: input.organization_id,
    vendor_id: input.vendor_id,
    sku: input.sku,
    barcode: input.barcode,
    description: input.description,
    unit_of_measure: input.unit_of_measure || 'each',
    reorder_point: input.reorder_point ?? 0,
    reorder_quantity: input.reorder_quantity ?? 0,
    max_level: input.max_level,
    unit_cost: input.unit_cost,
    purchase_link: input.purchase_link,
    brand: input.brand,
    origin: input.origin,
    tags: input.tags,
    item_size: input.item_size,
    price_per: input.price_per,
    pcs_per_box: input.pcs_per_box,
    attribute1_name: input.attribute1_name,
    attribute1_value: input.attribute1_value,
    attribute2_name: input.attribute2_name,
    attribute2_value: input.attribute2_value,
    attribute3_name: input.attribute3_name,
    attribute3_value: input.attribute3_value,
    is_retail: input.is_retail ?? true,
    is_backbar: input.is_backbar ?? false,
    is_professional_only: input.is_professional_only ?? false,
    has_variants: input.has_variants ?? false,
    expiration_tracking: input.expiration_tracking ?? false,
    image_url: input.image_url,
    image_url2: input.image_url2,
    image_url3: input.image_url3,
    created_at: now,
    updated_at: now,
    created_by: input.created_by,
    updated_by: input.created_by,
  };

  // Save to local store (optimistic)
  await putToStore(STORES.products, product);

  // Create initial inventory levels if provided
  if (locationQuantities?.length) {
    console.log('[DB] Creating inventory levels for product:', localId, locationQuantities);
    for (const { location_id, quantity } of locationQuantities) {
      const levelId = generateLocalId();
      const level: InventoryLevel = {
        id: levelId,
        product_id: localId,
        location_id,
        quantity_on_hand: quantity,
        quantity_reserved: 0,
        sync_status: 'pending',
        updated_at: now,
      };
      await putToStore(STORES.inventory_levels, level);
      console.log('[DB] Created inventory level:', level);
      
      // Queue inventory level for sync
      await queueCreate(STORES.inventory_levels, levelId, {
        product_id: localId,
        location_id,
        quantity_on_hand: quantity,
        quantity_reserved: 0,
      });
    }
  } else {
    console.log('[DB] No inventory levels to create for product:', localId);
  }

  // Queue for sync
  const syncData = { ...product };
  delete (syncData as Partial<Product>).id;
  delete (syncData as Partial<Product>).local_id;
  await queueCreate(STORES.products, localId, syncData);

  return product;
}

// ============ READ ============

/**
 * Get product by local ID
 */
export async function getProduct(localId: string): Promise<Product | undefined> {
  return getFromStore<Product>(STORES.products, localId);
}

/**
 * Get product by barcode
 */
export async function getProductByBarcode(
  organizationId: string,
  barcode: string
): Promise<Product | undefined> {
  const results = await queryByIndex<Product>(
    STORES.products,
    'by_barcode',
    [organizationId, barcode]
  );
  return results.find(p => p.barcode === barcode);
}

/**
 * Get all products for organization
 */
export async function getProductsByOrganization(
  organizationId: string
): Promise<Product[]> {
  console.log('[DB] getProductsByOrganization called:', organizationId.substring(0,8));
  const all = await getAllFromStore<Product>(STORES.products);
  console.log('[DB] Total products in store:', all.length);
  console.log('[DB] First few products org IDs:', all.slice(0,3).map(p => p.organization_id?.substring(0,8)));
  const filtered = all.filter(p => p.organization_id === organizationId && !p.deleted_at);
  console.log('[DB] Filtered products:', filtered.length);
  return filtered;
}

/**
 * Get products by category
 */
export async function getProductsByCategory(categoryId: string): Promise<Product[]> {
  return queryByIndex(STORES.products, 'by_category', categoryId);
}

/**
 * Search products by name or SKU
 */
export async function searchProducts(
  organizationId: string,
  query: string
): Promise<Product[]> {
  const all = await getProductsByOrganization(organizationId);
  const lowerQuery = query.toLowerCase();

  return all.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.sku?.toLowerCase().includes(lowerQuery) ||
      p.barcode?.includes(query)
  );
}

/**
 * Get products needing reorder
 */
export async function getProductsNeedingReorder(
  organizationId: string
): Promise<Array<{ product: Product; level: InventoryLevel }>> {
  const products = await getProductsByOrganization(organizationId);
  const result: Array<{ product: Product; level: InventoryLevel }> = [];

  for (const product of products) {
    const levels = await queryByIndex<InventoryLevel>(
      STORES.inventory_levels,
      'by_product_location',
      [product.local_id]
    );

    for (const level of levels) {
      const available = level.quantity_on_hand - level.quantity_reserved;
      if (available <= product.reorder_point && product.reorder_point > 0) {
        result.push({ product, level });
      }
    }
  }

  return result;
}

// ============ UPDATE ============

export type UpdateProductInput = Partial<
  Omit<Product, 'id' | 'local_id' | 'organization_id' | 'sync_status' | 'sync_version' | 'created_at'>
>;

/**
 * Update a product (optimistic + sync queue)
 */
export async function updateProduct(
  localId: string,
  updates: UpdateProductInput,
  userId?: string
): Promise<Product | undefined> {
  const existing = await getProduct(localId);
  if (!existing) return undefined;

  const now = new Date().toISOString();

  const updated: Product = {
    ...existing,
    ...updates,
    local_id: localId,
    id: existing.id,
    organization_id: existing.organization_id,
    sync_status: 'pending',
    sync_version: existing.sync_version + 1,
    updated_at: now,
    updated_by: userId || existing.updated_by,
  };

  // Save to local store
  await putToStore(STORES.products, updated);

  // Queue for sync
  const syncData = { ...updates, sync_version: updated.sync_version };
  await queueUpdate(STORES.products, localId, existing.id, syncData, updated.sync_version);

  return updated;
}

// ============ DELETE ============

/**
 * Soft delete a product (optimistic + sync queue)
 */
export async function deleteProduct(
  localId: string,
  userId?: string
): Promise<boolean> {
  const existing = await getProduct(localId);
  if (!existing) return false;

  const now = new Date().toISOString();

  // Soft delete
  const deleted: Product = {
    ...existing,
    deleted_at: now,
    sync_status: 'pending',
    sync_version: existing.sync_version + 1,
    updated_at: now,
    updated_by: userId,
  };

  await putToStore(STORES.products, deleted);

  // Queue delete
  await queueDelete(STORES.products, localId, existing.id);

  return true;
}

/**
 * Hard delete (use with caution - only for local cleanup)
 */
export async function hardDeleteProduct(localId: string): Promise<void> {
  await deleteFromStore(STORES.products, localId);
}

// ============ PRODUCT VARIANTS ============

export interface CreateVariantInput {
  product_id: string;
  variant_name: string;
  sku?: string;
  barcode?: string;
  image_url?: string;
}

export async function createProductVariant(
  input: CreateVariantInput
): Promise<ProductVariant> {
  const now = new Date().toISOString();
  const localId = generateLocalId();

  const variant: ProductVariant = {
    id: null,
    local_id: localId,
    sync_status: 'pending',
    sync_version: 1,
    product_id: input.product_id,
    variant_name: input.variant_name,
    sku: input.sku,
    barcode: input.barcode,
    image_url: input.image_url,
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  await putToStore(STORES.product_variants, variant);

  const syncData = { ...variant };
  delete (syncData as Partial<ProductVariant>).id;
  delete (syncData as Partial<ProductVariant>).local_id;
  await queueCreate(STORES.product_variants, localId, syncData);

  return variant;
}

export async function getProductVariants(productId: string): Promise<ProductVariant[]> {
  return queryByIndex(STORES.product_variants, 'by_product', productId);
}

// ============ INVENTORY LEVELS ============

/**
 * Get inventory level for a product at a location
 */
export async function getInventoryLevel(
  productId: string,
  locationId: string,
  variantId?: string
): Promise<InventoryLevel | undefined> {
  const results = await queryByIndex<InventoryLevel>(
    STORES.inventory_levels,
    'by_product_location',
    [productId, locationId]
  );

  return variantId
    ? results.find((l) => l.variant_id === variantId)
    : results.find((l) => !l.variant_id);
}

/**
 * Get all inventory levels for a product
 */
export async function getProductInventoryLevels(
  productId: string
): Promise<InventoryLevel[]> {
  console.log('[DB] Getting inventory levels for product:', productId);
  try {
    console.log('[DB] Step 1: Getting database...');
    const db = await getDatabase();
    console.log('[DB] Step 2: Database obtained, creating transaction...');
    const transaction = db.transaction(STORES.inventory_levels, 'readonly');
    console.log('[DB] Step 3: Transaction created, getting store...');
    const store = transaction.objectStore(STORES.inventory_levels);
    console.log('[DB] Step 4: Store obtained, calling getAll...');
    const request = store.getAll();
    
    console.log('[DB] Step 5: Awaiting getAll result...');
    const allLevels = await new Promise<InventoryLevel[]>((resolve, reject) => {
      request.onsuccess = () => {
        console.log('[DB] Step 6: getAll success');
        resolve(request.result as InventoryLevel[]);
      };
      request.onerror = () => {
        console.error('[DB] Step 6: getAll ERROR:', request.error);
        reject(request.error);
      };
    });
    
    console.log('[DB] Step 7: Total inventory levels in store:', allLevels.length);
    if (allLevels.length > 0) {
      console.log('[DB] First few inventory level product_ids:', allLevels.slice(0,3).map(l => l.product_id?.substring(0,8)));
      console.log('[DB] Looking for product_id:', productId.substring(0,8));
    }
    const filtered = allLevels.filter(level => level.product_id === productId);
    console.log('[DB] Found inventory levels for product:', filtered.length);
    return filtered;
  } catch (err) {
    console.error('[DB] ERROR in getProductInventoryLevels:', err);
    return [];
  }
}

/**
 * Set inventory level (for counts, adjustments)
 * Queues the change for sync
 */
export async function setInventoryLevel(
  productId: string,
  locationId: string,
  quantity: number,
  variantId?: string
): Promise<InventoryLevel> {
  const existing = await getInventoryLevel(productId, locationId, variantId);
  const now = new Date().toISOString();

  if (existing) {
    const updated: InventoryLevel = {
      ...existing,
      quantity_on_hand: quantity,
      sync_status: 'pending',
      last_counted_at: now,
      updated_at: now,
    };
    await putToStore(STORES.inventory_levels, updated);
    
    // Queue for sync - inventory_levels uses id as local_id
    await queueUpdate(STORES.inventory_levels, updated.id, updated.id, 
      { quantity_on_hand: quantity, quantity_reserved: updated.quantity_reserved }, 
      1);
    
    return updated;
  } else {
    const newLevel: InventoryLevel = {
      id: generateLocalId(),
      product_id: productId,
      variant_id: variantId,
      location_id: locationId,
      quantity_on_hand: quantity,
      quantity_reserved: 0,
      sync_status: 'pending',
      last_counted_at: now,
      updated_at: now,
    };
    await putToStore(STORES.inventory_levels, newLevel);
    
    // Queue for sync - inventory_levels uses id as local_id
    await queueCreate(STORES.inventory_levels, newLevel.id, {
      product_id: productId,
      location_id: locationId,
      quantity_on_hand: quantity,
      quantity_reserved: 0,
    });
    
    return newLevel;
  }
}

/**
 * Adjust inventory level (add/subtract quantity)
 * Queues the change for sync
 */
export async function adjustInventoryLevel(
  productId: string,
  locationId: string,
  delta: number,
  variantId?: string
): Promise<InventoryLevel> {
  const existing = await getInventoryLevel(productId, locationId, variantId);
  const now = new Date().toISOString();

  const newQuantity = Math.max(0, (existing?.quantity_on_hand || 0) + delta);

  if (existing) {
    const updated: InventoryLevel = {
      ...existing,
      quantity_on_hand: newQuantity,
      sync_status: 'pending',
      updated_at: now,
    };
    await putToStore(STORES.inventory_levels, updated);
    
    // Queue for sync - inventory_levels uses id as local_id
    await queueUpdate(STORES.inventory_levels, updated.id, updated.id, 
      { quantity_on_hand: newQuantity, quantity_reserved: updated.quantity_reserved }, 
      1);
    
    return updated;
  } else {
    const newLevel = await setInventoryLevel(productId, locationId, newQuantity, variantId);
    return newLevel;
  }
}

// ============ PRODUCT WITH INVENTORY ============

export interface ProductWithInventory extends Product {
  inventory: InventoryLevel[];
  total_quantity: number;
  variants?: ProductVariant[];
  vendor_name?: string;
}

/**
 * Get product with full inventory data
 */
export async function getProductWithInventory(
  localId: string
): Promise<ProductWithInventory | undefined> {
  const product = await getProduct(localId);
  if (!product) return undefined;

  const inventory = await getProductInventoryLevels(localId);
  const variants = await getProductVariants(localId);

  const total_quantity = inventory.reduce((sum, level) => sum + level.quantity_on_hand, 0);

  // Fetch vendor name if vendor_id exists
  let vendor_name: string | undefined;
  if (product.vendor_id) {
    try {
      const vendor = await getFromStore<Vendor>(STORES.vendors, product.vendor_id);
      vendor_name = vendor?.name;
    } catch (e) {
      console.log('[DB] Could not fetch vendor:', e);
    }
  }

  return {
    ...product,
    inventory,
    total_quantity,
    variants: variants.length > 0 ? variants : undefined,
    vendor_name,
  };
}
