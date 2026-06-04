// ═══ Informes Rayo — Analysis Pipeline ═══
// Groq Cloud (openai/gpt-oss-120b) con fallback a reglas locales
// Plan v3.1: análisis narrativo general (tendencia, aciertos, fallas, oportunidades)

// ═══ System Prompt ═══
const SYSTEM_PROMPT = `Eres un analista financiero especializado en restaurantes colombianos. Tu nombre es Rayo IA ⚡.

Analizas datos de A&K (Attic & Keller), un restaurante en Bogotá, Colombia. Moneda: COP (pesos colombianos).

ESTRUCTURA TU RESPUESTA EXACTAMENTE ASÍ (no agregues nada fuera de estas secciones):

⚡ **Tendencia General**
[2-3 líneas ejecutivas con el diagnóstico general del período]

📈 **Aciertos**
[3-5 bullets de lo que fue bien, con datos y desviaciones positivas. Usa formato: "- Zona X: $Y (↑Z%)"]

📉 **Fallas**
[2-4 bullets de lo que necesita atención, con datos y desviaciones negativas. Usa formato: "- Métrica: valor (↓Z%)"]

💡 **Oportunidades**
[3-5 acciones concretas que A&K puede tomar AHORA basadas en los datos]

📋 **Resumen para Junta**
[Exactamente 3 bullets para copiar en acta de junta directiva]

REGLAS:
- CANTIDADES en COP: "$1.2M", "$350K", no escribir "$1,200,000"
-PORCENTAJES con 1 decimal: "↑12.3%", "↓8.5%"
- Siempre basar conclusiones en LOS DATOS proporcionados, no inventar
- Si los datos son insuficientes, decir "Datos insuficientes" en esa sección
- NO agregar secciones extras, NO poner títulos adicionales
- Respuesta en español colombiano`

