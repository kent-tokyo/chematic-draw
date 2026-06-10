# chematic-draw（Versión en Español）

Editor de estructuras químicas multiplataforma. Construido con **Electron, React y WebAssembly**.

[![Pruebas](https://github.com/yourusername/chematic-draw/actions/workflows/test.yml/badge.svg)](https://github.com/yourusername/chematic-draw/actions/workflows/test.yml)
[![Compilación](https://github.com/yourusername/chematic-draw/actions/workflows/build.yml/badge.svg)](https://github.com/yourusername/chematic-draw/actions/workflows/build.yml)
[![Cobertura](https://codecov.io/gh/yourusername/chematic-draw/branch/main/graph/badge.svg)](https://codecov.io/gh/yourusername/chematic-draw)

[English](./README.md) | [日本語](./README.ja.md) | [中文](./README.zh.md) | Español

---

## Características Principales

### Funcionalidades Básicas
- **Editor de Estructuras 2D** — Interfaz de lienzo intuitiva para dibujar moléculas
- **Visualizador de Moléculas 3D** — Visualización 3D con rotación, zoom y exportación
- **Mecanismos de Reacción** — Visualización paso a paso de rutas de reacción
- **Predicción de Propiedades** — Peso molecular, LogP, ESOL, puntuación SA, Regla de Lipinski
- **Enumeración de Estereoisómeros** — Detección de centros quirales y generación de todos los estereoisómeros
- **Búsqueda en Base de Datos** — Búsqueda por similitud y detección de subestructura común máxima (MCS)
- **Procesamiento por Lotes** — Procesar múltiples moléculas de manera eficiente

### Funcionalidades Avanzadas
- **Motor WASM** — Cálculos químicos rápidos usando la librería chematic 0.1.40
- **Generación de Coordenadas 3D** — Geometría de distancia + minimización de campo de fuerza UFF
- **Huellas Dactilares Moleculares** — Generación ECFP4 y cálculo de similitud Tanimoto/Dice
- **Exportación de Archivos** — Formatos SVG, PNG, JSON, XYZ, CSV
- **Atajos de Teclado** — Operación compatible con ChemDraw
- **Modo Oscuro** — Soporte de tema claro/oscuro

---

## Instalación

### macOS
```bash
# Descargar archivo DMG
open chematic-draw-x.x.x.dmg
# O usar Homebrew
brew install chematic-draw
```

### Windows
```bash
# Descargar de la página de lanzamientos
chematic-draw-x.x.x.exe
# Ejecutar instalador
```

### Linux
```bash
# AppImage
./chematic-draw-x.x.x.AppImage

# O snap
sudo snap install chematic-draw
```

---

## Inicio Rápido

1. **Iniciar Aplicación** — Hacer clic en el icono
2. **Dibujar Molécula** — Hacer clic en el lienzo para colocar átomos, arrastrar para crear enlaces
3. **Cargar desde SMILES** — Archivo → Nuevo desde SMILES → Pegar estructura
4. **Ver 3D** — Hacer clic en la pestaña «3D» → Botón «3D 生成»
5. **Exportar** — Archivo → Elegir formato → Exportar

Consulte la [Guía de Inicio Rápido](./docs/QUICK_START.md) para más detalles.

---

## Pila Tecnológica

| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| **Escritorio** | Electron | 33.x |
| **UI** | React + TypeScript | 18.x |
| **Gestión de Estado** | Zustand | 4.x |
| **Canvas** | Canvas 2D API | Nativo |
| **Motor Químico** | chematic (Rust) | 0.1.40 |
| **WASM** | wasm-bindgen | Última |
| **Compilación** | Vite + wasm-pack | Última |
| **Pruebas** | Jest + Playwright | Última |

---

## Requisitos del Sistema

### Mínimos
- **OS**: macOS 11+, Windows 10+, Ubuntu 20.04+
- **RAM**: 4 GB
- **Disco**: 500 MB

### Desarrollo
- **Node.js**: 18+
- **Rust**: 1.70+
- **Git**: 2.30+

---

## Compilar desde Fuente

### Modo Desarrollo
```bash
# Clonar repositorio
git clone https://github.com/yourusername/chematic-draw.git
cd chematic-draw

# Instalar dependencias
npm install
rustup target add wasm32-unknown-unknown
cargo install wasm-pack

# Ejecutar con recarga en caliente
npm start
```

### Compilación para Producción
```bash
# Compilar para distribución
npm run make

# Salida en: out/make/
# - *.AppImage (Linux)
# - *.dmg (macOS)
# - *.exe (Windows)
```

Consulte la [Guía de Compilación](./docs/BUILD.md) para más detalles.

---

## Ejemplos de Uso

### Dibujar y Exportar Moléculas
```
1. Archivo → Nuevo desde SMILES
2. Pegar: CC(=O)Oc1ccccc1C(=O)O (aspirina)
3. Archivo → Exportar como → SVG
```

### Generar y Visualizar Estructura 3D
```
1. Cargar molécula
2. Hacer clic en pestaña «3D»
3. Hacer clic en botón «3D 生成»
4. Arrastrar para rotar, desplazarse para zoom
5. Hacer clic en «XYZ 导出» para guardar
```

### Verificar Similitud Farmacéutica
```
1. Cargar molécula
2. Hacer clic en pestaña «Props»
3. Revisar violaciones de Lipinski y puntuación SA
```

### Comparar Moléculas
```
1. Cargar molécula A
2. Hacer clic en pestaña «DB»
3. Hacer clic en «Search Database»
4. Hacer clic en molécula similar B
5. MCS resaltado en ambas estructuras
```

---

## Documentación

| Guía | Propósito | Tiempo de Lectura |
|------|-----------|-------------------|
| [Inicio Rápido](./docs/QUICK_START.md) | Comenzar en 5 minutos | 5 min |
| [Tutorial de Usuario](./docs/TUTORIAL.md) | Explicación detallada de funciones | 20 min |
| [Referencia de API](./docs/API.md) | Especificación de funciones WASM | 30 min |
| [Guía de Compilación](./docs/BUILD.md) | Configuración del entorno de desarrollo | 15 min |
| [Arquitectura](./docs/ARCHITECTURE.md) | Diseño del sistema | 25 min |
| [CI/CD](./docs/CI_CD.md) | Operación de pruebas y lanzamientos | 20 min |
| [Solución de Problemas](./docs/TROUBLESHOOTING.md) | Resolución de problemas | Según sea necesario |

---

## Atajos de Teclado

| Tecla | Acción |
|------|--------|
| `Ctrl+N` / `Cmd+N` | Nueva molécula |
| `Ctrl+O` / `Cmd+O` | Abrir archivo |
| `Ctrl+S` / `Cmd+S` | Guardar archivo |
| `Ctrl+Z` / `Cmd+Z` | Deshacer |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Rehacer |
| `Ctrl+V` / `Cmd+V` | Pegar SMILES |
| `D` | Modo dibujo |
| `S` | Modo selección |
| `B` | Herramienta de enlace |
| `Delete` | Eliminar seleccionado |
| `?` | Ayuda |

---

## Rendimiento

### Puntos de Referencia

| Operación | Tiempo | Estado |
|-----------|--------|--------|
| Análisis SMILES | 5ms | ✅ Rápido |
| Generación de huella dactilar | 30ms | ✅ Rápido |
| Generación 3D (50 átomos) | 300ms | ✅ Rápido |
| Generación 3D (200 átomos) | 1.2s | ✅ Bueno |
| Renderizado Canvas | 14ms | ✅ 60 FPS |
| Uso de memoria | <50MB | ✅ Eficiente |

Consulte [Puntos de Referencia de Rendimiento](./docs/CI_CD.md#performance-optimization) para más detalles.

---

## Pruebas

### Ejecutar Pruebas
```bash
# Pruebas unitarias
npm test

# Pruebas E2E
npm run test:e2e

# Puntos de referencia de rendimiento
npm run test:perf

# Informe de cobertura
npm test -- --coverage
```

### Integración Continua
Todos los push y PR ejecutan automáticamente:
- Verificación de tipos TypeScript
- Pruebas unitarias + cobertura
- Pruebas de navegador E2E
- Pruebas de regresión de rendimiento

Consulte la [Guía de CI/CD](./docs/CI_CD.md) para más detalles.

---

## Contribuciones

¡Las contribuciones son bienvenidas! Consulte [CONTRIBUTING.md](./CONTRIBUTING.md) para:
- Configuración del entorno de desarrollo
- Directrices de estilo de código
- Requisitos de pruebas
- Proceso de solicitud de extracción
- Formato de mensaje de confirmación

### Contribución Rápida
```bash
# Fork y clonar
git clone https://github.com/YOUR_USERNAME/chematic-draw.git

# Crear rama de funcionalidad
git checkout -b feature/my-feature

# Hacer cambios y probar
npm test

# Push y crear PR
git push origin feature/my-feature
```

---

## Hoja de Ruta

### v0.2.x (Actual)
- ✅ Visualizador de moléculas 3D
- ✅ Predicción de propiedades
- ✅ Visualización de mecanismos de reacción
- ✅ Enumeración de estereoisómeros
- ✅ Búsqueda en base de datos
- ✅ Optimización de rendimiento
- ✅ Documentación completa

### v0.3.x (Planeado)
- [ ] Versión web (navegador)
- [ ] Edición colaborativa en tiempo real
- [ ] Integración con almacenamiento en la nube
- [ ] Predicción avanzada de RMN

### v0.4.x (Futuro)
- [ ] Renderizado WebGL
- [ ] Soporte VR/AR
- [ ] Integración de aprendizaje automático

Consulte la [Hoja de Ruta](./ROADMAP.md) para más detalles.

---

## Licencia

chematic-draw tiene licencia dual:
- **Licencia MIT** — Para proyectos de código abierto
- **Licencia Apache 2.0** — Para uso comercial

Consulte [LICENSE.MIT](./LICENSE.MIT) y [LICENSE.APACHE](./LICENSE.APACHE).

---

## Soporte

### Documentación
- 📖 [Documentación Completa](./docs/)
- 🚀 [Inicio Rápido](./docs/QUICK_START.md)
- 🆘 [Solución de Problemas](./docs/TROUBLESHOOTING.md)

### Comunidad
- 💬 [GitHub Discussions](https://github.com/yourusername/chematic-draw/discussions)
- 🐛 [GitHub Issues](https://github.com/yourusername/chematic-draw/issues)
- 📧 Correo: support@example.com

---

## Información de Versión

| Componente | Estado | Notas |
|-----------|--------|-------|
| **Desarrollo** | ✅ Activo | Actualizaciones regulares |
| **Pruebas** | ✅ Completo | Jest + Playwright |
| **CI/CD** | ✅ Automatizado | GitHub Actions |
| **Documentación** | ✅ Completa | 7 guías |
| **Listo para Producción** | ✅ Sí | v0.2.0+ estable |

---

**¡Disfruta la química! 🧪**

❤️ Hecho para la comunidad de química.

---

[English](./README.md) | [日本語](./README.ja.md) | [中文](./README.zh.md) | Español
