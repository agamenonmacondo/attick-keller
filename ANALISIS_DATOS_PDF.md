# Análisis de Datos — Informe Rayo (PDF Editorial)
## ¿Qué necesita el gerente? ¿Qué tenemos?

---

## 1. DATOS DISPONIBLES (APIs existentes)

### A. KPIs Generales (`/api/admin/informes-rayo`)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| total_ventas | $ | Revenue del período |
| total_cheques | # | Cantidad de transacciones |
| ticket_promedio | $ | Promedio por cheque |
| propina_total | $ | Propinas recibidas |
| personas | # | Total comensales |
| propina_promedio | $/persona | Propina per cápita |
| avg_service_time | min | Tiempo promedio de servicio |
| zones[] | array | Ventas por zona (barra, terraza, etc.) |
| payments[] | array | Por método de pago (efectivo, tarjeta, etc.) |
| staff[] | array | Ventas por mesero |
| topProducts[] | array | Top 15 productos por revenue |
| clientSplit[] | array | Clientes nuevos vs recurrentes |
| daily[] | array | Ventas día por día (para tendencia) |
| comparison | object | Mismo KPIs vs período anterior (deltas) |

### B. Rentabilidad (`/api/admin/informes-rayo/margins`)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| kpis.total_revenue | $ | Revenue de productos con receta |
| kpis.margin_bruto | $ | Ganancia neta (revenue - costo) |
| kpis.margin_pct | % | Margen general ponderado |
| kpis.total_productos | # | Productos analizados con margen real |
| resumen_ejecutivo.categorias[] | array | 5 macrocategorías con revenue, margin_pct, importan, drenan |
| importan[] | array | Top 15 productos por margen bruto en pesos |
| drenan[] | array | Bottom 10 productos por margen bruto + diagnóstico textual |
| todos[] | array | Todos los productos con margen real |

### C. Análisis IA (`/api/admin/informes-rayo/analyze`)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| analysis | string | Texto generado por Groq gpt-oss-120b |
| source | "llm" \| "rules" | Si fue LLM real o fallback a reglas locales |

---

## 2. ¿QUÉ NECESITA FELIPE A LAS 8AM?

> Filtro: "¿Esto le sirve al gerente en su junta diaria?"

### ✅ SÍ sirve:
1. **Semáforo visual**: 3 luces (🟢🟡🔴) con una frase de diagnóstico
2. **Diagnóstico concreto**: "La carne subió 8%" — no "hay inflación"
3. **Lenguaje de negocio**: "Lo que drena", no "margen negativo"
4. **2-3 bullets para junta**: accionables, no descriptivos
5. **Macrocategorías**: COCTELES, LICORES, VINOS, COMIDA, BEBIDAS
6. **Comparativa vs período anterior**: ¿mejoró o empeoró?
7. **Productos estrella vs lastre**: top 5 / bottom 5 con margen bruto en pesos

### ❌ NO sirve:
1. Scatter plots ("no voy a buscar bolitas")
2. Análisis interpretativo de IA ("los números hablan solos")
3. KPIs anecdóticos ("eso lo ve el capitán de meseros")
4. Más de 3 KPIs principales en la portada
5. Datos sin contexto de "¿qué hago con esto?"

---

## 3. ARQUITECTURA PROPUESTA (NUEVA)

### Problema del actual:
- HTML monolítico capturado con `html2canvas` → fuentes no cargadas, texto truncado, calidad baja
- 10 slides intentan decir todo → nada se lee
- Marca de agua superpuesta sobre contenido

### Solución: PDF vectorial con Chart.js + jsPDF

**Tecnología:**
- **Chart.js** (CDN) para gráficos: barras, donuts, sparklines — renderiza en canvas
- **jsPDF** (CDN) para PDF: añade imágenes del canvas + texto vectorial
- **NO html2canvas** — evitamos captura DOM y problemas de fuentes
- **NO React** en el PDF — todo es canvas + jsPDF imperativo

**Ventajas:**
- Fuentes siempre renderizan (usa tipografías del sistema o embebidas en jsPDF)
- Texto nunca se trunca (layout programático con medidas exactas)
- Gráficos son vectoriales (no pixelados)
- Cada slide es función pura: `renderSlide1(doc, data)`

