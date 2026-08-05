import React, { useMemo, useState, useRef, useEffect } from "react";

const SearchableSelect = ({
  value,
  onChange,
  onSelect,
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

  const normalizedOptions = useMemo(() => {
    return options.map((item, idx) => {
      if (typeof item === "object" && item !== null) {
        return {
          id: item.id || idx,
          label: item.title || item.label || String(item.id),
          subtitle: item.subtitle || "",
          raw: item.raw || item
        };
      }
      return {
        id: item,
        label: String(item),
        subtitle: "",
        raw: item
      };
    });
  }, [options]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalizedOptions;
    return normalizedOptions.filter(
      (opt) => opt.label.toLowerCase().includes(q) || opt.subtitle.toLowerCase().includes(q)
    );
  }, [normalizedOptions, query]);

  const selectOption = (opt) => {
    if (disabled) return;
    const displayVal = opt.label;
    setQuery(displayVal);
    setOpen(false);
    if (onChange) onChange(displayVal);
    if (onSelect) onSelect(opt);
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
          if (!e.target.value) {
            if (onChange) onChange("");
            if (onSelect) onSelect(null);
          }
        }}
        onFocus={() => !disabled && setOpen(true)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#243744]/10 focus:border-[#243744] bg-white/90 disabled:bg-gray-50 disabled:text-gray-700 text-sm font-medium"
      />
      {open && !disabled && (
        <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
          {filtered.length === 0 ? (
            <button
              type="button"
              onClick={() => selectOption({ id: query, label: query, subtitle: "", raw: query })}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-[#243744]/5"
            >
              Use &quot;{query.trim()}&quot;
            </button>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => selectOption(opt)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-[#243744]/5 ${
                  value === opt.label ? "bg-[#243744]/5 text-[#243744] font-medium" : "text-gray-700"
                }`}
              >
                <div className="font-semibold text-gray-800">{opt.label}</div>
                {opt.subtitle && <div className="text-xs text-gray-400 mt-0.5">{opt.subtitle}</div>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
