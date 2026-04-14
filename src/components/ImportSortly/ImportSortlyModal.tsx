/**
 * ImportSortlyModal - Import Sortly Excel backup with category creation
 * 
 * Features:
 * - Drag-and-drop Excel import
 * - Auto-extract Sortly folders as categories
 * - Create categories on import
 */

import React, { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';

interface ImportProduct {
  local_id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  quantity: number;
  description: string | null;
  folder: string;
  unit_of_measure: string;
  reorder_point: number;
}

interface ImportCategory {
  name: string;
  local_id: string;
}

interface ImportSortlyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (products: ImportProduct[], categories: ImportCategory[]) => void;
}

export const ImportSortlyModal: React.FC<ImportSortlyModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [parsedData, setParsedData] = useState<{ products: ImportProduct[]; categories: ImportCategory[] } | null>(null);
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
        
        // Parse products and extract categories from folders
        const { products, categories } = parseSortlyData(jsonData);
        setParsedData({ products, categories });
        
        setStep('preview');
      }
    };
    
    reader.readAsBinaryString(file);
  };

  const parseSortlyData = (data: any[]): { products: ImportProduct[]; categories: ImportCategory[] } => {
    // Extract unique folder names
    const folderSet = new Set<string>();
    
    data.forEach((row) => {
      // Check Primary Folder first, then Subfolder levels
      const folder = row['Primary Folder'] || row['Subfolder-level1'] || row['Folder'] || 'Uncategorized';
      if (folder && folder !== 'Uncategorized') {
        folderSet.add(folder);
      }
    });
    
    // Create category objects
    const categories: ImportCategory[] = Array.from(folderSet).map((name, index) => ({
      name,
      local_id: `cat-${Date.now()}-${index}`,
    }));
    
    // Create a lookup map for category local_ids
    const categoryMap = new Map<string, string>();
    categories.forEach(cat => categoryMap.set(cat.name, cat.local_id));
    
    // Parse products
    const products: ImportProduct[] = data.map((row, index) => {
      const folder = row['Primary Folder'] || row['Subfolder-level1'] || row['Folder'] || 'Uncategorized';
      
      return {
        local_id: `sortly-${Date.now()}-${index}`,
        name: row['Entry Name'] || row['Name'] || `Item ${index + 1}`,
        sku: row['SID'] || row['SKU'] || null,
        barcode: row['Barcode/QR1-Data'] || row['Barcode'] || null,
        quantity: parseFloat(row['Quantity'] || row['Qty'] || '0') || 0,
        description: row['Notes'] || row['Description'] || null,
        folder: folder,
        unit_of_measure: row['Unit'] || 'piece',
        reorder_point: parseFloat(row['Min Level'] || '0') || 0,
      };
    });
    
    return { products, categories };
  };

  const handleImport = () => {
    if (!parsedData) return;
    
    onImport(parsedData.products, parsedData.categories);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Import from Sortly</h2>
          <p className="text-sm text-gray-500">Import your Sortly backup with folders as categories</p>
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
                  <strong>{parsedData.products.length} items</strong> will be imported into{' '}
                  <strong>{parsedData.categories.length} categories</strong> (from Sortly folders)
                </p>
              </div>
              
              {/* Categories Preview */}
              {parsedData.categories.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Categories to Create:</h3>
                  <div className="flex flex-wrap gap-2">
                    {parsedData.categories.map((cat) => (
                      <span key={cat.local_id} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {cat.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Products Preview */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Sample Items:</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Name</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Category</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-700">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {parsedData.products.slice(0, 5).map((product) => (
                        <tr key={product.local_id}>
                          <td className="px-4 py-2 text-gray-900">{product.name}</td>
                          <td className="px-4 py-2 text-gray-500">{product.folder}</td>
                          <td className="px-4 py-2 text-right text-gray-900">{product.quantity}</td>
                        </tr>
                      ))}
                      {parsedData.products.length > 5 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-2 text-center text-gray-500 italic">
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