**Estructura del generador:**
```
src/lib/informes-rayo/pdf-chartjs/
  ├── index.ts           # entry point: generatePDF(data) → Blob
  ├── slides/
  │   ├── slide-01-portada.ts      # Título + fecha + branding
  │   ├── slide-02-kpis.ts         # 3 KPIs grandes con deltas
  │   ├── slide-03-zonas.ts        # Barras horizontales por zona
  │   ├── slide-04-pagos.ts        # Donut de métodos de pago
  │   ├── slide-05-rentabilidad.ts  # Resumen ejecutivo + categorías
  │   ├── slide-06-importan.ts     # Top 7 productos (barras doradas)
  │   ├── slide-07-composicion.ts  # Composición del margen por categoría
  │   ├── slide-08-estrellas-lastre.ts # Dos columnas: estrellas vs lastre
  │   ├── slide-09-insights.ts     # 4-5 bullets editoriales del LLM
  │   └── slide-10-junta.ts        # 3 tarjetas accionables
  ├── chart-helpers.ts   # Funciones para barras, donuts, sparklines
  ├── pdf-helpers.ts     # Texto, colores, layout utils
  └── fonts.ts           # Registro de fuentes en jsPDF
```

### Paleta de colores (A&K editorial light):
| Token | Hex | Uso |
|-------|-----|-----|
| borgona | #6B2737 | Portada, headers, acentos |
| dorado | #C9A94E | Números, rankings, highlights |
| crema | #F5EDE0 | Fondo general |
| madera | #5C4037 | Texto secundario |
| blanco | #FFFFFF | Tarjetas, fondos de gráficos |

### Tipografía:
- **Títulos**: Playfair Display (serif) — embebida en jsPDF
- **Datos/Labels**: DM Sans (sans-serif) — embebida en jsPDF
- **Fallback**: Helvetica bold (built-in jsPDF) si carga falla

---

## 4. REGLAS DEL TEMPLATE (no negociables)

1. **Todo en español** (Colombia)
2. **Formato numérico**: `$791.2M`, `$12.5K`, `$450` — nunca `$791,234,567`
3. **Sin scroll** — cada slide autocontenido en A4 (210×297mm)
4. **Contraste alto**: texto #F0EDE8 sobre borgona, #2D1810 sobre crema
5. **Símbolos Unicode**: ⚠ ✅ ◉ ○ ◐ • ⭐ 🔥 — NO emojis
6. **Números impactantes**: el KPI debe ser el elemento más grande del slide
7. **3 KPIs máximo** en portada — el resto en slides secundarios
8. **Tarjetas con sombra sutil** — no bordes duros

---

## 5. FLUJO DE GENERACIÓN

```
1. Usuario clickea "Descargar PDF"
2. Frontend ya tiene los datos cargados (useInformesRayo + useProductMargins)
3. Llama a generatePDF(data) del módulo pdf-chartjs
4. Cada slide renderiza Chart.js en canvas off-screen
5. jsPDF ensambla: portada → KPIs → zonas → pagos → rentabilidad → ... → junta
6. Descarga automática como `Informe_Rayo_2026-06-06.pdf`
```

**NO hay llamada a API adicional** — todo es cliente, síncrono, instantáneo.

---

## 6. PROBLEMAS A EVITAR

| Problema anterior | Causa | Solución nueva |
|-------------------|-------|----------------|
| Fuentes corruptas | html2canvas captura antes de cargar fuentes | Chart.js usa canvas nativo + jsPDF embebe fuentes |
| Texto truncado | slides 450×800px con contenido excedido | A4 estándar con layout programático y medidas exactas |
| Marca de agua superpuesta | z-index/CSS en captura | jsPDF footer fijo en cada página |
| Calidad baja | rasterización a 96 DPI | Canvas a 300 DPI + vectorial donde sea posible |
| Análisis LLM faltante | pipeline roto o source="rules" | Verificar endpoint /analyze antes de generar PDF |

---

## 7. PROXIMAS ACCIONES

1. ✅ **Este documento** — análisis de datos completado
2. ⏳ **Crear prompt para Claude Code** — con este análisis + especificaciones visuales
3. ⏳ **Delegar a Claude Code** — generar código de cada slide
4. ⏳ **Probar localmente** — generar PDF con datos de prueba
5. ⏳ **Deploy a Vercel** — integrar con RentabilidadPanel.tsx

---

*Documento creado: 2026-06-06*
*Por: Ninja (Hermes Agent)*
*Para: Alejandro Sevilla — Attick & Keller*
