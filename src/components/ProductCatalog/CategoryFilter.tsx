/**
 * CategoryFilter - Horizontal scrolling category chips
 * 
 * Similar to Sortly's folder view, optimized for mobile.
 */

import React from 'react';
import { useCategories } from '../../hooks/useCategories';

export interface CategoryFilterProps {
  organizationId: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  className?: string;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  organizationId,
  selectedId,
  onSelect,
  className = '',
}) => {
  const { categories, isLoading } = useCategories(organizationId);

  if (isLoading) {
    return (
      <div className={`${className} flex gap-2 overflow-x-auto scrollbar-hide`}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-8 w-24 bg-gray-100 rounded-full animate-pulse flex-shrink-0"
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`${className} -mx-1`}>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-1 pb-1">
        {/* All Items chip */}
        <button
          onClick={() => onSelect(null)}
          className={`
            flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium
            transition-all active:scale-95
            ${
              selectedId === null
                ? 'bg-rose-500 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-rose-300'
            }
          `}
        >
          All Items
        </button>

        {/* Category chips */}
        {categories.map((category) => (
          <button
            key={category.local_id}
            onClick={() => onSelect(category.local_id)}
            className={`
              flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium
              transition-all active:scale-95
              ${
                selectedId === category.local_id
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-rose-300'
              }
            `}
          >
            {category.name}
          </button>
        ))}

        {/* Add Category button */}
        <button
          className="
            flex-shrink-0 px-3 py-2 rounded-full text-sm font-medium
            text-gray-500 border border-dashed border-gray-300
            hover:border-rose-300 hover:text-rose-500
            transition-all active:scale-95
          "
          onClick={() => {
            // TODO: Open add category modal
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  );
};
