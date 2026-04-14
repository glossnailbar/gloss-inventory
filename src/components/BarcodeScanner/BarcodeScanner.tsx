/**
 * BarcodeScanner - Camera-based barcode scanning
 * 
 * Uses getUserMedia API with ZXing or native BarcodeDetector if available.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';

export interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScan,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const animationRef = useRef<number>();

  // Initialize camera
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsScanning(true);
        }
      } catch (err) {
        setError('Camera access denied. Please enable camera permissions.');
      }
    };

    initCamera();

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Scan loop using BarcodeDetector API if available
  const scanFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check if video is ready
    if (video.readyState !== 4) {
      animationRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    // Draw video frame to canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Try to detect barcode
    if ('BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'],
        });
        const barcodes = await detector.detect(canvas);

        if (barcodes.length > 0) {
          const barcode = barcodes[0].rawValue;
          if (barcode !== lastScan) {
            setLastScan(barcode);
            onScan(barcode);
            // Vibrate if available
            if (navigator.vibrate) {
              navigator.vibrate(200);
            }
          }
        }
      } catch (err) {
        // Barcode detection failed, continue scanning
      }
    }

    animationRef.current = requestAnimationFrame(scanFrame);
  }, [isScanning, lastScan, onScan]);

  // Start scanning loop
  useEffect(() => {
    if (isScanning) {
      animationRef.current = requestAnimationFrame(scanFrame);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isScanning, scanFrame]);

  // Manual barcode entry fallback
  const [manualBarcode, setManualBarcode] = useState('');

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      onScan(manualBarcode.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/50">
        <button
          onClick={onClose}
          className="p-2 text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h1 className="text-white font-semibold">Scan Barcode</h1>
        <div className="w-10" />
      </div>

      {/* Camera View */}
      <div className="flex-1 relative">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-white mb-4">{error}</p>
            
            <form onSubmit={handleManualSubmit} className="w-full max-w-xs">
              <input
                type="text"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                placeholder="Enter barcode manually"
                className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-gray-400 border border-white/20 focus:border-rose-500 outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="w-full mt-3 py-3 bg-rose-500 text-white rounded-lg font-medium"
              >
                Search
              </button>
            </form>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Scan Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Corner brackets */}
              <div className="absolute top-1/4 left-1/4 w-16 h-16 border-l-4 border-t-4 border-rose-500 rounded-tl-lg" />
              <div className="absolute top-1/4 right-1/4 w-16 h-16 border-r-4 border-t-4 border-rose-500 rounded-tr-lg" />
              <div className="absolute bottom-1/4 left-1/4 w-16 h-16 border-l-4 border-b-4 border-rose-500 rounded-bl-lg" />
              <div className="absolute bottom-1/4 right-1/4 w-16 h-16 border-r-4 border-b-4 border-rose-500 rounded-br-lg" />

              {/* Scan line animation */}
              <div className="absolute top-1/4 left-1/4 right-1/4 h-0.5 bg-rose-500/50">
                <div className="absolute inset-x-0 h-8 bg-gradient-to-b from-rose-500/50 to-transparent animate-scan" />
              </div>

              {/* Instructions */}
              <div className="absolute bottom-24 left-0 right-0 text-center">
                <p className="text-white/80 text-sm">Position barcode within frame</p>
              </div>
            </div>

            {/* Manual entry button */}
            <button
              onClick={() => setError('Manual entry')}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-white/10 backdrop-blur text-white rounded-full border border-white/20"
            >
              Enter manually
            </button>
          </>
        )}
      </div>
    </div>
  );
};
