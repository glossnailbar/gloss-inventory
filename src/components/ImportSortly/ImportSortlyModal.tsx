/**
 * ImportSortlyModal - Import Sortly Excel backup
 * 
 * Drag-and-drop Excel file import with field mapping.
 */

import React, { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';

interface ImportSortlyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (products: any[]) => void;
}

export const ImportSortlyModal: React.FC<ImportSortlyModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
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
        
        // Auto-detect column mapping
        if (jsonData.length > 0) {
          const columns = Object.keys(jsonData[0]);
          const mapping: Record<string, string> = {};
          
          columns.forEach(col => {
            const lower = col.toLowerCase();
            if (lower.includes('name') || lower === 'item') mapping[col] = 'name';
            else if (lower.includes('sku')) mapping[col] = 'sku';
            else if (lower.includes('barcode')) mapping[col] = 'barcode';
            else if (lower.includes('qty') || lower.includes('quantity') || lower.includes('stock')) mapping[col] = 'quantity';
            else if (lower.includes('desc')) mapping[col] = 'description';
            else if (lower.includes('location') || lower.includes('folder')) mapping[col] = 'location';
            else if (lower.includes('price') || lower.includes('cost')) mapping[col] = 'cost';
          });
          
          setColumnMapping(mapping);
        }
        
        setStep('mapping');
      }
    };
    
    reader.readAsBinaryString(file);
  };

  const handleImport = () => {
    if (!preview) return;
    
    const products = preview.map((row, index) => ({
      local_id: `sortly-${Date.now()}-${index}`,
      name: row[Object.keys(columnMapping).find(k => columnMapping[k] === 'name') || 'Name'] || `Item ${index + 1}`,
      sku: row[Object.keys(columnMapping).find(k => columnMapping[k] === 'sku') || ''] || null,
      barcode: row[Object.keys(columnMapping).find(k => columnMapping[k] === 'barcode') || ''] || null,
      quantity: parseFloat(row[Object.keys(columnMapping).find(k => columnMapping[k] === 'quantity') || ''] || '0') || 0,
      description: row[Object.keys(columnMapping).find(k => columnMapping[k] === 'description') || ''] || null,
      location: row[Object.keys(columnMapping).find(k => columnMapping[k] === 'location') || ''] || 'Unassigned',
      unit_of_measure: 'piece',
      cost_method: 'fifo',
      reorder_point: 0,
    }));
    
    onImport(products);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Import from Sortly</h2>
          <p className="text-sm text-gray-500">Import your Sortly backup Excel file</p>
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

          {step === 'mapping' && preview && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <strong>{preview.length} items</strong> found. Please confirm the column mapping:
                </p>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Sortly Column</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Maps To</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Sample Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {Object.keys(preview[0]).map((col) => (
                      <tr key={col}>
                        <td className="px-4 py-2 font-medium text-gray-900">{col}</td>
                        <td className="px-4 py-2">
                          <select
                            value={columnMapping[col] || ''}
                            onChange={(e) => setColumnMapping(prev => ({ ...prev, [col]: e.target.value }))}
                            className="text-sm border-gray-300 rounded-md"
                          >
                            <option value="">-- Skip --</option>
                            <option value="name">Product Name</option>
                            <option value="sku">SKU</option>
                            <option value="barcode">Barcode</option>
                            <option value="quantity">Quantity</option>
                            <option value="description">Description</option>
                            <option value="location">Location</option>
                            <option value="cost">Cost/Price</option>
                          </select>
                        </td>
                        <td className="px-4 py-2 text-gray-500 truncate max-w-xs">
                          {String(preview[0][col]).slice(0, 30)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          {step === 'mapping' && (
            <button
              onClick={handleImport}
              className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600"
            >
              Import {preview?.length} Items
            </button>
          )}
          {step === 'upload' && file && (
            <button
              onClick={() => setStep('mapping')}
              className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
};