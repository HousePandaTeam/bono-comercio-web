// CommerceItem.jsx
import React from "react";

const isMobile = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  return /android|iphone|ipad|ipod/i.test(ua);
};

export default function CommerceItem({ comercio }) {
  const { nombre, direccion, maps_url, lat, lng, customCategoria, web } =
    comercio || {};

  const mapsUrl =
    maps_url ||
    (typeof lat === "number" && typeof lng === "number"
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : direccion
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          direccion
        )}`
      : null);

  const directionsUrl =
    (typeof lat === "number" && typeof lng === "number"
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
          `${lat},${lng}`
        )}`
      : direccion
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
          direccion
        )}`
      : null) || null;

  return (
    <div className='p-3 bg-white rounded-lg shadow-sm border border-gray-100'>
      <div className='font-semibold'>
        {web ? (
          <a
            href={web}
            target='_blank'
            rel='noreferrer'
            className='text-blue-700 hover:underline'
          >
            {nombre || "Sin nombre"}
          </a>
        ) : (
          <span>{nombre || "Sin nombre"}</span>
        )}
      </div>

      {direccion && (
        <div className='text-sm text-gray-600 mt-0.5 break-words'>
          {direccion}
        </div>
      )}

      {customCategoria && (
        <div className='mt-1'>
          <span className='inline-block text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded'>
            {customCategoria}
          </span>
        </div>
      )}

      <div className='flex gap-2 mt-2 flex-wrap'>
        {mapsUrl && (
          <a
            className='px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700'
            href={mapsUrl}
            target='_blank'
            rel='noreferrer'
          >
            Ver en Maps
          </a>
        )}

        {directionsUrl && (
          <a
            className='px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700'
            href={directionsUrl}
            target={isMobile() ? "_self" : "_blank"}
            rel='noreferrer'
          >
            Cómo llegar
          </a>
        )}
      </div>
    </div>
  );
}
