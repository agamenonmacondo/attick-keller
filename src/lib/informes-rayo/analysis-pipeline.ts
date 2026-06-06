// ═══ Informes Rayo — Analysis Pipeline ═══
// Groq Cloud (openai/gpt-oss-120b) con fallback a reglas locales
// Plan v3.2: análisis detallado con referencias cruzadas, tendencias y recomendaciones

// ═══ System Prompt ═══
const SYSTEM_PROMPT = `Eres Rayo IA ⚡, analista financiero senior especializado en restaurantes colombianos con 15 años de experiencia en consultoría gastronómica.

Analizas datos de A&K (Attick & Keller), un restaurante premium en Bogotá, Colombia. Moneda: COP (pesos colombianos).

ESTRUCTURA TU RESPUESTA EXACTAMENTE ASÍ (no agregues nada fuera de estas secciones):

⚡ **Diagnóstico General**
[3-4 líneas ejecutivas con el diagnóstico completo: tendencia general, HallazGO principal de RENTABILIDAD, y riesgo u oportunidad identificado. Sé específico con datos de márgenes.]

📊 **Rentabilidad y Márgenes**
[Análisis detallado de márgenes: categorías más y menos rentables, productos estrella vs productos que drenan, margen general vs meta del 30%. Explicar POR QUÉ cada categoría tiene ese margen si los datos lo sugieren.]

📋 **Oportunidades Estratégicas**
[4-6 acciones concretas y específicas para A&K, PRIORIZADAS por impacto en margen neto. Cada una: qué hacer, por qué, resultado esperado en pesos.]

⚠️ **Riesgos y Alertas**
[2-4 riesgos: productos con margen negativo, categorías débiles, concentración de margen en pocos productos.]

📋 **Resumen Ejecutivo para Junta**
[5 bullets concisos para copiar en acta. Incluir: margen general, categoría más rentable, producto estrella, cuántos drenan, acción prioritaria.]

REGLAS:
- CANTIDADES en COP: "$1.2M", "$350K"
- PORCENTAJES con 1 decimal: "72.8%"
- Basar conclusiones en DATOS proporcionados
- Respuesta en español colombiano`