function buildAnalysisPrompt(data: {
  kpis: any
  daily: any[]
  zones: any[]
  staff: any[]
  payments: any[]
  clientSplit: any[]
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

  prompt += `\n\n═══ KPIs PRINCIPALES ═══`

  if (kpi) {
    const revenue = Number(kpi.total_ventas || kpi.revenue || 0)
    const cheques = Number(kpi.total_cheques || 0)
    const personas = Number(kpi.personas || 0)
    const propina = Number(kpi.propina_total || kpi.tip_total || 0)

    prompt += `\n- Ventas totales: ${fmt(revenue)}`
    prompt += `\n- Cheques: ${cheques.toLocaleString('es-CO')}`
    prompt += `\n- Ticket promedio: ${fmt(cheques > 0 ? revenue / cheques : 0)}`
    prompt += `\n- Personas: ${personas.toLocaleString('es-CO')}`
    prompt += `\n- Propina: ${fmt(propina)}`
    prompt += `\n- Propina/persona: ${fmt(personas > 0 ? propina / personas : 0)}`

    if (compKpi) {
      const compRevenue = Number(compKpi.total_ventas || compKpi.revenue || 0)
      const compCheques = Number(compKpi.total_cheques || 0)
      const compPersonas = Number(compKpi.personas || 0)
      const compPropina = Number(compKpi.propina_total || compKpi.tip_total || 0)

      prompt += `\n\n═══ COMPARACIÓN (período anterior) ═══`
      prompt += `\n- Ventas anterior: ${fmt(compRevenue)} (${pct(revenue, compRevenue)})`
      prompt += `\n- Cheques anterior: ${compCheques.toLocaleString('es-CO')} (${pct(cheques, compCheques)})`
      prompt += `\n- Personas anterior: ${compPersonas.toLocaleString('es-CO')} (${pct(personas, compPersonas)})`
      prompt += `\n- Propina anterior: ${fmt(compPropina)} (${pct(propina, compPropina)})`
    }
  }

  if (data.zones && data.zones.length > 0) {
    prompt += `\n\n═══ POR ZONA ═══`
    for (const z of data.zones) {
      const zName = z.zone || z.derived_zone_name || z.name || 'Sin zona'
      const zRevenue = Number(z.total_ventas || z.revenue || 0)
      prompt += `\n- ${zName}: ${fmt(zRevenue)}, ${Number(z.total_cheques || z.cheques || 0)} cheques, ${Number(z.personas || 0)} personas`
    }
  }

  if (data.payments && data.payments.length > 0) {
    prompt += `\n\n═══ MÉTODOS DE PAGO ═══`
    for (const p of data.payments) {
      const method = p.payment_method || p.metodo || p.method || 'Otro'
      prompt += `\n- ${method}: ${fmt(Number(p.total || p.total_ventas || 0))}, ${Number(p.cheques || p.total_cheques || 0)} cheques`
    }
  }

  prompt += `\n\nAnaliza estos datos con la estructura requerida.`
  return prompt
}

// ═══ Rule-based fallback (sin IA) ═══
function generateRuleBasedAnalysis(data: {
  kpis: any
  daily: any[]
  zones: any[]
  staff: any[]
  payments: any[]
  clientSplit: any[]
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

  const fmt = (n: number) => {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
    if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
    return `$${Math.round(n).toLocaleString('es-CO')}`
  }

  const pcts: string[] = []
  let tendencia = 'Los datos del período muestran actividad operativa.'

  if (compKpi) {
    const compRevenue = Number(compKpi.total_ventas || compKpi.revenue || 0)
    const compCheques = Number(compKpi.total_cheques || 0)
    const compPersonas = Number(compKpi.personas || 0)

    const revPct = compRevenue > 0 ? ((revenue - compRevenue) / compRevenue) * 100 : 0
    const chkPct = compCheques > 0 ? ((cheques - compCheques) / compCheques) * 100 : 0
    const perPct = compPersonas > 0 ? ((personas - compPersonas) / compPersonas) * 100 : 0

    if (revPct > 0) pcts.push(`ventas ${revPct >= 0 ? '↑' : '↓'}${Math.abs(revPct).toFixed(1)}%`)
    if (chkPct > 0) pcts.push(`cheques ${chkPct >= 0 ? '↑' : '↓'}${Math.abs(chkPct).toFixed(1)}%`)

    tendencia = revPct >= 0
      ? `El período muestra un crecimiento del ${Math.abs(revPct).toFixed(1)}% en ventas vs período anterior.`
      : `Las ventas cayeron ${Math.abs(revPct).toFixed(1)}% vs período anterior.`
  }

  // Zone highlights
  const zoneHighlights = (data.zones || []).slice(0, 3).map((z: any) => {
    const name = z.zone || z.derived_zone_name || z.name || 'Sin zona'
    const rev = Number(z.total_ventas || z.revenue || 0)
    return `${name}: ${fmt(rev)}`
  })

  let analysis = `⚡ **Tendencia General**\n${tendencia}`

  analysis += `\n\n📈 **Aciertos**`
  if (revenue > 0) analysis += `\n- Ventas del período: ${fmt(revenue)}`
  if (cheques > 0) analysis += `\n- ${cheques} cheques atendidos`
  if (personas > 0) analysis += `\n- ${personas.toLocaleString('es-CO')} personas atendidas`
  if (pcts.length > 0 && pcts.some(p => p.includes('↑'))) analysis += `\n- Crecimiento en ${pcts.filter(p => p.includes('↑')).join(', ')}`

  analysis += `\n\n📉 **Fallas**`
  if (ticket > 0 && ticket < 15000) analysis += `\n- Ticket promedio bajo: ${fmt(ticket)}`
  if (pcts.some(p => p.includes('↓'))) analysis += `\n- Caída en ${pcts.filter(p => p.includes('↓')).join(', ')}`

  analysis += `\n\n💡 **Oportunidades**`
  if (ticket < 20000) analysis += `\n- Promocionar platos de mayor valor para subir ticket promedio`
  if (data.zones?.length > 0) analysis += `\n- Analizar rendimiento por zona: ${zoneHighlights.join(', ')}`
  analysis += `\n- Revisar horas pico para optimar staffing`
  if (propina < revenue * 0.05) analysis += `\n- Propina baja (${(propina / (revenue || 1) * 100).toFixed(1)}%) — evaluar sugerencia automática`

  analysis += `\n\n📋 **Resumen para Junta**`
  analysis += `\n- Ventas: ${fmt(revenue)}${pcts.length > 0 ? ` (${pcts[0]})` : ''}`
  analysis += `\n- Cheques: ${cheques.toLocaleString('es-CO')}, Personas: ${personas.toLocaleString('es-CO')}`
  analysis += `\n- Ticket promedio: ${fmt(ticket)}`

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
        max_tokens: 2000,
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