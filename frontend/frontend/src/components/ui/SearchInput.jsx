import React, { useRef } from "react";
import { Search, X } from "lucide-react";

const SearchInput = ({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
  ...props
}) => {
  const inputRef = useRef(null);

  const handleClear = () => {
    onChange({ target: { value: "" } });
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A97A4] pointer-events-none">
        <Search size={17} strokeWidth={2} />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="app-input !pl-10 !pr-9"
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-[#8A97A4] hover:text-[#1A2733] hover:bg-[#F0F2F5] transition-colors"
          aria-label="Clear search"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
};

export default SearchInput;
