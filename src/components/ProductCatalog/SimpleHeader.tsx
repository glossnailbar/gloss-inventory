/**
 * SimpleHeader - Minimal header with search and actions
 */

import React, { useState, useRef } from 'react';

interface SimpleHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onScanPress?: () => void;
  onImport?: () => void;
  onAddPress?: () => void;
  onClearData?: () => void;
  itemCount?: number;
}

export const SimpleHeader: React.FC<SimpleHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onScanPress,
  onImport,
  onAddPress,
  onClearData,
  itemCount,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-white border-b border-gray-100">
      {/* Search and Actions */}
      <div className="px-4 py-3 flex items-center gap-2">
        {/* Search */}
        <div className="flex-1 relative">
          <div
            className={`flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2 transition-all ${
              isFocused ? 'bg-white ring-2 ring-rose-200' : ''
            }`}
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="flex-1 bg-transparent outline-none text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  onSearchChange('');
                  inputRef.current?.focus();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Import Button */}
        {onImport && (
          <button
            onClick={onImport}
            className="p-2 text-gray-600 hover:text-rose-500 hover:bg-rose-50 rounded-full"
            title="Import"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </button>
        )}

        {/* Clear Data Button */}
        {onClearData && itemCount && itemCount > 0 && (
          <button
            onClick={onClearData}
            className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-50 rounded-full"
            title="Clear all data"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}

        {/* Add Button */}
        {onAddPress && (
          <button
            onClick={onAddPress}
            className="p-2 bg-rose-500 text-white rounded-full"
            title="Add"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>

      {/* Item Count */}
      {itemCount !== undefined && (
        <div className="px-4 pb-2 text-xs text-gray-500">
          {itemCount} items
        </div>
      )}
    </div>
  );
};
