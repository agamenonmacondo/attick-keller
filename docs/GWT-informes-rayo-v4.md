# GWT — Informes Rayo v4: Análisis LLM por Slide en PDF

## Given
- Existe un panel "Informes Rayo" en el dashboard admin de A&K
- El panel actual incluye: PeriodSelector, 6 KPI cards, gráficas (dashboard), AnalisisIA (texto largo), RentabilidadPanel, ProductoDesgloseTable, PDFExportButton
- El análisis LLM (Groq gpt-oss-120b) genera 1 texto general parseado en 5 secciones
- El PDF generado tiene 10 slides de datos + 1 slide de "Análisis IA" como apéndice
- El template visual Frank dark (fondo #0D0D0C, dorado #C9A94E) está guardado en templates/informes-rayo-frank-dark.html

## When
- El usuario selecciona un período en el panel
- El panel carga KPIs, gráficas y datos de rentabilidad (dashboard puro, sin texto IA)
- El usuario hace click en "Generar PDF Editorial"
- El sistema llama 1 vez a Groq con un **prompt maestro** que genera **JSON estructurado por slide**
- Cada slide del PDF recibe su propio análisis contextual inyectado en el HTML
- El PDF se captura con html2canvas (3x) y se exporta con jsPDF

## Then
- El panel web NO muestra texto de análisis IA — solo KPIs, gráficas y botón PDF
- El PDF tiene 11 slides, cada uno con análisis personalizado:
  - Slide 2 (Métricas): 1-2 líneas ejecutivas sobre margen general
  - Slide 3 (Drena): diagnóstico específico de productos en riesgo
  - Slide 4 (Importan): contexto sobre el producto #1
  - Slide 5 (Composición): insight de concentración por categoría
  - Slide 6 (Estrellas vs Lastre): dualidad operativa en números
  - Slide 7 (Datos que importan): 4-5 bullets editoriales basados en datos reales
  - Slide 8 (Junta): 3 tarjetas accionables con contexto de márgenes
  - Slide 9 (Análisis IA): análisis completo de 5 secciones (el "cerebro")
- El análisis es contextual: menciona productos reales, categorías reales, márgenes reales
- Si Groq falla, cada slide usa fallback basado en reglas locales (sin crash)
- 1 solo LLM call por PDF (~1.1s latencia, cacheable por 24h)
- Todo en español colombiano, números formateados $1.2M, $350K

## Acceptance Criteria
- [ ] Panel: AnalisisIA.tsx eliminado del render
- [ ] Panel: Sin texto largo visible, solo dashboard + botón PDF
- [ ] PDF: 11 slides generados con html2canvas + jsPDF
- [ ] PDF: Slide 2 tiene análisis contextual sobre métricas
- [ ] PDF: Slide 3 tiene diagnóstico sobre productos que drenan
- [ ] PDF: Slide 7 tiene 4-5 bullets editoriales personalizados
- [ ] PDF: Slide 8 tiene 3 tarjetas accionables con contexto real
- [ ] PDF: Slide 9 tiene análisis completo de 5 secciones
- [ ] Fallback: si Groq falla, PDF se genera con análisis por reglas
- [ ] Build: compila con `next build --webpack` sin errores
- [ ] Deploy: funciona en Vercel production
