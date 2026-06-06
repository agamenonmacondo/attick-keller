// ═══ Informes Rayo — Analysis Pipeline v4 ═══
// Prompt maestro que genera JSON estructurado por slide
// 1 solo call a Groq → análisis contextual para cada slide del PDF
// Fallback: reglas locales generan el mismo shape JSON

const GROQ_API_KEY = process.env.GROQ_API_KEY || ''
const GROQ_MODEL = 'openai/gpt-oss-120b'
const GROQ_FALLBACK_MODEL = 'llama-3.3-70b-versatile'
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

// ═══ System Prompt v5 — JSON estricto con campos editoriales ═══
const SYSTEM_PROMPT_V2 = [
  'Eres Rayo IA, analista financiero senior de restaurantes colombianos.',
  '',
  'INSTRUCCIONES CRÍTICAS:',
  '1. Analiza los datos proporcionados de A&K (Attick & Keller, Bogotá, COP).',
  '2. Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown, sin comillas triples, sin texto fuera del JSON.',
  '3. Cada campo del JSON debe ser análisis contextual y específico basado en los datos proporcionados. NADA genérico.',
  '4. Menciona productos reales, categorías reales, márgenes reales, números reales.',
  '5. Formato COP: "$1.2M", "$350K". Porcentajes: "72.8%".',
  '6. Español colombiano. Lenguaje de negocio: "lo que drena", "lo que importa", "margen bruto".',
  '',
  'ESTRUCTURA JSON EXACTA:',
  '{',
  '  "slide_2_metrics": "1-2 líneas ejecutivas sobre métricas clave del período. Incluir margen general, ventas totales, y si están sobre/bajo meta del 30%.",',
  '  "slide_2_headline": "Titular corto de 6-10 palabras para el slide de métricas. Punchy, como titular de periódico financiero. Ej: \'Margen 72.8% supera meta del 30%\'",',
  '  "slide_3_drena": "Diagnóstico de 1-2 líneas sobre productos que drenan. Mencionar cuántos, qué categoría es más débil, y el hallazgo principal de riesgo.",',
  '  "slide_3_headline": "Titular corto de 6-10 palabras para el slide de drenaje. Ej: \'8 productos drenan el 12% de ganancias\'",',
  '  "slide_4_importan": "Contexto de 1-2 líneas sobre el producto #1 por margen bruto. Mencionar su nombre exacto, categoría, y por qué lidera.",',
  '  "slide_5_composicion": "Insight de 1-2 líneas sobre composición del margen por categoría. Qué categoría domina, qué proporción del total, y si la concentración es saludable.",',
  '  "slide_5_headline": "Titular corto de 6-10 palabras para el slide de composición. Ej: \'Licores lideran con 75% del ingreso neto\'",',
  '  "slide_6_estrellas_lastre": "Dualidad operativa en 1-2 líneas. Comparar top 5 vs bottom 5 en margen bruto. Ratio o número clave.",',
  '  "slide_7_insights": ["4-5 strings, cada uno un bullet editorial de 12-18 palabras. Cada bullet menciona un dato específico real: producto, categoría, margen, revenue. Formato: NOMBRE en mayúsculas genera $X netos — insight"],',
  '  "slide_7_bullets": [{"icon":"icono Phosphor (Lightning, TrendUp, TrendDown, Warning, CheckCircle)","title":"título corto 2-4 palabras","body":"insight de 10-15 palabras con dato real"}, ...4-5 items],',
  '  "slide_8_junta": ["3 strings, cada uno una recomendación accionable de 15-25 palabras. Formato: EMOJI CATEGORÍA acción → resultado esperado"],',
  '  "slide_8_cards": [{"emoji":"uno de: ✅ ⚠ 🔥","title":"categoría en mayúsculas 2-3 palabras","action":"recomendación accionable 10-15 palabras","metric":"métrica clave con número, ej: 72.8% margen"}, ...3 items],',
  '  "slide_9_full_analysis": "Análisis completo de 5 secciones con headers. Usa headers EXACTAMENTE así con emojis y **negrita**:\n⚡ **Diagnóstico General**\n[texto]\n\n📊 **Rentabilidad y Márgenes**\n[texto]\n\n📋 **Oportunidades Estratégicas**\n[texto]\n\n⚠️ **Riesgos y Alertas**\n[texto]\n\n📋 **Resumen Ejecutivo para Junta**\n[texto]",',
  '  "version": "rayo-v5-2026-06"',
  '}',
  '',
  'REGLAS:',
  '- slide_2_metrics a slide_6_estrellas_lastre: máximo 200 caracteres cada uno. Conciso, punchy.',
  '- slide_2_headline, slide_3_headline, slide_5_headline: máximo 60 caracteres. Como titular de periódico.',
  '- slide_7_insights: bullets que parecen escritos por un editor financiero, no un robot.',
  '- slide_7_bullets: objects con icon (Phosphor icon name), title (2-4 palabras), body (10-15 palabras con dato real).',
  '- slide_8_junta: recomendaciones que Felipe (gerente) puede leer en 10 segundos antes de la junta.',
  '- slide_8_cards: objects con emoji, título de categoría, acción concreta, y métrica clave con número.',
  '- slide_9_full_analysis: el análisis completo para quien quiere profundidad.',
  '- NUNCA inventes datos. Si no hay datos de un slide, usa string vacío o array vacío.',
  '- Si no hay márgenes (margins es null), enfoca el análisis en ventas, zonas, y productos top.',
  '- Los campos _headline y _bullets/_cards son opcionales. Si no generas valor, omítelos. Los campos legacy (slide_7_insights, slide_8_junta) son obligatorios como fallback.',
].join('\n')

