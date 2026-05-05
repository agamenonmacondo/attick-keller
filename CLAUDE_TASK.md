# CLAUDE TASK — mejorar UI de ocupación, plano y host

Eres un desarrollador senior trabajando en el proyecto Attick & Keller (Next.js 14, TypeScript, Supabase, Tailwind, Framer Motion).

## REGLAS
- NO cambies la lógica del algoritmo de asignación
- NO toques archivos que no se mencionan aquí
- NO agregues dependencias nuevas
- Sigue el diseño visual existente (colores tierra, serif Playfair Display para títulos, @phosphor-icons/react)
- Los textos en ESPAÑOL
- Al terminar, corre `npx tsc --noEmit` para verificar 0 errores de TypeScript

---

## TAREA 1: FloorPlanMap — agregar detalles del cliente y acciones en la burbuja

**Problema:** Cuando el usuario hace clic en una burbuja del plano, el `TableDetailContent` solo muestra nombre, hora y capacidad. No muestra teléfono, email, notas, ni acciones (sentar, reasignar, liberar).

**Archivo:** `/mnt/f/attick-keller/web/src/components/admin/floorplan/FloorPlanMap.tsx`

**Pasos:**

1. **Ampliar el tipo `TableWithPosition`** en `/mnt/f/attick-keller/web/src/lib/hooks/useFloorPlan.ts` — agregar estos campos opcionales:
```typescript
export interface TableWithPosition {
  // ...campos existentes...
  customer_phone: string | null     // NUEVO
  customer_email: string | null     // NUEVO
  special_requests: string | null   // NUEVO
  reservation_status: string | null // NUEVO: 'confirmed' | 'pre_paid' | 'seated' | 'pending' | etc.
}
```

2. **Ampliar la API** `/mnt/f/attick-keller/web/src/app/api/admin/floorplan/route.ts`:
   - En la query de reservas, agregar `customers(full_name, phone, email)` y `special_requests, status`
   - En el mapeo de respuesta (around line 97-111), agregar los nuevos campos:
```typescript
return {
  // ...campos existentes...
  customer_phone: cust?.phone ?? null,
  customer_email: cust?.email ?? null,
  special_requests: reservation?.special_requests ?? null,
  reservation_status: reservation?.status ?? null,
}
```

3. **Mejorar `TableDetailContent`** en FloorPlanMap.tsx (lines 300-376):
   - Reemplace la sección de información del cliente con datos de contacto expandibles:
   - Agregar WhatsApp link (https://wa.me/57{phone}), email link (mailto:), notas con ícono de nota
   - Importar `WhatsappLogo, EnvelopeSimple, Note, CaretDown, CaretUp` de `@phosphor-icons/react`
   - Agregar `AnimatePresence` de framer-motion para expandir/colapsar detalles
   - Cuando mesa está `reserved` o `seated`, mostrar botones de acción:
     - Si `reservation_status === 'confirmed' || 'pre_paid'` → botón verde "Sentar" que llama a PATCH `/api/admin/reservations/{id}` con `{status: 'seated'}`
     - Si `reservation_status === 'seated'` → botón bordó "Liberar" que llama a PATCH con `{status: 'completed'}`
     - Siempre que haya reserva → botón gris "Reasignar" (solo placeholder, no implementa nada todavía)

   - Ejemplo de estructura:
```tsx
{/* Detalles del cliente con expand/collapse */}
{table.customer_name && (
  <div className="space-y-1.5">
    <div className="flex items-center gap-2">
      <Users size={14} className="text-[#8D6E63]" />
      <span className="font-medium text-[#3E2723]">{table.customer_name}</span>
    </div>
    {/* expandir teléfono, email, notas */}
    {(table.customer_phone || table.customer_email || table.special_requests) && (
      <div className="pl-6 space-y-1 border-l-2 border-[#D7CCC8] ml-1">
        {table.customer_phone && (
          <a href={`https://wa.me/57${table.customer_phone.replace(/^0+/, '').replace(/^\\+/, '')}`}
             target="_blank" className="flex items-center gap-1.5 text-xs text-[#25D366]">
            <WhatsappLogo size={12} weight="fill" /> {table.customer_phone}
          </a>
        )}
        {table.customer_email && (
          <a href={`mailto:${table.customer_email}`} className="flex items-center gap-1.5 text-xs text-[#1565C0]">
            <EnvelopeSimple size={12} /> {table.customer_email}
          </a>
        )}
        {table.special_requests && (
          <div className="flex items-start gap-1.5 text-xs text-[#5D4037] bg-[#F5EDE0] rounded-md px-2 py-1">
            <Note size={12} className="text-[#D4922A] shrink-0 mt-0.5" /> <span>{table.special_requests}</span>
          </div>
        )}
      </div>
    )}
  </div>
)}

