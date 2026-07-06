import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Calendar, Microscope, X,
} from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import { mockEquipmentDb } from "../../utils/mockEquipmentData";
import { getEquipmentList } from "../../api";
import {
  EquipmentWorkspace,
  SectionHeader,
  getCalibrationBadgeClass,
} from "../../components/equipment/EquipmentModuleShared";

const eventStatusStyle = (status) => {
  const norm = String(status || "").toLowerCase();
  if (norm === "valid") return "border-l-[#16A34A] bg-[#F0FDF4] text-[#16A34A]";
  if (norm === "overdue") return "border-l-[#DC2626] bg-[#FEF2F2] text-[#DC2626]";
  if (norm.includes("7 days")) return "border-l-[#EA580C] bg-[#FFF7ED] text-[#EA580C]";
  return "border-l-[#D97706] bg-[#FFFBEB] text-[#D97706]";
};

const CalibrationCalendar = () => {
  const navigate = useNavigate();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [viewMode, setViewMode] = useState("month");

  const fetchCalendarEvents = async () => {
    try {
      const res = await getEquipmentList();
      const data = res.success && res.data?.equipment ? res.data.equipment : mockEquipmentDb.getEquipment();
      setEvents(data.map((item) => {
        const date = new Date(item.nextDue);
        return {
          id: item.id,
          title: item.name,
          dateStr: item.nextDue,
          day: date.getDate(),
          month: date.getMonth(),
          year: date.getFullYear(),
          status: item.calibrationStatus,
          laboratory: item.laboratory,
        };
      }));
    } catch {
      const eq = mockEquipmentDb.getEquipment();
      setEvents(eq.map((item) => {
        const date = new Date(item.nextDue);
        return {
          id: item.id, title: item.name, dateStr: item.nextDue,
          day: date.getDate(), month: date.getMonth(), year: date.getFullYear(),
          status: item.calibrationStatus, laboratory: item.laboratory,
        };
      }));
    }
  };

  useEffect(() => { fetchCalendarEvents(); }, []);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);
  const daysGrid = [];
  for (let i = 0; i < firstDayIndex; i++) daysGrid.push({ dayNum: "", isCurrentMonth: false });
  for (let i = 1; i <= daysInMonth; i++) daysGrid.push({ dayNum: i, isCurrentMonth: true });
  const totalCells = daysGrid.length > 35 ? 42 : 35;
  while (daysGrid.length < totalCells) daysGrid.push({ dayNum: "", isCurrentMonth: false });

  const getEventsForDay = (dayNum) => {
    if (!dayNum) return [];
    return events.filter((evt) => evt.day === dayNum && evt.month === currentMonth && evt.year === currentYear);
  };

  const listEvents = events
    .filter((evt) => evt.month === currentMonth && evt.year === currentYear)
    .sort((a, b) => a.day - b.day);

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today = new Date();

  return (
    <MainLayout headerTitle="Calibration Schedule" headerSubtitle="Time-traceability layout of upcoming calibrations">
      <EquipmentWorkspace>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {/* Inspector Panel */}
          <motion.div
            className="lab-panel flex h-fit flex-col justify-between lg:col-span-1"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="space-y-4">
              <SectionHeader eyebrow="Inspector" title="Calendar Details" />
              {selectedEvent ? (
                <div className="space-y-4 text-sm">
                  <div className="rounded-xl border border-[#E2E6EB] bg-[#F6F7F9] p-4">
                    <p className="lab-overline">Selected Task</p>
                    <h4 className="mt-1 font-bold text-[#1A2733]">{selectedEvent.title}</h4>
                    <p className="mt-0.5 text-xs font-semibold text-[#8A97A4]">{selectedEvent.id}</p>
                  </div>
                  <div className="space-y-2 border-t border-[#E2E6EB] pt-3">
                    <div className="flex justify-between">
                      <span className="text-[#8A97A4]">Laboratory</span>
                      <span className="font-bold text-[#1A2733]">{selectedEvent.laboratory}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8A97A4]">Due Date</span>
                      <span className="font-bold text-[#1A2733]">{selectedEvent.dateStr}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#8A97A4]">Status</span>
                      <span className={getCalibrationBadgeClass(selectedEvent.status)}>{selectedEvent.status}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/equipment/view/${selectedEvent.id}`)}
                    className="app-button app-button-primary w-full"
                  >
                    View Instrument Specs
                  </button>
                </div>
              ) : (
                <div className="py-10 text-center text-[#8A97A4]">
                  <Calendar className="mx-auto mb-2 h-10 w-10 text-[#CDD4DB]" />
                  <p className="text-xs font-semibold">Click a calibration event to inspect details.</p>
                </div>
              )}
            </div>

            <div className="mt-6 space-y-2 border-t border-[#E2E6EB] pt-4">
              <p className="lab-overline">Legend</p>
              {[
                { color: "#16A34A", label: "Valid / Active" },
                { color: "#D97706", label: "Due Soon (7-30 Days)" },
                { color: "#EA580C", label: "Due within 7 Days" },
                { color: "#DC2626", label: "Overdue" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2 text-xs font-medium text-[#57687A]">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                  {label}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Calendar Grid */}
          <motion.div
            className="lab-panel lg:col-span-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <button type="button" onClick={handlePrevMonth} className="app-icon-button h-9 w-9">
                  <ChevronLeft size={16} />
                </button>
                <h2 className="min-w-[160px] text-center text-lg font-bold text-[#1A2733]">
                  {monthNames[currentMonth]} {currentYear}
                </h2>
                <button type="button" onClick={handleNextMonth} className="app-icon-button h-9 w-9">
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="flex items-center gap-1 rounded-xl border border-[#E2E6EB] bg-[#F6F7F9] p-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setCurrentYear(today.getFullYear()); setCurrentMonth(today.getMonth()); }}
                  className="rounded-lg px-3 py-1.5 text-[#57687A] hover:text-[#1A2733]"
                >
                  Today
                </button>
                {["month", "week", "list"].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      if (mode === "list") navigate("/calibration/register");
                      else setViewMode(mode);
                    }}
                    className={`rounded-lg px-3 py-1.5 capitalize transition-all ${
                      viewMode === mode ? "bg-white text-[#243744] shadow-sm" : "text-[#57687A] hover:text-[#1A2733]"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {viewMode === "month" ? (
              <div className="grid grid-cols-7 gap-1 border-t border-[#E2E6EB] pt-4">
                {weekdays.map((day) => (
                  <div key={day} className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-[#8A97A4]">
                    {day}
                  </div>
                ))}
                {daysGrid.map((cell, idx) => {
                  const dayEvents = getEventsForDay(cell.dayNum);
                  const isToday = cell.dayNum === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                  return (
                    <div
                      key={idx}
                      className={`flex min-h-[90px] flex-col rounded-xl border border-[#E2E6EB] p-1.5 transition-colors ${
                        cell.isCurrentMonth ? "bg-white" : "pointer-events-none bg-[#F6F7F9] opacity-40"
                      } ${isToday ? "ring-2 ring-[#3F6E8C] ring-offset-2" : ""}`}
                    >
                      <span className={`text-xs font-bold ${isToday ? "text-[#243744]" : "text-[#8A97A4]"}`}>
                        {cell.dayNum}
                      </span>
                      <div className="mt-1 flex flex-1 flex-col justify-end space-y-1">
                        {dayEvents.map((evt) => (
                          <button
                            key={evt.id}
                            type="button"
                            onClick={() => setSelectedEvent(evt)}
                            className={`w-full truncate rounded border-l-2 px-1.5 py-0.5 text-left text-[9px] font-bold leading-normal transition-transform active:scale-[0.98] ${eventStatusStyle(evt.status)}`}
                            title={evt.title}
                          >
                            {evt.id}: {evt.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2 border-t border-[#E2E6EB] pt-4">
                {listEvents.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[#8A97A4]">No events this week.</p>
                ) : (
                  listEvents.map((evt) => (
                    <button
                      key={evt.id}
                      type="button"
                      onClick={() => setSelectedEvent(evt)}
                      className="lab-data-row w-full text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Microscope size={16} className="text-[#3F6E8C]" />
                        <div>
                          <p className="text-sm font-semibold text-[#1A2733]">{evt.title}</p>
                          <p className="text-xs text-[#8A97A4]">{evt.id} · Day {evt.day}</p>
                        </div>
                      </div>
                      <span className={getCalibrationBadgeClass(evt.status)}>{evt.status}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </motion.div>
        </div>
      </EquipmentWorkspace>
    </MainLayout>
  );
};

export default CalibrationCalendar;
