import React, { useState, useEffect } from 'react';
import Select from 'react-select';

interface MultiSelectDropdownProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  maxSelect?: number;
  placeholder?: string;
  onAddNew?: () => Promise<string | null>;
}

const customSelectStyles = {
  control: (provided: any, state: any) => ({
    ...provided,
    minHeight: '34px',
    backgroundColor: state.isFocused ? '#ffffff' : '#fefce8',
    borderColor: state.isFocused ? '#facc15' : '#fef08a',
    boxShadow: state.isFocused ? '0 0 0 1px rgba(250, 204, 21, 0.3)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    borderRadius: '0.375rem',
    fontSize: '11px',
    fontWeight: '700',
    color: '#27272a',
    cursor: 'pointer',
    textAlign: 'left',
    '&:hover': {
      borderColor: '#fde047'
    }
  }),
  valueContainer: (provided: any) => ({
    ...provided,
    padding: '0 8px',
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  indicatorsContainer: (provided: any) => ({
    ...provided,
    height: '34px',
  }),
  dropdownIndicator: (provided: any) => ({
    ...provided,
    padding: '4px',
    color: '#a1a1aa',
    '&:hover': { color: '#71717a' }
  }),
  menu: (provided: any) => ({
    ...provided,
    fontSize: '11px',
    fontWeight: '600',
    borderRadius: '0.5rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    zIndex: 9999,
  }),
  menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
  option: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: state.isDisabled ? 'transparent' : state.isSelected ? '#ecfdf5' : state.isFocused ? '#f0fdf4' : 'white',
    color: state.isDisabled ? '#a1a1aa' : state.isSelected ? '#047857' : '#3f3f46',
    fontWeight: state.isSelected ? '700' : '600',
    cursor: state.isDisabled ? 'not-allowed' : 'pointer',
    opacity: state.isDisabled ? 0.5 : 1,
    textAlign: 'left'
  }),
  multiValue: (provided: any) => ({
    ...provided,
    backgroundColor: '#d1fae5', // emerald-100
    borderRadius: '4px',
  }),
  multiValueLabel: (provided: any) => ({
    ...provided,
    color: '#065f46', // emerald-800
    fontWeight: 'bold',
    fontSize: '10px',
    padding: '2px 4px',
    paddingLeft: '6px'
  }),
  multiValueRemove: (provided: any) => ({
    ...provided,
    color: '#065f46',
    ':hover': {
      backgroundColor: '#a7f3d0', // emerald-200
      color: '#022c22', // emerald-950
    },
  }),
};

export function MultiSelectDropdown({ options, selected, onChange, maxSelect = 2, placeholder = 'Select...', onAddNew }: MultiSelectDropdownProps) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const formattedOptions = [
    ...options.map(o => ({ value: o, label: o })),
    ...(onAddNew ? [{ value: '__add_new__', label: '+ Add New...', isAddNew: true }] : [])
  ];
  const selectedOptions = selected.map(s => ({ value: s, label: s }));

  const handleChange = async (newVal: any, actionMeta: any) => {
    // If the user selects the Add New option
    if (actionMeta.action === 'select-option' && actionMeta.option?.value === '__add_new__') {
      if (onAddNew) {
        const newValue = await onAddNew();
        if (newValue) {
          if (selected.length < maxSelect) {
            onChange([...selected, newValue]);
          }
        }
      }
      return;
    }

    if (newVal.length <= maxSelect) {
      onChange(newVal.map((v: any) => v.value));
    }
  };

  return (
    <Select
      isMulti
      value={selectedOptions}
      onChange={handleChange}
      options={formattedOptions}
      styles={customSelectStyles}
      menuPortalTarget={isMounted ? document.body : null}
      menuPosition="fixed"
      placeholder={placeholder}
      className="w-full"
      isOptionDisabled={() => selected.length >= maxSelect}
    />
  );
}
