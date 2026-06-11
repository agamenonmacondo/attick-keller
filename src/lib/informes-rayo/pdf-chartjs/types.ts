/**
 * Tipos unificados para el generador de PDF Informes Rayo v7
 * PDF vectorial puro con jsPDF — Dark Claude Design
 */

export interface KPIData {
  total_ventas: number
  total_cheques: number
  ticket_promedio: number
  propina_total: number
  personas: number
  propina_promedio: number
  avg_service_time: number
  card_paid: number
  cash_paid: number
}

export interface ZoneData {
  zone: string
  total_ventas: number
  total_cheques: number
  propina: number
  avg_service_time: number
  personas: number
  ticket_promedio: number
}

export interface PaymentData {
  payment_method: string
  total: number
  cheques: number
  pct: number
}

export interface TopProduct {
  product_name: string
  category_name: string
  quantity: number
  revenue: number
}

export interface MarginKPIs {
  total_revenue: number
  margin_bruto: number
  margin_pct: number
  total_productos: number
}

export interface CategorySummary {
  categoria: string
  revenue: number
  margin_pct: number
  importan: number
  drenan: number
  count: number
}

export interface ProductMargin {
  product_name: string
  macro_category: string
  revenue: number
  cost_total?: number
  margin_bruto: number
  margin_pct: number
  quantity_sold?: number
  diagnostico?: string
}

export interface SlideAnalysisV2 {
  slide_2_headline?: string
  slide_2_metrics?: string
  slide_3_headline?: string
  slide_3_drena?: string
  slide_4_importan?: string
  slide_5_headline?: string
  slide_5_composicion?: string
  slide_6_estrellas_lastre?: string
  slide_7_bullets?: { icon: string; title: string; body: string }[]
  slide_7_insights?: string[]
  slide_8_cards?: { emoji: string; title: string; action: string; metric: string }[]
  slide_8_junta?: string[]
  slide_junta_mensaje?: string
}

export interface DailyData {
  date: string
  revenue: number
}

export interface AllData {
  from: string
  to: string
  kpis: KPIData
  zones: ZoneData[]
  payments: PaymentData[]
  topProducts: TopProduct[]
  marginKPIs: MarginKPIs
  categories: CategorySummary[]
  importan: ProductMargin[]
  drenan: ProductMargin[]
  todos: ProductMargin[]
  analysis: SlideAnalysisV2 | null
  daily: DailyData[]
  comparison?: { kpis: KPIData } | null
}
