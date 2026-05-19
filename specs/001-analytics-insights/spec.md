# Feature Specification: Analytics con Insights y Acción

**Feature Branch**: `001-analytics-insights`

**Created**: 2026-05-18

**Status**: Draft

**Input**: Transformar el dashboard de analytics de Attick & Keller de un observatorio pasivo a un cerebro operativo que muestre insights con acciones concretas para el administrador del restaurante, permitiéndole tomar decisiones de marketing, retención y operación.

## User Scenarios & Testing

### User Story 1 - Ver el Estado del Restaurante en 30 Segundos (Priority: P1)

Como administrador de Attick & Keller, entro al dashboard y en 30 segundos puedo ver: cuántos clientes activos tengo, cuántos se me están fugando, cuántas reservas de riesgo tengo hoy, y cuál es la acción más urgente que debo tomar. Los KPIs principales me dicen inmediatamente si el restaurante va bien o necesita atención.

**Why this priority**: Sin esta visión rápida, el admin navega sin rumbo entre números sin contexto. Es la base sobre la que todo lo demás se construye.

**Independent Test**: Abro `/admin`, veo la vista de Analytics, y puedo responder en menos de 30 segundos: ¿cuántos clientes se me fugan? ¿cuántos no-show riesgo tengo? ¿qué acción sugerida aparece?

**Acceptance Scenarios**:

1. **Given** que tengo 20,413 clientes en la BD, **When** abro la vista de Analytics, **Then** veo KPIs con los números correctos (no truncados a 1000)
2. **Given** que el 90% de clientes vinieron 1 vez, **When** veo el embudo de retención, **Then** se muestra "90% fuga" con una acción sugerida: "Campaña de reactivación por WhatsApp"
3. **Given** que hay 161 clientes de alto riesgo no-show, **When** veo la tarjeta de riesgo, **Then** se muestra la cantidad y un CTA para verlos o enviar confirmaciones

---

### User Story 2 - Reactivar Clientes Dormidos (Priority: P1)

Como administrador, quiero ver cuántos clientes dormidos (1 sola visita)son alcanzables por WhatsApp y con un click lanzar una campaña de reactivación. El sistema me muestra: "16,000 clientes dormidos con celular + opt-in — una campaña podría generar ~800 reservas".

**Why this priority**: Reactivar un cliente cuesta 5x menos que adquirir uno nuevo. Con 90% de fuga, esta es la mayor oportunidad de negocio.

**Independent Test**: Veo la tarjeta de reactivación, veo el número de alcanzables, y hay un CTA claro para crear una campaña de WhatsApp.

**Acceptance Scenarios**:

1. **Given** 26,195 clientes de 1 visita, 83% con celular, 70% opt-in, **When** veo la sección de reactivación, **Then** se calcula correctamente el universo alcanzable (~16,000)
2. **Given** que tengo clientes dormidos alcanzables, **When** hago click en el CTA de campaña, **Then** se abre el flujo de creación de campaña dirigida a ese segmento
3. **Given** que no todos los clientes tienen celular, **When** calculo el alcance, **Then** separo correctamente los alcanzables por WhatsApp vs email vs no contactables

---

### User Story 3 - Recibir Alertas de No-Show para Reservas de Hoy (Priority: P1)

Como administrador, quiero ver al inicio del día qué reservas de hoy tienen alto riesgo de no-show, con información del cliente (historial, teléfono, riesgo), y poder enviar una confirmación por WhatsApp con un click.

**Why this priority**: Una mesa vacía por no-show es dinero perdido que no se recupera. Es la acción más urgente del día.

**Independent Test**: Abro el dashboard un día con reservas, veo la sección "Reservas de Riesgo Hoy", y puedo enviar confirmación WhatsApp.

**Acceptance Scenarios**:

1. **Given** que hay reservas para hoy de clientes con no_show_count >= 2, **When** abro el dashboard, **Then** se muestra una alerta con nombre, hora, riesgo, y botón de confirmar
2. **Given** una reserva de riesgo, **When** hago click en "Confirmar por WhatsApp", **Then** se genera un mensaje preescrito con nombre del cliente, fecha, hora
3. **Given** que no hay reservas de riesgo hoy, **When** abro el dashboard, **Then** la sección muestra "Sin alertas de no-show hoy" con un indicador verde

---

### User Story 2 - Ver Tendencias Semanales (Priority: P2)

