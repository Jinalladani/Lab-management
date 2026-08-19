import React from "react";
import { LayoutGrid, ShieldCheck, Microscope, Award, BookOpen, UserCheck } from "lucide-react";

const DocumentTabs = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: "All Documents", label: "All Documents", icon: LayoutGrid },
    { id: "Quality", label: "Quality", icon: ShieldCheck },
    { id: "Technical", label: "Technical", icon: Microscope },
    { id: "NABL", label: "NABL", icon: Award },
    { id: "External", label: "External", icon: BookOpen },
    { id: "My Documents", label: "My Documents", icon: UserCheck },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 shrink-0 ${
              isActive
                ? "bg-[#243744] text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100 hover:text-[#1A2733]"
            }`}
          >
            <Icon size={14} strokeWidth={isActive ? 2.2 : 1.8} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default DocumentTabs;
