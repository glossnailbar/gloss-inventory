/**
 * SortlyHeader - Clean, minimal header like Sortly app
 * 
 * Features:
 * - Centered search with large tap area
 * - Clean icon buttons
 * - Minimal visual clutter
 */

import React, { useState, useRef } from 'react';

interface SortlyHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onScanPress?: () => void;
  onImport?: () => void;
  onAddPress?: () => void;
  itemCount?: number;
}

export const SortlyHeader: React.FC<SortlyHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onScanPress,
  onImport,
  onAddPress,
  itemCount,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-white border-b border-gray-100">
      {/* Main Header Row */}
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Search Bar - Takes most space */}
        <div className="flex-1 relative">
          <div
            className={`
              flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2.5
              transition-all duration-200
              ${isFocused ? 'bg-white ring-2 ring-rose-200 shadow-sm' : 'hover:bg-gray-50'}
            `}
          >
            <svg 
              className={`w-5 h-5 transition-colors ${isFocused ? 'text-rose-500' : 'text-gray-400'}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Search items..."
              className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 text-base outline-none min-w-0"
            />
            
            {searchQuery && (
              <button
                onClick={() => {
                  onSearchChange('');
                  inputRef.current?.focus();
                }}
                className="p-0.5 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {/* Scan Button */}
          {onScanPress && (
            <button
              onClick={onScanPress}
              className="p-2.5 text-gray-600 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
              title="Scan barcode"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4m-4 4h4m-4-8h4m-4 4h4m6 0v1a2 2 0 01-2 2h-2a2 2 0 01-2-2v-1m0-6V5a2 2 0 012-2h2a2 2 0 012 2v1" />
              </svg>
            </button>
          )}

          {/* Import Button */}
          {onImport && (
            <button
              onClick={onImport}
              className="p-2.5 text-gray-600 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
              title="Import from Sortly"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </button>
          )}

          {/* Add Button */}
          {onAddPress && (
            <button
              onClick={onAddPress}
              className="p-2.5 bg-rose-500 text-white hover:bg-rose-600 rounded-full shadow-sm hover:shadow transition-all"
              title="Add item"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Item Count */}
      {itemCount !== undefined && (
        <div className="px-4 pb-2 text-sm text-gray-500">
          {itemCount.toLocaleString()} items
        </div>
      )}
    </div>
  );
};