{/* Acciones */}
{table.reservation_status && table.reservation_id && (
  <div className="flex gap-2 mt-3 pt-3 border-t border-[#D7CCC8]/50">
    {(['confirmed', 'pre_paid'].includes(table.reservation_status)) && (
      <button onClick={async () => {
        await fetch(`/api/admin/reservations/${table.reservation_id}`, {
          method: 'PATCH', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ status: 'seated' })
        })
        onClose() // trigger refetch by closing
      }} className="flex-1 py-2 text-xs font-medium rounded-lg bg-green-700 text-white hover:bg-green-800 active:scale-[0.97]">
        Sentar
      </button>
    )}
    {table.reservation_status === 'seated' && (
      <button onClick={async () => {
        await fetch(`/api/admin/reservations/${table.reservation_id}`, {
          method: 'PATCH', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ status: 'completed' })
        })
        onClose()
      }} className="flex-1 py-2 text-xs font-medium rounded-lg bg-[#6B2737] text-white hover:bg-[#5C2230] active:scale-[0.97]">
        Liberar
      </button>
    )}
    <button className="flex-1 py-2 text-xs font-medium rounded-lg border border-[#D7CCC8] text-[#3E2723] hover:bg-[#EFEBE9]">
      Reasignar
    </button>
  </div>
)}
```

4. **Agregar prop `onAction` a FloorPlanMap y TableDetailContent** — cuando se ejecuta una acción (sentar/liberar), llamar `onAction` además de `onClose` para que el padre haga refetch. FloorPlanMap ya tiene `refetch()` de useFloorPlan.

---

## TAREA 2: Ocupación Admin — mostrar estado de reserva en las tarjetas de mesa

**Problema:** En la pestaña de Ocupación, las tarjetas de mesa solo muestran un punto verde/rojo y "ocupada/libre", pero NO muestran el estado real de la reserva (Confirmado, Pre-pagado, Sentado).

**Archivos a modificar:**
- `/mnt/f/attick-keller/web/src/app/api/admin/occupancy/route.ts` — agregar `status` de reserva en la respuesta
- `/mnt/f/attick-keller/web/src/components/admin/occupancy/TableMap.tsx` — mostrar el estado con badge de color
- `/mnt/f/attick-keller/web/src/components/admin/occupancy/TableActionPopover.tsx` — agregar detalles del cliente (teléfono, email, notas) y botón sentar

**Pasos:**

1. **API occupancy** — en la query de reservas, ya se hace `.select('id, table_id, party_size, status, time_start, time_end, customers(full_name)')`. Agregar `customers(full_name, phone, email)` y `special_requests`:

   En `/mnt/f/attick-keller/web/src/app/api/admin/occupancy/route.ts`, buscar la query de reservas y agregar los campos:
   ```
   .select('id, table_id, party_size, status, time_start, time_end, special_requests, customers(full_name, phone, email)')
   ```

   En el mapeo de tablas que devuelve `current_customer_name`, agregar:
   - `current_customer_phone`
   - `current_customer_email` 
   - `current_special_requests`
   - `current_reservation_status` (ya existe `status` en la reserva but quizá no se pasa al response)

2. **TableMap.tsx** — agregar indicador visual del estado de la reserva:
   - Cambiar el punto de la mesa para que refleje el estado:
     - Verde: disponible
     - Naranja (#D4922A): confirmada/pre-pagada (reservada pero no sentada)
     - Bordó (#6B2737): sentada (ocupada)
     - Gris: completed/no_show
   - Debajo del nombre del cliente, agregar un badge de estado inline:
   ```tsx
   <span className="text-[9px] inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">
     <span className="w-1 h-1 rounded-full bg-green-600" /> Confirmado
   </span>
   ```

3. **TableActionPopover.tsx** — agregar detalles del cliente expandibles:
   - Agregar props nuevas: `currentCustomerPhone`, `currentCustomerEmail`, `currentSpecialRequests`, `currentReservationStatus`
   - Cuando la mesa está ocupada, mostrar además del nombre:
     - WhatsApp link si hay teléfono
     - Email link si hay email
     - Notas si hay
   - Agregar botón "Sentar" cuando `currentReservationStatus` es `confirmed` o `pre_paid` (actualmente solo muestra "Liberar mesa")
   - Agregar botón "No asistió" cuando `currentReservationStatus` es `confirmed` o `pre_paid`

---

## TAREA 3: HostReservationQueue — agregar detalles del cliente en la lista lateral

**Problema:** La lista lateral de reservas del host no muestra teléfono, email ni notas del cliente.

**Archivos:**
- `/mnt/f/attick-keller/web/src/components/host/HostReservationQueue.tsx` 

**Pasos:**

1. Ya se agregaron los imports `WhatsappLogo, EnvelopeSimple, Note, CaretDown, CaretUp, AnimatePresence` en un patch anterior. Verificar que estén presentes.

2. **Extraer datos del cliente de la reserva** — en el map de `sorted`, agregar:
```typescript
const phone = r.customer_phone as string | null
const email = r.customer_email as string | null
const notes = r.special_requests as string | null
const hasDetails = !!(phone || email || notes)
```

3. **Hacer la tarjeta expandible** — cuando `hasDetails` es true, agregar un botón de expandir/colapsar debajo del nombre:
```tsx
{hasDetails && (
  <button onClick={() => toggleExpand(id)} className="text-[10px] text-[#D4922A] flex items-center gap-0.5 mt-0.5">
    {expanded ? <CaretUp size={10} /> : <CaretDown size={10} />}
    {expanded ? 'Menos' : 'Ver detalles'}
  </button>
)}
```

4. **Contenido expandido** con `AnimatePresence`:
```tsx
<AnimatePresence>
  {expanded && (
    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
      <div className="mt-2 space-y-1 pl-3 border-l-2 border-[#D7CCC8]">
        {phone && <a href={...} className="flex items-center gap-1.5 text-xs text-[#25D366]"><WhatsappLogo size={12} weight="fill" /> {phone}</a>}
        {email && <a href={...} className="flex items-center gap-1.5 text-xs text-[#1565C0]"><EnvelopeSimple size={12} /> {email}</a>}
        {notes && <div className="flex items-start gap-1.5 text-xs text-[#5D4037] bg-[#F5EDE0] rounded-md px-2 py-1"><Note size={12} className="text-[#D4922A] shrink-0" /><span>{notes}</span></div>}
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

5. **Quitar `truncate` del nombre del cliente** (línea 186) — cambiar a `break-words`:
```tsx
<p className="text-sm font-medium text-[#3E2723] break-words">{customerName}</p>
```

---

## TAREA 4: Verificar y arreglar la API de occupancy para que devuelva datos del cliente

**Archivo:** `/mnt/f/attick-keller/web/src/app/api/admin/occupancy/route.ts`

Leer el archivo completo. Verificar que:
1. La query de reservas incluye `customers(full_name, phone, email)` y `special_requests`
2. El objeto de respuesta por mesa incluye los campos `current_customer_phone`, `current_customer_email`, `current_special_requests`
3. Si no los tiene, agregarlos

---

## RESUMEN DE ARCHIVOS A MODIFICAR

1. `/mnt/f/attick-keller/web/src/lib/hooks/useFloorPlan.ts` — agregar campos a TableWithPosition
2. `/mnt/f/attick-keller/web/src/app/api/admin/floorplan/route.ts` — agregar phone/email/notes/status en query
3. `/mnt/f/attick-keller/web/src/components/admin/floorplan/FloorPlanMap.tsx` — details + actions en burbuja
4. `/mnt/f/attick-keller/web/src/app/api/admin/occupancy/route.ts` — agregar phone/email/notes/status
5. `/mnt/f/attick-keller/web/src/components/admin/occupancy/TableMap.tsx` — mostrar estado reserva
6. `/mnt/f/attick-keller/web/src/components/admin/occupancy/TableActionPopover.tsx` — detalles cliente + acciones
7. `/mnt/f/attick-keller/web/src/components/host/HostReservationQueue.tsx` — detalles expandibles

## VERIFICACIÓN FINAL
Correr `npx tsc --noEmit` y verificar 0 errores en archivos del proyecto (ignorar warnings de node_modules).