# 🔍 Auditoría Detallada — Dashboard Analítico A&K

**Generado por:** Kimi K2.6 vía Codex  
**Fecha:** Mayo 2026  
**Proyecto:** Attick & Keller — Panel de Clientes → Dashboard Analítico

---

## 1. Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| **Total registros CSV** | 29,103 |
| **Clientes con celular** | 24,191 (83.1%) |
| **Clientes con email** | 14,306 (49.2%) |
| **Con ambos contactos** | 14,237 (48.9%) |
| **Sin ningún contacto** | 4,843 (16.6%) |
| **Opt-In Marketing** | 20,411 (70.1%) |

### 🚨 Hallazgo Crítico
**El 90% de los clientes (26,195) vinieron UNA vez y no volvieron.**  
Reactivar el 10% = 2,619 clientes recurrentes adicionales.

---

## 2. Segmentación por Tipo de Cliente

| Tipo | Cantidad | % |
|------|----------|---|
| Sin tipo | 16,466 | 56.6% |
| Nuevo | 11,835 | 40.7% |
| Recurrente | 802 | 2.8% |

**⚠️ Problema:** Más de la mitad no tiene clasificación. Solo 802 recurrentes de 29,103 = 2.8%.

**Propuesta de auto-clasificación por `Total Reservas`:**
- 0 reservas → Prospecto
- 1 reserva → Nuevo
- 2-3 → Ocasional
- 4-5 → Frecuente
- 6-10 → Habitual
- 11+ → VIP

---

## 3. Frecuencia de Visita (Embudo de Retención)

| Segmento | Cantidad | % | Valor |
|----------|----------|---|-------|
| 1 (Una vez) | 26,195 | 90.0% | 🔴 Perdidos |
| 2-3 (Ocasional) | 2,551 | 8.8% | 🟡 Retenibles |
| 4-5 (Frecuente) | 264 | 0.9% | 🟢 Valiosos |
| 6-10 (Habitual) | 82 | 0.3% | 🟢 Muy valiosos |
| 11+ (VIP) | 11 | 0.0% | 🌟 Invaluables |

```
29,103 clientes en BD
  └→ 29,103 vinieron al menos 1 vez
      └→ 2,908 volvieron (10%) ← BRECHA ENORME
          └→ 357 frecuentes (1.2%)
              └→ 93 habituales (0.3%)
                  └→ 11 VIP (0.04%)
```

---

## 4. Tamaño de Grupo

| Tamaño | Cantidad | % | Implicación |
|--------|----------|---|-------------|
| 1-2 (Parejas) | 20,392 | 70.1% | Optimizar para 2 personas |
| 3-4 (Pequeños) | 3,276 | 11.3% | Mesas de 4 |
| 5-6 (Medianos) | 2,108 | 7.2% | Combinaciones |
| 7-8 (Grandes) | 1,146 | 3.9% | Mesas grandes (8) |
| 9+ (Muy grandes) | 2,181 | 7.5% | Comedor, Chispas |

---

## 5. Riesgo de No-Show

| No-Shows | Cantidad | % | Riesgo |
|----------|----------|---|--------|
| 0 | 23,521 | 80.8% | ✅ Ninguno |
| 1 | 5,255 | 18.1% | 🟡 Bajo |
| 2-3 | 304 | 1.0% | 🟠 Medio |
| 4+ | 23 | 0.1% | 🔴 Alto |

### 🔴 Top 10 Clientes de Alto Riesgo (≥50% ratio, 3+ reservas)

| # | Cliente | Reservas | No-Shows | Ratio |
|---|---------|----------|----------|-------|
| 1 | Alejandro Hristodulopulos | 29 | 16 | 55% |
| 2 | Alejandro Castro | 26 | 14 | 54% |
| 3 | Sebastian Ramirez | 15 | 8 | 53% |
| 4 | Daniel Castiblanco | 10 | 6 | 60% |
| 5 | Juanita Basto | 8 | 6 | 75% |
| 6 | Gabriel Fernando Lozano Vanegas | 7 | 5 | 71% |
| 7 | Luis Diaz | 9 | 5 | 56% |
| 8 | Alejandro Osorio | 5 | 4 | 80% |
| 9 | Andre Bonilla Ovalle | 4 | 4 | 100% |
| 10 | Camilo Eduardo González | 5 | 4 | 80% |

