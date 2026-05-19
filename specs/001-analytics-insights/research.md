# Research: Analytics con Insights y Acción

**Feature**: 001-analytics-insights
**Date**: 2026-05-18

## Decision 1: Cómo calcular tendencia semanal sin tabla de snapshots

**Decision**: Usar `last_visit_date` de `customer_stats` + `created_at` de `reservations` para calcular cohortes semanales en tiempo real.

**Rationale**: No tenemos una tabla de snapshots históricos. Pero `customer_stats.last_visit_date` nos dice cuándo fue la última visita de cada cliente, y `reservations.created_at` nos da el historial de reservas. Con esto podemos reconstruir: cuántos clientes estaban "activos en los últimos 30d" en cada semana pasada, agrupando por la fecha de reserva.

**Alternatives considered**:
- **Tabla de snapshots**: Crear una tabla `weekly_snapshots` con un cron job. Rechazado porque agrega complejidad operativa y no tenemos cron jobs en Supabase Hobby.
- **Materialized views**: Supabase no soporta materialized views en el plan Hobby.
- **Pre-calcular en la API**: Hacerlo en el frontend con los 20K registros. Factible pero lento en primera carga. Preferimos queries de conteo eficientes.

## Decision 2: Componentes nuevos vs extensión de existentes

**Decision**: Crear componentes nuevos (ReactivationCard, NoShowAlertCard, TrendChart, TableDemandCard, VIPAlertCard, CampaignModal) y modificar los existentes (RetentionFunnel, NoShowRiskCard) para agregar CTAs.

**Rationale**: Los componentes existentes ya tienen su responsabilidad clara. Agregar CTAs es un cambio mínimo, pero las nuevas funcionalidades (reactivación, alertas de hoy, tendencias) merecen componentes dedicados. Esto sigue el principio de componentes granulares de la constitución.

**Alternatives considered**:
- **Todo en un mega-componente**: Rechazado por ilegible e inmantenible.
- **Modificar solo los existentes**: Rechazado porque EachCard tendría demasiadas responsabilidades.

## Decision 3: Campaña de WhatsApp en v1

**Decision**: v1 genera un mensaje pre-escrito que el admin copia y envía manualmente por WhatsApp. No hay integración con WhatsApp Business API.

**Rationale**: La WhatsApp Business API requiere cuenta de negocio verificada, número de teléfono registrado, y aprobación de Meta. Eso es scope para v2. En v1, el CTA genera el mensaje con variables (nombre del cliente, fecha, etc.) y el admin lo copia al clipboard. Es funcional inmediatamente sin dependencias externas.

**Alternatives considered**:
- **WhatsApp Business API directa**: Rechazado por complejidad y tiempo de aprobación.
- **Twilio WhatsApp**: Mismo problema de aprobación + costo por mensaje.
- **Email campaigns con Resend**: Posible pero 83% de clientes tienen celular vs 49% email. WhatsApp tiene mayor alcance.

## Decision 4: Cómo obtener reservas de riesgo de hoy

**Decision**: Nueva ruta API `/api/admin/customers/analytics/no-show-today` que consulta `reservations` para la fecha actual con `status = 'confirmed'` y hace join con `customer_stats` para obtener `no_show_count`. Retorna las reservas cuyo cliente tiene `no_show_count >= 2`.

**Rationale**: Las reservas de hoy viven en la tabla `reservations` (no en `customer_stats`). Necesitamos cruzar la reserva activa con el riesgo del cliente. Una query separada es más eficiente que fetchAll de todo.

**Alternatives considered**:
- **Incluir en la API de analytics existente**: Agregaría complejidad y hacer la query de reservas de hoy cada vez que se carga el dashboard sería ineficiente si el admin navega entre tabs.
- **Cliente-side filter desde reservas existentes**: El panel de reservas ya carga reservas, pero no tiene los datos de riesgo del cliente.

## Decision 5: Tendencias semanales - estructura de datos

**Decision**: API devuelve un array de 8 objetos `{ week: 'YYYY-WNN', active_count: N, new_count: N, no_show_count: N, retention_pct: N }` calculados desde `reservations.created_at` agrupados por semana.

**Rationale**: 8 semanas es suficiente para ver tendencia sin sobrecargar. Agrupar por semana ISO es estándar y fácil de calcular. El cálculo de "activos" usa: clientes con al menos 1 reserva en esa semana.

**Alternatives considered**:
- **Tendencia diaria**: Demasiado ruidoso para un restaurante (días vacíos entre semana).
- **Tendencia mensual**: Demasiado grueso, no permite ver efecto de campañas recientes.
- **Pre-calcular con cron**: No tenemos cron en Supabase Hobby.

## Decision 6: Gráfica de tendencias - librería

**Decision**: Usar Recharts (ya probablemente instalada o fácil de agregar con Tailwind).

**Rationale**: Es la librería de gráficos más usada con React, ligera, y compatible con Tailwind. Alternative sería Chart.js pero Recharts es más declarativa y se integra mejor con React components.

**Alternatives considered**:
- **Chart.js + react-chartjs-2**: Más pesada, API imperativa.
- **D3**: Demasiado bajo nivel para gráficos de línea simples.
- **Canvas puro**: Innecesariamente complejo.
- **SVG manual**: Posible pero Recharts lo hace mejor en menos código.

## Decision 7: Demanda vs mesas - cálculo

**Decision**: Calcular distribución de `party_size` desde `reservations` (histórico) y compararla con la distribución de `capacity` desde `tables`. Mostrar como gráfico de barras comparativo.

**Rationale**: 70% de las reservas son para 2 personas. Si la mayoría de las mesas son de 4, hay un desajuste claro. La comparación visual es inmediata: "demandás mesas de 2 pero tenés mesas de 4".

**Alternatives considered**:
- **Solo demanda**: Parcial, no muestra el desajuste.
- **Ocupación en tiempo real**: Requiere datos de ocupación real por mesa, no disponibles aún.

## Decision 8: Gasto/Visita cuando total_spent = $0

**Decision**: Mostrar "Dato no disponible" en vez de "$0" cuando el promedio de gasto da 0.

**Rationale**: Mostrar "$0" sugiere que el cliente gasta cero, cuando en realidad no tenemos el dato. "Dato no disponible" es honesto y evita decisiones erróneas.

**Alternatives considered**:
- **Mostrar "$0"**: Engañoso.
- **Ocultar la tarjeta**: Pierde la oportunidad de informar que falta integración con POS.
- **Mostrar tooltip explicativo**: Buena UX, pero "Dato no disponible" es suficiente por ahora.