import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.22, 0.68, 0, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 8,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
  className = "",
}) => {
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            className="fixed inset-0 bg-[#1A2733]/40 backdrop-blur-[2px]"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
          />
          <motion.div
            className={`relative w-full ${sizeClasses[size]} rounded-2xl border border-[#E2E6EB] bg-white overflow-hidden ${className}`}
            style={{ boxShadow: "0 24px 56px rgba(0,0,0,0.14), 0 8px 20px rgba(0,0,0,0.06)" }}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {(title || onClose) && (
              <div className="flex items-center justify-between border-b border-[#EDF0F3] px-6 py-4">
                <div>
                  {title && (
                    <h2 className="text-lg font-semibold text-[#1A2733]">{title}</h2>
                  )}
                  {description && (
                    <p className="mt-0.5 text-sm text-[#8A97A4]">{description}</p>
                  )}
                </div>
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8A97A4] transition-colors hover:bg-[#F0F2F5] hover:text-[#1A2733]"
                    aria-label="Close"
                  >
                    <X size={18} strokeWidth={2} />
                  </button>
                )}
              </div>
            )}
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
