import { useState, useRef, useEffect } from 'react';

interface CustomDropdownProps<T extends string> {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  placeholder?: string;
}

function CustomDropdown<T extends string>({
  options,
  value,
  onChange,
  placeholder = 'Select...',
}: CustomDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val: T) => {
    onChange(val);
    setIsOpen(false);
  };

  const selectedLabel = options.find((opt) => opt.value === value)?.label || placeholder;

  return (
    <div className="custom-dropdown" ref={dropdownRef}>
      <div
        className={`custom-dropdown-header ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {selectedLabel}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="#141B34"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <path d="M6 9L12 15L18 9" />
        </svg>
      </div>

      {isOpen && (
        <div className="custom-dropdown-list">
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`custom-dropdown-item ${opt.value === value ? 'selected' : ''}`}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CustomDropdown;
