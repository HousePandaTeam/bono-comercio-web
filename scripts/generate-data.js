import axios from "axios";
import { load as loadHtml } from "cheerio";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";

const SOURCE_URL = "https://bonocomerciovlc.com/comercios-adheridos";
const ORIGIN = "https://bonocomerciovlc.com";

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
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 30000,
    });
    
    const rawData = parseComercios(html);
    const dataWithCustomCats = addCustomCategories(rawData);
    
    const allCustomCats = new Set();
    dataWithCustomCats.forEach(cat => 
      cat.comercios.forEach(c => allCustomCats.add(c.customCategoria))
    );
    
    const finalData = {
      meta: {
        lastUpdated: Date.now(),
        totalComercios: dataWithCustomCats.reduce((sum, cat) => sum + cat.comercios.length, 0),
        generatedAt: new Date().toISOString(),
      },
      categorias: Array.from(allCustomCats).sort(),
      data: dataWithCustomCats,
    };
    
    return finalData;
    
  } catch (error) {
    throw error;
  }
}

async function main() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const outputPath = resolve(__dirname, "../web/public/bono.json");
  
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
