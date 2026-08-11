import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

interface MultiSelectDropdownProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  maxSelect?: number;
  placeholder?: string;
}

export function MultiSelectDropdown({ options, selected, onChange, maxSelect = 2, placeholder = 'Select...' }: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
    } else {
      if (selected.length < maxSelect) {
        onChange([...selected, option]);
      }
    }
  };

  const removeOption = (e: React.MouseEvent, option: string) => {
    e.stopPropagation();
    onChange(selected.filter(item => item !== option));
  };

  return (
    <div ref={wrapperRef} className="relative w-full text-left">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[34px] w-full bg-yellow-50 border border-yellow-200 hover:border-yellow-300 focus:bg-white focus:border-yellow-400 rounded-md px-2 py-1 flex items-center justify-between cursor-pointer transition-all shadow-sm"
      >
        <div className="flex flex-wrap gap-1 items-center flex-1 overflow-hidden">
          {selected.length === 0 && <span className="text-zinc-400 text-[11px] font-bold px-1">{placeholder}</span>}
          {selected.map(item => (
            <span key={item} className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
              {item}
              <X size={10} className="cursor-pointer hover:text-emerald-950" onClick={(e) => removeOption(e, item)} />
            </span>
          ))}
        </div>
        <ChevronDown size={14} className="text-zinc-400 shrink-0 ml-1" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-64 mt-1 bg-white border border-zinc-200 rounded-md shadow-xl max-h-60 overflow-auto flex flex-col">
          {options.map((option, index) => {
            const isSelected = selected.includes(option);
            const isDisabled = !isSelected && selected.length >= maxSelect;
            return (
              <div 
                key={index} 
                onClick={() => !isDisabled && toggleOption(option)}
                className={`px-3 py-2 text-[12px] font-bold flex items-center justify-between transition-colors
                  ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-yellow-50'}
                  ${isSelected ? 'text-emerald-700 bg-emerald-50/30' : 'text-zinc-700'}
                `}
              >
                <span>{option}</span>
                {isSelected && <Check size={14} className="text-emerald-600" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