Como administrador, quiero ver gráficos de tendencia semanales: clientes activos, retención, no-shows. Necesito saber si mis acciones están funcionando — si lancé una campaña, ¿subió la retención?

**Why this priority**: Sin medición no hay mejora. P2 porque primero necesito las acciones (P1), luego la medición.

**Independent Test**: Veo un gráfico de línea con datos de las últimas 8 semanas y puedo ver si la retención sube o baja.

**Acceptance Scenarios**:

1. **Given** que hay datos de reservas de las últimas 8 semanas, **When** veo el gráfico de tendencia, **Then** se muestra la evolución de clientes activos, retención y no-shows por semana
2. **Given** que lanzó una campaña de reactivación, **When** paso el cursor sobre una semana, **Then** puedo comparar antes y después de la campaña

---

### User Story 3 - Optimizar Distribución de Mesas (Priority: P2)

Como administrador, quiero ver la demanda real por tamaño de grupo (parejas, grupos de 4, etc.) comparada con la disponibilidad de mesas, para ajustar la distribución del restaurante.

**Why this priority**: El 70% de las reservas son para 2 personas — si tengo demasiadas mesas de 4, estoy desperdiciando espacio.

**Independent Test**: Veo un gráfico que compara distribución de demanda vs distribución de mesas.

**Acceptance Scenarios**:

1. **Given** datos históricos de party_size y configuración de mesas, **When** veo la sección de demanda, **Then** se muestra comparativa: demanda por tamaño vs mesas disponibles por tamaño
2. **Given** que el 70% de la demanda es para 2, **When** la oferta de mesas de 2 es insuficiente, **Then** se sugiere: "Considerar convertir X mesas de 4 a mesas de 2"

---

### User Story 4 - Identificar VIPs Inactivos y Fechas Especiales (Priority: P3)

Como administrador, quiero ser alertado cuando un cliente VIP no visita en 30+ días, y ver las próximas fechas especiales (San Valentín, Navidad) con el número de clientes alcanzables para cada una.

**Why this priority**: P3 porque es valioso pero no urgente como los no-shows o la reactivación.

**Independent Test**: Veo una lista de VIPs inactivos y un calendario de fechas especiales con alcance.

**Acceptance Scenarios**:

1. **Given** un cliente VIP sin visita en 30+ días, **When** veo la sección VIP, **Then** aparece con nombre, última visita, y sugerencia de contacto personalizado
2. **Given** que San Valentín es en 2 semanas, **When** veo el calendario, **Then** se muestra la fecha + el número de clientes alcanzables por WhatsApp para esa campaña

---

### Edge Cases

- ¿Qué pasa si no hay reservas para hoy? → Mostrar "Sin alertas de no-show hoy" en verde
- ¿Qué pasa si un cliente tiene celular pero no opt-in? → Incluir en conteo total pero NO en alcanzables para WhatsApp
- ¿Qué pasa si los datos de gasto son todos $0 (como ahora)? → Mostrar "Gasto/visita: dato no disponible" en vez de "$0"
- ¿Qué pasa si la API tarda más de 5 segundos? → Mostrar skeleton loading con indicador de progreso
- ¿Qué pasa si solo hay 50 clientes en vez de 20K? → Los componentes deben funcionar con pocos datos sin errores de división por cero
- ¿Qué pasa cuando se borra un cliente que tenía stats? → customer_stats también se elimina (cascada)

## Requirements

### Functional Requirements

