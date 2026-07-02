import React from "react";
import { motion } from "framer-motion";

const SectionCard = ({
  title,
  description,
  icon: IconComponent,
  children,
  className = "",
}) => {
  return (
    <motion.div
      className={`app-section-card ${className}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 0.68, 0, 1] }}
    >
      {(title || description) && (
        <div className="app-section-card-header">
          {IconComponent && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-[#E2E6EB] text-[#3F6E8C]">
              <IconComponent size={18} strokeWidth={2} />
            </div>
          )}
          <div className="min-w-0">
            {title && (
              <h3 className="text-sm font-semibold text-[#1A2733]">{title}</h3>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-[#8A97A4]">{description}</p>
            )}
          </div>
        </div>
      )}
      <div className="app-section-card-body">{children}</div>
    </motion.div>
  );
};

export default SectionCard;
