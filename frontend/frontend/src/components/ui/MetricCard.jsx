import React from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

const toneClasses = {
  primary: "text-[#243744] bg-[#F4F5F7]",
  success: "text-[#2E7D32] bg-[#F0F7F1]",
  warning: "text-[#C58B00] bg-[#FFF8E7]",
  danger: "text-[#B3261E] bg-[#FFF1F0]",
  info: "text-[#2F6B9A] bg-[#EDF5FA]",
  neutral: "text-[#5C7896] bg-[#F4F5F7]",
};

const MetricCard = ({
  label,
  value,
  caption,
  trend,
  icon: Icon,
  tone = "primary",
}) => {
  const isDown = String(trend || "").startsWith("-");
  const TrendIcon = isDown ? ArrowDownRight : ArrowUpRight;

  return (
    <motion.article
      className="rounded-[20px] border border-[#E3E7EC] bg-white p-5"
      style={{ boxShadow: "var(--shadow-sm)" }}
      whileHover={{ y: -2, boxShadow: "var(--shadow-md)" }}
      transition={{ duration: 0.2, ease: [0.22, 0.68, 0, 1] }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
            {label}
          </p>
          <div className="mt-3 flex items-end gap-2">
            <p className="text-3xl font-bold leading-none tracking-tight text-[#1E293B]">
              {value}
            </p>
            {trend && (
              <span className={`inline-flex items-center gap-1 text-xs font-semibold ${isDown ? "text-[#B3261E]" : "text-[#2E7D32]"}`}>
                <TrendIcon size={14} />
                {trend}
              </span>
            )}
          </div>
        </div>
        {Icon && (
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${toneClasses[tone] || toneClasses.primary}`}>
            <Icon size={22} strokeWidth={2} />
          </div>
        )}
      </div>
      {caption && (
        <p className="mt-4 text-sm text-[#64748B]">{caption}</p>
      )}
    </motion.article>
  );
};

export default MetricCard;
