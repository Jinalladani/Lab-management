import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import Icon from "../ui/LucideIcon";

/* ─── Theme-aligned chart & status colors ─── */
export const CHART_COLORS = ["#16A34A", "#D97706", "#EA580C", "#DC2626", "#8A97A4"];
export const PRIMARY_CHART = "#3F6E8C";

export const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } },
  item: {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 0.68, 0, 1] } },
  },
};

export const useCountUp = (value) => {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    const target = Number(value) || 0;
    const duration = 700;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    const frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return displayValue;
};

export const getRemainingDays = (nextDueStr) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextDue = new Date(nextDueStr);
  nextDue.setHours(0, 0, 0, 0);
  return Math.ceil((nextDue - today) / (1000 * 60 * 60 * 24));
};

export const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export const EquipmentWorkspace = ({ children }) => (
  <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">
    <div className="app-workspace-shell">{children}</div>
  </div>
);

export const SectionHeader = ({ eyebrow, title, action }) => (
  <div className="mb-5 flex items-end justify-between gap-4">
    <div>
      <p className="lab-overline">{eyebrow}</p>
      <h2 className="mt-1 text-lg font-bold text-[#1A2733] tracking-tight">{title}</h2>
    </div>
    {action}
  </div>
);

const iconMap = {
  microscope: "microscope",
  wrench: "wrench",
  calendar: "calendar",
  warning: "warning",
  check: "checkSquare",
  flask: "flask",
  building: "building",
  timer: "timer",
  plus: "plus",
  fileText: "fileText",
  settings: "settings",
};

export const StatTile = ({ label, value, icon = "microscope", tone = "primary", caption, trend = "up", suffix = "" }) => {
  const count = useCountUp(value);
  const TrendIcon = trend === "down" ? TrendingDown : TrendingUp;
  const pct = Math.min(100, Math.max(8, Number(value) ? Math.round((Number(value) / Math.max(Number(value) + 2, 10)) * 100) : 0));

  return (
    <motion.article
      className={`lab-stat-tile lab-stat-${tone}`}
      variants={stagger.item}
      whileHover={{ y: -3, boxShadow: "0 16px 40px rgba(0,0,0,0.08)" }}
      transition={{ duration: 0.2 }}
    >
      <div className="lab-stat-head flex items-start justify-between gap-4">
        <div>
          <p className="lab-overline lab-stat-label">{label}</p>
          <div className="mt-2.5 flex items-end gap-3">
            <span className="lab-stat-number">
              {count.toLocaleString()}{suffix}
            </span>
            {caption && (
              <span className={`lab-trend ${trend === "down" ? "lab-trend-danger" : "lab-trend-success"}`}>
                <TrendIcon size={14} />
                {caption}
              </span>
            )}
          </div>
        </div>
        <div className="lab-stat-icon">
          <Icon name={iconMap[icon] || icon} size={20} strokeWidth={2} />
        </div>
      </div>
      <div className="lab-stat-body">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[#667684]">
          <span>Share</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-[#EDF0F3]">
          <div className="lab-meter-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </motion.article>
  );
};

export const QuickActionCard = ({ title, description, icon, onClick, tone = "primary" }) => {
  const toneStyles = {
    primary: "border-[#E2E6EB] hover:border-[#3F6E8C]/40",
    success: "border-[#BBF7D0] hover:border-[#16A34A]/40",
    warning: "border-[#FDE68A] hover:border-[#D97706]/40",
    danger: "border-[#FECACA] hover:border-[#DC2626]/40",
  };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`group flex flex-col items-center justify-center gap-2 rounded-xl border bg-white p-4 text-center transition-all duration-200 ${toneStyles[tone] || toneStyles.primary}`}
      style={{ boxShadow: "var(--shadow-xs)" }}
      whileHover={{ y: -2, boxShadow: "var(--shadow-md)" }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="lab-action-icon">
        <Icon name={iconMap[icon] || icon} size={18} strokeWidth={2} />
      </span>
      <span className="text-xs font-bold text-[#1A2733]">{title}</span>
      {description && <span className="text-[10px] text-[#8A97A4]">{description}</span>}
    </motion.button>
  );
};

export const ActionLink = ({ children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-0.5 text-xs font-semibold text-[#3F6E8C] hover:text-[#243744] transition-colors"
  >
    {children}
    <ArrowRight size={14} />
  </button>
);

export const getCalibrationBadgeClass = (status) => {
  const norm = String(status || "").toLowerCase();
  if (norm === "valid") return "lab-badge lab-badge-success";
  if (norm === "overdue") return "lab-badge lab-badge-danger";
  if (norm.includes("7 days")) return "lab-badge lab-badge-danger";
  if (norm.includes("soon")) return "lab-badge lab-badge-warning";
  if (norm === "not required") return "lab-badge";
  return "lab-badge lab-badge-warning";
};

export const getEquipmentStatusBadgeClass = (status) => {
  const norm = String(status || "").toLowerCase();
  if (norm === "active") return "lab-badge lab-badge-success";
  if (norm.includes("maintenance")) return "lab-badge lab-badge-info";
  return "lab-badge";
};

export const getUrgencyLabel = (daysLeft) => {
  if (daysLeft < 0) return { text: `${Math.abs(daysLeft)} Days Overdue`, className: "lab-badge lab-badge-danger" };
  if (daysLeft <= 7) return { text: `${daysLeft} Days Left`, className: "lab-badge lab-badge-danger" };
  if (daysLeft <= 30) return { text: `${daysLeft} Days Left`, className: "lab-badge lab-badge-warning" };
  return { text: `${daysLeft} Days Left`, className: "lab-badge lab-badge-success" };
};

export const ComplianceFooter = ({ index = 96.2 }) => (
  <div className="mt-6 flex items-center justify-between rounded-xl border border-[#E2E6EB] bg-[#F6F7F9] px-4 py-3">
    <div className="flex items-center gap-2 text-xs font-medium text-[#57687A]">
      <Icon name="checkSquare" size={14} />
      <span>Compliance Index: <strong className="text-[#16A34A]">{index}%</strong></span>
    </div>
    <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-[#16A34A]" />
  </div>
);