function buildAnalysisPrompt(data: {
  kpis: any
  daily: any[]
  zones: any[]
  staff: any[]
  payments: any[]
  clientSplit: any[]
  topProducts: any[]
  comparison: { kpis: any } | null
  period: { from: string; to: string; zone: string; compareFrom: string; compareTo: string }
}): string {
  const kpi = Array.isArray(data.kpis) ? data.kpis[0] : data.kpis
  const compKpi = data.comparison?.kpis ? (Array.isArray(data.comparison.kpis) ? data.comparison.kpis[0] : data.comparison.kpis) : null

  const fmt = (n: number) => {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
    if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
    return `$${Math.round(n).toLocaleString('es-CO')}`
  }

  const pct = (current: number, previous: number) => {
    if (!previous || previous === 0) return 'N/A'
    const change = ((current - previous) / previous) * 100
    return `${change >= 0 ? '↑' : '↓'}${Math.abs(change).toFixed(1)}%`
  }

  let prompt = `INFORME RAYO — Período: ${data.period.from} al ${data.period.to}`

  if (data.period.compareFrom && data.period.compareTo) {
    prompt += `\nComparación: ${data.period.compareFrom} al ${data.period.compareTo}`
  }

  // ── KPIs Principales ──
  prompt += `\n\n═══ KPIs PRINCIPALES ═══`

  if (kpi) {
    const revenue = Number(kpi.total_ventas || kpi.revenue || 0)
    const cheques = Number(kpi.total_cheques || 0)
    const personas = Number(kpi.personas || 0)
    const propina = Number(kpi.propina_total || kpi.tip_total || 0)
    const ticket = cheques > 0 ? revenue / cheques : 0
    const propinaPerCapita = personas > 0 ? propina / personas : 0
    const propinaPct = revenue > 0 ? (propina / revenue) * 100 : 0

    prompt += `\n- Ventas totales: ${fmt(revenue)}`
    prompt += `\n- Cheques: ${cheques.toLocaleString('es-CO')}`
    prompt += `\n- Ticket promedio: ${fmt(ticket)}`
    prompt += `\n- Personas: ${personas.toLocaleString('es-CO')}`
    prompt += `\n- Propina total: ${fmt(propina)} (${propinaPct.toFixed(1)}% de ventas)`
    prompt += `\n- Propina/persona: ${fmt(propinaPerCapita)}`

    if (compKpi) {
      const compRevenue = Number(compKpi.total_ventas || compKpi.revenue || 0)
      const compCheques = Number(compKpi.total_cheques || 0)
      const compPersonas = Number(compKpi.personas || 0)
      const compPropina = Number(compKpi.propina_total || compKpi.tip_total || 0)
      const compTicket = compCheques > 0 ? compRevenue / compCheques : 0

      prompt += `\n\n═══ COMPARACIÓN (período anterior) ═══`
      prompt += `\n- Ventas anterior: ${fmt(compRevenue)} (${pct(revenue, compRevenue)})`
      prompt += `\n- Cheques anterior: ${compCheques.toLocaleString('es-CO')} (${pct(cheques, compCheques)})`
      prompt += `\n- Ticket promedio anterior: ${fmt(compTicket)} (${pct(ticket, compTicket)})`
      prompt += `\n- Personas anterior: ${compPersonas.toLocaleString('es-CO')} (${pct(personas, compPersonas)})`
      prompt += `\n- Propina anterior: ${fmt(compPropina)} (${pct(propina, compPropina)})`
    }
  }

  // ── Por Zona ──
  if (data.zones && data.zones.length > 0) {
    prompt += `\n\n═══ POR ZONA ═══`
    const totalRevenue = data.zones.reduce((s: number, z: any) => s + Number(z.total_ventas || z.revenue || 0), 0)
    for (const z of data.zones) {
      const zName = z.zone || z.derived_zone_name || z.name || 'Sin zona'
      const zRevenue = Number(z.total_ventas || z.revenue || 0)
      const zCheques = Number(z.total_cheques || z.cheques || 0)
      const zPersonas = Number(z.personas || 0)
      const zPct = totalRevenue > 0 ? (zRevenue / totalRevenue * 100).toFixed(1) : '0'
      prompt += `\n- ${zName}: ${fmt(zRevenue)} (${zPct}% del total), ${zCheques} cheques, ${zPersonas} personas`
    }
  }

  // ── Métodos de Pago ──
  if (data.payments && data.payments.length > 0) {
    prompt += `\n\n═══ MÉTODOS DE PAGO ═══`
    for (const p of data.payments) {
      const method = p.payment_method || p.metodo || p.method || 'Otro'
      const total = Number(p.total || p.amount || p.total_ventas || 0)
      const cheques = Number(p.cheques || p.count || p.total_cheques || 0)
      const pPct = p.pct || 0
      prompt += `\n- ${method}: ${fmt(total)} (${pPct}%), ${cheques} cheques`
    }
  }

  // ── Top Productos ──
  if (data.topProducts && data.topProducts.length > 0) {
    prompt += `\n\n═══ TOP PRODUCTOS ═══`
    const totalProductRevenue = data.topProducts.reduce((s: number, p: any) => s + Number(p.revenue || p.total_ventas || 0), 0)
    for (const p of data.topProducts) {
      const name = p.product_name || p.name || 'Sin nombre'
      const category = p.category_name || p.group_name || 'Sin categoría'
      const qty = Number(p.quantity || 0)
      const rev = Number(p.revenue || p.total_ventas || 0)
      const unitPrice = qty > 0 ? rev / qty : 0
      const concentrationPct = totalProductRevenue > 0 ? (rev / totalProductRevenue * 100).toFixed(1) : '0'
      prompt += `\n- ${name} (${category}): ${qty} uds, ${fmt(rev)} (${concentrationPct}% del top), precio unitario ${fmt(unitPrice)}`
    }
  }

  // ── Márgenes (rentabilidad real) ──
  if ((data as any).margins && (data as any).margins.kpis && (data as any).margins.kpis.total_productos > 0) {
    const mk = (data as any).margins.kpis
    const cats = (data as any).margins.resumen_ejecutivo?.categorias || []
    const drenan = (data as any).margins.drenan || []
    const importan = (data as any).margins.importan || []

    prompt += `\n\n═══ RENTABILIDAD (MÁRGENES REALES) ═══`
    prompt += `\n- Margen bruto general: ${mk.margin_pct.toFixed(1)}%`
    prompt += `\n- Ingreso total: ${fmt(mk.total_revenue)}`
    prompt += `\n- Ganancia neta: ${fmt(mk.margin_bruto)}`
    prompt += `\n- Productos con margen calculable: ${mk.total_productos}`

    if (cats.length > 0) {
      prompt += `\n\nPOR CATEGORÍA:`
      for (const c of cats) {
        prompt += `\n- ${c.categoria}: ${fmt(c.revenue)} ingreso, ${c.margin_pct}% margen, ${c.importan} importan, ${c.drenan} drenan (${c.count} productos)`
      }
    }

    if (importan.length > 0) {
      prompt += `\n\nTOP 5 POR MARGEN NETO (LOS QUE IMPORTAN):`
      for (const p of importan.slice(0, 5)) {
        prompt += `\n- ${p.product_name} (${p.macro_category}): ${fmt(p.margin_bruto)} netos, ${Math.round(p.margin_pct)}% margen, ${fmt(p.revenue)} ingreso`
      }
    }

    if (drenan.length > 0) {
      prompt += `\n\nLOS QUE DRENAN (bottom 5%):`
      for (const p of drenan.slice(0, 5)) {
        prompt += `\n- ${p.product_name} (${p.macro_category}): ${fmt(Math.abs(p.margin_bruto))} netos, ${Math.round(p.margin_pct)}% margen (alto pero contribución baja)`
        if (p.diagnostico) prompt += ` — ${p.diagnostico}`
      }
    }
  }

  // ── Staff summary ──
  if (data.staff && data.staff.length > 0) {
    prompt += `\n\n═══ STAFF (top 5) ═══`
    const top5 = data.staff.slice(0, 5)
    for (const s of top5) {
      const name = s.staff_name || s.name || 'Sin nombre'
      const rev = Number(s.total_ventas || s.revenue || 0)
      const cheques = Number(s.total_cheques || s.cheques || 0)
      const propina = Number(s.total_propina || s.tip_total || 0)
      prompt += `\n- ${name}: ${fmt(rev)}, ${cheques} cheques, propina ${fmt(propina)}`
    }
  }

  prompt += `\n\nGenera un análisis financiero detallado following la estructura EXACTA del system prompt. Sé específico con datos, calcula concentración, ticket proyectado, y propinas como % de ventas. NO seas genérico.`

  return prompt
}

