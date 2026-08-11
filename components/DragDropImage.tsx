import React, { useCallback } from 'react';
import { UploadCloud } from 'lucide-react';

interface DragDropImageProps {
  value: string;
  onChange: (base64: string) => void;
}

export function DragDropImage({ value, onChange }: DragDropImageProps) {
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
      // Reduce size if needed, but for now just read as data URL
      reader.readAsDataURL(file);
    }
  }, [onChange]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleClick = () => {
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
    <div 
      onDrop={handleDrop} 
      onDragOver={handleDragOver}
      onClick={handleClick}
      className="w-14 h-14 border-2 border-dashed border-zinc-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors overflow-hidden bg-white mx-auto relative group"
    >
      {value ? (
        <>
          <img src={value} alt="Preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center">
            <UploadCloud size={16} className="text-white" />
          </div>
        </>
      ) : (
        <UploadCloud size={20} className="text-zinc-400 group-hover:text-emerald-500" />
      )}
    </div>
  );
}
