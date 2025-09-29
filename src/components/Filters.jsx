import { useState } from "react";
import { Map, List } from "lucide-react";

export default function Filters({
  view,
  setView,
  categoria,
  setCategoria,
  customCat,
  setCustomCat,
  allCats,
  q,
  setQ,
}) {
  const [useCustom, setUseCustom] = useState(false);

  return (
    <div className='flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4'>
      <h1 className='text-2xl font-bold flex-1'>Comercios adheridos</h1>

      <div className='flex items-center gap-2'>
        <button
          onClick={() => setView("list")}
          className={`p-2 rounded border ${
            view === "list"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-700 border-gray-300"
          }`}
        >
          <List size={18} />
        </button>
        <button
          onClick={() => setView("map")}
          className={`p-2 rounded border ${
            view === "map"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-700 border-gray-300"
          }`}
        >
          <Map size={18} />
        </button>
      </div>

      <div className='flex gap-2'>
        <label className='flex items-center gap-1 text-sm'>
          <input
            type='checkbox'
            checked={useCustom}
            onChange={() => setUseCustom((v) => !v)}
          />
          Usar filtros personalizados
        </label>
      </div>

      {!useCustom ? (
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className='px-3 py-2 border border-gray-300 rounded bg-white'
        >
          <option value=''>Todas las categorías</option>
          {(allCats.length ? allCats : []).map((name, i) => (
            <option key={`${name}-${i}`} value={name}>
              {name}
            </option>
          ))}
        </select>
      ) : (
        <select
          value={customCat}
          onChange={(e) => setCustomCat(e.target.value)}
          className='px-3 py-2 border border-gray-300 rounded bg-white'
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
      )}

      <input
        type='search'
        placeholder='Buscar por nombre o dirección...'
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className='w-full sm:w-96 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500'
      />
    </div>
  );
}
