import React from "react";
import { motion } from "framer-motion";
import { Inbox } from "lucide-react";

const EmptyState = ({
  icon: IconComponent = Inbox,
  title = "No data found",
  description,
  action,
  className = "",
}) => {
  return (
    <motion.div
      className={`flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#D4DBE2] bg-[#FAFBFC] px-8 py-12 text-center ${className}`}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.22, 0.68, 0, 1] }}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E2E6EB] bg-white text-[#8A97A4]"
        style={{ boxShadow: "var(--shadow-sm)" }}
      >
        <IconComponent size={24} strokeWidth={1.8} />
      </div>
      <h3 className="text-base font-semibold text-[#1A2733]">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm text-[#8A97A4]">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </motion.div>
  );
};

export default EmptyState;
