import React from "react";

const variantClasses = {
  success: "border-[#CFE8D1] bg-[#F0F7F1] text-[#2E7D32]",
  warning: "border-[#F5DFA2] bg-[#FFF8E7] text-[#C58B00]",
  danger: "border-[#F3C5C1] bg-[#FFF1F0] text-[#B3261E]",
  info: "border-[#B9D6E8] bg-[#EDF5FA] text-[#2F6B9A]",
  neutral: "border-[#E3E7EC] bg-[#F4F5F7] text-[#64748B]",
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
