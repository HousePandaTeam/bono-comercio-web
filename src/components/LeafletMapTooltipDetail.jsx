import React from "react";

export default function LeafletMapTooltipDetail({ punto }) {
  if (!punto) return null;
  return (
    <div>
      <div className='font-bold text-lg'>{punto.nombre || "Sin nombre"}</div>
      {punto.direccion && (
        <div className='text-gray-700 mb-2'>{punto.direccion}</div>
      )}
      {punto.customCategoria && (
        <div className='mb-2'>
          <span className='inline-block text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded'>
            {punto.customCategoria}
          </span>
        </div>
      )}
      <div className='flex gap-3 mt-2'>
        {punto.maps_url && (
          <a
            className='px-3 py-1 bg-blue-700 text-white rounded hover:bg-blue-800 transition'
            href={punto.maps_url}
            target='_blank'
            rel='noreferrer'
          >
            Abrir en Maps
          </a>
        )}
        {typeof punto.lat === "number" && typeof punto.lng === "number" && (
          <a
            className='px-3 py-1 bg-blue-700 text-white rounded hover:bg-blue-800 transition'
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
              punto.lat + "," + punto.lng
            )}`}
            target='_blank'
            rel='noreferrer'
          >
            Cómo llegar
          </a>
        )}
      </div>
    </div>
  );
}
