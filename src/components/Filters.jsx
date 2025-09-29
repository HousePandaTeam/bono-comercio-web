import { useState } from "react";
import { Map, List, Settings, Home, Wallet } from "lucide-react";

export default function Filters({
  view,
  setView,
  categoria,
  setCategoria,
  customCat,
  setCustomCat,
  allCats,
  customCats,
  q,
  setQ,
}) {
  const [useCustom, setUseCustom] = useState(true);

  return (
    <div className='flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4'>
      <div className='flex items-center gap-2'>
        <a
          href='https://www.tutarjetaregalo.com/#/login'
          target='_blank'
          rel='noopener noreferrer'
          className='p-2 rounded border bg-white text-gray-700 border-gray-300 hover:bg-blue-50 flex items-center'
        >
          <Wallet size={22} />
        </a>
        <h1 className='text-2xl font-bold flex-1'>VLC - B.Comercio</h1>
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

      <div className='flex items-center gap-2'>
        <button
          type='button'
          className={`flex items-center px-2 py-1 rounded-full border transition-colors duration-200 ${
            useCustom
              ? "bg-blue-600 border-blue-600 text-white"
              : "bg-white border-gray-300 text-gray-700"
          }`}
          onClick={() => {
            setUseCustom((v) => {
              // Resetear filtros al cambiar el switch
              setCategoria("");
              setCustomCat("");
              setQ("");
              return !v;
            });
          }}
        >
          <Settings
            size={18}
            className={`mr-1 ${useCustom ? "opacity-100" : "opacity-40"}`}
          />
          <div className='w-8 h-5 flex items-center bg-gray-200 rounded-full mx-1 relative'>
            <div
              className={`w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 border ${
                useCustom
                  ? "translate-x-0 border-blue-600"
                  : "translate-x-4 border-gray-400"
              }`}
              style={{
                transform: useCustom ? "translateX(0)" : "translateX(16px)",
              }}
            />
          </div>
          <Home
            size={18}
            className={`ml-1 ${!useCustom ? "opacity-100" : "opacity-40"}`}
          />
        </button>
        <input
          type='search'
          placeholder='Buscar por nombre o dirección...'
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className='w-full sm:w-96 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500'
        />
      </div>

      {!useCustom ? (
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className='px-3 py-2 border border-gray-300 rounded bg-white'
        >
          <option value=''>Categorías por defecto</option>
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
          {(customCats && customCats.length ? customCats : []).map(
            (name, i) => (
              <option key={`${name}-${i}`} value={name}>
                {name}
              </option>
            )
          )}
        </select>
      )}
    </div>
  );
}
