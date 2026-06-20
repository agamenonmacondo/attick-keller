/**
 * Formato compartido para los paneles de nómina.
 *
 * `formatCOP`     — versión compacta (M/K), para KPIs y tarjetas donde el espacio es escaso.
 * `formatCOPFull`  — versión completa con separadores de miles, para tablas contables.
 *
 * Antes estas dos funciones estaban duplicadas en NominaPanel, NominaUnifiedPanel y
 * NominaContablePanel (Fase 4.4 — consolidación).
 */

// Compacto: $1.2M / $45K / $1.234
export function formatCOP(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString('es-CO')}`;
}

// Completo: $1.234.567 — para tablas contables donde la cifra exacta importa
export function formatCOPFull(n: number): string {
  if (n == null || isNaN(n)) return '$0';
  return '$' + Math.round(n).toLocaleString('es-CO');
}