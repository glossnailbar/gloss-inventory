/**
 * SearchBar - Sticky search with barcode scanner integration
 * 
 * Mobile-optimized with large touch targets.
 */

import React, { useState, useRef, useEffect } from 'react';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onScanPress?: () => void;
  className?: string;
  autoFocus?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search products...',
  onScanPress,
  className = '',
  autoFocus = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`
          relative flex items-center gap-2 
          bg-gray-100 rounded-xl
          border-2 transition-all
          ${isFocused ? 'border-rose-500 bg-white' : 'border-transparent'}
        `}
      >
        {/* Search Icon */}
        <svg
          className={`w-5 h-5 md:w-4 md:h-4 ml-3 transition-colors ${isFocused ? 'text-rose-500' : 'text-gray-400'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="
            flex-1 py-3 pr-2
            bg-transparent
            text-gray-900 placeholder-gray-400
            outline-none
            text-base
          "
        />

        {/* Clear Button */}
        {value && (
          <button
            onClick={handleClear}
            className="p-1 mr-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear search"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {/* Barcode Scan Button */}
        {onScanPress && (
          <button
            onClick={onScanPress}
            className="
              p-1.5 mr-2 md:p-2
              bg-rose-500 text-white
              rounded-lg
              hover:bg-rose-600
              active:scale-95
              transition-all
              flex-shrink-0
            "
            aria-label="Scan barcode"
          >
            <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4m-4 4h4m-4-8h4m-4 4h4m6 0v1a2 2 0 01-2 2h-2a2 2 0 01-2-2v-1m0-6V5a2 2 0 012-2h2a2 2 0 012 2v1"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Quick Filter Pills (show when searching) */}
      {value.trim() && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => onChange(`sku:${value}`)}
            className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full hover:bg-gray-200"
          >
            Search SKU: {value}
          </button>
          <button
            onClick={() => onChange(`barcode:${value}`)}
            className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full hover:bg-gray-200"
          >
            Search Barcode
          </button>
        </div>
      )}
    </div>
  );
};