// ── Types ──
export interface InsightBullet {
  icon: string
  title: string
  body: string
}

export interface JuntaCard {
  emoji: string
  title: string
  action: string
  metric: string
}

export interface SlideAnalysisV2 {
  // v4 legacy fields (kept for backwards compat)
  slide_2_metrics: string
  slide_3_drena: string
  slide_4_importan: string
  slide_5_composicion: string
  slide_6_estrellas_lastre: string
  slide_7_insights: string[]
  slide_8_junta: string[]
  slide_9_full_analysis: string
  // v5 editorial fields
  slide_2_headline?: string
  slide_3_headline?: string
  slide_5_headline?: string
  slide_7_bullets?: InsightBullet[]
  slide_8_cards?: JuntaCard[]
  version: string
}

export interface AnalysisResultV2 {
  analysis: SlideAnalysisV2
  source: 'ai' | 'rules'
  error?: string
  durationMs: number
}

// ── Formatters ──
function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(n) >= 1_000) return '$' + (n / 1_000).toFixed(0) + 'K'
  return '$' + Math.round(n).toLocaleString('es-CO')
}

function fmtN(n: number): string {
  return Math.round(n).toLocaleString('es-CO')
}

function pctx(current: number, previous: number): string {
  if (!previous || previous === 0) return 'N/A'
  const change = ((current - previous) / previous) * 100
  return (change >= 0 ? '↑' : '↓') + Math.abs(change).toFixed(1) + '%'
}

