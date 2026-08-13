import React, { useCallback, useState } from 'react';
import { UploadCloud, Eye, Edit2, X } from 'lucide-react';

interface DragDropImageProps {
  value: string;
  onChange: (base64: string) => void;
}

export function DragDropImage({ value, onChange }: DragDropImageProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onChange(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  }, [onChange]);

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
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            onChange(event.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  return (
    <>
      <div 
        onDrop={handleDrop} 
        onDragOver={handleDragOver}
        onClick={value ? undefined : () => handleClick()}
        className={`w-24 h-24 border-2 border-dashed border-zinc-300 rounded-lg flex items-center justify-center transition-colors overflow-hidden mx-auto relative group ${!value ? 'cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 bg-white' : 'bg-black/5'}`}
      >
        {value ? (
          <>
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
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
