import React from "react";
import { motion } from "framer-motion";
import Icon from "./LucideIcon";

const PageHeader = ({
  title,
  subtitle,
  icon,
  actions,
  backButton,
  className = "",
}) => {
  return (
    <motion.div
      className={`mb-6 ${className}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 0.68, 0, 1] }}
    >
      {backButton && (
        <div className="mb-3">{backButton}</div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E2E6EB] bg-white text-[#3F6E8C]"
              style={{ boxShadow: "var(--shadow-xs)" }}
            >
              <Icon name={icon} size={20} strokeWidth={2} />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-[#1A2733] tracking-tight sm:text-2xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 text-sm text-[#8A97A4]">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </motion.div>
  );
};

export default PageHeader;
