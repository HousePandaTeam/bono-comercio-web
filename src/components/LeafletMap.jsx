// LeafletMap.jsx
import React, { useEffect, useState } from "react";

const CUSTOM_COLORS = {
  Carnicería: "#D32F2F",
  Frutería: "#388E3C",
  Pescadería: "#1976D2",
  "Horno y panadería": "#EF6C00",
  "Mercado municipal": "#6D4C41",
  Óptica: "#7B1FA2",
  Peluquería: "#EC407A",
  Calzado: "#5C6BC0",
  Perfumería: "#8D6E63",
  "Hogar y decoración": "#455A64",
  Librerías: "#0097A7",
  Jugueterías: "#FBC02D",
  "Tienda mascotas": "#00796B",
  Otros: "#9E9E9E",
};

const colorForCategory = (name = "") => CUSTOM_COLORS[name] || "#9E9E9E";

export default function LeafletMap({
  points = [],
  onSelect,
  selected,
  onClear,
  loading,
}) {
  const [Lmod, setLmod] = useState(null);
  const [mapEl, setMapEl] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (mounted) setLmod(L);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!Lmod || !mapEl) return;
    mapEl.innerHTML = "";
    const L = Lmod.default || Lmod;
    const map = L.map(mapEl, { zoomControl: true, scrollWheelZoom: false });

    const tileUrl =
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
    L.tileLayer(tileUrl, {
      attribution:
        "&copy; OpenStreetMap contributors &copy; CARTO | Tiles: CartoDB Positron",
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    const makeIcon = (catName) => {
      const color = colorForCategory(catName);
      const html = `
    <div style="
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: ${color};
      border: 2px solid white;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.35);
    "></div>`;
      return L.divIcon({
        className: "",
        html,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
    };

    const group = L.featureGroup();
    points.forEach((p) => {
      if (typeof p.lat !== "number" || typeof p.lng !== "number") return;
      const catForColor = p.customCategoria || p.categoria;
      const marker = L.marker([p.lat, p.lng], { icon: makeIcon(catForColor) });
      marker
        .addTo(group)
        .bindPopup(
          `<strong>${p.nombre || ""}</strong><br/>${p.direccion || ""}${
            p.customCategoria ? `<br/><em>${p.customCategoria}</em>` : ""
          }`
        );
      marker.on("click", () => onSelect && onSelect(p));
    });
    group.addTo(map);

    if (
      points.length === 1 &&
      points[0] &&
      typeof points[0].lat === "number" &&
      typeof points[0].lng === "number"
    ) {
      map.setView([points[0].lat, points[0].lng], 16);
      const singleMarker = group.getLayers()[0];
      singleMarker?.openPopup();
      singleMarker?.on("popupclose", () => onClear && onClear());
    } else {
      map.setView([39.4699, -0.3763], 12);
    }

    return () => {
      map.remove();
    };
  }, [Lmod, mapEl, JSON.stringify(points)]);

  return (
    <div className='w-full'>
      <div className='flex items-center justify-between mb-2'>
        <div className='text-sm text-gray-600'>
          Puntos:{" "}
          {
            points.filter(
              (p) => typeof p.lat === "number" && typeof p.lng === "number"
            ).length
          }
          {selected ? " (filtrado)" : ""}
        </div>
        {selected && (
          <button
            className='px-3 py-1.5 text-sm border rounded'
            onClick={onClear}
          >
            Limpiar selección
          </button>
        )}
      </div>

      <div className='mb-2 overflow-x-auto'>
        <div className='flex items-center gap-3 text-xs text-gray-700 min-w-max'>
          {Object.entries(CUSTOM_COLORS).map(([label, color]) => (
            <div key={`${color}-${label}`} className='flex items-center gap-1'>
              <span
                aria-hidden
                style={{
                  background: color,
                  width: 10,
                  height: 10,
                  borderRadius: 9999,
                  display: "inline-block",
                  boxShadow: "0 0 0 1px rgba(0,0,0,0.25)",
                }}
              />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className='relative'>
        <div className='w-full h-[60vh] border rounded' ref={setMapEl} />
        {loading && (
          <div className='absolute inset-0 z-[10000] bg-white/60 backdrop-blur-[1px] flex items-center justify-center'>
            <div className='flex flex-col items-center gap-3'>
              <div
                className='h-10 w-10 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin'
                aria-hidden
              />
              <div className='text-gray-700 text-sm'>Cargando…</div>
            </div>
          </div>
        )}
      </div>

      <ul className='mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2'>
        {points.map((c, idx) => (
          <li
            key={`${c.maps_url || c.nombre}-${idx}`}
            className='text-sm bg-white p-2 rounded border cursor-pointer'
            onClick={() => onSelect && onSelect(c)}
          >
            <div className='font-semibold'>{c.nombre || "Sin nombre"}</div>
            {c.direccion && <div className='text-gray-600'>{c.direccion}</div>}
            {c.customCategoria && (
              <div className='mt-1'>
                <span className='inline-block text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded'>
                  {c.customCategoria}
                </span>
              </div>
            )}
            <div className='flex gap-2 mt-1'>
              {c.maps_url && (
                <a
                  className='text-blue-700 hover:underline'
                  href={c.maps_url}
                  target='_blank'
                  rel='noreferrer'
                >
                  Abrir en Maps
                </a>
              )}
              {typeof c.lat === "number" && typeof c.lng === "number" && (
                <a
                  className='text-blue-700 hover:underline'
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                    c.lat + "," + c.lng
                  )}`}
                  target='_blank'
                  rel='noreferrer'
                >
                  Cómo llegar
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
