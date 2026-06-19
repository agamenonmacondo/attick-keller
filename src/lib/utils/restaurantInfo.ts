/**
 * Single source of truth for Attick & Keller restaurant contact info,
 * address and opening hours. Used by Footer, ReserveInfoSection and any
 * page that needs to show practical info — keeps the brand data in one place
 * so it never drifts between components again.
 */

export const RESTAURANT_INFO = {
  name: 'Attick & Keller',
  tagline: 'Cocina de autor',
  city: 'Bogotá',
  country: 'Colombia',

  address: {
    line1: 'Carrera 13 #75-51',
    city: 'Bogotá',
    country: 'Colombia',
    /** Full one-line address used in copy/footers. */
    full: 'Carrera 13 #75-51, Bogotá, Colombia',
    /** Google Maps search URL (no API key, works for any address). */
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Attick+%26+Keller+Carrera+13+%2375-51+Bogot%C3%A1',
  },

  phone: {
    /** Display form, keeps the space for readability. */
    display: '310 787 4752',
    /** Tel-link form (digits only, +57 country code). */
    href: 'tel:+573107874752',
  },

  email: 'reservas@attickkeller.com',
  web: 'atticandkeller.mesa247.la',
  webUrl: 'https://atticandkeller.mesa247.la',

  social: {
    instagram: {
      handle: '@attic_keller',
      url: 'https://instagram.com/attic_keller',
    },
  },

  /**
   * Opening hours per weekday group. `open`/`close` are 24h "HH:mm" strings.
   * Source: verified by the brand — Mar–Mi 12:00–00:00, Jue 12:00–01:30,
   * Vie–Sáb 12:00–02:00, Dom–Lun 12:00–22:00.
   */
  hours: [
    { days: 'Mar – Mié', open: '12:00', close: '00:00', label: '12:00 pm – 12:00 am' },
    { days: 'Jueves', open: '12:00', close: '01:30', label: '12:00 pm – 1:30 am' },
    { days: 'Vie – Sáb', open: '12:00', close: '02:00', label: '12:00 pm – 2:00 am' },
    { days: 'Dom – Lun', open: '12:00', close: '22:00', label: '12:00 pm – 10:00 pm' },
  ] as const,

  /** Short single-line summary for tight spaces (hero/footers). */
  hoursSummary: 'Mar – Dom · 12:00 pm hasta tarde',
} as const

export type RestaurantInfo = typeof RESTAURANT_INFO