**Total:** 161 clientes con ratio ≥50% y 3+ reservas  
**Acción:** Marcar automáticamente con tags 🔴 y sugerir confirmación WhatsApp.

---

## 6. Top 15 VIPs

| # | Cliente | Reservas | Personas | No-Show | Valor |
|---|---------|----------|----------|---------|-------|
| 1 | Emilio Marquez | 26 | 86 | 5 | 🌟 Trae grupos grandes |
| 2 | Timeleft DRINKS Table 1 | 10 | 62 | 0 | 🌟 Grupo evento |
| 3 | Cristiano Ronaldo | 21 | 49 | 6 | ⚠️ Alto no-show |
| 4 | Sergio Ojeda | 29 | 49 | 3 | 🌟 Cliente leal |
| 5 | Patricia Cogollos | 20 | 45 | 3 | 🌟 Trae grupos |
| 6 | Victor Valencia | 5 | 40 | 1 | 🌟 Grupo grande esporádico |
| 7 | Laura Rojas | 8 | 38 | 0 | 🌟 Perfecto |
| 8 | Luca De Petris Dannemann | 8 | 34 | 0 | 🌟 Perfecto |
| 9 | Alicia Soacha | 5 | 33 | 0 | 🌟 Perfecto |
| 10 | María Victoria Lugo Gil | 5 | 31 | 1 | 🌟 Buen cliente |
| 11 | Dayana Torres Dominguez | 12 | 30 | 3 | 🌟 Frecuente |
| 12 | Leidy Lopez | 5 | 29 | 0 | 🌟 Perfecto |
| 13 | David Rojas | 6 | 28 | 1 | 🌟 Buen cliente |
| 14 | Santiago Henao | 5 | 27 | 0 | 🌟 Perfecto |
| 15 | Marceliano Castro | 12 | 26 | 0 | 🌟 Perfecto |

---

## 7. Contactabilidad para Campañas

| Canal | Cantidad | % | Alcance |
|-------|----------|---|---------|
| Con celular | 24,191 | 83.1% | ✅ WhatsApp |
| Con email | 14,306 | 49.2% | ✅ Email marketing |
| Con ambos | 14,237 | 48.9% | ✅ Multi-canal |
| Sin contacto | 4,843 | 16.6% | ❌ No alcanzable |

**Opt-In:** 70.1% acepta marketing  
**Potencial WhatsApp:** ~16,000 clientes alcanzables (1 visita + opt-in + celular)  
**Si reactivamos 5%** = ~800 reservas adicionales

---

## 8. Distribución Temporal

| Fecha | Clientes | Evento |
|-------|----------|--------|
| 05 Mar 2024 | 277 | ¿Evento especial? |
| 16 Feb 2024 | 162 | Valentine's |
| 19 Feb 2024 | 91 | Fin de semana |
| 09 Ene 2025 | 90 | Post-fiestas |
| 26 Mar 2024 | 85 | — |

---

## 9. Mapeo CSV → Supabase (34 campos)

| # | Campo CSV | Tipo | ¿Importa? | Mapeo |
|---|-----------|------|-----------|-------|
| 1 | Nombres | texto | ✅ | customers.full_name |
| 2 | Apellidos | texto | ✅ | customers.full_name (combo) |
| 3 | Tipo de cliente | enum | ✅ | customer_stats.loyalty_tier |
| 7 | Celular | texto | ✅ | customers.phone |
| 8 | Email | texto | ✅ | customers.email |
| 11 | Última Reserva | fecha | ✅ | customer_stats.last_visit_date |
| 16 | Reservas Atendidas | número | ✅ | — |
| 17 | Reservas Pendientes | número | ✅ | — |
| 18 | Reservas Canceladas | número | ✅ | — |
| 19 | No-Show | número | ✅ | customer_stats.no_show_count |
| 20 | Total Reservas | número | ✅ | customer_stats.total_visits |
| 21 | Personas Totales | número | ✅ | preferences.total_guests |
| 22 | Personas promedio | decimal | ✅ | preferences.avg_party_size |
| 30 | Opt-In Marketing | sí/no | ✅ | preferences.opt_in |
| 31 | ListaNegra | sí/no | ✅ | preferences.blacklist |
| 32 | Notas del restaurante | texto | ✅ | customers.notes |
| 33 | Alergias | texto | ✅ | preferences.allergies |

