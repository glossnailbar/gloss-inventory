/**
 * ImportSortlyModal - Import Sortly Excel backup with full data capture
 * 
 * Captures: name, quantity, price, vendor, purchase link, photos, folders as categories
 */

import React, { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';

interface ImportProduct {
  local_id: string;
  name: string;
  item_group: string | null;
  sku: string | null;
  barcode: string | null;
  quantity: number;
  unit_cost: number | null;
  value: number | null;
  ordered: number;
  purchase_link: string | null;
  description: string | null;
  folder: string;
  location: string | null;
  vendor: string | null;
  brand: string | null;
  origin: string | null;
  tags: string | null;
  item_size: string | null;
  price_per: number | null;
  pcs_per_box: number | null;
  max_level: number | null;
  unit_of_measure: string;
  reorder_point: number;
  image_url: string | null;
  image_url2: string | null;
  image_url3: string | null;
  attribute1_name: string | null;
  attribute1_value: string | null;
  attribute2_name: string | null;
  attribute2_value: string | null;
  attribute3_name: string | null;
  attribute3_value: string | null;
}

interface ImportCategory {
  name: string;
  local_id: string;
}

interface ImportVendor {
  name: string;
  local_id: string;
}

interface ImportSortlyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (products: ImportProduct[], categories: ImportCategory[], vendors: ImportVendor[], locations: string[]) => void;
}