// ═══ Build Prompt v2 ═══
function buildAnalysisPromptV2(data: {
  kpis: any
  daily: any[]
  zones: any[]
  staff: any[]
  payments: any[]
  clientSplit: any[]
  topProducts: any[]
  comparison: { kpis: any } | null
  period: { from: string; to: string; zone: string; compareFrom: string; compareTo: string }
  margins?: any
}): string {
  const kpi = Array.isArray(data.kpis) ? data.kpis[0] : data.kpis
  const compKpi = data.comparison?.kpis ? (Array.isArray(data.comparison.kpis) ? data.comparison.kpis[0] : data.comparison.kpis) : null

  let prompt = 'DATOS DE ENTRADA — Informe Rayo A&K\nPeríodo: ' + data.period.from + ' al ' + data.period.to
  if (data.period.compareFrom && data.period.compareTo) {
    prompt += '\nComparación: ' + data.period.compareFrom + ' al ' + data.period.compareTo
  }

  // ── KPIs ──
  if (kpi) {
    const revenue = Number(kpi.total_ventas ?? kpi.revenue ?? 0)
    const cheques = Number(kpi.total_cheques ?? 0)
    const personas = Number(kpi.personas ?? 0)
    const propina = Number(kpi.propina_total ?? kpi.tip_total ?? 0)
    const ticket = cheques > 0 ? revenue / cheques : 0
    const propinaPct = revenue > 0 ? (propina / revenue * 100).toFixed(1) : '0'

    prompt += '\n\n═══ KPIs PRINCIPALES ═══'
    prompt += '\n- Ventas: ' + fmt(revenue)
    prompt += '\n- Cheques: ' + fmtN(cheques)
    prompt += '\n- Ticket: ' + fmt(ticket)
    prompt += '\n- Personas: ' + fmtN(personas)
    prompt += '\n- Propina: ' + fmt(propina) + ' (' + propinaPct + '%)'

    if (compKpi) {
      const cRev = Number(compKpi.total_ventas ?? compKpi.revenue ?? 0)
      prompt += '\n- Ventas anterior: ' + fmt(cRev) + ' (' + pctx(revenue, cRev) + ')'
    }
  }

  // ── Zonas ──
  if (data.zones && data.zones.length > 0) {
    const totalRev = data.zones.reduce((s: number, z: any) => s + Number(z.total_ventas ?? z.revenue ?? 0), 0)
    prompt += '\n\n═══ ZONAS ═══'
    for (const z of data.zones.slice(0, 5)) {
      const zRev = Number(z.total_ventas ?? z.revenue ?? 0)
      const zPct = totalRev > 0 ? (zRev / totalRev * 100).toFixed(1) : '0'
      prompt += '\n- ' + (z.zone || z.derived_zone_name || 'Sin zona') + ': ' + fmt(zRev) + ' (' + zPct + '%)'
    }
  }

  // ── Pagos ──
  if (data.payments && data.payments.length > 0) {
    prompt += '\n\n═══ PAGOS ═══'
    for (const p of data.payments.slice(0, 4)) {
      const method = p.payment_method || p.metodo || p.method || 'Otro'
      const total = Number(p.total ?? p.amount ?? 0)
      const pPct = p.pct || 0
      prompt += '\n- ' + method + ': ' + fmt(total) + ' (' + pPct + '%)'
    }
  }

  // ── Top Productos ──
  if (data.topProducts && data.topProducts.length > 0) {
    const totalProdRev = data.topProducts.reduce((s: number, p: any) => s + Number(p.revenue ?? 0), 0)
    prompt += '\n\n═══ TOP PRODUCTOS ═══'
    for (const p of data.topProducts.slice(0, 7)) {
      const rev = Number(p.revenue ?? 0)
      const qty = Number(p.quantity ?? 0)
      const conc = totalProdRev > 0 ? (rev / totalProdRev * 100).toFixed(1) : '0'
      prompt += '\n- ' + (p.product_name || p.name || 'N/A') + ' (' + (p.category_name || 'N/A') + '): ' + fmt(rev) + ' (' + conc + '%), ' + fmtN(qty) + ' uds'
    }
  }

  // ── Márgenes ──
  if (data.margins && data.margins.kpis && data.margins.kpis.total_productos > 0) {
    const mk = data.margins.kpis
    const cats = data.margins.resumen_ejecutivo?.categorias || []
    const importan = data.margins.importan || []
    const drenan = data.margins.drenan || []

    prompt += '\n\n═══ RENTABILIDAD (MÁRGENES REALES) ═══'
    prompt += '\n- Margen general: ' + mk.margin_pct.toFixed(1) + '%'
    prompt += '\n- Ingreso total: ' + fmt(mk.total_revenue)
    prompt += '\n- Ganancia neta: ' + fmt(mk.margin_bruto)
    prompt += '\n- Productos con margen: ' + fmtN(mk.total_productos)

    if (cats.length > 0) {
      prompt += '\n\nPOR CATEGORÍA:'
      for (const c of cats) {
        prompt += '\n- ' + c.categoria + ': ' + fmt(c.revenue) + ' ingreso, ' + c.margin_pct + '% margen, ' + fmtN(c.count) + ' productos, ' + fmtN(c.importan) + ' importan, ' + fmtN(c.drenan) + ' drenan'
      }
    }

    if (importan.length > 0) {
      prompt += '\n\nTOP 5 POR MARGEN NETO:'
      for (const p of importan.slice(0, 5)) {
        prompt += '\n- ' + p.product_name + ' (' + p.macro_category + '): ' + fmt(p.margin_bruto) + ' netos, ' + Math.round(p.margin_pct) + '% margen, ' + fmt(p.revenue) + ' ingreso'
      }
    }

    if (drenan.length > 0) {
      prompt += '\n\nLOS QUE DRENAN (bottom 5%):'
      for (const p of drenan.slice(0, 5)) {
        prompt += '\n- ' + p.product_name + ' (' + p.macro_category + '): ' + fmt(Math.abs(p.margin_bruto)) + ' netos, ' + Math.round(p.margin_pct) + '% margen'
      }
    }
  }

  prompt += '\n\n═══════════════════════════════════════'
  prompt += '\nGENERA EL JSON EXACTO según el system prompt. Responde ÚNICAMENTE JSON válido. Sin texto adicional.'

  return prompt
}

