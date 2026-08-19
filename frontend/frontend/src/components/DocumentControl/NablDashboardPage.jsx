import React from "react";
import MainLayout from "../layout/MainLayout";
import { Award, ShieldCheck, CheckCircle2, AlertTriangle, FileText, Download, Calendar } from "lucide-react";

const NablDashboardPage = () => {
  return (
    <MainLayout headerTitle="NABL Dashboard" headerSubtitle="Quality Management System ISO/IEC 17025 Readiness">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        
        {/* Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-[#243744] to-[#1A2733] p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Award size={22} className="text-amber-300" />
              <span className="text-xs font-extrabold uppercase tracking-widest text-amber-200">ISO/IEC 17025:2017</span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">NABL Quality & Accreditation Status</h1>
            <p className="text-xs text-white/80 max-w-xl">
              Centralized repository for NABL application forms, assessors reports, scope of accreditation, proficiency testing (PT), and internal audits.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#243744] hover:bg-gray-100 shadow-sm">
              <Download size={14} /> Download Certificate
            </button>
          </div>
        </div>

        {/* NABL Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs">
            <span className="text-xs font-bold text-gray-500">Accreditation Cycle</span>
            <div className="text-xl font-black text-gray-900 mt-2">2025 - 2027</div>
            <p className="text-[11px] font-medium text-emerald-600 mt-0.5">● Active Accreditation</p>
          </div>

          <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs">
            <span className="text-xs font-bold text-gray-500">Scope Discipline</span>
            <div className="text-xl font-black text-gray-900 mt-2">Mechanical & Chemical</div>
            <p className="text-[11px] font-medium text-gray-400 mt-0.5">Concrete, Soil, Aggregates</p>
          </div>

          <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs">
            <span className="text-xs font-bold text-gray-500">Surveillance Audit</span>
            <div className="text-xl font-black text-gray-900 mt-2">Nov 2026</div>
            <p className="text-[11px] font-medium text-amber-600 mt-0.5">Due in 3 months</p>
          </div>

          <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs">
            <span className="text-xs font-bold text-gray-500">Open NCs / Findings</span>
            <div className="text-xl font-black text-emerald-700 mt-2">0 Open</div>
            <p className="text-[11px] font-medium text-emerald-600 mt-0.5">All CARs Closed</p>
          </div>
        </div>

        {/* NABL Controlled Documents Grid */}
        <div className="rounded-2xl border border-gray-200/80 bg-white shadow-xs p-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <FileText size={16} className="text-[#243744]" />
            NABL Key Controlled Documents & Reports
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/50 flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-200 text-[#243744]">NABL-APP-01</span>
                <p className="font-bold text-gray-900 mt-1">NABL Application Form for Accreditation</p>
                <p className="text-[11px] text-gray-500">Rev 00 • Effective: 10-Feb-2026</p>
              </div>
              <button className="flex items-center gap-1 text-xs font-bold text-[#243744] hover:underline">
                <Download size={14} /> PDF
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/50 flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-200 text-[#243744]">NABL-REP-2025</span>
                <p className="font-bold text-gray-900 mt-1">NABL Assessment Report 2025</p>
                <p className="text-[11px] text-gray-500">Rev 00 • Effective: 15-Nov-2025</p>
              </div>
              <button className="flex items-center gap-1 text-xs font-bold text-[#243744] hover:underline">
                <Download size={14} /> PDF
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/50 flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-200 text-[#243744]">QM-001</span>
                <p className="font-bold text-gray-900 mt-1">Quality Manual (ISO/IEC 17025:2017)</p>
                <p className="text-[11px] text-gray-500">Rev 04 • Effective: 01-Jan-2026</p>
              </div>
              <button className="flex items-center gap-1 text-xs font-bold text-[#243744] hover:underline">
                <Download size={14} /> PDF
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/50 flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-200 text-[#243744]">QP-006</span>
                <p className="font-bold text-gray-900 mt-1">Internal Audit Procedure & Schedule</p>
                <p className="text-[11px] text-gray-500">Rev 02 • Effective: 10-Aug-2025</p>
              </div>
              <button className="flex items-center gap-1 text-xs font-bold text-[#243744] hover:underline">
                <Download size={14} /> PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default NablDashboardPage;
