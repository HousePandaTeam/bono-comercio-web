import { useState, useEffect, useMemo } from "react";
import Filters from "./components/Filters";
import Listado from "./components/Listado";
import LeafletMap from "./components/LeafletMap";

export default function App() {
  const [data, setData] = useState([]);
  const [categoria, setCategoria] = useState("");
  const [customCat, setCustomCat] = useState("");
  const [allCats, setAllCats] = useState([]);
  const [q, setQ] = useState("");
  const [view, setView] = useState("map");

  useEffect(() => {
    (async () => {
      const res = await fetch("./bono.json");
      const json = await res.json();
      setData(json.data);
      setAllCats(json.categorias);
    })();
  }, []);

  const filtered = useMemo(() => {
    let result = data;
    const term = q.trim().toLowerCase();

    // Filtrar por categoría original si está seleccionada
    if (categoria) {
      result = result
        .map((cat) => ({
          categoria: cat.categoria,
          comercios: (cat.comercios || []).filter(
            (c) => c.categoriaOriginal === categoria
          ),
        }))
        .filter((cat) => cat.comercios.length > 0);
    }

    // Filtrar por categoría personalizada si está seleccionada
    if (customCat) {
      result = result
        .map((cat) => ({
          categoria: cat.categoria,
          comercios: (cat.comercios || []).filter(
            (c) => c.customCategoria === customCat
          ),
        }))
        .filter((cat) => cat.comercios.length > 0);
    }

    // Filtrar por búsqueda de texto
    if (term) {
      result = result
        .map((cat) => ({
          categoria: cat.categoria,
          comercios: (cat.comercios || []).filter(
            (c) =>
              (c.nombre || "").toLowerCase().includes(term) ||
              (c.direccion || "").toLowerCase().includes(term)
          ),
        }))
        .filter((cat) => cat.comercios.length > 0);
    }

    return result;
  }, [q, data, categoria, customCat]);

  const initialOpenAll = true;

  return (
    <div className='max-w-8xl mx-auto px-3 sm:px-6 py-4'>
      <Filters
        view={view}
        setView={setView}
        categoria={categoria}
        setCategoria={setCategoria}
        customCat={customCat}
        setCustomCat={setCustomCat}
        allCats={allCats}
        q={q}
        setQ={setQ}
      />

      {view === "list" ? (
        <Listado data={filtered} initialOpenAll={initialOpenAll} />
      ) : (
        <>
          <LeafletMap points={filtered.flatMap((c) => c.comercios)} />
          <Listado data={filtered} initialOpenAll={false} />
        </>
      )}
    </div>
  );
}
