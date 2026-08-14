import React, { useCallback, useState } from 'react';
import { UploadCloud, Eye, Edit2, X } from 'lucide-react';

interface DragDropImageProps {
  value: string;
  onChange: (base64: string) => void;
}

// Compress an image File to a max dimension and quality before storing as Base64.
// This prevents large phone photos from crashing the Google Apps Script endpoint.
function compressImage(file: File, maxDimension = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;

        // Scale down while preserving aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas context unavailable')); return; }

        ctx.drawImage(img, 0, 0, width, height);
        // Export as JPEG for better compression (PNG would be too large for photos)
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function DragDropImage({ value, onChange }: DragDropImageProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setIsCompressing(true);
    try {
      const compressed = await compressImage(file);
      onChange(compressed);
    } catch (err) {
      console.error('Image compression failed, using original:', err);
      // Fallback: use original FileReader without compression
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) onChange(event.target.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressing(false);
    }
  }, [onChange]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) processFile(file);
    };
    input.click();
  };

  return (
    <>
      <div 
        onDrop={handleDrop} 
        onDragOver={handleDragOver}
        onClick={value ? undefined : () => handleClick()}
        className={`w-40 h-40 border-2 border-dashed border-zinc-300 rounded-lg flex items-center justify-center transition-colors overflow-hidden mx-auto relative group ${!value ? 'cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 bg-white' : 'bg-black/5'}`}
      >
        {isCompressing ? (
          <div className="flex flex-col items-center gap-1">
            <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-zinc-400 font-bold">Compressing</span>
          </div>
        ) : value ? (
          <>
            <img src={value} alt="Preview" className="w-full h-full object-contain" />
            <div className="absolute inset-0 bg-black/60 hidden group-hover:flex items-center justify-center gap-3">
              <button onClick={(e) => { e.stopPropagation(); setIsFullScreen(true); }} className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors" title="View Full Screen">
                <Eye size={16} />
              </button>
              <button onClick={(e) => handleClick(e)} className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors" title="Change Image">
                <Edit2 size={16} />
              </button>
            </div>
          </>
        ) : (
          <UploadCloud size={20} className="text-zinc-400 group-hover:text-emerald-500" />
        )}
      </div>

      {isFullScreen && value && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-8 backdrop-blur-sm" onClick={() => setIsFullScreen(false)}>
          <button 
            onClick={() => setIsFullScreen(false)} 
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          >
            <X size={24} />
          </button>
          <img 
            src={value} 
            alt="Full Screen Preview" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" 
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </>
  );
}
