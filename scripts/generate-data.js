import axios from "axios";
import { load as loadHtml } from "cheerio";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";

// Configure axios for maximum performance
axios.defaults.timeout = 5000;
axios.defaults.maxRedirects = 2;
axios.defaults.maxContentLength = 1024 * 1024; // 1MB limit
axios.defaults.headers.common["User-Agent"] =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
axios.defaults.headers.common["Accept"] =
  "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
axios.defaults.headers.common["Accept-Language"] = "es-ES,es;q=0.9,en;q=0.8";
axios.defaults.headers.common["Connection"] = "keep-alive";

const SOURCE_URL = "https://bonocomerciovlc.com/comercios-adheridos";
const ORIGIN = "https://bonocomerciovlc.com";

// Simple cache for coordinates to avoid duplicate requests
const coordsCache = new Map();

function parseComercios(html) {
  const $ = loadHtml(html);
  const result = [];

  const absolutize = (href) => {
    if (!href) return null;
    try {
      if (href.startsWith("http://") || href.startsWith("https://"))
        return href;
      if (href.startsWith("//")) return "https:" + href;
      if (href.startsWith("/")) return new URL(href, ORIGIN).toString();
      return new URL("/" + href, ORIGIN).toString();
    } catch {
      return href;
    }
  };

  $(".vc_tta-panel").each((_, panel) => {
    const $panel = $(panel);
    const categoria =
      $panel.find(".vc_tta-title-text").first().text().trim() ||
      $panel.attr("id") ||
      "Sin categoría";

    const comercios = [];

    $panel.find(".vc_tta-panel-body table tr").each((__, tr) => {
      const $tr = $(tr);
      const tds = $tr.find("td");
      if (tds.length < 3) return;

      const $tdNombre = $(tds[0]);
      const $aNombre = $tdNombre.find("a").first();
      let nombre = $aNombre.text().trim();
      if (!nombre) {
        nombre = $tdNombre.text().trim();
      }
      const web = absolutize($aNombre.attr("href"));

      const $img = $tdNombre.find("img").first();
      let logo = absolutize($img.attr("src"));

      const direccion = $(tds[1]).text().replace(/\s+/g, " ").trim();

      const $aMaps = $(tds[2]).find("a").first();
      let maps_url = absolutize($aMaps.attr("href"));

      if (!nombre && !direccion && !maps_url) return;

      comercios.push({ nombre, web, direccion, maps_url, logo });
    });

    if (comercios.length) {
      result.push({ categoria, comercios });
    }
  });

  return result;
}

function unescapeUnicode(str) {
  if (!str) return str;
  return str
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) =>
      String.fromCharCode(parseInt(code, 16))
    )
    .replace(/\\\//g, "/")
    .replace(/\\"/g, '"');
}

function extractCoordsFromHtml(html, debugName = "") {
  if (!html) return null;

  const text = unescapeUnicode(html);

  // Try to find !3dLAT!4dLNG pattern (common in Google data blobs)
  const bangMatch = text.match(/!3d([\-0-9\.]+)!4d([\-0-9\.]+)/);
  if (bangMatch) {
    const lat = parseFloat(bangMatch[1]);
    const lng = parseFloat(bangMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      if (debugName) console.log(`🎯 Bang pattern found: ${lat}, ${lng}`);
      return { lat, lng };
    }
  }

  // Try to find /@lat,lng pattern first
  const atMatch = text.match(/\/@([\-0-9\.]+),([\-0-9\.]+)[,\/]/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      if (debugName) console.log(`🎯 @ pattern found: ${lat}, ${lng}`);
      return { lat, lng };
    }
  }

  // Try ll=lat,lng query param
  const llMatch = text.match(/[?&]ll=([\-0-9\.]+),([\-0-9\.]+)/);
  if (llMatch) {
    const lat = parseFloat(llMatch[1]);
    const lng = parseFloat(llMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      if (debugName) console.log(`🎯 ll param found: ${lat}, ${lng}`);
      return { lat, lng };
    }
  }

  // Fallback: q=lat,lng query param
  const qMatch = text.match(/[?&]q=([\-0-9\.]+),([\-0-9\.]+)/);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      if (debugName) console.log(`🎯 q param found: ${lat}, ${lng}`);
      return { lat, lng };
    }
  }

  if (debugName)
    console.log(`❌ No coords found in text: ${text.substring(0, 200)}...`);
  return null;
}