// ═══ Call Groq ═══
async function callGroq(prompt: string, model: string): Promise<{ content: string; source: 'ai' } | { error: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + GROQ_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT_V2 },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 2048,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!res.ok) {
      const text = await res.text()
      return { error: 'Groq HTTP ' + res.status + ': ' + text.slice(0, 200) }
    }

    const json = await res.json()
    const content = json.choices?.[0]?.message?.content
    if (!content) {
      return { error: 'Groq returned empty content' }
    }

    return { content, source: 'ai' }
  } catch (err: any) {
    clearTimeout(timeout)
    if (err.name === 'AbortError') {
      return { error: 'Groq timeout (15s)' }
    }
    return { error: err.message || 'Groq fetch error' }
  }
}

// ═══ Parse JSON robusto ═══
function parseAnalysisJSON(raw: string): SlideAnalysisV2 | null {
  try {
    const cleaned = raw.trim()
    const parsed = JSON.parse(cleaned)
    if (parsed && typeof parsed === 'object' && 'slide_2_metrics' in parsed) {
      return parsed as SlideAnalysisV2
    }
  } catch {}

  try {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      const parsed = JSON.parse(match[1].trim())
      if (parsed && 'slide_2_metrics' in parsed) return parsed as SlideAnalysisV2
    }
  } catch {}

  try {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0])
      if (parsed && 'slide_2_metrics' in parsed) return parsed as SlideAnalysisV2
    }
  } catch {}

  return null
}

