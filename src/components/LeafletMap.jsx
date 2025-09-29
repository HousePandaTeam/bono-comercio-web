// LeafletMap.jsx
import React, { useEffect, useState } from "react";
import LeafletMapTooltip from "./LeafletMapTooltip";

const CUSTOM_COLORS = {
  ALIMENTACIÓN: "#43A047",
  "Bares y restauración": "#FF7043",
  Bodegas: "#8D6E63",
  Calzado: "#5C6BC0",
  Carnicería: "#D32F2F",
  ELECTRODOMÉSTICOS: "#0288D1",
  Frutería: "#388E3C",
  "Hogar y decoración": "#455A64",
  "Horno y panadería": "#EF6C00",
  Jugueterías: "#FBC02D",
  Librerías: "#0097A7",
  "Mercado municipal": "#6D4C41",
  "Moda y complementos": "#AB47BC",
  Otros: "#9E9E9E",
  Peluquería: "#EC407A",
  Perfumería: "#8D6E63",
  Pescadería: "#1976D2",
  Salud: "#00897B",
  "Tienda ecológica": "#7CB342",
  "Tienda mascotas": "#00796B",
  Óptica: "#7B1FA2",
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
  const [bottomSheet, setBottomSheet] = useState(null); // punto seleccionado para el panel

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
      // Popup con botón "Ver más"
      const popupHtml = `
        <strong>${p.nombre || ""}</strong><br/>${p.direccion || ""}${
        p.customCategoria ? `<br/><em>${p.customCategoria}</em>` : ""
      }<br/>
        <button id="ver-mas-${p.lat}-${
        p.lng
      }" style="margin-top:6px;padding:4px 8px;background:#1976D2;color:white;border:none;border-radius:4px;cursor:pointer;">Ver más</button>
      `;
      marker.addTo(group).bindPopup(popupHtml);
      marker.on("click", () => {
        onSelect && onSelect(p);
        setTimeout(() => {
          const btn = document.getElementById(`ver-mas-${p.lat}-${p.lng}`);
          if (btn) {
            btn.onclick = (e) => {
              e.preventDefault();
              setBottomSheet(p);
            };
          }
        }, 300);
      });
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
        {/* Bottom Sheet Panel extraído a componente modal */}
        <LeafletMapTooltip
          punto={bottomSheet}
          onClose={() => setBottomSheet(null)}
        />
      </div>

      <ul className='mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2'>
        {points.map((c, idx) => (
          <li
            key={`${c.maps_url || c.nombre}-${idx}`}
            className='text-sm bg-white p-2 rounded border cursor-pointer'
            onClick={() => {
              onSelect && onSelect(c);
              setBottomSheet(c);
            }}
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
