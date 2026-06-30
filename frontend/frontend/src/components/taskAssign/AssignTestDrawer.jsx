import React, { useState } from "react";
import CloseIcon from "@mui/icons-material/Close";

const inputClass =
  "w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#2b63ae] bg-white/90 text-sm";

const AssignTestDrawer = () => {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {/* OPEN BUTTON */}
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        + Assign Test
      </button>

      {/* OVERLAY */}
      {open && (
        <div
          className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-[1000]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* DRAWER */}
      <aside
        className={`fixed top-0 right-0 h-full w-full md:max-w-[700px] lg:max-w-[500px]
        z-[1001] flex flex-col
        bg-gradient-to-br from-[#f8fbff] via-white to-[#eef5fd]
        shadow-2xl transform transition-transform duration-300 ease-out
        ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* HEADER */}
        <div className="sticky top-0 z-20 border-b border-white/70 bg-white/80 backdrop-blur-xl px-5 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Assign Test
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Assign laboratory tests to technicians and track progress
              </p>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-xl hover:bg-gray-100"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* PROJECT CARD */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">
              Project Information
            </h3>

            <div className="grid grid-cols-1 gap-4">

              <div>
                <label className="text-xs font-medium text-gray-600">
                  Project
                </label>
                <select className={inputClass}>
                  <option>Highway Project</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">

                <div>
                  <label className="text-xs text-gray-600">Sample</label>
                  <select className={inputClass}>
                    <option>S-001</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-600">Material</label>
                  <input
                    value="Soil"
                    readOnly
                    className={`${inputClass} bg-gray-50`}
                  />
                </div>

              </div>
            </div>
          </section>

          {/* TESTS CARD */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">
              Available Tests
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {["CBR", "OMC", "MDD", "Direct Shear", "Specific Gravity"].map(
                (test) => (
                  <label key={test} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" />
                    {test}
                  </label>
                )
              )}
            </div>
          </section>

          {/* ASSIGNMENT DETAILS */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">
              Assignment Details
            </h3>

            <div className="grid grid-cols-2 gap-4">

              <div>
                <label className="text-xs text-gray-600">
                  Assigned To
                </label>
                <select className={inputClass}>
                  <option>Ravi</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-600">
                  Priority
                </label>
                <select className={inputClass}>
                  <option>Normal</option>
                  <option>High</option>
                  <option>Low</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="text-xs text-gray-600">
                  Target Date
                </label>
                <input type="date" className={inputClass} />
              </div>

              <div className="col-span-2">
                <label className="text-xs text-gray-600">
                  Remarks
                </label>
                <textarea rows="3" className={inputClass} />
              </div>

            </div>
          </section>

        </div>

        {/* FOOTER */}
        <div className="sticky bottom-0 z-20 border-t border-white/70 bg-white/90 backdrop-blur-xl px-5 py-4">
          <div className="flex justify-end gap-3">

            <button
              onClick={() => setOpen(false)}
              className="px-4 py-2 rounded-xl border text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>

            <button className="px-4 py-2 rounded-xl bg-[#2b63ae] text-white hover:bg-[#1f4f8a]">
              Save Assignment
            </button>

          </div>
        </div>

      </aside>
    </div>
  );
};

export default AssignTestDrawer;