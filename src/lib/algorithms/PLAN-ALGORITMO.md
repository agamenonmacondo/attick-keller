# Plan de Implementación — Algoritmo de Asignación de Mesas

## Estado Actual (Mayo 2026)

### ✅ Completadas:
- **FASE 1**: Migraciones SQL listas (pendiente María las corra en Supabase)
- **FASE 2**: Algoritmo puro (686 líneas, `table-assignment.ts`)
- **FASE 3**: API de disponibilidad (`/api/availability`)
- **FASE 4**: Form de reserva con horas dinámicas (`reservar/page.tsx`)
- **FASE 5**: Host panel con sugerencias automáticas

### 🔄 En progreso:
- **FASE 6**: Autoaprendizaje (correcciones → ajustan puntajes de zona) — requiere migración `assignment_corrections`

### ❌ Problemas encontrados:

1. **Zonas de la DB no coinciden** — La DB tiene 3 zonas (Interior, Terraza, Bar) pero el restaurante real tiene 5 (Taller/A, Tipi/B, Jardín/C, Chispas/D, Ático/E). Las zonas del inventario auditado no están en producción.

2. **Asignación de mesas es NAIVE** — `POST /api/reservations` solo busca la primera mesa que quepa en la zona, sin validar solapamiento de horarios ni usar el algoritmo.

3. **Horarios hardcodeados** — El form de reserva muestra siempre las mismas 14 horas, sin verificar disponibilidad real.

4. **`availability` vacía** — La tabla existe pero no tiene datos ni código que la use.

5. **`table_combinations` vacía** — A pesar de que 14 mesas tienen `can_combine=true`, no hay combinaciones configuradas.

6. **6 de 14 reservas sin mesa** — La asignación manual funciona pero es impráctica.

7. **Algoritmo desconectado** — `table-assignment-sim.ts` existe pero no está integrado, usa datos de prueba, y no maneja combinaciones.

8. **Sin flujo de sugerencia** — El host ve reservas sin mesa y las asigna una por una manualmente.

---

## Plan de Implementación (6 fases)

### FASE 1: Sincronizar DB con la realidad 🗄️
**Prioridad: CRÍTICA — todo lo demás depende de esto**

- [ ] Migración SQL: Actualizar `table_zones` con las 5 zonas reales
  - Taller (A), Tipi (B), Jardín (C), Chispas (D), Ático (E)
  - Incluir `zone_letter`, `color`, `icon` en la tabla
- [ ] Migración SQL: Actualizar las 45 mesas con datos del inventario auditado
  - `number` = "1A", "2A", ..., "9E"
  - `name_attick` = "Sala 1", "T.P. 20", etc.
  - `capacity`, `capacity_min` correctos
  - `can_combine`, `combine_group` correctos
- [ ] Migración SQL: Seed `table_combinations` con las combinaciones posibles
  - Taller: 4A+5A, 4A+5A+6A, etc. (7 mesas combinables)
  - Jardín: 2C+3C, 2C+3C+4C, etc. (7 mesas combinables)
- [ ] Migración SQL: Seed `availability` con horarios de servicio
  - Martes-Miércoles: 12:00-00:00
  - Jueves: 12:00-01:30
  - Viernes-Sábado: 12:00-02:00
  - Domingo-Lunes: 12:00-22:00
- [ ] Verificar que `zone_letter` y `floor_num` existen en `table_zones`

**Entregable:** DB con 5 zonas, 45 mesas correctas, combinaciones configuradas, horarios de servicio.

---

### FASE 2: Algoritmo puro (motor) ⚙️
**Prioridad: ALTA — el corazón del sistema**

Archivo: `src/lib/algorithms/table-assignment.ts`

```typescript
// Interfaces principales
interface AssignmentInput {
  reservation: {
    id: string;
    party_size: number;
    date: string;       // YYYY-MM-DD
    time_start: string; // HH:MM
    time_end: string;   // HH:MM
  };
  available_tables: TableWithZone[];  // de la DB
  existing_reservations: Reservation[]; // del mismo día/solapamiento
  zone_scores?: ZoneScores;  // para autocorrección
}

interface AssignmentResult {
  suggested_table_id: string | null;
  suggested_combination_id?: string | null;
  alternatives: Alternative[];
  score: number;
  breakdown: {
    capacity_fit: number;   // 40%
    zone_priority: number;  // 30%
    waste_penalty: number;  // 20%
    combine_bonus: number;  // 10%
  };
  reason: string;  // explicación para el host
}

// Función principal
function assignTable(input: AssignmentInput): AssignmentResult;
```

**Reglas del algoritmo:**
1. PROTEGER combinables (no parejas en mesas combinables)
2. PRIORIZAR grupos grandes (12→10→9→8→7→6→5→4→3→2)
3. Combinar mesas para grupos de 4+ cuando no hay individual
4. Ruteo por hora: temprano → zonas bajas, pico → zonas altas
5. Fit: grupo llena la mesa al máximo, desperdicio penaliza
6. Zona: Tipi(100) > Taller(80) > Jardín(60) > Chispas(40) > Ático(20)

