import React from "react";

const colorPalette = [
  "bg-[#3F6E8C]",
  "bg-[#2F855A]",
  "bg-[#9B5DE5]",
  "bg-[#D97706]",
  "bg-[#DC2626]",
  "bg-[#2563EB]",
  "bg-[#0D9488]",
  "bg-[#C026D3]",
];

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-xl",
};

const getColorIndex = (name = "") => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % colorPalette.length;
};

const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (name.slice(0, 2) || "?").toUpperCase();
};

const Avatar = ({
  name = "",
  src,
  size = "md",
  showOnline = false,
  className = "",
  bgClass,
}) => {
  const initials = getInitials(name);
  const colorClass = bgClass || colorPalette[getColorIndex(name)];

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-white`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} ${colorClass} inline-flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-white`}
        >
          {initials}
        </div>
      )}
      {showOnline && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#16A34A]" />
      )}
    </div>
  );
};

export default Avatar;