// ═══ Fallback: reglas locales generan mismo shape JSON ═══
function generateRuleBasedAnalysisV2(data: {
  kpis: any
  zones: any[]
  payments: any[]
  topProducts: any[]
  comparison: { kpis: any } | null
  margins?: any
}): SlideAnalysisV2 {
  const kpi = Array.isArray(data.kpis) ? data.kpis[0] : data.kpis
  const revenue = kpi ? Number(kpi.total_ventas ?? kpi.revenue ?? 0) : 0
  const cheques = kpi ? Number(kpi.total_cheques ?? 0) : 0

  const mk = data.margins?.kpis
  const cats = data.margins?.resumen_ejecutivo?.categorias || []
  const importan = data.margins?.importan || []
  const drenan = data.margins?.drenan || []

  const bestCat = cats.length > 0
    ? [...cats].sort((a: any, b: any) => Number(b.margin_pct || 0) - Number(a.margin_pct || 0))[0]
    : null
  const worstCat = cats.length > 0
    ? [...cats].sort((a: any, b: any) => Number(a.margin_pct || 0) - Number(b.margin_pct || 0))[0]
    : null
  const topProduct = importan.length > 0 ? importan[0] : null

  const s2 = mk
    ? 'Margen general ' + mk.margin_pct.toFixed(1) + '% — ' + (mk.margin_pct >= 30 ? 'sobre' : 'bajo') + ' la meta del 30%. Ventas ' + fmt(mk.total_revenue) + ' con ' + fmtN(mk.total_productos) + ' productos analizados.'
    : 'Ventas ' + fmt(revenue) + ' en ' + fmtN(cheques) + ' cheques. Sin datos de rentabilidad para este período.'

  const s3 = drenan.length > 0 && worstCat
    ? '⚠ ' + fmtN(drenan.length) + ' productos en el 5% inferior por ganancia neta. ' + worstCat.categoria + ' con ' + worstCat.margin_pct + '% margen — la categoría más débil del menú.'
    : 'Sin productos identificados como lastre en este período.'

  const s4 = topProduct
    ? topProduct.product_name + ' lidera con ' + fmt(topProduct.margin_bruto) + ' netos y ' + Math.round(topProduct.margin_pct) + '% de margen en ' + topProduct.macro_category + '.'
    : 'Sin datos de productos top por margen.'

  const s5 = bestCat
    ? bestCat.categoria + ' representa la mayor contribución con ' + bestCat.margin_pct + '% margen y ' + fmt(bestCat.revenue) + ' en ingresos.'
    : 'Sin datos de composición por categoría.'

  const totalStarMargin = importan.slice(0, 5).reduce((s: number, p: any) => s + Number(p.margin_bruto || 0), 0)
  const totalLastreMargin = drenan.slice(0, 5).reduce((s: number, p: any) => s + Number(p.margin_bruto || 0), 0)
  const s6 = totalStarMargin > 0
    ? 'Top 5 estrellas generan ' + fmt(totalStarMargin) + ' vs ' + fmt(Math.abs(totalLastreMargin)) + ' de los 5 lastres. Ratio ' + (totalStarMargin / Math.max(Math.abs(totalLastreMargin), 1)).toFixed(1) + ':1.'
    : 'Sin datos suficientes para comparar estrellas vs lastres.'

  const insights: string[] = []
  if (topProduct) insights.push(topProduct.product_name + ' genera ' + fmt(topProduct.margin_bruto) + ' netos — el producto más rentable del período')
  if (bestCat) insights.push(bestCat.categoria + ' tiene ' + bestCat.margin_pct + '% de margen con solo ' + fmtN(bestCat.count) + ' productos')
  if (worstCat && worstCat.categoria !== bestCat?.categoria) insights.push(worstCat.categoria + ' muestra solo ' + worstCat.margin_pct + '% de margen — la categoría más débil')
  if (mk) insights.push('El ' + mk.margin_pct.toFixed(1) + '% de margen general supera la meta del 30% por ' + (mk.margin_pct - 30).toFixed(0) + ' puntos')
  if (revenue > 0) insights.push('Ventas totales ' + fmt(revenue) + ' en ' + fmtN(cheques) + ' cheques — ticket promedio ' + fmt(revenue / Math.max(cheques, 1)))

  const junta: string[] = []
  if (bestCat) junta.push('✅ ' + bestCat.categoria + ' lidera con ' + bestCat.margin_pct + '% margen → mantener precios y promociones')
  if (drenan.length > 0) junta.push('⚠ ' + fmtN(drenan.length) + ' productos en el 5% inferior por ganancia neta → evaluar menú')
  if (mk) junta.push('🔥 Margen general ' + mk.margin_pct.toFixed(1) + '% → saludable, sobre meta del 30%')

  const fullParts = [
    '⚡ **Diagnóstico General**',
    s2,
    '',
    '📊 **Rentabilidad y Márgenes**',
    'Margen general ' + (mk ? mk.margin_pct.toFixed(1) : 'N/A') + '%. ' + (bestCat ? bestCat.categoria + ' lidera con ' + bestCat.margin_pct + '%' : 'Sin datos de categorías') + '. ' + (worstCat ? worstCat.categoria + ' es la más débil con ' + worstCat.margin_pct + '%' : ''),
    '',
    '📋 **Oportunidades Estratégicas**',
    '1. Duplicar promociones en ' + (bestCat ? bestCat.categoria : 'la categoría líder') + ' durante horas pico.',
    '2. Revisar precios de ' + (worstCat ? worstCat.categoria : 'la categoría más débil') + ' para recuperar margen.',
    '3. ' + (drenan.length > 0 ? 'Evaluar ' + fmtN(drenan.length) + ' productos del 5% inferior.' : 'Monitorear rotación semanal.'),
    '',
    '⚠️ **Riesgos y Alertas**',
    (worstCat ? worstCat.categoria + ' con margen de ' + worstCat.margin_pct + '% representa riesgo.' : 'Sin riesgos identificados.') + ' ' + (drenan.length > 0 ? fmtN(drenan.length) + ' productos drenan ganancias.' : ''),
    '',
    '📋 **Resumen Ejecutivo para Junta**',
    '• Margen general: ' + (mk ? mk.margin_pct.toFixed(1) + '%' : 'N/A'),
    '• Categoría más rentable: ' + (bestCat ? bestCat.categoria + ' (' + bestCat.margin_pct + '%)' : 'N/A'),
    '• Producto estrella: ' + (topProduct ? topProduct.product_name + ' (' + fmt(topProduct.margin_bruto) + ')' : 'N/A'),
    '• Productos en riesgo: ' + fmtN(drenan.length),
    '• Acción prioritaria: ' + (bestCat ? 'Mantener ' + bestCat.categoria : 'Revisar costos'),
  ]
  const full = fullParts.join('\n')

  // ── v5 editorial fields ──
  const s2_headline = mk
    ? 'Margen ' + mk.margin_pct.toFixed(1) + '% ' + (mk.margin_pct >= 30 ? 'supera' : 'bajo') + ' meta del 30%'
    : 'Ventas ' + fmt(revenue) + ' sin datos de rentabilidad'

  const s3_headline = drenan.length > 0
    ? fmtN(drenan.length) + ' productos drenan ganancias'
    : 'Sin productos en riesgo de drenaje'

  const s5_headline = bestCat
    ? bestCat.categoria + ' lidera con ' + bestCat.margin_pct + '% de margen'
    : 'Composición de margen por categoría'

  const bullets: InsightBullet[] = []
  if (topProduct) bullets.push({ icon: 'Lightning', title: 'Producto estrella', body: topProduct.product_name + ' genera ' + fmt(topProduct.margin_bruto) + ' netos' })
  if (bestCat) bullets.push({ icon: 'TrendUp', title: bestCat.categoria, body: bestCat.margin_pct + '% margen con ' + fmtN(bestCat.count) + ' productos' })
  if (worstCat && worstCat.categoria !== bestCat?.categoria) bullets.push({ icon: 'Warning', title: worstCat.categoria, body: 'Solo ' + worstCat.margin_pct + '% margen — categoría más débil' })
  if (mk) bullets.push({ icon: 'CheckCircle', title: 'Meta cumplida', body: (mk.margin_pct - 30).toFixed(0) + ' puntos sobre el 30% objetivo' })
  if (revenue > 0) bullets.push({ icon: 'TrendUp', title: 'Ventas período', body: fmt(revenue) + ' en ' + fmtN(cheques) + ' cheques' })

  const cards: JuntaCard[] = []
  if (bestCat) cards.push({ emoji: '✅', title: bestCat.categoria.toUpperCase(), action: 'Mantener precios y duplicar promociones en horas pico', metric: bestCat.margin_pct + '% margen' })
  if (drenan.length > 0) cards.push({ emoji: '⚠', title: fmtN(drenan.length) + ' EN RIESGO', action: 'Evaluar menú y ajustar precios de productos del 5% inferior', metric: 'Bottom 5%' })
  if (mk) cards.push({ emoji: '🔥', title: 'MARGEN SALUDABLE', action: 'Margen general sobre meta — mantener estrategia actual', metric: mk.margin_pct.toFixed(1) + '% margen' })

  return {
    slide_2_metrics: s2,
    slide_2_headline: s2_headline,
    slide_3_drena: s3,
    slide_3_headline: s3_headline,
    slide_4_importan: s4,
    slide_5_composicion: s5,
    slide_5_headline: s5_headline,
    slide_6_estrellas_lastre: s6,
    slide_7_insights: insights.slice(0, 5),
    slide_7_bullets: bullets.slice(0, 5),
    slide_8_junta: junta.slice(0, 3),
    slide_8_cards: cards.slice(0, 3),
    slide_9_full_analysis: full,
    version: 'rayo-v5-2026-06',
  }
}

