import React from "react";
import * as icons from "lucide-react";

// Map our camelCase icon names to PascalCase Lucide component names
const nameMap = {
  activity: "Activity",
  arrowRight: "ArrowRight",
  arrowLeft: "ArrowLeft",
  bell: "Bell",
  briefcase: "Briefcase",
  building: "Building2",
  calendar: "Calendar",
  checkSquare: "CheckSquare",
  chevronDown: "ChevronDown",
  chevronLeft: "ChevronLeft",
  chevronRight: "ChevronRight",
  chevronUp: "ChevronUp",
  clipboard: "ClipboardList",
  eye: "Eye",
  eyeOff: "EyeOff",
  fileText: "FileText",
  flask: "FlaskConical",
  gauge: "Gauge",
  grid: "LayoutGrid",
  layoutDashboard: "LayoutDashboard",
  list: "List",
  logOut: "LogOut",
  menu: "Menu",
  microscope: "Microscope",
  plus: "Plus",
  search: "Search",
  table: "Table2",
  timer: "Clock",
  trendingDown: "TrendingDown",
  trendingUp: "TrendingUp",
  user: "User",
  users: "Users",
  wrench: "Wrench",
  x: "X",
  check: "Check",
  info: "Info",
  alertCircle: "AlertCircle",
  alertTriangle: "AlertTriangle",
  mail: "Mail",
  phone: "Phone",
  shield: "Shield",
  settings: "Settings",
  download: "Download",
  upload: "Upload",
  trash: "Trash2",
  edit: "Pencil",
  moreVertical: "MoreVertical",
  moreHorizontal: "MoreHorizontal",
  externalLink: "ExternalLink",
  copy: "Copy",
  filter: "Filter",
  sortAsc: "ArrowUpAZ",
  sortDesc: "ArrowDownAZ",
  refreshCw: "RefreshCw",
  loader: "Loader2",
  home: "Home",
  star: "Star",
  heart: "Heart",
  bookmark: "Bookmark",
  folder: "Folder",
  file: "File",
  image: "Image",
  video: "Video",
  lock: "Lock",
  unlock: "Unlock",
  key: "Key",
  link: "Link",
  unlink: "Unlink",
  globe: "Globe",
  mapPin: "MapPin",
  navigation: "Navigation",
  compass: "Compass",
  zap: "Zap",
  hash: "Hash",
  atSign: "AtSign",
  toggleLeft: "ToggleLeft",
  toggleRight: "ToggleRight",
  userPlus: "UserPlus",
  userMinus: "UserMinus",
  userCheck: "UserCheck",
  userX: "UserX",
  package: "Package",
  archive: "Archive",
  inbox: "Inbox",
  send: "Send",
  printer: "Printer",
  save: "Save",
  circleDot: "CircleDot",
  circleCheck: "CircleCheck",
  circleX: "CircleX",
  badgeCheck: "BadgeCheck",
  shieldCheck: "ShieldCheck",
};

const Icon = ({ name, size = 20, className = "", strokeWidth = 2, ...props }) => {
  const pascalName = nameMap[name];
  const LucideComponent = pascalName ? icons[pascalName] : icons.Activity;

  if (!LucideComponent) {
    // Fallback to Activity icon if mapping not found
    const FallbackIcon = icons.Activity;
    return (
      <FallbackIcon
        size={size}
        strokeWidth={strokeWidth}
        className={className}
        aria-hidden="true"
        {...props}
      />
    );
  }

  return (
    <LucideComponent
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden="true"
      {...props}
    />
  );
};

export default Icon;