**⚠️ Campos sin utilidad:** Gastos (todos 0), Delivery (vacío), Puntos (vacío), Cumpleaños (solo 20)

---

## 10. Estado Actual de la BD Supabase

| Tabla | Registros | Notas |
|-------|-----------|-------|
| customers | 5 | ⚠️ Vacía — necesita import CSV |
| customer_stats | ~5 | ⚠️ Vinculada a los 5 clientes |
| reservations | 5 | Fechas antiguas (mayo 5-12) |
| tables | 45 | ✅ 5 zonas, completa |
| table_zones | 5 | ✅ A-E |
| table_combinations | 4 | ✅ Combinaciones configuradas |
| assignment_corrections | 0 | Sin datos de aprendizaje |

**Schema completo reconstruido:**
- customers: id, restaurant_id, full_name, phone, email, preferences (jsonb), notes, created_at
- customer_stats: id, customer_id, restaurant_id, total_visits, no_show_count, last_visit_date, loyalty_tier, avg_party_size, total_guests, created_at
- customer_tags: id, name, color, restaurant_id
- customer_tag_links: customer_id, tag_id
- customer_segments: id, name, description, criteria (jsonb), is_auto, restaurant_id
- reservations: id, restaurant_id, customer_id, date, time_start, status, source, party_size, table_id, notes, created_at
- tables: id, restaurant_id, number, capacity, capacity_min, name_attick, is_active, zone_id, can_combine, combine_group, sort_order
- availability: day_of_week, open, close, restaurant_id
- user_roles: auth_user_id, restaurant_id, role, is_active

**Datos faltantes vs CSV:**
- El CSV tiene 34 campos, muchos no están en la BD
- No hay `reservation_status_log`
- `Opt-in marketing` no está explícitamente en customer_stats
- No hay tabla `customer_analytics`
- No hay campos de no-show ratio, loyalty_score en customer_stats

---

## 11. Auditoría de APIs Existentes

### /api/admin/metrics (GET)
- **Datos:** peak_hours, by_source, conversionRate, noShowRate, avgPartySize, dailyTrend
- **Fuente:** `reservations` (últimos 30 días)
- **⚠️ Problema:** Solo usa reservations, no usa customers ni customer_stats
- **Mejora:** Agregar datos de clientes (embudo, segmentos, riesgo)

### /api/admin/customers (GET, POST)
- **GET:** Lista paginada con filtros (search, has_email, min_visits, last_visit_days, tag_ids)
- **POST:** Crear cliente (phone required, deduplica por phone)
- **⚠️ Problema:** No expone no_show_count, avg_party_size, loyalty_tier
- **⚠️ Problema:** No hay endpoint PATCH/PUT para actualizar cliente
- **⚠️ Problema:** Segmentos son filtros estáticos, no computaciones

### /api/admin/segments (GET)
- **Datos:** Segmentos predefinidos (VIPs, Frecuentes, etc.)
- **⚠️ Problema:** Son hardcode, no se calculan dinámicamente

### /api/admin/customers/[id] (PATCH)
- **Existe:** Sí, permite actualizar preferences, notes, tags
- **⚠️ Problema:** No hay endpoint para métricas de cliente individual

---

## 12. Auditoría de Componentes Frontend

### MetricsPanel.tsx
- Grid 3 cards + 2 charts
- **Cards:** ConversionCard, NoShowCard, PartySizeCard
- **Charts:** PeakHoursChart, DailyTrendChart, SourceBreakdown
- **⚠️ Falta:** Embudo de retención, riesgo de no-show por cliente, tendencia semanal

### CustomersPanel.tsx
- Tabs: Clientes / Métricas
- **Lista:** CustomerList con filtros y búsqueda
- **⚠️ Falta:** Vista de oportunidades, vista no-show risk, vista reactivación

### CustomerDetail.tsx
- Muestra info del cliente + estadísticas
- **⚠️ Falta:** Historial de reservas, predicción de no-show, acciones sugeridas

---

## 13. Plan del Dashboard Analítico

