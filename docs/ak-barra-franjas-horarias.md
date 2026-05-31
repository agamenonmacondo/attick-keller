# Análisis de Franjas Horarias — Barra Attic & Keller

**Fuente:** Excel `HORARIO BARRA ATTIC.xlsx` — 5 semanas (Mar-Abr) + 2 semanas Julio + 1 semana Agosto  
**Datos HO/HN (Horas Ordinarias/Nocturnas):** Verificados contra turnos escritos en Abril  
**Fecha:** Mayo 2026

---

## 1. Interpretación de Horarios

La barra opera de tarde-noche con un turno de aseo/madrugada. Los horarios del Excel usan una notación donde:

- **Horas bajas (01-06)** = AM del mismo día o día siguiente (madrugada)
- **04:00-06:00 inicio** = PM (4-6pm) cuando el turno cruza medianoche
- **10:00-12:00** = AM (mañana) cuando inicio < fin
- **12:00-CIERRE / 12:00-06:00** = Mediodía a madrugada siguiente
- **/** = Turno partido (2 bloques con descanso intermedio)

### Franjas identificadas

| Franja | Horario real | Código Excel | Duración | % Nocturno |
|--------|-------------|--------------|----------|------------|
| Madrugada | 01:00 - 06:00 AM | `01:00-06:00` | 5h | 100% |
| Apertura | 04:00 PM - 12:00 AM | `04:00-12:00` | 8h | 38% |
| Mañana | 10:00 AM - 05:00 PM | `10:00-05:00` | 7h | 0% |
| Tarde-Noche | 05:00 PM - 01:00 AM | `05:00-01:00` | 8h | 50% |
| Noche | 06:00 PM - 02:00 AM | `06:00-02:00` | 8h | 75% |
| Largo | 04:00 PM - 01:00 AM | `04:00-01:00` | 9h | 44% |
| Partido | 12:00-04:00/08:00-12:00 | 2 bloques | 8h | mixto |
| Aseo | 01:00 - 06:00 AM | `01:00-06:00` | 5h | 100% |

**Verificación HO/HN (Abril 6-12):**
- `04:00-01:00` = 4PM-1AM → HO=5, HN=4 (9h total) ✓
- `10:00-05:00` = 10AM-5PM → HO=7, HN=0 (7h total) ✓
- `05:00-01:00` = 5PM-1AM → HO≈4, HN≈4 (8h total) ✓
- `01:00-06:00` = 1AM-6AM → HO=0, HN=5 (5h total) ✓

---

## 2. Horas Semanales por Persona — Abril 6-12 (datos exactos)

| Nombre | Días | HO | HN | HDO | HDN | Total | Noct% | Exceso |
|--------|------|----|----|-----|-----|-------|-------|--------|
| ADRIAN | 6 | 22 | 15 | 6 | 0 | 43h | 35% | — |
| NICOLAS | 6 | 18 | 19 | 3 | 3 | 43h | 51% | — |
| STEVEN | 6 | 17 | 20 | 6 | 0 | 43h | 47% | — |
| JUAN PABLO | 6 | 22 | 15 | 3 | 3 | 43h | 42% | — |
| YOHAN | 5 | 15 | 24 | 0 | 0 | 39h | 62% | — |
| MANOLO | 5 | 19 | 18 | 0 | 0 | 37h | 49% | — |
| HELENA | 4 | 27 | 0 | 0 | 0 | 27h | 0% | — |
| JUANSE | 3 | 9 | 18 | 0 | 0 | 27h | 67% | — |
| DAYANA | 3 | 8 | 18 | 0 | 0 | 26h | 69% | — |
| ASHLEY | 3 | 4 | 19 | 0 | 0 | 23h | 83% | — |
| APOYO | 2 | 10 | 8 | 0 | 0 | 18h | 44% | — |

**Totales:** 11 personas | 369h semanales | Promedio: 33.5h/persona | Nocturno: 49%

### Detalle por persona y día (Abril)

**ADRIAN** (43h, 6 días, 6 turnos distintos):
- Mar: 05:00-12:00 | Mie: 11:00-05:00 | Jue: 10:00-05:00
- Vie: 10:00-03:00/08:00-12:00 (partido) | Sab: 05:00-01:00 | Dom: 10:00-04:00

**NICOLAS** (43h, 6 días, 5 turnos distintos):
- Lun: 04:00-10:00 | Mie: 05:00-12:00 | Jue: 05:00-01:00
- Vie: 04:00-01:00 | Sab: 10:00-05:00 | Dom: 04:00-10:00

**YOHAN** (39h, 5 días, 5 turnos distintos):
- Lun: 04:00-10:00 | Mie: 05:00-12:00 | Jue: 05:00-01:00
- Vie: 04:00-01:00 | Sab: 10:00-03:00/08:00-12:00

---

## 3. Patrones de Turno por Persona

| Nombre | Hora/semana | Turnos distintos | Patrón |
|--------|-------------|-----------------|--------|
| ADRIAN | 43h | 6 | Rotación total (cada día diferente) |
| NICOLAS | 43h | 5 | Rotación alta con apertura y cierre |
| STEVEN | 43h | 4 | Noche + Mañana mixto |
| JUAN PABLO | 43h | 4 | Apertura + Mañana |
| YOHAN | 39h | 5 | Versátil (apertura/noche/largo) |
| MANOLO | 37h | 3 | Apertura + Noche |
| HELENA | 27h | 2 | Solo mañana (0% nocturno) |
| JUANSE | 27h | 1 | Noche fijo (06:00-02:00) |
| DAYANA | 26h | 2 | Apertura + Noche |
| ASHLEY | 23h | 2 | Noche (83% nocturno) |
| APOYO | 18h | 1 | Largo (04:00-01:00) |

**Hallazgo:** Los bartenders más experimentados (ADRIAN, NICOLAS) rotan entre 5-6 turnos distintos por semana. Los nuevos o parciales trabajan patrones más fijos.

---

## 4. Comparativa entre Semanas

| Semana | Personas activas | Horas totales | Promedio/persona |
|--------|-----------------|---------------|------------------|
| Mar 9-15 | 11 | 351h | 31.9h |
| Mar 16-22 | 10 | 368h | 36.8h |
| Mar 23-29 | 6 | 190h | 31.7h |
| Mar 30-Abr 5 | 10 | 280h | 28.0h |
| Abr 6-12 | 11 | 369h | 33.5h |

**Nota:** La semana de Mar 23-29 tiene solo 6 personas — datos posiblemente incompletos.

---

## 5. Cobertura por Día (Abril 6-12)

| Día | Personas | Tipos de turno | Detalle |
|-----|----------|----------------|---------|
| LUN | 7 | Apertura + Mañana | Sin noche; ADRIAN y STEVEN descansan |
| MAR | 7 | Mixto | YOHAN descansa; otros sin dato |
| MIE | 8 | Apertura + Mañana + Noche | Mixto |
| JUE | 9 | Apertura + Noche + Largo | Día fuerte |
| VIE | 10 | Apertura + Noche + Partido | Noche más pesada |
| SAB | 10 | Apertura + Noche + Partido | Noche más pesada |
| DOM | 5 | Apertura + Mañana | Cobertura mínima |

**Patrón:** La cobertura aumenta progresivamente de Lun (7) a Vie-Sáb (10), luego cae a 5 el Domingo.

---

## 6. Datos de Julio (Semana 22-28) — Equipo diferente

Equipo de julio tiene ~14 personas con horarios más intensos:

| Nombre | Días | Horas est. | Turnos principales |
|--------|------|-----------|-------------------|
| GIOVANNY | 5 | ~48h | Apertura + Partido |
| EDUARDO | 5 | ~48h | Apertura + Partido |
| CRISTIAN | 6 | ~68h | Apertura + Noche + Madrugada |
| CAROLINA | 5 | ~60h | Apertura + Partido |
| SOFIA | 6 | ~68h | Apertura + Noche |
| LEONARDO | 5 | ~60h | Apertura + Partido |
| HANNA | 5 | ~72h | Mañana + Noche + Apertura |
| NATALIA | 5 | ~72h | Mañana + Noche + Apertura |
| MARTIN | 6 | ~92h | Apertura + Noche + Madrugada |
| ALDEMAR | 5 | ~96h | Apertura + Noche |
| DON MARTIN | 5 | ~84h | Apertura + Noche + Mañana |
| MAICOL | 5 | ~96h | Apertura + Noche |
| ESTEFANIA | 5 | ~96h | Noche + Apertura |
| DOBLE-A | 4 | ~35h | Madrugada (01:00-06:00) |

**⚠️ ADVERTENCIA:** Varias personas en Julio superan 48h semanales. Los horarios calculados asumen cruce de medianoche sin descanso (no verificados con HO/HN como Abril). Es probable que los turnos largos (ej: 05:00-01:00) incluyan descansos no documentados, reduciendo horas reales.

---

## 7. Comparativa: Cocina vs Barra

| Criterio | Cocina (11 personas) | Barra (10-14 activas) |
|----------|---------------------|----------------------|
| Tipos de turno | 6 códigos fijos | 30+ franjas flotantes |
| Horas promedio | ~41h/semana | ~33h/semana (Abr) |
| % Nocturno | ~5% (solo cierre 22:30) | ~49% (horas 9pm-6am) |
| Turno más largo | P1/P2 = 10.5h (partido) | 9h (04:00-01:00) |
| Horario máximo | 22:30 | 01:00-03:00 AM |
| Cobertura Dom | 5-6 personas | 4-5 personas |
| Digitalizado | Sí (Rodri app) | No (Excel manual) |
| Estandarizado | Sí (6 códigos) | No (franjas variables) |
| Recargo nocturno | Mínimo | Alto (49% de horas) |

---

## 8. Recargos Laborales Aplicables (Colombia)

| Concepto | Recargo | Base |
|----------|---------|------|
| Nocturno (21:00-06:00) | +35% | Hora ordinaria |
| Dominical ordinario | +75% | Hora ordinaria |
| Dominical nocturno | +110% | Hora ordinaria |
| Extra diurno | +25% | Hora ordinaria |
| Extra nocturno | +75% | Hora ordinaria |
| Extra dominical diurno | +100% | Hora ordinaria |
| Extra dominical nocturno | +150% | Hora ordinaria |

**Impacto estimado (Abril):**
- 49% de las horas son nocturnas → +35% recargo promedio
- Domingos con 5 personas → +75% recargo dominical
- Costo laboral barra ≈ 1.4x vs cocina (por recargos nocturnos y dominicales)

---

## 9. Problemas Críticos Identificados

### 9.1 Sin estandarización
- **30+ combinaciones de horario** vs 6 códigos fijos en cocina
- Cada semana cambia sin patrón predecible
- Misma persona puede rotar entre 5-6 turnos distintos

### 9.2 No digitalizado
- Barra NO está en la app Rodri (solo cocina)
- Horarios se manejan en Excel manual
- Sin control automático de horas extra o recargos

### 9.3 Alto riesgo laboral
- 49% de horas son nocturnas (vs 5% en cocina)
- Posibles jornadas >48h en Julio (no verificado)
- Sin descanso uniforme entre turnos (rotación irregular)

### 9.4 Cobertura insuficiente domingos
- Solo 5 personas el Domingo (Abril)
- 4 personas el Domingo (Julio)
- Sin reemplazo para incapacidades

### 9.5 Typos en Excel
- "4:OO" en vez de "04:00" (O vs 0)
- Formatos inconsistentes entre semanas

---

## 10. Recomendaciones

### 10.1 Estandarizar franjas (reducir de 30+ a 6-8)
Propuesta de códigos fijos para barra:
- **B1**: Apertura 16:00-00:00 (8h)
- **B2**: Mañana 10:00-17:00 (7h)
- **B3**: Noche 17:00-01:00 (8h)
- **B4**: Cierre 22:00-06:00 (8h)
- **BP**: Partido 12:00-16:00/20:00-00:00 (8h)
- **BA**: Aseo 01:00-06:00 (5h)

### 10.2 Digitalizar en Rodri
- Migrar horarios de barra a la app
- Control automático de HO/HN y recargos
- Alertas de exceso de horas (>48h semanales)

### 10.3 Calcular recargos automáticamente
- Nocturno: +35% (21:00-06:00)
- Dominical: +75%
- Extra: según tipo

### 10.4 Mínimo 2 personas por franja
- Vie-Sáb: 10 personas OK
- Dom: elevar a mínimo 6
- Lun-Mar: elevar a mínimo 8

### 10.5 Rotación justa
- Alternar noches y mañanas equitativamente
- Máximo 3 noches consecutivas
- Descanso posterior a turno nocturno de 12h mínimo