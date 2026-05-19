# Attick & Keller — Constitución del Proyecto

## Identidad

**Nombre:** Attick & Keller Dashboard de Operaciones
**Tipo:** Panel analítico para administradores de restaurante
**Tech Stack:** Next.js 16, Supabase, TypeScript, Tailwind v4
**Filosofía de diseño:** Rústico Editorial Moderno (Madera #3E2723, Borgoña #6B2737, Cal/Cream #F5EDE0, Oliva #5C7A4D, Ámbar #D4922A)

## Principios Fundamentales

### 1. Insights con Acción, no solo Observación
Cada componente del dashboard debe responder: **"¿Y entonces qué hago?"**
- Un número sin contexto es ruido. Un insight sin acción es frustración.
- Si mostramos "90% de fuga", debemos sugerir "Campaña de reactivación por WhatsApp → 16K alcanzables"
- Si mostramos "161 alto riesgo no-show", debemos mostrar "Reservas de riesgo HOY" y botón de confirmar

### 2. Datos Reales, Decisiones Reales
- 20,413 clientes importados del POS real. No son datos de prueba.
- El dashboard procesa datos de producción. Cada insight afecta el negocio real.
- Nunca mostrar métricas artificiales o infladas.

### 3. WhatsApp como Canal Principal
- 83% de clientes tienen celular. WhatsApp es el canal de comunicación primario.
- Toda campaña o acción sugerida debe priorizar WhatsApp sobre email.
- El 70% opt-in marketing (20K personas) es el audiencia alcanzable.

### 4. El Admin No Tiene Tiempo
- El admin de un restaurante está ocupado. El dashboard debe ser escaneable en 30 segundos.
- KPIs arriba, detalles abajo. Rojo = acción urgente, verde = bien, ámbar = vigilar.
- Un click para actuar, no tres.

### 5. Retención > Adquisición
- 26,195 clientes vinieron 1 vez y no volvieron (90% fuga).
- Reactivar un cliente dormido cuesta 5x menos que adquirir uno nuevo.
- El dashboard debe priorizar retención y reactivación sobre nuevas adquisiciones.

### 6. No-Show = Dinero Perdido
- Una mesa vacía por no-show es revenue perdido que no se recupera.
- El sistema debe alertar proactivamente sobre reservas de riesgo.
- Confirmación automática por WhatsApp 2h antes es el mínimo necesario.

### 7. Progreso Verificable
- Si lanzamos una campaña, debemos poder medir si funcionó.
- Tendencias semanales de retención, no-show, y activos son obligatorias.
- Sin medición, no hay mejora.

## Restricciones Técnicas

- **Supabase REST API:** Máximo 1000 filas por request. fetchAll() con batches de 999.
- **No DDL vía API:** ALTER TYPE y otros DDL deben ejecutarse manualmente en Supabase Dashboard por Alejandro.
- **No psycopg2 en WSL:** IPv6 issue. Workaround: REST API con requests.
- **Vercel serverless:** 10s timeout en Hobby. Queries deben ser eficientes.
- **customer_stats columnas:** id, customer_id, total_visits, total_spent, last_visit_date, no_show_count, is_recurring, loyalty_tier, updated_at. NO hay: cancellations, total_party_size, avg_party_size, marketing_opt_in, blacklisted.
- **Gasto total = $0:** El POS no registró valores monetarios. No se puede calcular LTV ni ticket promedio hasta integrar POS con datos financieros.

## Estándares de Código

- TypeScript estricto. No `any` sin justificación.
- Componentes tan granulares como sea razonable.
- Tailwind para estilos. Los colores del diseño (Madera, Borgoña, etc.) como constantes del tema.
- APIs con try-catch y mensajes de error útiles para el admin.
- fetchAll() SIEMPRE para tablas con 1000+ registros.

## Criterios de Aceptación

- El admin debe poder ver el estado del restaurante en 30 segundos
- Cada insight debe tener una acción sugerida (botón, enlace, o instrucción clara)
- Los datos deben corresponder a los 20K+ clientes reales (no solo los primeros 1000)
- La UI debe ser funcional en móvil (el admin puede revisar desde el celular)
- Cero columnas inexistentes consultadas a la BD