// ═══ Public API ═══
export async function runAnalysisPipelineV2(data: {
  kpis: any
  daily: any[]
  zones: any[]
  staff: any[]
  payments: any[]
  clientSplit: any[]
  topProducts: any[]
  comparison: { kpis: any } | null
  period: { from: string; to: string; zone: string; compareFrom: string; compareTo: string }
  margins?: any
}): Promise<AnalysisResultV2> {
  const start = Date.now()
  const prompt = buildAnalysisPromptV2(data)

  let groqResult = await callGroq(prompt, GROQ_MODEL)

  if ('error' in groqResult) {
    console.log('[RayoV2] Primary model failed, trying fallback:', groqResult.error)
    groqResult = await callGroq(prompt, GROQ_FALLBACK_MODEL)
  }

  if ('content' in groqResult) {
    const parsed = parseAnalysisJSON(groqResult.content)
    if (parsed) {
      return {
        analysis: parsed,
        source: 'ai',
        durationMs: Date.now() - start,
      }
    }
    console.log('[RayoV2] JSON parse failed, falling back to rules. Raw:', groqResult.content.slice(0, 200))
  }

  console.log('[RayoV2] Using rule-based fallback. Error:', 'error' in groqResult ? groqResult.error : 'JSON parse failed')
  return {
    analysis: generateRuleBasedAnalysisV2(data),
    source: 'rules',
    error: 'error' in groqResult ? groqResult.error : 'JSON parse failed',
    durationMs: Date.now() - start,
  }
}

// Re-export v1 for backwards compatibility
export { runAnalysisPipeline } from './analysis-pipeline'
