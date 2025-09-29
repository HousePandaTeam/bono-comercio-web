import React from "react";
import LeafletMapTooltipDetail from "./LeafletMapTooltipDetail";

export default function LeafletMapTooltip({ punto, onClose }) {
  if (!punto) return null;
  return (
    <div
      className='fixed z-[10001] bg-white shadow-lg animate-slideup border-t sm:border sm:rounded-xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:right-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-lg sm:w-full left-0 right-0 bottom-0 max-w-full'
      style={{ margin: "0 auto" }}
    >
      <div className='p-4'>
        <div className='flex justify-between items-center mb-2'>
          <LeafletMapTooltipDetail punto={punto} />
          <button
            className='text-gray-500 hover:text-gray-800 text-xl'
            onClick={onClose}
            aria-label='Cerrar'
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
