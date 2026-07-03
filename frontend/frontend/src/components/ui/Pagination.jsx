import React from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const Pagination = ({
  page = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize,
  itemLabel = "items",
  onPrevious,
  onNext,
  className = "",
}) => {
  const safeTotalPages = Math.max(1, totalPages);
  const canPrevious = page > 1;
  const canNext = page < safeTotalPages;
  const start = totalItems === 0 ? 0 : pageSize ? (page - 1) * pageSize + 1 : 1;
  const end = pageSize ? Math.min(totalItems, page * pageSize) : totalItems;

  return (
    <div className={`app-pagination ${className}`}>
      <p className="text-xs font-medium text-[#8A97A4]">
        Showing <span className="font-bold text-[#57687A]">{start}</span>
        {pageSize ? (
          <>
            {" "}to <span className="font-bold text-[#57687A]">{end}</span>
          </>
        ) : null}
        {" "}of <span className="font-bold text-[#57687A]">{totalItems}</span> {itemLabel}
      </p>

      <div className="flex items-center gap-2">
        <motion.button
          type="button"
          onClick={onPrevious}
          disabled={!canPrevious}
          className="app-pagination-button"
          whileHover={canPrevious ? { y: -1 } : {}}
          whileTap={canPrevious ? { scale: 0.97 } : {}}
          aria-label="Previous page"
        >
          <ChevronLeft size={15} />
          <span>Previous</span>
        </motion.button>
        <span className="app-pagination-current" aria-current="page">
          {page}
        </span>
        <motion.button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="app-pagination-button"
          whileHover={canNext ? { y: -1 } : {}}
          whileTap={canNext ? { scale: 0.97 } : {}}
          aria-label="Next page"
        >
          <span>Next</span>
          <ChevronRight size={15} />
        </motion.button>
      </div>
    </div>
  );
};

export default Pagination;
