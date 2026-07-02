import React from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const variantClasses = {
  primary: "app-button app-button-primary",
  secondary: "app-button app-button-secondary",
  ghost: "app-button app-button-ghost",
  danger: "app-button app-button-danger",
};

const sizeClasses = {
  sm: "!h-8 !px-3 !text-xs !rounded-lg !gap-1.5",
  md: "",
  lg: "!h-12 !px-6 !text-base !rounded-xl",
};

const Button = ({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon: IconComponent,
  iconRight: IconRightComponent,
  className = "",
  type = "button",
  ...props
}) => {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      type={type}
      className={`${variantClasses[variant] || variantClasses.primary} ${sizeClasses[size] || ""} ${isDisabled ? "opacity-60 pointer-events-none" : ""} ${className}`}
      disabled={isDisabled}
      whileHover={isDisabled ? {} : { scale: 1.015, y: -1 }}
      whileTap={isDisabled ? {} : { scale: 0.975 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      {...props}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : IconComponent ? (
        <IconComponent size={16} strokeWidth={2.2} />
      ) : null}
      {children}
      {IconRightComponent && !loading && (
        <IconRightComponent size={16} strokeWidth={2.2} />
      )}
    </motion.button>
  );
};

export default Button;
