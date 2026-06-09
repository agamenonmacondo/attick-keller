/**
 * Tipos unificados para el generador de PDF Informes Rayo
 * PDF vectorial con Chart.js + jsPDF
 */

export interface KPIData {
  total_ventas: number;
  total_cheques: number;
  ticket_promedio: number;
  propina_total: number;
  personas: number;
  propina_promedio: number;
  avg_service_time: number;
  card_paid: number;
  cash_paid: number;
}

export interface ZoneData {
  zone: string;
  total_ventas: number;
  total_cheques: number;
  propina: number;
  avg_service_time: number;
  personas: number;
  ticket_promedio: number;
}

export interface PaymentData {
  payment_method: string;
  total: number;
  cheques: number;
  pct: number;
}

export interface TopProduct {
  product_name: string;
  category_name: string;
  quantity: number;
  revenue: number;
}

export interface MarginKPIs {
  total_revenue: number;
  margin_bruto: number;
  margin_pct: number;
  total_productos: number;
}

export interface CategorySummary {
  categoria: string;
  revenue: number;
  margin_pct: number;
  importan: number;
  drenan: number;
  count: number;
}

export interface ProductMargin {
  product_name: string;
  macro_category: string;
  revenue: number;
  cost_total: number;
  margin_bruto: number;
  margin_pct: number;
  quantity_sold: number;
  diagnostico?: string;
}

export interface LLMAnalysis {
  analysis: string;
  source: 'llm' | 'rules';
}

export interface DailyData {
  date: string;
  revenue: number;
}

export interface AllData {
  kpis: KPIData;
  zones: ZoneData[];
  payments: PaymentData[];
  topProducts: TopProduct[];
  marginKPIs: MarginKPIs;
  categories: CategorySummary[];
  importan: ProductMargin[];
  drenan: ProductMargin[];
  llmAnalysis: LLMAnalysis;
  from: string;
  to: string;
  daily: DailyData[];
  comparison?: { kpis: KPIData } | null;
}