// ═══ Rule-based fallback (sin IA) — más detallado ═══
function generateRuleBasedAnalysis(data: {
  kpis: any
  daily: any[]
  zones: any[]
  staff: any[]
  payments: any[]
  clientSplit: any[]
  topProducts: any[]
  comparison: { kpis: any } | null
  period: { from: string; to: string; zone: string }
}): string {
  const kpi = Array.isArray(data.kpis) ? data.kpis[0] : data.kpis
  const compKpi = data.comparison?.kpis ? (Array.isArray(data.comparison.kpis) ? data.comparison.kpis[0] : data.comparison.kpis) : null

  if (!kpi) return 'Sin datos para el período seleccionado.'

  const revenue = Number(kpi.total_ventas || kpi.revenue || 0)
  const cheques = Number(kpi.total_cheques || 0)
  const personas = Number(kpi.personas || 0)
  const propina = Number(kpi.propina_total || kpi.tip_total || 0)
  const ticket = cheques > 0 ? revenue / cheques : 0
  const propinaPct = revenue > 0 ? (propina / revenue) * 100 : 0

  const fmt = (n: number) => {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
    if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
    return `$${Math.round(n).toLocaleString('es-CO')}`
  }

  const pct = (cur: number, prev: number) => {
    if (!prev || prev === 0) return 'N/A'
    const change = ((cur - prev) / prev) * 100
    return `${change >= 0 ? '↑' : '↓'}${Math.abs(change).toFixed(1)}%`
  }

  // ── Diagnosis ──
  let tendencia = 'Los datos del período muestran actividad operativa.'
  let revChange = 0
  if (compKpi) {
    const compRevenue = Number(compKpi.total_ventas || compKpi.revenue || 0)
    revChange = compRevenue > 0 ? ((revenue - compRevenue) / compRevenue) * 100 : 0
    tendencia = revChange >= 0
      ? `Crecimiento del ${Math.abs(revChange).toFixed(1)}% en ventas vs período anterior.`
      : `Las ventas cayeron ${Math.abs(revChange).toFixed(1)}% vs período anterior.`
  }

  // ── Zone info ──
  const zoneHighlights = (data.zones || []).slice(0, 5).map((z: any) => {
    const name = z.zone || z.derived_zone_name || z.name || 'Sin zona'
    const rev = Number(z.total_ventas || z.revenue || 0)
    const totalRev = (data.zones || []).reduce((s: number, z2: any) => s + Number(z2.total_ventas || z2.revenue || 0), 0)
    const pctOfTotal = totalRev > 0 ? (rev / totalRev * 100).toFixed(0) : '0'
    return `${name}: ${fmt(rev)} (${pctOfTotal}%)`
  })

  // ── Top products info ──
  const productHighlights = (data.topProducts || []).slice(0, 5).map((p: any) => {
    const name = p.product_name || p.name || 'Sin nombre'
    const rev = Number(p.revenue || p.total_ventas || 0)
    return `${name}: ${fmt(rev)}`
  })

  let analysis = `⚡ **Diagnóstico General**\n${tendencia}`
  if (revChange < 0) analysis += ` Caída significativa que requiere análisis de causas.`
  if (propinaPct < 8) analysis += ` Propina baja (${propinaPct.toFixed(1)}% de ventas).`

  analysis += `\n\n📊 **Análisis de Ventas**`
  analysis += `\n- Ventas: ${fmt(revenue)}`
  if (cheques > 0) analysis += `\n- ${cheques} cheques con ticket promedio de ${fmt(ticket)}`
  if (personas > 0) analysis += `\n- ${personas.toLocaleString('es-CO')} personas atendidas`
  analysis += `\n- Propina: ${fmt(propina)} (${propinaPct.toFixed(1)}% de ventas)`
  if (compKpi) {
    const compRevenue = Number(compKpi.total_ventas || compKpi.revenue || 0)
    const compCheques = Number(compKpi.total_cheques || 0)
    const compPersonas = Number(compKpi.personas || 0)
    analysis += `\n- vs Período anterior: Ventas ${pct(revenue, compRevenue)}, Cheques ${pct(cheques, compCheques)}, Personas ${pct(personas, compPersonas)}`
  }

  if (zoneHighlights.length > 0) {
    analysis += `\n\n🏆 **Productos Estrella**`
    if (productHighlights.length > 0) {
      analysis += `\nTop productos: ${productHighlights.join(', ')}`
    } else {
      analysis += `\nDatos de productos no disponibles para este período.`
    }
  }

  analysis += `\n\n💡 **Oportunidades Estratégicas**`
  if (ticket > 0 && ticket < 200000) analysis += `\n- Subir ticket promedio (${fmt(ticket)}) con estrategias de upselling y maridaje`
  if (zoneHighlights.length > 1) analysis += `\n- Distribuir carga entre zonas: ${zoneHighlights.join('; ')}`
  analysis += `\n- Analizar horas pico para optimizar staffing y reducir tiempos de espera`
  if (propinaPct < 10) analysis += `\n- Propina al ${propinaPct.toFixed(1)}% — considerar sugerencia automática del 15% en cuenta`
  if (productHighlights.length > 0) analysis += `\n- Promocionar productos estrella (${productHighlights.slice(0, 3).join(', ')}) en redes y menú digital`

  analysis += `\n\n⚠️ **Riesgos y Alertas**`
  if (zoneHighlights.length === 1) analysis += `\n- Alta concentración en una sola zona — cualquier cierre impacta ${fmt(revenue)} en ventas`
  if (revChange < -20) analysis += `\n- Caída de ${Math.abs(revChange).toFixed(1)}% en ventas — investigar causas (estacionalidad, competencia, calidad)`
  if (propinaPct < 8) analysis += `\n- Propina debajo del 8% del ticket — puede indicar insatisfacción o falta de sugerencia`
  if (productHighlights.length > 0) {
    const topProduct = (data.topProducts || [])[0]
    if (topProduct) {
      const topRev = Number(topProduct.revenue || topProduct.total_ventas || 0)
      const topPct = revenue > 0 ? (topRev / revenue * 100).toFixed(1) : '0'
      if (Number(topPct) > 15) analysis += `\n- Producto "${topProduct.product_name || topProduct.name}" representa ${topPct}% de ventas — alta dependencia`
    }
  }

  analysis += `\n\n📋 **Resumen Ejecutivo para Junta**`
  analysis += `\n- Ventas del período: ${fmt(revenue)}${compKpi ? ` (${pct(revenue, Number(compKpi.total_ventas || compKpi.revenue || 0))})` : ''}`
  analysis += `\n- ${cheques} cheques, ${personas.toLocaleString('es-CO')} personas, ticket ${fmt(ticket)}`
  analysis += `\n- Propina: ${fmt(propina)} (${propinaPct.toFixed(1)}% de ventas)`
  analysis += `\n- ${revChange >= 0 ? 'Crecimiento' : 'Caída'} ${Math.abs(revChange).toFixed(1)}% vs período anterior`
  analysis += `\n- Acción clave: ${revChange < -10 ? 'Investigar causas de caída y definir plan de recuperación' : 'Mantener estrategia y enfocarse en upselling'}`

  return analysis
}

