import React from "react";

const variants = {
  text: "h-4 w-full rounded-md",
  "text-sm": "h-3 w-3/4 rounded-md",
  circle: "h-10 w-10 rounded-full",
  rect: "h-24 w-full rounded-xl",
  "table-row": "h-14 w-full rounded-lg",
  card: "h-32 w-full rounded-xl",
  avatar: "h-10 w-10 rounded-full",
};

const Skeleton = ({ variant = "text", className = "", count = 1 }) => {
  const baseClass = variants[variant] || variants.text;

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`lab-skeleton ${baseClass} ${className}`}
          aria-hidden="true"
        />
      ))}
    </>
  );
};

// Specialized table skeleton
export const TableSkeleton = ({ rows = 5, cols = 6 }) => (
  <div className="app-table-container">
    <div className="px-5 py-4 border-b border-[#E2E6EB]" style={{ background: "var(--app-section)" }}>
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="!h-3 flex-1" />
        ))}
      </div>
    </div>
    <div className="divide-y divide-[#EDF0F3]">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-5 py-4">
          <div className="flex items-center gap-4">
            <Skeleton variant="avatar" />
            <div className="flex-1 space-y-2">
              <Skeleton className="!w-1/3" />
              <Skeleton variant="text-sm" className="!w-1/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default Skeleton;
