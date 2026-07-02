import React from "react";
import { AnimatePresence, motion } from "framer-motion";

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
  return (
    <div className={className}>
      {label && (
        <label htmlFor={name} className="app-label">
          {label}
          {required && <span className="text-[#DC2626] ml-0.5">*</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled || loading}
        className={`app-select ${error ? "app-input-error" : ""} ${disabled ? "opacity-60 cursor-not-allowed bg-[#F6F7F9]" : ""}`}
        {...props}
      >
        <option value="">
          {loading ? "Loading..." : placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
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