export const ImportSortlyModal: React.FC<ImportSortlyModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [parsedData, setParsedData] = useState<{ 
    products: ImportProduct[]; 
    categories: ImportCategory[];
    vendors: ImportVendor[];
    locations: string[];
  } | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'confirm'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.name.endsWith('.xlsx')) {
      processFile(droppedFile);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  }, []);

  const processFile = (file: File) => {
    setFile(file);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const data = e.target?.result;
      if (data) {
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        setPreview(jsonData);
        
        // Parse products, categories, and vendors
        const { products, categories, vendors, locations } = parseSortlyData(jsonData);
        setParsedData({ products, categories, vendors, locations });
        
        setStep('preview');
      }
    };
    
    reader.readAsBinaryString(file);
  };

  const parseSortlyData = (data: any[]): { 
    products: ImportProduct[]; 
    categories: ImportCategory[];
    vendors: ImportVendor[];
    locations: string[];
  } => {
    // Extract unique folder names for categories
    const folderSet = new Set<string>();
    const vendorSet = new Set<string>();
    const locationSet = new Set<string>();
    
    data.forEach((row) => {
      const folder = row['Primary Folder'] || row['Subfolder-level1'] || 'Uncategorized';
      if (folder && folder !== 'Uncategorized') {
        folderSet.add(folder);
      }
      
      const vendor = row['Vendor'];
      if (vendor && typeof vendor === 'string' && vendor.trim()) {
        vendorSet.add(vendor.trim());
      }
      
      // Extract location - use Sortly Folder as location since Location column doesn't exist
      const folderName = row['Primary Folder'] || row['Subfolder-level1'];
      const location = folderName && typeof folderName === 'string' ? folderName.trim() : null;
      if (location) {
        locationSet.add(location);
      }
    });
    
    console.log('[Parse] Extracted locations:', Array.from(locationSet));
    console.log('[Parse] Extracted folders:', Array.from(folderSet));
    
    // Create category objects
    const categories: ImportCategory[] = Array.from(folderSet).map((name, index) => ({
      name,
      local_id: `cat-${Date.now()}-${index}`,
    }));
    
    // Create vendor objects
    const vendors: ImportVendor[] = Array.from(vendorSet).map((name, index) => ({
      name,
      local_id: `vendor-${Date.now()}-${index}`,
    }));
    
    // Parse products with all fields
    const products: ImportProduct[] = data.map((row, index) => {
      const folder = row['Primary Folder'] || row['Subfolder-level1'] || 'Uncategorized';
      const vendorName = row['Vendor'];
      
      // Parse location from Sortly - use Folder as location
      const folderForLocation = row['Primary Folder'] || row['Subfolder-level1'];
      const locationName = folderForLocation && typeof folderForLocation === 'string' ? folderForLocation.trim() : null;
      
      // Parse quantity - handle both number and string
      const rawQty = row['Quantity'];
      const quantity = typeof rawQty === 'number' ? rawQty : 
                       typeof rawQty === 'string' ? parseFloat(rawQty) || 0 : 0;
      
      // Parse price
      const rawPrice = row['Price'];
      const unitCost = typeof rawPrice === 'number' ? rawPrice : 
                       typeof rawPrice === 'string' ? parseFloat(rawPrice) || null : null;
      
      // Calculate value (Qty × Price)
      const value = unitCost ? quantity * unitCost : null;
      
      // Parse other numeric fields
      const ordered = typeof row['Ordered'] === 'number' ? row['Ordered'] : 
                      parseFloat(row['Ordered']) || 0;
      const maxLevel = typeof row['Max Level'] === 'number' ? row['Max Level'] : 
                       parseFloat(row['Max Level']) || null;
      const pricePer = typeof row['Price Per'] === 'number' ? row['Price Per'] : 
                       parseFloat(row['Price Per']) || null;
      const pcsPerBox = typeof row['Pcs per Box'] === 'number' ? row['Pcs per Box'] : 
                        parseFloat(row['Pcs per Box']) || null;
      
      // Parse photos
      const photo1 = row['Photo1'];
      const photo2 = row['Photo2'];
      const photo3 = row['Photo3'];
      
      // Parse purchase link
      const purchaseLink = row['Purchase Link'];
      
      return {
        local_id: `sortly-${Date.now()}-${index}`,
        name: row['Entry Name'] || `Item ${index + 1}`,
        item_group: row['Item Group Name'] || null,
        sku: row['SID'] || null,
        barcode: row['Barcode/QR1-Data'] || null,
        quantity: quantity,
        unit_cost: unitCost,
        value: value,
        ordered: ordered,
        purchase_link: purchaseLink && typeof purchaseLink === 'string' && purchaseLink.startsWith('http')
          ? purchaseLink 
          : null,
        description: row['Notes'] || null,
        folder: folder,
        vendor: vendorName && typeof vendorName === 'string' ? vendorName.trim() : null,
        brand: row['Brand'] || null,
        origin: row['Origin'] || null,
        tags: row['Tags'] || null,
        item_size: row['Item Size'] || null,
        price_per: pricePer,
        pcs_per_box: pcsPerBox,
        max_level: maxLevel,
        unit_of_measure: row['Unit'] || 'piece',
        reorder_point: parseFloat(row['Min Level']) || 0,
        image_url: photo1 && typeof photo1 === 'string' && photo1.startsWith('http') ? photo1 : null,
        image_url2: photo2 && typeof photo2 === 'string' && photo2.startsWith('http') ? photo2 : null,
        image_url3: photo3 && typeof photo3 === 'string' && photo3.startsWith('http') ? photo3 : null,
        attribute1_name: row['Attribute 1 Name'] || null,
        attribute1_value: row['Attribute 1 Option'] || null,
        attribute2_name: row['Attribute 2 Name'] || null,
        attribute2_value: row['Attribute 2 Option'] || null,
        attribute3_name: row['Attribute 3 Name'] || null,
        attribute3_value: row['Attribute 3 Option'] || null,
        location: locationName && typeof locationName === 'string' ? locationName.trim() : null,
      };
    });
    
    return { products, categories, vendors, locations: Array.from(locationSet) };
  };

  const handleImport = () => {
    if (!parsedData) return;
    
    onImport(parsedData.products, parsedData.categories, parsedData.vendors, parsedData.locations);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Import from Sortly</h2>
          <p className="text-sm text-gray-500">Import with quantity, price, vendor, photos, and folders</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
                transition-colors
                ${isDragging ? 'border-rose-500 bg-rose-50' : 'border-gray-300 hover:border-gray-400'}
              `}
            >
              <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-gray-900 font-medium mb-1">Drop your Sortly backup here</p>
              <p className="text-sm text-gray-500">or click to browse</p>
              <p className="text-xs text-gray-400 mt-2">Supports .xlsx files</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {step === 'preview' && parsedData && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                <p className="text-sm text-rose-800">
                  <strong>{parsedData.products.length} items</strong> with quantity, price, vendor, and photos
                </p>
                <p className="text-sm text-rose-700 mt-1">
                  {parsedData.categories.length} categories · {parsedData.vendors.length} vendors
                </p>
              </div>
              
              {/* Sample Items Preview */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Sample Items:</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Name</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Category</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-700">Qty</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-700">Price</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Vendor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {parsedData.products.slice(0, 5).map((product) => (
                        <tr key={product.local_id}>
                          <td className="px-3 py-2 text-gray-900 truncate max-w-[150px]">{product.name}</td>
                          <td className="px-3 py-2 text-gray-500">{product.folder}</td>
                          <td className="px-3 py-2 text-right text-gray-900">{product.quantity}</td>
                          <td className="px-3 py-2 text-right text-gray-900">
                            {product.unit_cost ? `$${product.unit_cost.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-3 py-2 text-gray-500 truncate max-w-[100px]">{product.vendor || '-'}</td>
                        </tr>
                      ))}
                      {parsedData.products.length > 5 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-2 text-center text-gray-500 italic">
                            ...and {parsedData.products.length - 5} more items
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
          
          {step === 'preview' && (
            <button
              onClick={handleImport}
              className="px-6 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 font-medium"
            >
              Import {parsedData?.products.length} Items
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
