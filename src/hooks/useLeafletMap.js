import { useEffect, useState } from "react";

export default function useLeafletMap(points, onSelect, onClear, selected) {
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
        "© OpenStreetMap contributors © CARTO | Tiles: CartoDB Positron",
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    const group = L.featureGroup();
    points.forEach((p) => {
      if (
        typeof p.lat === "number" &&
        typeof p.lng === "number" &&
        !isNaN(p.lat) &&
        !isNaN(p.lng)
      ) {
        const m = L.marker([p.lat, p.lng]);
        m.addTo(group).bindPopup(
          `<strong>${p.nombre || ""}</strong><br/>${p.direccion || ""}`
        );
        m.on("click", () => onSelect && onSelect(p));
      }
    });
    group.addTo(map);

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 16);
      const singleMarker = group.getLayers()[0];
      singleMarker?.openPopup();
      singleMarker?.on("popupclose", () => onClear && onClear());
    } else {
      map.setView([39.4699, -0.3763], 12);
    }
    return () => map.remove();
  }, [Lmod, mapEl, points]);

  return { mapEl, setMapEl };
}
