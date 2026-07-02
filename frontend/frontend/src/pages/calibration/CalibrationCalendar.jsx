import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../components/layout/MainLayout";
import { mockEquipmentDb } from "../../utils/mockEquipmentData";
import { getEquipmentList } from "../../api";
import {
  ChevronLeft,
  ChevronRight,
  Event,
  Timer,
  Build,
  Science
} from "@mui/icons-material";

const CalibrationCalendar = () => {
  const navigate = useNavigate();
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(5); // June (0-indexed: 5)
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const fetchCalendarEvents = async () => {
    try {
      const res = await getEquipmentList();
      if (res.success && res.data?.equipment) {
        const data = res.data.equipment;
        const generatedEvents = data.map(item => {
          const date = new Date(item.nextDue);
          return {
            id: item.id,
            title: item.name,
            dateStr: item.nextDue,
            day: date.getDate(),
            month: date.getMonth(),
            year: date.getFullYear(),
            status: item.calibrationStatus,
            laboratory: item.laboratory
          };
        });
        setEvents(generatedEvents);
      } else {
        throw new Error("Failed response");
      }
    } catch (err) {
      console.warn("Using fallback local data for Calendar:", err.message);
      const eq = mockEquipmentDb.getEquipment();
      const generatedEvents = eq.map(item => {
        const date = new Date(item.nextDue);
        return {
          id: item.id,
          title: item.name,
          dateStr: item.nextDue,
          day: date.getDate(),
          month: date.getMonth(),
          year: date.getFullYear(),
          status: item.calibrationStatus,
          laboratory: item.laboratory
        };
      });
      setEvents(generatedEvents);
    }
  };

  useEffect(() => {
    fetchCalendarEvents();
  }, []);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Generate calendar days
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => {
    // Return 0-indexed day of week, adjusting so Mon = 0, Sun = 6
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  const daysGrid = [];
  // Fill leading empty cells
  for (let i = 0; i < firstDayIndex; i++) {
    daysGrid.push({ dayNum: "", isCurrentMonth: false });
  }
  // Fill actual month days
  for (let i = 1; i <= daysInMonth; i++) {
    daysGrid.push({ dayNum: i, isCurrentMonth: true });
  }
  // Fill trailing empty cells to make complete grid of 35 or 42
  const totalCells = daysGrid.length > 35 ? 42 : 35;
  while (daysGrid.length < totalCells) {
    daysGrid.push({ dayNum: "", isCurrentMonth: false });
  }

  // Filter events for a particular day in current view
  const getEventsForDay = (dayNum) => {
    if (!dayNum) return [];
    return events.filter(evt => 
      evt.day === dayNum && 
      evt.month === currentMonth && 
      evt.year === currentYear
    );
  };

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <MainLayout headerTitle="Calibration Schedule" headerSubtitle="Time-traceability layout of upcoming standards calibrations">
      <div className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Left Event Details Drawer/Panel */}
        <div className="bg-white p-5 rounded-3xl border border-gray-150 shadow-sm flex flex-col justify-between h-fit lg:col-span-1">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Calendar Inspector</h3>
            {selectedEvent ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl">
                  <span className="text-[10px] font-bold text-blue-500 uppercase">Selected Task</span>
                  <h4 className="text-sm font-bold text-gray-900 mt-1">{selectedEvent.title}</h4>
                  <p className="text-[10px] text-gray-500 font-semibold mt-0.5">{selectedEvent.id}</p>
                </div>
                
                <div className="space-y-2 border-t border-gray-100 pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-semibold">Laboratory</span>
                    <span className="font-bold text-gray-800">{selectedEvent.laboratory}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-semibold">Due Date</span>
                    <span className="font-bold text-gray-800">{selectedEvent.dateStr}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-semibold">Compliance Status</span>
                    <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      selectedEvent.status === "Valid"
                        ? "bg-emerald-50 text-emerald-700"
                        : selectedEvent.status === "Overdue"
                        ? "bg-red-50 text-red-700"
                        : "bg-amber-50 text-amber-700"
                    }`}>{selectedEvent.status}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button onClick={() => navigate(`/equipment/view/${selectedEvent.id}`)} className="w-full py-2 bg-[#2562AA] hover:bg-blue-700 text-white rounded-xl font-bold">
                    View Instrument Specs
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400">
                <Event className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p className="text-xs font-semibold">Click a calibration block in the monthly calendar to inspect details.</p>
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-gray-100 pt-4 space-y-2.5">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase">Calendar Legend</h4>
            <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Valid / Active</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>Due Soon (7-30 Days)</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
              <span>Due within 7 Days</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
              <span>Overdue</span>
            </div>
          </div>
        </div>

        {/* Right Calendar Grid Container */}
        <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm lg:col-span-3 flex flex-col space-y-4">
          
          {/* Month Switcher Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={handlePrevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 border border-gray-200 shadow-xs">
                <ChevronLeft />
              </button>
              <h2 className="text-lg font-bold text-gray-900 min-w-[140px] text-center">
                {monthNames[currentMonth]} {currentYear}
              </h2>
              <button onClick={handleNextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 border border-gray-200 shadow-xs">
                <ChevronRight />
              </button>
            </div>

            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 p-1 rounded-xl text-xs font-bold text-gray-500">
              <button onClick={() => { setCurrentYear(2026); setCurrentMonth(5); }} className="px-3 py-1 hover:text-gray-800">Today</button>
              <span className="text-gray-300">|</span>
              <button className="px-3 py-1 bg-white shadow-sm text-[#2562AA] rounded-lg">Month</button>
              <button onClick={() => alert("Week view mock deactivated.")} className="px-3 py-1 hover:text-gray-850">Week</button>
              <button onClick={() => navigate("/calibration/register")} className="px-3 py-1 hover:text-gray-850">List</button>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-7 gap-1 border-t border-gray-100 pt-4 flex-1">
            {/* Weekdays Labels */}
            {weekdays.map(day => (
              <div key={day} className="text-center text-xs font-bold text-gray-400 py-2 uppercase tracking-wide">
                {day}
              </div>
            ))}

            {/* Days Cells */}
            {daysGrid.map((cell, idx) => {
              const dayEvents = getEventsForDay(cell.dayNum);
              const isToday = cell.dayNum === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();
              
              return (
                <div
                  key={idx}
                  className={`min-h-[90px] border border-gray-100 rounded-xl p-1.5 flex flex-col justify-between transition-colors ${
                    cell.isCurrentMonth ? "bg-white" : "bg-gray-50/50 opacity-40 pointer-events-none"
                  } ${isToday ? "ring-2 ring-[#2562AA] ring-offset-2" : ""}`}
                >
                  <span className={`text-xs font-bold ${
                    isToday ? "text-[#2562AA] font-extrabold" : "text-gray-500"
                  }`}>{cell.dayNum}</span>
                  
                  {/* Event list in day block */}
                  <div className="space-y-1 mt-1 flex-1 flex flex-col justify-end">
                    {dayEvents.map(evt => (
                      <button
                        key={evt.id}
                        onClick={() => setSelectedEvent(evt)}
                        className={`w-full text-[9px] font-bold text-left px-1.5 py-0.5 rounded truncate leading-normal transition-transform active:scale-[0.98] ${
                          evt.status === "Valid"
                            ? "bg-emerald-50 text-emerald-800 border-l-2 border-emerald-500"
                            : evt.status === "Overdue"
                            ? "bg-red-50 text-red-800 border-l-2 border-red-500"
                            : evt.status === "Due within 7 Days"
                            ? "bg-orange-50 text-orange-850 border-l-2 border-orange-500"
                            : "bg-amber-50 text-amber-800 border-l-2 border-amber-500"
                        }`}
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

        </div>

      </div>
    </MainLayout>
  );
};

export default CalibrationCalendar;
