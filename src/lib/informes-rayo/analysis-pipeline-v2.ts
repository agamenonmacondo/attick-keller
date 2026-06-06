// ═══ Informes Rayo — Analysis Pipeline v6 ═══
// Prompt maestro estilo "Mensaje al equipo" — como el reporte diario de A&K
// 1 solo call a Groq → JSON estructurado con narrativa directiva
// Fallback: reglas locales generan el mismo shape JSON

const GROQ_API_KEY = process.env.GROQ_API_KEY || ''
const GROQ_MODEL = 'openai/gpt-oss-120b'
const GROQ_FALLBACK_MODEL = 'llama-3.3-70b-versatile'
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

// ═══ System Prompt v6 — "Mensaje al equipo" ═══
const SYSTEM_PROMPT_V2 = [
  'Eres Rayo, el gerente nocturno de Attick & Keller (A&K), restaurante en Bogotá.',
  '',
  'Estilo: directo, coloquial, como le escribes al equipo a las 6am.',
  'No digas "Se recomienda" ni "Es notable que". Di: "Vamos con todo en cocteles", "Push pizza hoy", "El ticket bajo es una señal".',
  'Lenguaje: "lo que importa", "lo que drena", "vamos con todo", "se nota", "cada servicio cuenta".',
  '',
  'DATOS QUE USAS:',
  '- Márgenes reales por categoría (COCTELES, LICORES, VINOS, COMIDA, BEBIDAS)',
  '- Productos estrellas (top por margen bruto) y productos que drenan',
  '- KPIs: ventas, cheques, ticket, personas, propina',
  '- Comparación vs período anterior si existe',
  '',
  'ESTRUCTURA JSON EXACTA:',
  '{',
  '  "slide_2_metrics": "1-2 líneas executive summary. Ej: Margen 72.8%. Bebidas jala con 78%. Ticket bajo — empujar upsell.",',
  '  "slide_2_headline": "Titular punchy 6-10 palabras. Ej: Bebidas salva el día, ticket no acompaña",',
  '  "slide_3_drena": "1-2 líneas sobre lo que drena. Mencionar categorías y productos específicos. Ej: 8 productos drenan — todos ADICIONES con 1 sola venta.",',
  '  "slide_3_headline": "Titular 6-10 palabras para drenaje. Ej: Adiciones y brunch bajo — limpiar menú",',
  '  "slide_4_importan": "1-2 líneas sobre el producto #1. Ej: STELLA lidera con $22.8M netos — cada cerveza cuenta.",',
  '  "slide_5_composicion": "1-2 líneas sobre composición del margen. Qué categoría domina y si la concentración es sana.",',
  '  "slide_5_headline": "Titular 6-10 palabras para composición. Ej: Bebidas 78% y Comida 69% — duopolio saludable",',
  '  "slide_6_estrellas_lastre": "1-2 líneas comparando top vs bottom. Ej: Top 5 genera $107M netos vs $50K de los 5 últimos. Ratio 2140:1.",',
  '  "slide_7_insights": ["4-5 bullets de 12-18 palabras cada uno. Mencionar producto real, dólar real, insight concreto."],',
  '  "slide_7_bullets": [{"icon":"Phosphor icon name","title":"2-4 palabras","body":"10-15 palabras con dato real"}, ...4-5 items],',
  '  "slide_8_junta": ["3 recomendaciones accionables de 15-25 palabras. Formato: EMOJI ACCION → RESULTADO"],',
  '  "slide_8_cards": [{"emoji":"✅ o ⚠ o 🔥","title":"CATEGORÍA","action":"recomendación concreta 10-15 palabras","metric":"métrica con número"}, ...3 items],',
  '  "slide_junta_mensaje": "EL CAMPO MÁS IMPORTANTE. 3-5 párrafos cortos estilo mensaje al equipo a las 6am. Tono directo, coloquial. Mencionar productos por nombre, comparaciones vs período anterior, recomendaciones concretas. Ejemplo:",',
  '  "Equipo, el jueves estuvo flojo: bajaron los cubiertos y el ticket promedio no subio. El mes va bien y cada servicio cuenta para sostenerlo.",',
  '  "Hoy vamos con todo: primera recomendacion apenas llega la mesa, empujar nuestras pizzas y pastas, y que cada cliente sienta que vale la pena volver.",',
  '  "STELLA salio 17 veces anoche. Cuando el equipo lo recomienda bien, se nota. Y hoy vale la pena darle mas protagonismo a los cocteles, que ayer estuvieron callados. Una buena recomendacion puede cambiar eso.",',
  '  "Asi se construye ATTIK. Gracias equipo, vamos con todo!",',
  '  "slide_9_full_analysis": "Analisis completo de 5 secciones con headers. Usa EXACTAMENTE estos headers con **negrita**: Diagnostico General, Rentabilidad y Margenes, Oportunidades Estrategicas, Riesgos y Alertas, Resumen Ejecutivo para Junta.",',
  '  "version": "rayo-v6-2026-06"',
  '}',
  '',
  'REGLAS:',
  '- slide_2_metrics a slide_6: máximo 200 caracteres cada uno. Punchy, coloquial.',
  '- Headlines: máximo 60 caracteres. Como título de mensaje de WhatsApp.',
  '- slide_7_insights: bullets que suenan como si el gerente los dijera en voz alta.',
  '- slide_7_bullets: Phosphor icons, título corto, body con dato real.',
  '- slide_8_junta: recomendaciones que Felipe puede leer en 10 segundos.',
  '- slide_8_cards: emoji + categoría + acción + métrica.',
  '- slide_junta_mensaje: EL CAMPO CLAVE. Narrativa directa, coloquial, con productos reales y recomendaciones específicas. Como mensaje de WhatsApp al equipo a las 6am. 3-5 párrafos cortos. Mencionar productos por nombre, cantidades, comparaciones con período anterior.',
  '- NUNCA inventes datos. Si no hay dato, usa string vacío o array vacío.',
  '- Si no hay márgenes (margins es null), enfoca en ventas, zonas, y productos top.',
  '- Los campos _headline y _bullets/_cards son opcionales. slide_7_insights, slide_8_junta, y slide_junta_mensaje son obligatorios.',
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
  // v6 — mensaje al equipo
  slide_junta_mensaje?: string
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
  prompt += '\nIMPORTANTE: El campo slide_junta_mensaje es el más importante. Es un mensaje directo al equipo como el de este ejemplo:'
  prompt += '\n"Equipo, el jueves estuvo flojo: bajaron los cubiertos y el ticket promedio no subió. El mes va bien y cada servicio cuenta para sostenerlo.\nHoy vamos con todo: primera recomendación apenas llega la mesa, empujar nuestras pizzas y pastas, y que cada cliente sienta que vale la pena volver.\nSTELLA salió 17 veces anoche. Cuando el equipo lo recomienda bien, se nota. Y hoy vale la pena darle más protagonismo a los cocteles, que ayer estuvieron callados. Una buena recomendación puede cambiar eso.\nAsí se construye ATTIK. Gracias equipo, vamos con todo!"'
  prompt += '\n\nGenera el JSON EXACTO según el system prompt. Responde ÚNICAMENTE JSON válido. Sin texto adicional.'

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
      if (parsed && typeof parsed === 'object' && 'slide_2_metrics' in parsed) {
        return parsed as SlideAnalysisV2
      }
    }
  } catch {}

  try {
    const firstBrace = raw.indexOf('{')
    const lastBrace = raw.lastIndexOf('}')
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const jsonObject = raw.substring(firstBrace, lastBrace + 1)
      const parsed = JSON.parse(jsonObject)
      if (parsed && typeof parsed === 'object' && 'slide_2_metrics' in parsed) {
        return parsed as SlideAnalysisV2
      }
    }
  } catch {}

  return null
}

