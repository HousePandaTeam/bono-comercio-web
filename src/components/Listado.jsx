// Listado.jsx
import React from "react";
import CategoryAccordion from "./CategoryAccordion";

export default function Listado({ data = [], initialOpenAll = false }) {
  return (
    <div className='space-y-3'>
      {data.map((cat, i) => (
        <CategoryAccordion
          key={`${cat.categoria}-${i}`}
          categoria={cat.categoria}
          comercios={cat.comercios}
          defaultOpen={initialOpenAll}
        />
      ))}
    </div>
  );
}
