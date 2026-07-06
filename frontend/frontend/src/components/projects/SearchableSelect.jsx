import React, { useMemo, useState, useRef, useEffect } from "react";

const SearchableSelect = ({
  value,
  onChange,
  options = [],
  placeholder = "Search or select...",
  required = false,
  disabled = false,
  className = "",
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const wrapperRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
        setQuery(value || "");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.toLowerCase().includes(q));
  }, [options, query]);

  const selectOption = (option) => {
    if (disabled) return;
    onChange(option);
    setQuery(option);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <input
        type="text"
        value={query}
        required={required && !value}
        disabled={disabled}
        onChange={(e) => {
          if (disabled) return;
          setQuery(e.target.value);
          setOpen(true);
          if (!e.target.value) onChange("");
        }}
        onFocus={() => !disabled && setOpen(true)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#243744]/10 focus:border-[#243744] bg-white/90 disabled:bg-gray-50 disabled:text-gray-700"
      />
      {open && !disabled && (
        <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
          {filtered.length === 0 ? (
            <button
              type="button"
              onClick={() => selectOption(query.trim())}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-[#243744]/5"
            >
              Use &quot;{query.trim()}&quot;
            </button>
          ) : (
            filtered.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => selectOption(option)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-[#243744]/5 ${
                  value === option ? "bg-[#243744]/5 text-[#243744] font-medium" : "text-gray-700"
                }`}
              >
                {option}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