async function getGoogleMapsCoords(mapsUrl, debug = false) {
  if (!mapsUrl) return null;

  // Check cache first
  if (coordsCache.has(mapsUrl)) {
    const cached = coordsCache.get(mapsUrl);
    if (debug)
      console.log(
        `� Cache hit: ${cached ? `${cached.lat}, ${cached.lng}` : "null"}`
      );
    return cached;
  }

  if (debug) console.log(`�🔍 Processing: ${mapsUrl}`);

  try {
    // Extract the search query from the Google Maps search URL
    const urlObj = new URL(mapsUrl);
    const query = urlObj.searchParams.get("q");

    if (!query) {
      if (debug) console.log(`❌ No search query found in URL`);
      coordsCache.set(mapsUrl, null);
      return null;
    }

    // Add Valencia context to improve geocoding accuracy
    const valenciaQuery = query.includes("Valencia")
      ? query
      : `${query}, Valencia, España`;

    // Use Valencia coordinates as center for better results (39.4699, -0.3763)
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(
      valenciaQuery
    )}/@39.4699,-0.3763,12z`;

    const { data: html } = await axios.get(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      },
      timeout: 7000, // Reduced timeout
      maxRedirects: 3, // Fewer redirects
      validateStatus: (s) => s >= 200 && s < 400,
    });

    // Extract coordinates from the search results page
    const coords = extractCoordsFromHtml(html, debug ? "SEARCH" : "");

    // Validate coordinates are in Valencia area (rough bounds)
    if (coords) {
      const { lat, lng } = coords;
      const inValencia =
        lat >= 39.3 && lat <= 39.6 && lng >= -0.5 && lng <= -0.2;

      if (inValencia) {
        if (debug)
          console.log(`🌐 Valencia coords: ${lat}, ${lng} for "${query}"`);
        coordsCache.set(mapsUrl, coords);
        return coords;
      } else {
        if (debug)
          console.log(
            `⚠️  Coords outside Valencia: ${lat}, ${lng} for "${query}"`
          );
        coordsCache.set(mapsUrl, null);
        return null; // Don't use coordinates outside Valencia
      }
    }

    if (debug) console.log(`❌ No coords found for query: "${query}"`);
    coordsCache.set(mapsUrl, null);
    return null;
  } catch (error) {
    if (debug) console.log(`🚫 HTTP error for search: ${error.message}`);
    coordsCache.set(mapsUrl, null);
    return null;
  }
}

function classifyCustom(nombre = "", web = "") {
  const text = (nombre + " " + web).toLowerCase();
  const hay = (terms) => terms.some((t) => text.includes(t.toLowerCase()));

  if (
    hay([
      "bar",
      "cafe",
      "cafeteria",
      "restaurant",
      "cerveceria",
      "bistro",
      "gastrobar",
      "taberna",
      "sidreria",
      "hamburgues",
      "pizzeria",
      "heladeria",
      "gelato",
      "pasteleria",
      "chocolateria",
      "tapas",
      "comida para llevar",
      "food truck",
      "gastronomi",
    ])
  )
    return "Bares y restauración";

  if (
    hay([
      "ropa",
      "moda",
      "vestir",
      "boutique",
      "fashion",
      "confeccion",
      "sastreria",
      "complementos",
      "accesorios",
      "bolsos",
    ])
  )
    return "Moda y complementos";

  if (
    hay([
      "farmacia",
      "clinica",
      "medic",
      "fisio",
      "terapeut",
      "psicolog",
      "dentist",
      "orthodonc",
      "salud",
    ])
  )
    return "Salud";

  if (
    hay([
      "mercado central",
      "mercado de colon",
      "mercado ruzafa",
      "mercado de ruzafa",
      "mercat de russafa",
      "mercado de algiros",
      "mercat de ruzafa",
      "mercat del cabanyal",
      "mercat d'algirs",
      "mercat d'algiro",
    ])
  )
    return "Mercado municipal";

  if (
    hay([
      "carniceria",
      "carnes",
      "polleria",
      "pollos",
      "aves",
      "xarcuteria",
      "charcuteria",
    ])
  )
    return "Carnicería";
  if (hay(["fruteria", "frutas", "verduras", "verdura", "fruits i verdures"]))
    return "Frutería";
  if (
    hay([
      "pescaderia",
      "pescados",
      "mariscos",
      "clochinas",
      "peixcateria",
      "peixateria",
    ])
  )
    return "Pescadería";
  if (
    hay([
      "horno",
      "forn",
      "panaderia",
      "pasteleria",
      "dulces",
      "bombones",
      "chocolates",
      "bomboneria",
      "chocolateria",
    ])
  )
    return "Horno y panadería";
  if (hay(["optica", "opticos", "gafas", "auditivo", "audiologia"]))
    return "Óptica";
  if (
    hay([
      "peluqueria",
      "perruquers",
      "estilistas",
      "salon",
      "estetica",
      "belleza",
    ])
  )
    return "Peluquería";
  if (hay(["calzado", "zapatos", "zapatilla", "sabates", "zapateria"]))
    return "Calzado";
  if (hay(["perfumeria", "perfumes", "cosmeticos", "cosmetica"]))
    return "Perfumería";
  if (
    hay(["hogar", "decoracion", "muebles", "colchones", "descanso", "textil"])
  )
    return "Hogar y decoración";
  if (hay(["libreria", "libros", "comics", "papeleria"])) return "Librerías";
  if (hay(["juguetes", "jugueteria", "figuras", "modelismo"]))
    return "Jugueterías";
  if (hay(["mascotas", "veterinario", "veterinaria", "piensos", "zoo"]))
    return "Tienda mascotas";
  return "Otros";
}

function addCustomCategories(data) {
  return data.map((cat) => ({
    categoria: cat.categoria,
    comercios: cat.comercios.map((c) => ({
      ...c,
      customCategoria: classifyCustom(c.nombre, c.web),
    })),
  }));
}

async function generateBonoData() {
  try {
    const { data: html } = await axios.get(SOURCE_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 30000,
    });

    const rawData = parseComercios(html);
    const dataWithCustomCats = addCustomCategories(rawData);

    // Add coordinates for commerces with maps_url (maximum parallel processing)
    console.log("🚀 Iniciando obtención de coordenadas...");

    // Collect all commerces that need coordinates
    const allComercios = [];
    const commerceIndex = new Map(); // Maps originalIndex to { categoria, comercioIndex }

    dataWithCustomCats.forEach((cat, catIndex) => {
      cat.comercios.forEach((comercio, comIndex) => {
        const originalIndex = allComercios.length;
        commerceIndex.set(originalIndex, { catIndex, comIndex });
        allComercios.push({ ...comercio, originalIndex });
      });
    });

    const comerciosWithMaps = allComercios.filter((c) => c.maps_url);
    console.log(
      `📍 Procesando ${comerciosWithMaps.length} comercios con mapas de ${allComercios.length} total`
    );

    // Debug: Show first few URLs
    console.log("🔍 Primeras URLs de muestra:");
    comerciosWithMaps.slice(0, 3).forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.nombre}: ${c.maps_url}`);
    });

    // Process coordinates in larger batches for speed
    const BATCH_SIZE = 150; // Larger batches for speed
    const BATCH_DELAY = 0; // Minimal delay between batches

    const startTime = Date.now();
    const allCoords = [];

    for (let i = 0; i < comerciosWithMaps.length; i += BATCH_SIZE) {
      const batch = comerciosWithMaps.slice(i, i + BATCH_SIZE);

      console.log(
        `⏳ Procesando lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
          comerciosWithMaps.length / BATCH_SIZE
        )} (${i}-${Math.min(
          i + BATCH_SIZE - 1,
          comerciosWithMaps.length - 1
        )})...`
      );

      const batchPromises = batch.map(async (comercio, batchIndex) => {
        try {
          const globalIndex = i + batchIndex;
          const isDebug = globalIndex < 3; // Only debug first 3
          const coords = await getGoogleMapsCoords(comercio.maps_url, isDebug);
          return { originalIndex: comercio.originalIndex, coords };
        } catch (error) {
          console.log(
            `❌ Error procesando ${comercio.nombre}: ${error.message}`
          );
          return { originalIndex: comercio.originalIndex, coords: null };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      allCoords.push(...batchResults);

      // Small delay between batches to be respectful to Google's servers
      if (i + BATCH_SIZE < comerciosWithMaps.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
      }
    }

    // All batches completed
    console.log("🔄 Completado el procesamiento por lotes...");

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    const successCount = allCoords.filter((c) => c.coords).length;
    console.log(
      `✅ Completado en ${elapsedTime}s. Coordenadas obtenidas: ${successCount}/${comerciosWithMaps.length}`
    );

    // Apply coordinates to the original data structure
    const dataWithCoords = dataWithCustomCats.map((cat) => ({
      ...cat,
      comercios: cat.comercios.map((comercio) => ({ ...comercio })),
    }));

    allCoords.forEach(({ originalIndex, coords }) => {
      if (coords) {
        const { catIndex, comIndex } = commerceIndex.get(originalIndex);
        dataWithCoords[catIndex].comercios[comIndex].lat = coords.lat;
        dataWithCoords[catIndex].comercios[comIndex].lng = coords.lng;
      }
    });

    const allCustomCats = new Set();
    dataWithCoords.forEach((cat) =>
      cat.comercios.forEach((c) => allCustomCats.add(c.customCategoria))
    );

    const finalData = {
      meta: {
        lastUpdated: Date.now(),
        totalComercios: dataWithCoords.reduce(
          (sum, cat) => sum + cat.comercios.length,
          0
        ),
        generatedAt: new Date().toISOString(),
      },
      categorias: Array.from(allCustomCats).sort(),
      data: dataWithCoords,
    };

    return finalData;
  } catch (error) {
    throw error;
  }
}

async function main() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const outputPath = resolve(__dirname, "../public/bono.json");

  try {
    const publicDir = dirname(outputPath);
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const data = await generateBonoData();
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  } catch (error) {
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateBonoData, parseComercios };
