/** Restaurant ID for Attick & Keller — shared between client and server code */
export const RESTAURANT_ID = 'a0000000-0000-0000-0000-000000000001'

/**
 * Etiquetas legibles de las sedes — compartidas por los paneles de nómina
 * (Fase 4.4 — antes duplicado en NominaContablePanel y NominaUnifiedPanel).
 */
export const SEDE_LABELS: Record<string, string> = {
  C75: 'Calle 75',
  C85: 'Calle 85',
  KINDER: 'Kinder',
  ADMIN: 'Admin',
}

/** Sedes disponibles para los selectores de nómina (orden de visualización) */
export const SEDES = ['C75', 'C85', 'KINDER', 'ADMIN']