import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const Input = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  helperText,
  required = false,
  disabled = false,
  icon: IconLeft,
  iconRight: IconRight,
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
      <div className="relative">
        {IconLeft && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A97A4] pointer-events-none">
            <IconLeft size={17} strokeWidth={2} />
          </div>
        )}
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`app-input ${IconLeft ? "!pl-10" : ""} ${IconRight ? "!pr-10" : ""} ${error ? "app-input-error" : ""} ${disabled ? "opacity-60 cursor-not-allowed bg-[#F6F7F9]" : ""}`}
          {...props}
        />
        {IconRight && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A97A4] pointer-events-none">
            <IconRight size={17} strokeWidth={2} />
          </div>
        )}
      </div>
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

export default Input;
