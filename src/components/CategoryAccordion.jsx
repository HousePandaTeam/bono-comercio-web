// CategoryAccordion.jsx
import React, { useState } from "react";
import CommerceItem from "./CommerceItem";

export default function CategoryAccordion({
  categoria,
  comercios = [],
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className='border border-gray-200 rounded-lg overflow-hidden bg-white'>
      <button
        className='w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-200'
        onClick={() => setOpen((o) => !o)}
      >
        <span className='font-semibold text-left pr-4'>{categoria}</span>
        <span className='text-sm text-gray-600'>{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className='p-3'>
          <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3'>
            {comercios.map((c, idx) => (
              <CommerceItem
                key={`${c.maps_url || c.nombre || categoria}-${idx}`}
                comercio={c}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
