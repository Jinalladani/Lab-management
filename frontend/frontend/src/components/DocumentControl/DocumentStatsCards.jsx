import React from "react";
import { Folder, CheckCircle2, Clock, Calendar, FileText, Archive } from "lucide-react";

const DocumentStatsCards = ({ stats = {}, activeTab, onCardClick, loading = false }) => {
  const cardItems = [
    {
      id: "total",
      title: "Total Documents",
      value: stats.total_documents ?? 248,
      subtitle: "All time",
      icon: Folder,
      iconBg: "bg-slate-100 text-[#243744]",
      borderAccent: "border-slate-200",
    },
    {
      id: "active",
      title: "Active Documents",
      value: stats.active_documents ?? 192,
      subtitle: `${stats.active_percentage ?? 77.4}% of total`,
      icon: CheckCircle2,
      iconBg: "bg-emerald-50 text-emerald-600",
      borderAccent: "border-emerald-200",
    },
    {
      id: "under_review",
      title: "Under Review",
      value: stats.under_review ?? 14,
      subtitle: `${stats.under_review_percentage ?? 5.6}% of total`,
      icon: Clock,
      iconBg: "bg-amber-50 text-amber-600",
      borderAccent: "border-amber-200",
    },
    {
      id: "review_due",
      title: "Review Due",
      value: stats.review_due ?? 8,
      subtitle: stats.review_due_subtitle || "Due within 30 days",
      icon: Calendar,
      iconBg: "bg-orange-50 text-orange-600",
      borderAccent: "border-orange-200",
    },
    {
      id: "draft",
      title: "Draft Documents",
      value: stats.draft_documents ?? 21,
      subtitle: `${stats.draft_percentage ?? 8.5}% of total`,
      icon: FileText,
      iconBg: "bg-blue-50 text-blue-600",
      borderAccent: "border-blue-200",
    },
    {
      id: "obsolete",
      title: "Obsolete Documents",
      value: stats.obsolete_documents ?? 13,
      subtitle: `${stats.obsolete_percentage ?? 5.2}% of total`,
      icon: Archive,
      iconBg: "bg-rose-50 text-rose-600",
      borderAccent: "border-rose-200",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-[100px] animate-pulse rounded-2xl border border-gray-200/70 bg-white p-4 shadow-xs" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
      {cardItems.map((card) => {
        const IconComp = card.icon;
        return (
          <div
            key={card.id}
            onClick={() => onCardClick && onCardClick(card.id)}
            className="group relative flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <span className="text-[12px] font-semibold text-gray-600 group-hover:text-[#1A2733] transition-colors">
                {card.title}
              </span>
              <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${card.iconBg}`}>
                <IconComp size={16} strokeWidth={2.2} />
              </div>
            </div>

            <div className="mt-2">
              <div className="text-2xl font-bold tracking-tight text-[#1A2733]">
                {card.value}
              </div>
              <div className="mt-0.5 text-[11px] font-medium text-gray-400">
                {card.subtitle}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DocumentStatsCards;
