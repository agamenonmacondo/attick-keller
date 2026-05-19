# 📊 Análisis Detallado de Base de Datos — Attick & Keller

**Fecha:** Mayo 2026  
**Fuente:** Export POS 24/7 (29,103 registros)  
**BD Supabase:** 5 clientes (vacía — pendiente importación)

---

## 1. Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| **Total registros** | 29,103 |
| **Clientes con celular** | 24,191 (83.1%) |
| **Clientes con email** | 14,306 (49.2%) |
| **Con ambos contactos** | 14,237 (48.9%) |
| **Sin ningún contacto** | 4,843 (16.6%) |
| **Opt-In Marketing** | 20,411 (70.1%) |

### Hallazgo Crítico
**El 90% de los clientes (26,195) vinieron UNA vez y no volvieron.**  
Esta es la mayor oportunidad de negocio: reactivar aunque sea el 10% de esos = 2,619 clientes recurrentes adicionales.

---

## 2. Segmentación por Tipo de Cliente

| Tipo | Cantidad | % |
|------|----------|---|
| Sin tipo | 16,466 | 56.6% |
| Nuevo | 11,835 | 40.7% |
| Recurrente | 802 | 2.8% |

**⚠️ Problema:** Más de la mitad no tiene clasificación. Solo 802 clientes recurrentes de 29,103 = el 2.8% del total.

**Oportunidad:** Auto-clasificar basado en `Total Reservas`:
- 0 reservas → Prospecto
- 1 reserva → Nuevo
- 2-3 → Ocasional  
- 4-5 → Frecuente
- 6-10 → Habitual
- 11+ → VIP

---

## 3. Frecuencia de Visita

| Segmento | Cantidad | % | Valor |
|----------|----------|---|-------|
| 1 (Una vez) | 26,195 | 90.0% | 🔴 Perdidos |
| 2-3 (Ocasional) | 2,551 | 8.8% | 🟡 Retenibles |
| 4-5 (Frecuente) | 264 | 0.9% | 🟢 Valiosos |
| 6-10 (Habitual) | 82 | 0.3% | 🟢 Muy valiosos |
| 11+ (VIP) | 11 | 0.0% | 🌟 Invaluables |

**Embudo de retención:**
```
29,103 clientes en BD
  └→ 29,103 vinieron al menos 1 vez
      └→ 2,908 volvieron (10%) ← BRECHA ENORME
          └→ 357 frecuentes (1.2%)
              └→ 93 habituales (0.3%)
                  └→ 11 VIP (0.04%)
```

---

## 4. Tamaño de Grupo (Personas Promedio por Reserva)

| Tamaño | Cantidad | % | Implicación para Mesas |
|--------|----------|---|----------------------|
| 1-2 (Parejas) | 20,392 | 70.1% | La distribución debe optimizarse para 2 personas |
| 3-4 (Pequeños) | 3,276 | 11.3% | Mesas de 4 son ideales |
| 5-6 (Medianos) | 2,108 | 7.2% | Combinaciones de mesas |
| 7-8 (Grandes) | 1,146 | 3.9% | Mesas grandes (8 personas) |
| 9+ (Muy grandes) | 2,181 | 7.5% | Comedor, Chispas grandes |

**Implicación para el algoritmo:** El 70% de las reservas son para 2 personas. El algoritmo debería:
1. Priorizar mesas para parejas en zonas bajas temprano
2. Proteger mesas combinables para grupos de 4+
3. Distribuir parejas entre TODAS las zonas, no solo Tipi

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

**Total clientes alto riesgo:** 161 con ratio ≥50% y 3+ reservas

**Acción:** El sistema debe marcar automáticamente estos clientes con tags 🔴 cuando hagan una reserva, y sugerir confirmación por WhatsApp.

---

## 6. Top 15 VIPs (Mejores Clientes)

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

**Patrón VIP:** Traen entre 26-86 personas acumuladas, bajo no-show, frecuentes.

---

## 7. Contactabilidad para Campañas

| Canal | Cantidad | % | Alcance |
|-------|----------|---|---------|
| Con celular | 24,191 | 83.1% | ✅ WhatsApp |
| Con email | 14,306 | 49.2% | ✅ Email marketing |
| Con ambos | 14,237 | 48.9% | ✅ Multi-canal |
| Sin contacto | 4,843 | 16.6% | ❌ No alcanzable |

**Opt-In Marketing:**
- Sí: 20,411 (70.1%) → se puede contactar
- No: 8,692 (29.9%) → NO contactar

**Potencial de reactivación por WhatsApp:**
- 1 sola visita + opt-in sí + con celular = ~16,000 clientes alcanzables
- Si reactivamos el 5% = ~800 reservas adicionales

---

## 8. Distribución Temporal (Última Reserva)

Las fechas más frecuentes de última visita:

| Fecha | Clientes | Evento |
|-------|----------|--------|
| 05 Mar 2024 | 277 | ¿Evento especial? |
| 16 Feb 2024 | 162 | Valentine's / San Valentín |
| 19 Feb 2024 | 91 | Fin de semana |
| 09 Ene 2025 | 90 | Post-fiestas |
| 26 Mar 2024 | 85 | — |

**Observación:** Los picos corresponden a fechas especiales (San Valentín, post-navidad). El sistema debería tener campañas automáticas para estas fechas.

---

## 9. Columnas del CSV (34 campos)