// ═══ Groq API Call ═══
async function callGroqAI(
  prompt: string,
  systemPrompt: string,
  options?: { model?: string; signal?: AbortSignal }
): Promise<string> {
  const API_URL = 'https://api.groq.com/openai/v1/chat/completions'
  const MODEL = options?.model || 'openai/gpt-oss-120b'
  const API_KEY = process.env.GROQ_API_KEY

  if (!API_KEY) {
    throw new Error('GROQ_API_KEY no configurada')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
      signal: options?.signal ?? controller.signal,
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown')
      throw new Error(`Groq API error ${response.status}: ${errorBody}`)
    }

    const result = await response.json()
    if (!result.choices?.[0]?.message?.content) {
      throw new Error('Respuesta de Groq sin contenido')
    }

    return result.choices[0].message.content
  } finally {
    clearTimeout(timeout)
  }
}

// ═══ Main Pipeline ═══
export async function runAnalysisPipeline(
  reportData: Parameters<typeof buildAnalysisPrompt>[0]
): Promise<{ analysis: string; source: 'ai' | 'rules' | 'error'; error?: string; durationMs: number }> {
  const startTime = Date.now()

  try {
    // Validate data
    const kpi = Array.isArray(reportData.kpis) ? reportData.kpis[0] : reportData.kpis
    if (!kpi) {
      return {
        analysis: generateRuleBasedAnalysis(reportData),
        source: 'rules',
        error: 'No KPI data',
        durationMs: Date.now() - startTime,
      }
    }

    const prompt = buildAnalysisPrompt(reportData)

    // Try AI with retry
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const analysis = await callGroqAI(prompt, SYSTEM_PROMPT)
        return { analysis, source: 'ai', durationMs: Date.now() - startTime }
      } catch (primaryError) {
        console.warn(`[InformesRayo] AI attempt ${attempt + 1}/3 (primary) failed:`, primaryError)
        try {
          const analysis = await callGroqAI(prompt, SYSTEM_PROMPT, { model: 'llama-3.3-70b-versatile' })
          return { analysis, source: 'ai', durationMs: Date.now() - startTime }
        } catch (fallbackError) {
          console.warn(`[InformesRayo] AI attempt ${attempt + 1}/3 (fallback) failed:`, fallbackError)
        }
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)))
      }
    }

    // Fallback to rules
    return {
      analysis: generateRuleBasedAnalysis(reportData),
      source: 'rules',
      durationMs: Date.now() - startTime,
    }
  } catch (error: any) {
    return {
      analysis: generateRuleBasedAnalysis(reportData),
      source: 'error',
      error: error.message,
      durationMs: Date.now() - startTime,
    }
  }
}

export { buildAnalysisPrompt, SYSTEM_PROMPT }