### KPIs que debe mostrar:
1. **Embudo de Retención** — 29,103 → 2,908 → 357 → 93 → 11
2. **Tasa de No-Show** — por día, por source, por segmento
3. **Risk Score por Cliente** — probabilidad de no-show basada en historial
4. **Valor de Cliente (CLV proxy)** — personas_totales × visitas
5. **Oportunidad de Reactivación** — clientes 1-vez con celular y opt-in
6. **Tendencia Diaria/Semanal** — reservas confirmadas vs no-show por día
7. **Distribución de Tamaño de Grupo** — parejas vs grupos vs grandes
8. **Contactabilidad** — celular, email, ambos, ninguno

### Visualizaciones:
1. **FunnelChart** — Embudo de retención animado
2. **NoShowHeatmap** — Heatmap de no-show por día de semana × hora
3. **RetentionTrend** — Línea de retención por semana
4. **RiskTable** — Tabla de clientes alto riesgo con acciones
5. **VIPLeaderboard** — Top VIPs con personas traídas
6. **ReactivationOpportunity** — Cards de oportunidad por segmento
7. **PartySizeDistribution** — Donut chart de tamaños
8. **ContactabilityChart** — Barras apiladas de contacto

---

## 14. Arquitectura de Implementación

### Fase 1: Importación (Prioridad Alta)
1. Script Python que mapea CSV → `customers` + `customer_stats`
2. Deduplicación por celular (mismo número = mismo cliente)
3. Auto-clasificación: Nuevo/Ocasional/Frecuente/Habitual/VIP
4. Tags automáticos: 🟢 VIP, 🟡 Frecuente, 🔴 No-Show Risk
5. **Objetivo:** 29,103 → ~25,000 únicos

### Fase 2: Nuevos Endpoints API
1. `GET /api/admin/dashboard` — KPIs agregados del dashboard
2. `GET /api/admin/customers/risk` — Clientes de alto riesgo no-show
3. `GET /api/admin/customers/vip` — Top VIPs
4. `GET /api/admin/customers/reactivation` — Oportunidades de reactivación
5. `GET /api/admin/metrics/retention` — Embudo de retención
6. Ampliar `/api/admin/customers` para exponer no_show_count, avg_party_size, loyalty_tier

### Fase 3: Nuevos Componentes Frontend
1. `DashboardPanel.tsx` — Tab principal del dashboard analítico
2. `RetentionFunnel.tsx` — Embudo animado (Framer Motion)
3. `NoShowRiskTable.tsx` — Tabla de riesgo con acciones
4. `VIPLeaderboard.tsx` — Top VIPs con badges
5. `ReactivationCards.tsx` — Oportunidades de reactivación
6. `ContactabilityChart.tsx` — Barras apiladas
7. `PartySizeDistribution.tsx` — Donut chart

### Fase 4: Campañas Automáticas
1. Reactivación: WhatsApp a clientes de 1 visita con opt-in
2. Cumpleaños: captura de fecha + campaña automática
3. Fidelización: descuentos para frecuentes que traen más personas

---

## 15. Optimizaciones Recomendadas

### BD (Supabase)
- Agregar campos faltantes a `customer_stats`: no_show_ratio, loyalty_score, risk_level
- Crear `customer_analytics` materialized view para KPIs precalculados
- Agregar índices en: phone, email, last_visit_date, loyalty_tier
- Agregar `reservation_status_log` para tracking de estados

### API
- Unificar métricas en un solo endpoint `/api/admin/dashboard`
- Agregar caching (SWR con revalidation) para datos agregados
- Endpoint de búsqueda avanzada (por risk_level, loyalty_tier, etc.)

### Frontend
- Usar React Query (TanStack Query) para data fetching
- Implementar virtualización para lista de 25K clientes
- Lazy loading de componentes pesados (charts)
- Skeleton loading states

---

## 16. Datos Curiosos

- **"Cristiano Ronaldo"** es cliente (21 reservas, 49 personas, 6 no-show) — probablemente homónimo
- **"Timeleft DRINKS Table 1"** es un grupo evento recurrente (10 reservas, 62 personas)
- **Solo 20 de 29,103** tienen fecha de cumpleaños → oportunidad de captura masiva
- **9,433 clientes** tienen "Reservas Pendientes = 1" → probablemente dato del POS
- **4,843 clientes sin contacto** → datos irrecuperables sin teléfono ni email

---

*Generado por Kimi K2.6 vía Codex + Ninja*  
*Fuente: ANALISIS_CLIENTES.md (29,103 registros) + Código fuente A&K*