# DISEÑO UX — Panel de Hosts v2
## Multi-Reserva, Urgencia, Reasignación, y Walk-in Inteligente

---

## 1. FUNCIONALIDADES SOLICITADAS

### 1A. Mesa → Todas sus reservas
- Al tocar una mesa, ver la LÍNEA DE TIEMPO completa de reservas esa noche
- Cada reserva muestra: nombre, hora, personas, estado
- Reserva actual (en curso) destacada, próximas en gris/secundario
- Posibilidad de expandir una reserva para ver detalle completo (tel, email, notas)

### 1B. Urgencia Visual
- Mesa con reserva en ≤15 min: **ROJO pulsante** + badge "15m"
- Mesa con reserva en 16-30 min: **NARANJA** + badge "30m"
- Mesa con reserva en 31-60 min: **AZUL** + badge "1h"
- Mesa libre sin nada cercano: verde normal
- Mesa ocupada сейчас (sentados): **BURDEOS** sólido

### 1C. Reasignar Mesas (Admin)
- Botón para mover una reserva de una mesa a otra
- Dropdown de mesas disponibles filtrado por capacidad y zona
- Cuando llueve o hay cambio, poder mover reservas de mesas exteriores a interiores
- Confirmación antes de mover

### 1D. Walk-in con Dropdown Inteligente
- Al crear walk-in, elegir # de personas
- Dropdown muestra SOLO mesas disponibles para ese # de personas en ese horario
- Cada opción muestra: Mesa X · Zona · Capacidad · "Libre hasta las 20:00"
- Filtro automático por zona si se selecciona

### 1E. Datos Completos del Cliente
- En cada reserva (card, popover, timeline): nombre + teléfono + email + notas
- Teléfono con ícono WhatsApp clickable
- Email con ícono de sobre
- Notas/special_requests en sección destacada

---

## 2. MODELO DE DATOS

### 2A. API Response Shape — /api/admin/occupancy

```ts
interface ReservationTimeline {
  id: string
  status: 'pending' | 'confirmed' | 'pre_paid' | 'seated' | 'completed' | 'no_show' | 'cancelled'
  party_size: number
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  special_requests: string | null
  time_start: string   // "18:00"
  time_end: string     // "20:00"
  is_current: boolean  // reserva activa ahora
  is_past: boolean     // ya terminó
  is_upcoming: boolean // todavía no empieza
}

interface TableItem {
  id: string
  number: string
  name_attick: string | null
  capacity: number
  zone_id: string
  zone_name: string
  can_combine: boolean
  combine_group: string | null

  // Timeline de reservas
  reservations: ReservationTimeline[]
  current_reservation: ReservationTimeline | null
  next_reservation: ReservationTimeline | null
  urgency_level: 'urgent' | 'warning' | 'info' | 'none'

  // Backward compat
  is_occupied: boolean
  current_reservation_id: string | null
  current_party_size: number | null
  current_customer_name: string | null
  current_time: string | null
  reservation_status: string | null
}
```

### 2B. Urgency Computation

```ts
function computeUrgency(nowHHMM: string, nextStart: string | null): UrgencyLevel {
  if (!nextStart) return 'none'
  const diff = diffMinutes(nowHHMM, nextStart)
  if (diff <= 15) return 'urgent'
  if (diff <= 30) return 'warning'
  if (diff <= 60) return 'info'
  return 'none'
}
```

---

## 3. DISEÑO VISUAL — COMPONENTES

### 3A. Mesa Card (vista de grilla)

```
┌──────────────────────────┐
│ ⚠ 15m              Mesa 3B │  ← badge urgencia + nombre
│                        6p  │  ← capacidad
│ ━━━━━━━░░░░           │  ← mini-timeline (barrita)
│ 🟢 Tipi               │  ← zona
│ 📱 Juan Pérez          │  ← cliente actual (si hay)
│ 19:00 - 21:00         │  ← horario actual
│ ⏳ 21:30 - María García │  ← próxima reserva
└──────────────────────────┘
```

### 3B. Popover Expandible (al tocar mesa)

```
┌─────────────────────────────────────┐
│ Mesa 3B · Tipi (6 personas)    [✕] │
│                                     │
│ ── AHORA ───────────────────────── │
│ 🟢 Juan Pérez              6 personas│
│    19:00 - 21:00  ● Confirmado       │
│    📱 310 555 1234                    │
│    ✉️ juan@email.com                  │
│    📝 Alergia a mariscos              │
│                              [Sentados]│
│                                      │
│ ── PRÓXIMA ──────────────────────── │
│ 🟠 María García            4 personas │
│    21:30 - 23:00  ● Confirmado       │
│    ⚠ Empieza en 30 min              │
│    📱 310 666 7890                    │
│                              [Reasignar]│
│                                      │
│ ── MÁS TARDE ────────────────────── │
│ ⏳ Carlos López             2 personas │
│    23:00 - 23:30  ● Pre-pagado       │
│                                      │
│ ── ACCIONES ─────────────────────── │
│ [+ Walk-in]  [Reasignar reserva]     │
└─────────────────────────────────────┘
```

