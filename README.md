# Bono Comercio Web

Una aplicación web que muestra los comercios adheridos al bono comercio de Valencia. Los datos se obtienen automáticamente de la página oficial y se actualizan en cada despliegue.

## 🌐 Demo

La aplicación está desplegada en GitHub Pages: https://housepandateam.github.io/bono-comercio-web/

## ✨ Características

- **Datos actualizados**: Los comercios se obtienen automáticamente de la fuente oficial
- **Búsqueda y filtros**: Busca por nombre o dirección, filtra por categorías
- **Vista de mapa**: Visualiza los comercios en un mapa interactivo con Leaflet
- **Responsive**: Funciona en desktop y móvil
- **Categorización inteligente**: Los comercios se clasifican automáticamente en categorías útiles
- **Enlaces directos**: Acceso directo a webs y ubicaciones en Google Maps
- **PWA Ready**: Funciona como aplicación web progresiva

## 🛠 Tecnologías

- **Frontend**: React + Vite + Tailwind CSS
- **Mapa**: Leaflet
- **Scraping**: Cheerio + Axios
- **Despliegue**: GitHub Pages con GitHub Actions

## 🏗 Desarrollo

### Requisitos previos

- Node.js 18+
- pnpm

### Instalación

```bash
# Clonar el repositorio
git clone git@github.com-personal:HousePandaTeam/bono-comercio-web.git
cd bono-comercio-web

# Instalar dependencias
pnpm install
```

### Scripts disponibles

```bash
# Desarrollo local
pnpm dev                 # Inicia el servidor de desarrollo
pnpm dev:lan            # Servidor de desarrollo accesible desde la red local

# Generar datos
pnpm generate-data      # Obtiene los últimos datos de comercios

# Construcción
pnpm build              # Build para producción (incluye generación de datos)
pnpm build:github      # Build específico para GitHub Pages

# Vista previa
pnpm preview            # Vista previa del build
pnpm preview:lan       # Vista previa accesible desde la red local
```

### Estructura del proyecto

```
├── .github/workflows/     # GitHub Actions para despliegue automático
├── scripts/              # Scripts de utilidad
│   └── generate-data.js  # Obtiene datos de comercios
├── public/              # Archivos públicos (donde se genera bono.json)
├── src/                 # Código fuente React
├── index.html           # HTML principal
├── vite.config.js       # Configuración de Vite
├── tailwind.config.js   # Configuración de Tailwind
├── postcss.config.js    # Configuración de PostCSS
├── package.json         # Dependencias y scripts
└── README.md           # Este archivo
```

## 🚀 Despliegue

El despliegue es automático:

1. **Push a main**: Cada commit a la rama `main` dispara el workflow
2. **Generación de datos**: Se obtienen los últimos comercios automáticamente
3. **Build**: Se construye la aplicación con Vite
4. **Despliegue**: Se publica en GitHub Pages

### Configuración manual de GitHub Pages

Si necesitas configurar GitHub Pages manualmente:

1. Ve a Settings → Pages en tu repositorio
2. Selecciona "GitHub Actions" como source
3. El workflow se encargará del resto

## 📊 Datos

Los datos se obtienen de la página oficial del bono comercio de Valencia. El script:

1. Hace scraping de la página oficial
2. Parsea los comercios y sus categorías
3. Añade categorización inteligente adicional
4. Genera un archivo JSON estático
5. Se incluye en el build de la aplicación

## 🤝 Contribuir

1. Fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto es de código abierto y está disponible bajo la [Licencia MIT](LICENSE).

## 🙋‍♂️ Soporte

Si tienes preguntas o encuentras algún problema, por favor abre un [issue](https://github.com/HousePandaTeam/bono-comercio-web/issues).
