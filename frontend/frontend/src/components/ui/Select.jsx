import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Loader2 } from "lucide-react";

const Select = ({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = "Select an option",
  error,
  helperText,
  required = false,
  disabled = false,
  loading = false,
  className = "",
  ...props
}) => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const isDisabled = disabled || loading;

  const selectedOption = useMemo(
    () => options.find((opt) => String(opt.value) === String(value)),
    [options, value]
  );

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target) &&
        listRef.current &&
        !listRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const emitChange = (nextValue) => {
    onChange?.({
      target: {
        name,
        value: nextValue,
      },
    });
  };

  const selectOption = (nextValue) => {
    emitChange(nextValue);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (isDisabled) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen((prev) => !prev);
    }

    if (event.key === "Escape") {
      setOpen(false);
      buttonRef.current?.focus();
    }
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label htmlFor={name} className="app-label">
          {label}
          {required && <span className="text-[#DC2626] ml-0.5">*</span>}
        </label>
      )}

      <button
        ref={buttonRef}
        id={name}
        name={name}
        type="button"
        disabled={isDisabled}
        onClick={() => !isDisabled && setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={[
          "app-select-trigger",
          open ? "app-select-trigger-open" : "",
          error ? "app-input-error" : "",
          isDisabled ? "opacity-60 cursor-not-allowed bg-[#F6F7F9]" : "",
        ].join(" ")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={Boolean(error)}
        {...props}
      >
        <span className={selectedOption ? "truncate text-[#1A2733]" : "truncate text-[#A1ADB8]"}>
          {loading ? "Loading..." : selectedOption?.label || placeholder}
        </span>
        {loading ? (
          <Loader2 size={16} className="shrink-0 animate-spin text-[#8A97A4]" />
        ) : (
          <ChevronDown
            size={16}
            className={`shrink-0 text-[#8A97A4] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      <AnimatePresence>
        {open && !isDisabled && (
          <motion.div
            ref={listRef}
            className="app-select-menu"
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
          >
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => selectOption("")}
              className={`app-select-option ${!value ? "app-select-option-selected" : ""}`}
            >
              <span>{placeholder}</span>
              {!value && <Check size={15} />}
            </button>
            {options.map((opt) => {
              const selected = String(opt.value) === String(value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => selectOption(opt.value)}
                  className={`app-select-option ${selected ? "app-select-option-selected" : ""}`}
                >
                  <span className="truncate">{opt.label}</span>
                  {selected && <Check size={15} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {error && (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.15 }}
            className="app-error-text"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      {helperText && !error && (
        <p className="app-helper-text">{helperText}</p>
      )}
    </div>
  );
};

export default Select;