### 3C. Walk-in con Dropdown Inteligente

```
┌─────────────────────────────────────┐
│ Nuevo Walk-in                       │
│                                     │
│ Nombre: [________________]          │
│ Teléfono: [________________]        │
│                                      │
│ # Personas:  [- 2 +]               │
│                                      │
│ Mesa sugerida:                      │
│ ┌────────────────────────────────┐  │
│ │ Mesa 3B · Tipi (6p)    ⭐ 95% │  │ ← algoritmo
│ │ Mesa 5B · Tipi (4p)    □ 88%  │  │
│ │ Mesa 1B · Tipi (4p)    □ 82%  │  │
│ │ Mesa 2A · Taller (9p)  □ 78%  │  │
│ └────────────────────────────────┘  │
│                                      │
│ Horario: [18:30] (predeterminado)   │
│                                      │
│           [Confirmar Walk-in]        │
└─────────────────────────────────────┘
```

### 3D. Modal de Reasignación

```
┌─────────────────────────────────────┐
│ Reasignar Reserva                   │
│                                     │
│ Juan Pérez · 6 personas             │
│ 19:00 - 21:00 · Mesa 3B · Tipi      │
│                                      │
│ Mover a:                             │
│ ┌────────────────────────────────┐  │
│ │ 🟢 Mesa 5B · Tipi (4p)       │  │ ← disponible
│ │   Libre hasta 21:30            │  │
│ │ 🟡 Mesa 9A · Taller (3p)     │  │ ← warning
│ │   Libre 18:00-18:30            │  │
│ │ 🔵 Mesa 1D · Chispas (10p)   │  │ ← info
│ │   Libre toda la noche          │  │
│ └────────────────────────────────┘  │
│                                      │
│  [Cancelar]      [Confirmar Move]   │
└─────────────────────────────────────┘
```

---

## 4. COLORES Y ANIMACIONES

| Estado | Borde | Badge | Animación |
|--------|-------|-------|-----------|
| Disponible | Verde #5C7A4D | — | Ninguna |
| Reservado (lejos) | Ámbar #D4922A | — | Ninguna |
| Info (31-60 min) | Azul #1565C0 | "1h" | Ninguna |
| Warning (16-30 min) | Naranja #E65100 | "30m" | Suave pulso |
| Urgent (≤15 min) | Rojo #C62828 | "15m" | Pulso fuerte |
| Ocupado (sentado) | Burdeos #6B2737 | — | Ninguna |
| Transición (entre reservas) | Púrpura #7B1FA2 | — | Ninguna |

---

## 5. FLUJO DE ACCIONES

### 5A. Al tocar una mesa
1. Si está libre: muestra dropdown de "Asignar reserva" (reservas sin mesa + walk-in)
2. Si tiene reservas: muestra popover con timeline completo
3. Desde el popover: botones de Sentar/Liberar/Reasignar por cada reserva

### 5B. Reasignar reserva
1. Click en "Reasignar" en la reserva
2. Abre modal con mesas disponibles filtradas por:
   - Capacidad ≥ party_size
   - Sin solapamiento de horario (con buffer de 30 min)
   - Ordenadas por score del algoritmo
3. Confirmar → PATCH reservation con nuevo table_id
4. Si es mesa exterior y llueve → priorizar mesas interiores

### 5C. Walk-in inteligente
1. Click en botón "+" (FAB)
2. Ingresar nombre, personas
3. Dropdown de mesas calculado con assignTable()
4. Cada opción muestra score y disponibilidad horaria
5. Confirmar → POST reservation con table_id asignado

---

## 6. ARCHIVOS A MODIFICAR

### Backend (FASE 1)
1. `src/lib/utils/time.ts` — helpers de tiempo Colombia
2. `src/lib/utils/urgency.ts` — computeUrgency(), diffMinutes()
3. `src/app/api/admin/occupancy/route.ts` — Map<id, Reservation[]> + urgency + customer data
4. `src/app/api/admin/floorplan/route.ts` — Same + customer phone/email
5. `src/app/api/admin/dashboard/route.ts` — Same grouping change
6. `src/lib/algorithms/table-assignment.ts` — Comment fix + turnover buffer

### Frontend (FASE 2-3)
7. `src/lib/hooks/useHostOccupancy.ts` — Nueva interfaz TableItem
8. `src/components/host/HostTableMap.tsx` — Urgencia + mini-timeline + popover expandido
9. `src/components/host/HostWalkInForm.tsx` — Dropdown inteligente de mesas
10. `src/components/host/HostReservationQueue.tsx` — Datos completos del cliente
11. NEW: `src/components/host/ReassignModal.tsx` — Modal de reasignación
12. NEW: `src/components/host/ReservationDetail.tsx` — Detalle expandible de reserva