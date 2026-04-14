/**
 * BottomSheet - Mobile-first bottom sheet component
 * 
 * Like native iOS/Android bottom sheets. Slides up from bottom.
 */

import React, { useEffect, useState } from 'react';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: 'auto' | 'full' | 'half';
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  height = 'auto',
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      setShowContent(true);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      setIsAnimating(false);
      setTimeout(() => setShowContent(false), 300);
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!showContent) return null;

  const heightClass = {
    auto: 'max-h-[85vh]',
    half: 'h-1/2',
    full: 'h-[95vh]',
  }[height];

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className={`
          absolute inset-0 bg-black/50
          transition-opacity duration-300
          ${isAnimating ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`
          absolute bottom-0 left-0 right-0
          bg-white rounded-t-2xl
          shadow-2xl
          transition-transform duration-300 ease-out
          ${heightClass}
          ${isAnimating ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2" onClick={onClose}>
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="px-4 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 -mr-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 120px)' }}>
          {children}
        </div>
      </div>
    </div>
  );
};