- **FR-001**: El dashboard DEBE cargar y mostrar los 20,413+ clientes completos (no truncados a 1000)
- **FR-002**: La vista de Analytics DEBE mostrar un KPI bar con: Total Clientes, Recurrentes (%), Activos 30d, Activos 90d, Visitas Total, Gasto/Visita (si hay datos)
- **FR-003**: El sistema DEBE mostrar un embudo de retención con 5 niveles: 1 visita, 2-3, 4-5, 6-10, 11+ VIP
- **FR-004**: El sistema DEBE mostrar riesgo no-show con 4 niveles: sin riesgo, bajo (1), medio (2-3), alto (4+)
- **FR-005**: Cada insight DEBE tener una acción sugerida (CTA, enlace, o instrucción clara)
- **FR-006**: El sistema DEBE mostrar una tarjeta de reactivación con: clientes dormidos, alcanzables por WhatsApp, y CTA de campaña
- **FR-007**: El sistema DEBE mostrar alertas de no-show para reservas del día actual con datos del cliente y botón de confirmación
- **FR-008**: El sistema DEBE calcular correctamente el universo de contactabilidad: con celular, con email, con ambos, sin contacto
- **FR-009**: El sistema DEBE mostrar segmentación por loyalty_tier: none, new, occasional, regular, vip (no nombres inventados)
- **FR-010**: Los gráficos de tendencia DEBEN mostrar datos semanales de las últimas 8 semanas
- **FR-011**: El sistema DEBE mostrar demanda por tamaño de grupo comparado con oferta de mesas
- **FR-012**: El sistema DEBE alertar sobre VIPs inactivos (30+ días sin visita)
- **FR-013**: El sistema DEBE mostrar próximas fechas especiales con audiencia alcanzable
- **FR-014**: El dashboard DEBE ser escaneable en 30 segundos: KPIs arriba, detalles y acciones abajo
- **FR-015**: El dashboard DEBE ser funcional en móvil (responsive)
- **FR-016**: El sistema DEBE manejar correctamente datos faltantes: gasto $0, sin celular, sin email
- **FR-017**: Los componentes DEBEN funcionar con pocos datos sin errores (división por cero, arrays vacíos)

### Key Entities

- **Customer**: Cliente del restaurante con datos personales (nombre, celular, email), estadísticas de visita (total_visits, no_show_count, loyalty_tier, last_visit_date), y flags (is_recurring)
- **Customer Stats**: Agregados por cliente: total_visits, total_spent, no_show_count, last_visit_date, is_recurring, loyalty_tier
- **Reservation**: Reserva con fecha, hora, party_size, estado (confirmed, cancelled, no_show, completed), source, customer
- **Table**: Mesa del restaurante con capacidad, zona, y combinaciones posibles
- **Segment**: Agrupación de clientes por loyalty_tier (none, new, occasional, regular, vip)
- **No-Show Risk**: Clasificación de riesgo basada en no_show_count: none (0), low (1), medium (2-3), high (4+)
- **Campaign**: Campaña de marketing dirigida a un segmento de clientes con canal (WhatsApp, email), mensaje, y métricas de resultado

## Success Criteria

### Measurable Outcomes

- **SC-001**: El administrador puede identificar la acción más urgente del día en menos de 30 segundos al abrir el dashboard
- **SC-002**: El dashboard muestra correctamente los 20,413+ clientes sin truncamiento (validación contra conteo de BD)
- **SC-003**: Cada tarjeta o insight en el dashboard tiene al menos una acción sugerida visible (botón, enlace, o instrucción)
- **SC-004**: El sistema calcula correctamente el universo de reactivación: clientes de 1 visita con celular y opt-in
- **SC-005**: Las alertas de no-show aparecen para todas las reservas del día con clientes de riesgo (no_show_count >= 2)
- **SC-006**: El dashboard carga en menos de 5 segundos con 20K+ registros
- **SC-007**: El dashboard es usable en móvil (responsive, scrollable, sin overflow horizontal)

## Assumptions

- Los datos de gasto (total_spent) son $0 en todos los registros — el POS no registró valores monetarios. "Gasto/Visita" mostrará "No disponible" hasta que se integre con datos financieros reales.
- WhatsApp es el canal principal de comunicación, pero la integración directa con WhatsApp Business API no está en scope para v1. El CTA de "Enviar por WhatsApp" generará un mensaje preescrito que el admin copia/envía manualmente.
- La tabla `reservations` tiene datos mock de 2 semanas. Los componentes deben funcionar con datos reales cuando el POS se integre.
- La tabla `tables` ya existe con 45 mesas en 5 zonas. La demanda por tamaño de grupo se calcula desde `reservations.party_size`.
- `customer_stats.loyalty_tier` usa el enum: none, new, occasional, regular, vip. No hay columnas: cancellations, total_party_size, avg_party_size, marketing_opt_in, blacklisted.
- El admin usa el dashboard desde su PC y ocasionalmente desde el celular. No es para clientes finales.
- Supabase REST API limita a 1000 filas por request. fetchAll() DEBE paginar en batches de 999 para obtener todos los registros.
- Vercel serverless tiene timeout de 10s en plan Hobby. Las queries deben ser eficientes (preferir count queries sobre fetchAll cuando sea posible).