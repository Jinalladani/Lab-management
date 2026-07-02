import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

const ActionDropdown = ({
  trigger,
  items = [],
  open,
  onOpenChange,
  align = "right",
}) => {
  const [position, setPosition] = useState(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open || !triggerRef.current) return;

    const updatePosition = () => {
      const rect = triggerRef.current.getBoundingClientRect();
      const dropdownHeight = 200;
      const dropdownWidth = 200;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      const spaceBelow = viewportHeight - rect.bottom;
      const top = spaceBelow >= dropdownHeight + 8
        ? rect.bottom + 6
        : rect.top - dropdownHeight - 6;

      let left = align === "right"
        ? rect.right - dropdownWidth
        : rect.left;

      if (left < 8) left = 8;
      if (left + dropdownWidth > viewportWidth - 8) {
        left = viewportWidth - dropdownWidth - 8;
      }

      setPosition({ top, left, width: dropdownWidth });
    };

    const handleClickOutside = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        onOpenChange(false);
      }
    };

    updatePosition();
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, align, onOpenChange]);

  return (
    <>
      <div ref={triggerRef} className="inline-flex">
        {trigger}
      </div>
      {createPortal(
        <AnimatePresence>
          {open && position && (
            <motion.div
              ref={dropdownRef}
              className="fixed z-[99999] rounded-xl border border-[#E2E6EB] bg-white py-1 overflow-hidden"
              style={{
                top: position.top,
                left: position.left,
                width: position.width,
                boxShadow: "0 16px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)",
              }}
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.22, 0.68, 0, 1] }}
            >
              {items.map((item, index) => {
                if (item.divider) {
                  return <div key={index} className="my-1 border-t border-[#EDF0F3]" />;
                }

                const IconComp = item.icon;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      item.onClick?.();
                      onOpenChange(false);
                    }}
                    className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors duration-100 ${
                      item.danger
                        ? "text-[#DC2626] hover:bg-[#FEF2F2]"
                        : "text-[#3D4F5F] hover:bg-[#F6F7F9]"
                    }`}
                  >
                    {IconComp && <IconComp size={16} strokeWidth={2} className="shrink-0" />}
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default ActionDropdown;