// ═══ Rule-based fallback v6 ═══
function generateRuleBasedAnalysisV2(data: {
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
}): SlideAnalysisV2 {
  const kpi = Array.isArray(data.kpis) ? data.kpis[0] : data.kpis
  const revenue = Number(kpi?.total_ventas ?? kpi?.revenue ?? 0)
  const cheques = Number(kpi?.total_cheques ?? 0)
  const personas = Number(kpi?.personas ?? 0)
  const propina = Number(kpi?.propina_total ?? kpi?.tip_total ?? 0)
  const ticket = cheques > 0 ? revenue / cheques : 0

  // Margins
  const mk = data.margins?.kpis
  const cats = data.margins?.resumen_ejecutivo?.categorias || []
  const importan = data.margins?.importan || []
  const drenan = data.margins?.drenan || []
  const hasMargins = mk && mk.total_productos > 0

  const bestCat = cats.length > 0 ? cats.reduce((best: any, c: any) => c.margin_pct > best.margin_pct ? c : best, cats[0]) : null
  const worstCat = cats.length > 0 ? cats.reduce((worst: any, c: any) => c.margin_pct < worst.margin_pct ? c : worst, cats[0]) : null
  const topProduct = importan.length > 0 ? importan[0] : null

  // Comparación
  const compKpi = data.comparison?.kpis ? (Array.isArray(data.comparison.kpis) ? data.comparison.kpis[0] : data.comparison.kpis) : null
  const compRevenue = Number(compKpi?.total_ventas ?? compKpi?.revenue ?? 0)
  const compCheques = Number(compKpi?.total_cheques ?? 0)
  const compTicket = compCheques > 0 ? compRevenue / compCheques : 0

  // ── Slides ──
  const s2 = 'Ventas ' + fmt(revenue) + '. ' + (hasMargins ? 'Margen ' + mk.margin_pct.toFixed(1) + '%.' : 'Sin datos de margen.') + ' ' + (cheques > 0 ? fmtN(cheques) + ' cheques, ticket ' + fmt(ticket) + '.' : '')
  const s3 = drenan.length > 0
    ? fmtN(drenan.length) + ' productos drenan — ' + (worstCat ? worstCat.categoria + ' es la más débil con ' + worstCat.margin_pct + '% margen.' : 'todos con ventas mínimas.')
    : 'Sin productos en riesgo de drenaje este período.'
  const s4 = topProduct
    ? topProduct.product_name + ' lidera con ' + fmt(topProduct.margin_bruto) + ' netos y ' + Math.round(topProduct.margin_pct) + '% margen.'
    : 'Sin datos de producto estrella.'
  const s5 = bestCat
    ? bestCat.categoria + ' lidera con ' + bestCat.margin_pct + '% margen. ' + (worstCat && worstCat.categoria !== bestCat.categoria ? worstCat.categoria + ' es la más débil con ' + worstCat.margin_pct + '%.' : 'Concentración saludable.')
    : 'Sin datos de composición.'
  const s6 = importan.length > 0 && drenan.length > 0
    ? 'Top 5 genera ' + fmt(importan.slice(0, 5).reduce((s: number, p: any) => s + Number(p.margin_bruto || 0), 0)) + ' netos vs ' + fmt(drenan.slice(0, 5).reduce((s: number, p: any) => s + Math.abs(Number(p.margin_bruto || 0)), 0)) + ' de los 5 últimos.'
    : 'Sin datos para comparar estrellas vs lastres.'

  // ── Headlines ──
  const s2_headline = mk
    ? 'Margen ' + mk.margin_pct.toFixed(1) + '% ' + (mk.margin_pct >= 30 ? 'supera' : 'bajo') + ' meta del 30%'
    : 'Ventas ' + fmt(revenue) + ' sin datos de rentabilidad'
  const s3_headline = drenan.length > 0
    ? fmtN(drenan.length) + ' productos drenan ganancias'
    : 'Sin productos en riesgo de drenaje'
  const s5_headline = bestCat
    ? bestCat.categoria + ' lidera con ' + bestCat.margin_pct + '% de margen'
    : 'Composición de margen por categoría'

  const insights: string[] = []
  if (topProduct) insights.push(topProduct.product_name.toUpperCase() + ' genera ' + fmt(topProduct.margin_bruto) + ' netos — el producto más rentable')
  if (bestCat) insights.push(bestCat.categoria + ' tiene ' + bestCat.margin_pct + '% margen con ' + fmtN(bestCat.count) + ' productos')
  if (worstCat && worstCat.categoria !== bestCat?.categoria) insights.push(worstCat.categoria + ' muestra solo ' + worstCat.margin_pct + '% margen — la categoría más débil')
  if (mk) insights.push('Margen general ' + mk.margin_pct.toFixed(1) + '% — ' + (mk.margin_pct >= 30 ? 'sobre meta del 30%' : 'bajo meta del 30%'))
  if (revenue > 0) insights.push('Ventas período: ' + fmt(revenue) + ' en ' + fmtN(cheques) + ' cheques')

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

  // ── MENSAJE AL EQUIPO (v6) ──
  // Generar narrativa estilo reporte diario de A&K
  const fecha = data.period.from + ' al ' + data.period.to
  const top3 = importan.slice(0, 3).map((p: any) => p.product_name)
  const catLider = bestCat ? bestCat.categoria : 'BEBIDAS'
  const margenPct = hasMargins ? mk.margin_pct.toFixed(1) : 'N/A'

  let mensaje = ''

  // Párrafo 1: diagnóstico general + comparación
  if (compRevenue > 0 && revenue > 0) {
    const changePct = ((revenue - compRevenue) / compRevenue * 100).toFixed(1)
    const direction = Number(changePct) >= 0 ? 'arriba' : 'abajo'
    mensaje += 'Equipo, el período va ' + direction + ': ventas ' + fmt(revenue) + ', ' + (Number(changePct) >= 0 ? '↑' : '↓') + Math.abs(Number(changePct)) + '% vs período anterior.'
    if (cheques > 0 && compCheques > 0) {
      const ticketChange = compTicket > 0 ? ((ticket - compTicket) / compTicket * 100).toFixed(1) : '0'
      mensaje += ' ' + (Number(ticketChange) >= 0 ? 'Ticket subió' : 'Ticket bajó') + ' ' + Math.abs(Number(ticketChange)) + '%.'
    }
  } else {
    mensaje += 'Ventas del período: ' + fmt(revenue) + ' en ' + fmtN(cheques) + ' cheques.'
  }
  if (hasMargins) {
    mensaje += ' Margen ' + margenPct + '% — ' + (Number(margenPct) >= 30 ? 'sobre meta. Cada peso cuenta.' : 'bajo meta del 30%. Hay que empujar margen.')
  }
  mensaje += '\n\n'

  // Párrafo 2: recomendaciones específicas por producto
  if (top3.length > 0) {
    mensaje += top3[0] + ' lidera con ' + (topProduct ? fmt(topProduct.margin_bruto) : 'buen margen') + ' netos.'
    if (top3.length > 1) {
      mensaje += ' ' + top3[1] + ' y ' + top3[2] + ' también son estrellas.'
    }
    mensaje += ' Primera recomendación apenas llega la mesa: empujar ' + top3.slice(0, 2).join(' y ') + '.'
  }
  if (worstCat) {
    mensaje += ' Y ojo con ' + worstCat.categoria.toLowerCase() + ' — ' + worstCat.margin_pct + '% margen, la más débil.'
  }
  mensaje += '\n\n'

  // Párrafo 3: llamado a la acción
  mensaje += (catLider === 'BEBIDAS' ? 'Los cocteles' : catLider) + ' jala. '
  if (drenan.length > 0) {
    mensaje += fmtN(drenan.length) + ' productos del menú tienen ventas mínimas — evaluar si valen la pena en la carta.'
  }
  mensaje += ' Cada servicio cuenta para sostener el mes. Vamos con todo.'

  const fullParts = [
    '⚡ **Diagnóstico General**',
    s2,
    '',
    '📊 **Rentabilidad y Márgenes**',
    'Margen general ' + (mk ? mk.margin_pct.toFixed(1) + '%' : 'N/A') + '. ' + (bestCat ? bestCat.categoria + ' lidera con ' + bestCat.margin_pct + '%' : 'Sin datos de categorías') + '. ' + (worstCat ? worstCat.categoria + ' es la más débil con ' + worstCat.margin_pct + '%' : ''),
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
    slide_8_junta: [
      '✅ ' + (bestCat ? bestCat.categoria.toUpperCase() : 'CATEGORÍA LÍDER') + ' — mantener precios y duplicar promociones en horas pico → margen arriba',
      '⚠ ' + fmtN(drenan.length) + ' productos en el 5% inferior por ganancia neta → evaluar menú y ajustar precios',
      '🔥 Margen general ' + margenPct + '% — ' + (Number(margenPct) >= 30 ? 'saludable, sobre meta' : 'bajo meta, empujar ventas de alto margen'),
    ],
    slide_8_cards: cards.slice(0, 3),
    slide_junta_mensaje: mensaje,
    slide_9_full_analysis: full,
    version: 'rayo-v6-2026-06',
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