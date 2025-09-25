import React, { useEffect, useMemo, useState } from "react";

const isMobile = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  return /android|iphone|ipad|ipod/i.test(ua);
};

function getMapsUrl(comercio) {
  if (comercio?.maps_url) return comercio.maps_url;
  if (comercio?.direccion) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      comercio.direccion
    )}`;
  }
  return null;
}

function getDirectionsDeepLink(direccion) {
  if (!direccion) return null;
  const ua =
    typeof navigator !== "undefined" && navigator.userAgent
      ? navigator.userAgent.toLowerCase()
      : "";
  const q = encodeURIComponent(direccion);
  if (/iphone|ipad|ipod/.test(ua)) {
    // iOS maps deep link (Apple Maps also handles maps://)
    return `maps://?q=${q}`;
  }
  if (/android/.test(ua)) {
    // Android geo deep link
    return `geo:0,0?q=${q}`;
  }
  // Fallback to Google Maps web
  return `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}

// --- Local cache helpers (coords per URL and data snapshots) ---
const LS_KEYS = {
  coords: "bc.coords.v1",
  snapshot: (sig) => `bc.snapshot.v1:${sig}`,
};
const lsRead = (k, fallback = null) => {
  try {
    const s = localStorage.getItem(k);
    return s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
};
const lsWrite = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};
const buildSignature = ({ view, categoria, customCat }) =>
  `v1|view=${view || ""}|cat=${categoria || ""}|custom=${customCat || ""}`;
const applyCoordsFromCache = (data, coordsMap) => {
  if (!Array.isArray(data) || !coordsMap) return data;
  return data.map((cat) => ({
    categoria: cat.categoria,
    comercios: (cat.comercios || []).map((c) => {
      const cc = c && c.maps_url ? coordsMap[c.maps_url] : null;
      if (cc && typeof cc.lat === "number" && typeof cc.lng === "number") {
        return { ...c, lat: cc.lat, lng: cc.lng };
      }
      return c;
    }),
  }));
};
const updateCoordsCacheFromData = (data) => {
  const coords = lsRead(LS_KEYS.coords, {});
  data.forEach((cat) =>
    (cat.comercios || []).forEach((c) => {
      if (
        c.maps_url &&
        typeof c.lat === "number" &&
        typeof c.lng === "number"
      ) {
        coords[c.maps_url] = { lat: c.lat, lng: c.lng, ts: Date.now() };
      }
    })
  );
  lsWrite(LS_KEYS.coords, coords);
};

function CommerceItem({ comercio }) {
  const mapsUrl = getMapsUrl(comercio);
  const directionsUrl = getDirectionsDeepLink(comercio.direccion);
  return (
    <div className='p-3 bg-white rounded-lg shadow-sm border border-gray-100'>
      <div className='font-semibold'>
        {comercio.web ? (
          <a
            href={comercio.web}
            target='_blank'
            rel='noreferrer'
            className='text-blue-700 hover:underline'
          >
            {comercio.nombre || "Sin nombre"}
          </a>
        ) : (
          <span>{comercio.nombre || "Sin nombre"}</span>
        )}
      </div>
      {comercio.direccion && (
        <div className='text-sm text-gray-600 mt-0.5 break-words'>
          {comercio.direccion}
        </div>
      )}
      {comercio.customCategoria && (
        <div className='mt-1'>
          <span className='inline-block text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded'>
            {comercio.customCategoria}
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
            Ver en Google Maps
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

function CategoryAccordion({ categoria, comercios, defaultOpen = false }) {
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
              <CommerceItem key={`${c.nombre}-${idx}`} comercio={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [view, setView] = useState("map"); // default to map
  const [categoria, setCategoria] = useState("");
  const [customCat, setCustomCat] = useState("");
  const [geoInfo, setGeoInfo] = useState({ queued: 0, cacheSize: 0 });
  const [reloadTick, setReloadTick] = useState(0);
  const [allCats, setAllCats] = useState([]);
  const [hasPrefill, setHasPrefill] = useState(false);

  // Fetch stable categories list from static data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/bono.json");
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        if (!cancelled && Array.isArray(data.categorias))
          setAllCats(data.categorias);
      } catch {
        // fallback silently; selector will use current data categories
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setHasPrefill(false);
        // Pre-fill with cached snapshot (fast UI) and coords cache
        const sig = buildSignature({ view, categoria, customCat });
        const cachedCoords = lsRead(LS_KEYS.coords, {});
        const cachedSnap = lsRead(LS_KEYS.snapshot(sig), null);
        if (cachedSnap) {
          const snap = Array.isArray(cachedSnap.data) ? cachedSnap.data : [];
          const snapWithCoords = applyCoordsFromCache(snap, cachedCoords);
          if (!cancelled) {
            setData(snapWithCoords);
            setHasPrefill(true);
          }
        }

        // Load static data from bono.json
        const res = await fetch("/bono.json");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        if (!cancelled) {
          // No geo info for static data
          setGeoInfo({
            queued: 0,
            cacheSize: 0,
          });

          // Get the data array and filter by selected criteria
          let filteredData = Array.isArray(json.data) ? json.data : [];

          // Filter by categoria if selected
          if (categoria) {
            filteredData = filteredData.filter(
              (cat) => cat.categoria === categoria
            );
          }

          // Filter by custom category if selected
          if (customCat) {
            filteredData = filteredData
              .map((cat) => ({
                categoria: cat.categoria,
                comercios: cat.comercios.filter(
                  (c) => c.customCategoria === customCat
                ),
              }))
              .filter((cat) => cat.comercios.length > 0);
          }

          setData(filteredData);
          // Update local caches
          updateCoordsCacheFromData(filteredData);
          lsWrite(
            LS_KEYS.snapshot(buildSignature({ view, categoria, customCat })),
            { ts: Date.now(), data: filteredData }
          );
        }
      } catch (e) {
        if (!cancelled)
          setError(
            "Error al cargar los datos. Verifica tu conexión a internet."
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [view, categoria, customCat, reloadTick]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data;
    return data
      .map((cat) => ({
        categoria: cat.categoria,
        comercios: (cat.comercios || []).filter(
          (c) =>
            (c.nombre || "").toLowerCase().includes(term) ||
            (c.direccion || "").toLowerCase().includes(term)
        ),
      }))
      .filter((cat) => cat.comercios.length > 0);
  }, [q, data]);

  const initialOpenAll = !isMobile();

  return (
    <div className='max-w-8xl mx-auto px-3 sm:px-6 py-4'>
      <header className='flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4'>
        <h1 className='text-2xl font-bold flex-1'>Comercios adheridos</h1>
        <div className='flex flex-wrap items-center gap-2'>
          <button
            className={`px-3 py-2 text-sm rounded border ${
              view === "list"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300"
            }`}
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
          >
            Listado
          </button>
          <button
            className={`px-3 py-2 text-sm rounded border ${
              view === "map"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300"
            }`}
            onClick={() => setView("map")}
            aria-pressed={view === "map"}
          >
            Mapa
          </button>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className='px-3 py-2 border border-gray-300 rounded bg-white w-full sm:w-auto'
          >
            <option value=''>Todas las categorías</option>
            {(allCats.length ? allCats : data.map((c) => c.categoria)).map(
              (name, i) => (
                <option key={`${name}-${i}`} value={name}>
                  {name}
                </option>
              )
            )}
          </select>
          <select
            value={customCat}
            onChange={(e) => setCustomCat(e.target.value)}
            className='px-3 py-2 border border-gray-300 rounded bg-white w-full sm:w-auto'
          >
            <option value=''>Categorías personalizadas</option>
            <option value='Carnicería'>Carnicería</option>
            <option value='Frutería'>Frutería</option>
            <option value='Pescadería'>Pescadería</option>
            <option value='Horno y panadería'>Horno y panadería</option>
            <option value='Mercado municipal'>Mercado municipal</option>
            <option value='Óptica'>Óptica</option>
            <option value='Peluquería'>Peluquería</option>
            <option value='Calzado'>Calzado</option>
            <option value='Perfumería'>Perfumería</option>
            <option value='Hogar y decoración'>Hogar y decoración</option>
            <option value='Librerías'>Librerías</option>
            <option value='Jugueterías'>Jugueterías</option>
            <option value='Tienda mascotas'>Tienda mascotas</option>
            <option value='Otros'>Otros</option>
          </select>
        </div>
        <input
          type='search'
          placeholder='Buscar por nombre o dirección...'
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className='w-full sm:w-96 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
        />
      </header>

      {/* Loading state: we'll show an overlay on top of the map instead of inline text */}
      {error && <div className='text-red-600 mb-3'>{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className='text-gray-600'>No se encontraron resultados.</div>
      )}

      {view === "list" ? (
        <div className='space-y-3'>
          {filtered.map((cat, i) => (
            <CategoryAccordion
              key={`${cat.categoria}-${i}`}
              categoria={cat.categoria}
              comercios={cat.comercios}
              defaultOpen={initialOpenAll}
            />
          ))}
        </div>
      ) : (
        <MapView
          data={filtered}
          categoria={categoria}
          geoInfo={geoInfo}
          loading={!!loading && !error && !hasPrefill}
          onRetry={() => setReloadTick((t) => t + 1)}
        />
      )}
    </div>
  );
}

function MapView({ data, categoria, geoInfo, onRetry, loading }) {
  // flatten commerces that have coords
  const allPoints = [];
  data.forEach((cat) => {
    (cat.comercios || []).forEach((c) => {
      if (typeof c.lat === "number" && typeof c.lng === "number") {
        allPoints.push({ ...c, categoria: cat.categoria });
      }
    });
  });
  const totalShops = data.reduce(
    (acc, cat) => acc + (cat.comercios?.length || 0),
    0
  );

  const [selected, setSelected] = useState(null); // one commerce or null
  const points = selected ? [selected] : allPoints;

  // Reset selection when category changes or data set refreshes
  useEffect(() => {
    setSelected(null);
  }, [
    categoria,
    JSON.stringify(allPoints.map((p) => [p.nombre, p.direccion, p.lat, p.lng])),
  ]);

  if (points.length === 0) {
    return (
      <div className='w-full'>
        <div className='p-4 border rounded bg-white text-gray-700'>
          <div className='flex items-start gap-3'>
            <div className='mt-1 h-3 w-3 rounded-full bg-yellow-400 animate-pulse' />
            <div>
              <div className='font-semibold'>Obteniendo coordenadas…</div>
              <div className='text-sm text-gray-600 mt-1'>
                {totalShops > 0
                  ? `Estamos localizando ${totalShops} comercio(s) en el mapa. Esto puede tardar unos segundos.`
                  : "No hay comercios para esta selección."}
              </div>
              {(geoInfo?.queued ?? 0) > 0 && (
                <div className='text-xs text-gray-500 mt-1'>
                  Pendientes: {geoInfo.queued} · Cache: {geoInfo.cacheSize}
                </div>
              )}
              <div className='mt-3 flex gap-2'>
                <button
                  className='px-3 py-1.5 text-sm border rounded'
                  onClick={() => onRetry && onRetry()}
                >
                  Reintentar
                </button>
                <a
                  className='px-3 py-1.5 text-sm border rounded text-blue-700'
                  href='#'
                  onClick={(e) => {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Ir arriba
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LeafletMap
      points={points}
      onSelect={setSelected}
      selected={!!selected}
      onClear={() => setSelected(null)}
      loading={loading}
    />
  );
}

function LeafletMap({ points, onSelect, selected, onClear, loading }) {
  // Lazy load Leaflet only when map view is used
  const [Lmod, setLmod] = useState(null);
  const [mapEl, setMapEl] = useState(null);
  // Fixed palette for custom categories
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
    // clear container
    mapEl.innerHTML = "";
    const L = Lmod.default || Lmod;
    const map = L.map(mapEl, { zoomControl: true, scrollWheelZoom: false });
    // Lightweight basemap (Carto Positron)
    const tileUrl =
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
    L.tileLayer(tileUrl, {
      attribution:
        "&copy; OpenStreetMap contributors &copy; CARTO | Tiles: CartoDB Positron",
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    // colorForCategory provided at component scope

    const makeIcon = (catName) => {
      const color = colorForCategory(catName);
      // Simple round dot with color and subtle ring
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
      const catForColor = p.customCategoria || p.categoria;
      const m = L.marker([p.lat, p.lng], { icon: makeIcon(catForColor) });
      m.addTo(group).bindPopup(
        `<strong>${p.nombre || ""}</strong><br/>${p.direccion || ""}${
          p.customCategoria ? `<br/><em>${p.customCategoria}</em>` : ""
        }`
      );
      m.on("click", () => onSelect && onSelect(p));
      // Note: we don't clear selection on marker popupclose here to avoid race conditions
    });
    group.addTo(map);
    // Remove global popupclose clear to avoid instant reset
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 16);
      const singleMarker = group.getLayers()[0];
      singleMarker?.openPopup();
      // When closing the popup in single-point mode, clear selection
      singleMarker?.on("popupclose", () => onClear && onClear());
    } else {
      // Default view: Valencia
      const VALENCIA = [39.4699, -0.3763];
      map.setView(VALENCIA, 12);
    }
    return () => {
      map.remove();
    };
  }, [Lmod, mapEl, points]);

  return (
    <div className='w-full'>
      <div className='flex items-center justify-between mb-2'>
        <div className='text-sm text-gray-600'>
          Puntos: {points.length}
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
      {/* Legend */}
      <div className='mb-2 overflow-x-auto'>
        <div className='flex items-center gap-3 text-xs text-gray-700 min-w-max'>
          {Object.entries(CUSTOM_COLORS).map(([label, color]) => (
            <div key={label} className='flex items-center gap-1'>
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
            key={`${c.nombre}-${idx}`}
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
