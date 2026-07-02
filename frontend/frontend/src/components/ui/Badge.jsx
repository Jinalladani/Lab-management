import React from "react";

const variantClasses = {
  success: "border-[#BBF7D0] bg-[#F0FDF4] text-[#16A34A]",
  warning: "border-[#FDE68A] bg-[#FFFBEB] text-[#D97706]",
  danger: "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]",
  info: "border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB]",
  neutral: "border-[#E2E6EB] bg-[#F6F7F9] text-[#57687A]",
};

const Badge = ({
  children,
  variant = "neutral",
  dot = false,
  className = "",
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold capitalize ${variantClasses[variant] || variantClasses.neutral} ${className}`}
    >
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      )}
      {children}
    </span>
  );
};

export default Badge;