**Entregable:** `table-assignment.ts` con `assignTable()` puro, testeable, sin dependencias de DB.

---

### FASE 3: API de disponibilidad 🔍
**Prioridad: ALTA — el form de reserva necesita esto**

Archivo: `src/app/api/availability/route.ts`

```
GET /api/availability?date=2026-05-10&party_size=10

Respuesta:
{
  "date": "2026-05-10",
  "party_size": 10,
  "slots": [
    { "time": "18:00", "available": true, "tables": 3 },
    { "time": "18:30", "available": true, "tables": 3 },
    { "time": "19:00", "available": true, "tables": 2 },
    { "time": "19:30", "available": true, "tables": 2 },
    { "time": "20:00", "available": false, "tables": 0 },  // PICO
    { "time": "20:30", "available": false, "tables": 0 },
    { "time": "21:00", "available": true, "tables": 1 },
    { "time": "21:30", "available": true, "tables": 1 }
  ]
}
```

**Lógica:**
1. Leer `availability` para el día de la semana
2. Para cada slot, contar mesas donde `party_size` cabe y no hay solapamiento con reservas existentes
3. Marcar como disponible solo si hay al menos 1 mesa o combinación posible
4. Si no hay mesa individual, verificar combinaciones

**Entregable:** Endpoint que el form de reserva consulta para mostrar solo horas disponibles.

---

### FASE 4: Integración en el form de reserva 📱
**Prioridad: MEDIA — UX para el cliente**

Archivo: `src/app/reservar/page.tsx`

**Cambios:**
1. Paso 1: Cliente elige fecha + personas
2. Llama a `/api/availability?date=X&party_size=Y`
3. Muestra SOLO las horas con disponibilidad
4. Horas sin disponibilidad: aparececen como bloqueadas ("No disponible")
5. Si ninguna hora disponible: mensaje "No hay disponibilidad para esa fecha"
6. Paso 2: Confirmar + teléfono + peticiones
7. Al confirmar, `POST /api/reservations` llama al algoritmo para asignar mesa

**Entregable:** Form que solo muestra horas reales disponibles.

---

### FASE 5: Host panel con sugerencias 👨‍💼
**Prioridad: MEDIA — UX para el anfitrión**

Archivos: `HostTableMap.tsx`, `useTableAssignment.ts`

**Cambios:**
1. Nuevo hook `useTableAssignment(reservationId)` → llama al algoritmo
2. Al hacer clic en reserva sin mesa → muestra sugerencia + alternativas
3. Botón "Aceptar sugerencia" → asigna la mesa recomendada
4. Botón "Cambiar" → el host elige otra mesa manualmente
5. Cada corrección se registra en `assignment_corrections` (fase 6)

**Entregable:** Host panel con sugerencias automáticas y flujo aceptar/cambiar.

---

### FASE 6: Autoaprendizaje (futuro) 🧠
**Prioriedad: BAJA — después de que todo funcione**

Tabla nueva: `assignment_corrections`
```sql
CREATE TABLE assignment_corrections (
  id UUID PRIMARY KEY,
  reservation_id UUID REFERENCES reservations,
  suggested_table_id UUID REFERENCES tables,
  actual_table_id UUID REFERENCES tables,
  suggested_zone_letter TEXT,
  actual_zone_letter TEXT,
  created_at TIMESTAMPTZ
);
```

**Lógica:**
- Cada vez que el host cambia la mesa sugerida → registro
- Cada semana, calcular % de correcciones por zona
- Si Tipi tiene 90% de aceptación → score sube
- Si Ático tiene 50% de aceptación → score baja
- Los scores ajustados alimentan el algoritmo

**Entregable:** Sistema que aprende de los operadores.

---

## Orden de ejecución

```
FASE 1 (DB) → FASE 2 (Algoritmo) → FASE 3 (API) → FASE 4 (Form) → FASE 5 (Host) → FASE 6 (Autoaprendizaje)
     ↑              ↑                    ↑                ↑                ↑                    ↑
   1-2 días       2-3 días            1-2 días          1 día           2-3 días            1-2 días
```

**Total estimado: 8-13 días**

---

## Decisión pendiente de Alejandro

- [ ] ¿Las 5 zonas reales (Taller, Tipi, Jardín, Chispas, Ático) reemplazan las 3 actuales (Interior, Terraza, Bar)?
- [ ] ¿Confirma los horarios de servicio para `availability`?
- [ ] ¿La FASE 1 se hace ahora o se espera a después?
- [ ] ¿El algoritmo se configura con los pesos que discutimos? (40% capacidad, 30% zona, 20% desperdicio, 10% combinación)