| # | Campo | Tipo | ¿Importa? | Notas |
|---|-------|------|-----------|-------|
| 1 | Nombres | texto | ✅ | Nombre del cliente |
| 2 | Apellidos | texto | ✅ | Apellido |
| 3 | Tipo de cliente | enum | ✅ | Nuevo/Recurrente — pero 56.6% vacío |
| 4 | Cumpleaños | fecha | ⚠️ | Solo ~20 de 29K tienen dato |
| 5 | Puntos en mesa 24/7 | número | ❌ | Casi todos vacíos |
| 6 | Teléfono | texto | ⚠️ | Fijo, poco útil en Colombia |
| 7 | Celular | texto | ✅ | 83% lleno — para WhatsApp |
| 8 | Email | texto | ✅ | 49% lleno |
| 9 | Tags | texto | ⚠️ | Para segmentación |
| 10 | Sexo | texto | ⚠️ | M/F |
| 11 | Última Reserva | fecha | ✅ | "14 Apr 2026" — parsear |
| 12 | Último Delivery | fecha | ❌ | Casi todos vacíos |
| 13 | Último Take Out | fecha | ❌ | Casi todos vacíos |
| 14 | Última Experiencia | fecha | ❌ | Casi todos vacíos |
| 15 | Próximas Reservas | número | ❌ | Todos vacíos o "0" |
| 16 | Reservas Atendidas | número | ✅ | Conteo |
| 17 | Reservas Pendientes | número | ✅ | Conteo (9,433 con "1") |
| 18 | Reservas Canceladas | número | ✅ | Conteo |
| 19 | No-Show | número | ✅ | Para riesgo |
| 20 | Total Reservas | número | ✅ | Frecuencia |
| 21 | Personas Totales | número | ✅ | Personas traídas |
| 22 | Personas promedio por reserva | decimal | ✅ | → party_size estimado |
| 23 | Gasto total en reservas | moneda | ❌ | Todos en 0.00 |
| 24 | Gasto promedio por reserva | moneda | ❌ | Todos en 0.00 |
| 25 | Gasto promedio por persona | moneda | ❌ | Todos en 0.00 |
| 26 | Pedidos entregados | número | ❌ | Delivery |
| 27 | Pedidos cancelados | número | ❌ | Delivery |
| 28 | Gasto total por pedidos | moneda | ❌ | Delivery |
| 29 | Gasto promedio por pedido | moneda | ❌ | Delivery |
| 30 | Opt-In Marketing | sí/no | ✅ | 70% "Sí" |
| 31 | ListaNegra | sí/no | ✅ | Blacklist |
| 32 | Notas del restaurante | texto | ✅ | Notas libres |
| 33 | Alergias | texto | ✅ | Para cocina |
| 34 | Reviews | texto | ⚠️ | Para reputación |

### Mapeo CSV → Supabase

| CSV | Supabase `customers` | Supabase `customer_stats` |
|-----|----------------------|--------------------------|
| Nombres + Apellidos | full_name | — |
| Celular | phone | — |
| Email | email | — |
| Tipo de cliente | notes (clasificación) | loyalty_tier (derivado) |
| Cumpleaños | preferences.birthday | — |
| No-Show | — | no_show_count |
| Total Reservas | — | total_visits |
| Personas Totales | — | preferences.total_guests |
| Personas promedio | — | preferences.avg_party_size |
| Última Reserva | — | last_visit_date (parser) |
| Opt-In Marketing | preferences.opt_in | — |
| ListaNegra | preferences.blacklist | — |
| Alergias | preferences.allergies | — |
| Notas | notes | — |

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

---

## 11. Plan de Acción

### Fase 1: Importación (Domingo)
1. Script Python que mapea CSV → `customers` + `customer_stats`
2. Deduplicación por celular (mismo número = mismo cliente)
3. Auto-clasificación: Nuevo/Ocasional/Frecuente/Habitual/VIP
4. Tags automáticos: 🟢 VIP, 🟡 Frecuente, 🔴 No-Show Risk
5. Objetivo: 29,103 → ~25,000 únicos (después de deduplicar)

### Fase 2: Segmentación en la App
1. Agregar tabs al CustomersPanel: Todos / VIPs / Frecuentes / No-Show Risk / Reactivación
2. Dashboard de embudo en MetricsPanel
3. Alertas automáticas cuando un cliente de alto riesgo hace reserva

### Fase 3: Campañas
1. Reactivación: WhatsApp a clientes de 1 visita con opt-in
2. Cumpleaños: captura de fecha + campaña automática
3. Fidelización: descuentos para frecuentes que traen más personas

---

## 12. Datos Curiosos

- **"Cristiano Ronaldo"** es cliente (21 reservas, 49 personas, 6 no-show) — probablemente homónimo
- **"Timeleft DRINKS Table 1"** es un grupo evento recurrente (10 reservas, 62 personas)
- **Solo 20 de 29,103** tienen fecha de cumpleaños → oportunidad de captura masiva
- **9,433 clientes** tienen "Reservas Pendientes = 1" → probablemente dato del POS (no reservas activas reales)
- **4,843 clientes sin contacto** → datos irrecuperables sin teléfono ni email

---

*Generado por Ninja — Análisis de datos A&K*  
*Fuente: doc_732737c094a9_attic-keller-clientes.csv (29,103 registros)*