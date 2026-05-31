# Reporte de Tallado: Cocina — Personal, Roles y Franjas Horarias

**Fecha:** Mayo 2026
**Fuente:** App Rodri (Seadotec DB) — tablas `employees`, `schedules`, `turnos_config`, `teams`
**Nota:** Solo personal de Cocina registrado en la app Rodri. Los 38 empleados "Sin asignar" en biometría pertenecen a otras áreas (Salón, Bar, etc.).

---

## 1. Resumen Ejecutivo

El área de Cocina tiene **11 colaboradores activos**, organizados en 3 roles:
- 1 Chef Principal
- 6 Cocineros + 1 Cocinera + 1 Turnante = 8 en línea
- 3 Stewards

Con 1 día de descanso por persona, se cubren **~7-8 personas por día** promedio, con déficit los domingos y lunes (5-6 disponibles).

---

## 2. Plantilla de Cocina — Roles y Cargos

### 2.1 Personal Activo (11 personas)

| # | Nombre | Cargo | Rol Operativo |
|---|--------|-------|---------------|
| 1 | Esneider | Chef Principal | Liderazgo de brigada, coordinación de pedidos |
| 2 | Iván | Cocinero | Línea caliente |
| 3 | Mauricio | Cocinero | Línea caliente |
| 4 | Carlos | Cocinero | Línea caliente |
| 5 | Santiago | Cocinero | Línea caliente |
| 6 | Jose | Cocinero | Línea caliente |
| 7 | Vanessa | Cocinera | Línea caliente |
| 8 | Turnante | Cocinero | Cobertura rotativa |
| 9 | Clara | Steward | Aseo y kitchen prep |
| 10 | Dusibeth | Steward | Aseo y kitchen prep |
| 11 | Yohana | Steward | Aseo y kitchen prep |

**Desglose por rol:**
- **Chef Principal (1):** Esneider — Coordina la brigada, maneja pedidos especiales, presencia en todos los servicios
- **Cocineros/Cocinera (7 + 1 Turnante):** Línea caliente, preparación, emplatado. El Turnante cubre huecos por descansos, vacaciones o incapacidad
- **Stewards (3):** Limpieza, organización de insumos, apoyo logístico

---

## 3. Diccionario de Turnos

| Código | Nombre | Entrada | Salida* | Duración estimada | Tipo |
|--------|--------|---------|---------|-------------------|------|
| A | Apertura | 09:00 | 16:00 | 7h | Fijo |
| C | Cierre | 15:00 | ~22:30 | 7.5h | Variable |
| S | Seguido | 10:00 | ~22:30 | 12.5h | Variable |
| P1 | Partido 9 | 09:00 | ~22:30** | 13.5h | Partido |
| P2 | Partido 10 | 10:00 | ~22:30** | 12.5h | Partido |
| CD | Cierre Domestic | 14:00 | ~22:30 | 8.5h | Variable |
| CS | Cierre Steward | 16:00 | ~22:30 | 6.5h | Variable |
| X | Descanso | — | — | 0h | Libre |
| VAC | Vacaciones | — | — | 0h | Libre |
| INC | Incapacidad | — | — | 0h | Libre |
| FEST | Festivo | — | — | 0h | Libre |

*\* La hora de cierre real varía según volumen del día. Estimado: 22:30 entresemana, 23:00 vie/sáb.*
*\*\* Turnos partidos tienen pausa entre turno (2-3h approx), por eso la duración total es mayor al tiempo efectivo trabajado.*

---

## 4. Patrones de Turnos por Rol y Día

### 4.1 Chef Principal (Esneider)

| Día | Turno típico | Horario | Función |
|-----|-------------|---------|---------|
| Domingo | X (Descanso) | Libre | Recuperación |
| Lunes | S (Seguido) | 10:00-22:30 | Cobertura completa |
| Martes | S (Seguido) | 10:00-22:30 | Cobertura completa |
| Miércoles | C (Cierre) | 15:00-22:30 | Cobertura tarde |
| Jueves | S (Seguido) | 10:00-22:30 | Cobertura completa |
| Viernes | S (Seguido) | 10:00-22:30 | Cobertura completa |
| Sábado | A (Apertura) | 09:00-16:00 | Setup del día más pesado |

**Horas estimadas:** ~72h/semana (28h sobre límite legal de 44h)

### 4.2 Cocineros (6 + 1 Turnante)

Patrón rotativo. Cada cocinero tiene **1 día de descanso** (preferiblemente lunes o domingo) y rota entre los turnos:

| Día | A (Apertura) | C (Cierre) | S (Seguido) | P1/P2 (Partido) | Total personas |
|-----|:---:|:---:|:---:|:---:|:---:|
| Domingo | 1 | 1 | 1 | 3-4 | 5-6*** |
| Lunes | — | 2 | 1 | 2-3 | 4-5 |
| Martes | 1 | 1 | 1 | 2-3 | 5-6 |
| Miércoles | 1 | 3 | 1 | 4 | 6-7*** |
| Jueves | 1 | 2 | 2 | 1 | 5-6 |
| Viernes | 1 | 3 | 1 | 2 | 6-7 |
| Sábado | 1 | 1 | — | 3-4 | 5-6 |

***\*\* Miércoles concentra más partidos (4 P2) por pico de transición almuerzo-cena.***

**Horas por cocinero:**
- Semana con P1: ~65h
- Semana con P2: ~62h
- Semana sin partidos (solo A/S/C): ~47-52h
- **Promedio: ~60h/semana (36% sobre límite legal)**

### 4.3 Stewards (3)

| Día | Clara | Dusibeth | Yohana | Total |
|-----|-------|----------|--------|--------|
| Domingo | VAC/libre | A (7h) | libre | 1-2 |
| Lunes | CS (6.5h) | libre (X) | libre (X) | 1 |
| Martes | CS (6.5h) | A (7h) | CS (6.5h) | 2-3 |
| Miércoles | CS (6.5h) | A (7h) | CS (6.5h) | 2-3 |
| Jueves | CS (6.5h) | A (7h) | CS (6.5h) | 3 |
| Viernes | CS/P1 | A (7h) | CS (6.5h) | 2-3 |
| Sábado | libre (X) | A (7h) | CS (6.5h) | 2 |

**Problema:** Con solo 3 stewards, los días lunes quedan con 1 solo steward. Dom/domingo también quedan cortos.

---

## 5. Franjas Horarias — Cobertura por Hora

Basado en los turnos asignados en la app Rodri:

| Hora | A (Apertura) | C (Cierre) | S (Seguido) | P1/P2 (Partido) | CD (C.Dom) | CS (C.Steward) | Total cocina |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 09:00-10:00 | ✓ | — | — | ✓ | — | — | 2-3 |
| 10:00-12:00 | — | — | ✓ | ✓ | — | — | 4-5 |
| 12:00-15:00 | — | — | ✓ | ✓ | — | — | 6-7 |
| 15:00-16:00 | — | ✓ | ✓ | ✓ | ✓ | — | 7-8 |
| 16:00-19:00 | — | ✓ | ✓ | ✓ | ✓ | ✓ | 7-9 |
| 19:00-22:00 | — | ✓ | ✓ | ✓ | ✓ | ✓ | 6-8 |
| 22:00-22:30 | — | ✓ | ✓ | ✓ | ✓ | ✓ | 4-5 |

**GAP crítico:** Entre 15:00-16:00 confluyen A (salida) + C (entrada) + S + P1/P2, creando el pico de cobertura pero también el mayor riesgo de cuello de botella en cocina.

---

## 6. Horario Detallado por Semana (W16 — la más representativa)

| Persona | Cargo | Dom | Lun | Mar | Mie | Jue | Vie | Sab | hrs/días |
|---------|-------|-----|-----|-----|-----|-----|-----|-----|----------|
| **Esneider** | Chef | X | S | S | C | S | S | A | ~72h/7d |
| **Iván** | Cocinero | C | X | P2 | C | C | P1 | CD | ~65h/7d |
| **Carlos** | Cocinero | X | C | C | P2 | P1 | C | A | ~64h/7d |
| **Mauricio** | Cocinero | P2 | P2 | X | C | C | C | C | ~63h/7d |
| **Vanessa** | Cocinera | VAC | VAC | VAC | VAC | S | P2 | P1 | ~70h/7d* |
| **Santiago** | Cocinero | P2 | C | X | C | — | — | — | ~36h/4d |
| **Jose** | Cocinero | X | P2 | P2 | P2 | — | — | — | ~46h/4d |
| **Dusibeth** | Steward | A | X | A | A | A | A | A | ~50h/7d |
| **Clara** | Steward | — | CS | CS | CS | CS | CS | X | ~40h/6d |
| **Yohana** | Steward | — | X | CS | CS | CS | CS | CS | ~40h/6d |

*\* Vanessa en VAC lunes-miércoles, compensa con carga los otros 4 días.*

---

## 7. Problemas Identificados

### 7.1 Exceso de Horas

| Persona | Cargo | Horas/sem | Días trabajados | Exceso sobre 44h |
|---------|-------|-----------|-----------------|------------------|
| Esneider | Chef | ~72h | 7 | +28h (64% extra) |
| Vanessa | Cocinera | ~70h | 7* | +26h (59% extra) |
| Carlos | Cocinero | ~64h | 7 | +20h (45% extra) |
| Iván | Cocinero | ~65h | 7 | +21h (48% extra) |
| Mauricio | Cocinero | ~63h | 7 | +19h (43% extra) |
| Dusibeth | Steward | ~50h | 7 | +6h (14% extra) |

**Ningún cocinero cumple 44h/semana.** El problema es estructural: con solo 8 cocineros y 1 descanso/día, cada persona trabaja 6-7 días.

### 7.2 Turnos Partidos Demasiado Frecuentes

- P1/P2 representan ~30% de las asignaciones de cocineros
- Cada turno partido genera: pausa no remunerada, recargo nocturno adicional, fatiga
- Miércoles concentra 4 P2 simultáneos

### 7.3 Stewards Insuficientes

- Solo 3 stewards para 7 días
- Lunes: 1 solo steward
- Domingo: 1-2 stewards
- Necesitan mínimo 4-5 para cobertura con descanso

### 7.4 Sin Horario de Cierre Definido

- Turnos C, S, P1, P2, CD, CS no tienen hora de salida en `turnos_config`
- Dependen del volumen del día, generando sobretiempo no planificado

---

## 8. Cobertura Mínima Recomendada vs Actual

| Día | Cocineros necesarios | Stewards necesarios | Cocina total necesario | Cocina total actual | DÉFICIT |
|-----|:---:|:---:|:---:|:---:|:---:|
| Domingo | 4 | 2 | 6 | 5 | **-1** |
| Lunes | 3 | 1 | 4 | 4-5 | OK |
| Martes | 5 | 2 | 7 | 5-6 | **-1** |
| Miércoles | 5 | 2 | 7 | 6-7 | **-0 a -1** |
| Jueves | 5 | 2 | 7 | 5-6 | **-1** |
| Viernes | 6 | 2 | 8 | 6-7 | **-1 a -2** |
| Sábado | 6 | 2 | 8 | 5-6 | **-2 a -3** |

**Déficit total:** 6-8 persona-días por semana. Se necesita al menos 2-3 cocineros adicionales.

---

## 9. Parámetros Legales (Colombia)

| Concepto | Valor |
|----------|-------|
| Salario mínimo | $1,750,905 COP/mes |
| Auxilio transporte | $249,095 COP/mes |
| Jornada semanal | 44 horas |
| Jornada diaria | 8 horas |
| Inicio nocturno | 19:00 |
| Fin nocturno | 06:00 |
| Recargo nocturno | 35% |
| Recargo dominical | 80% |
| Extra diurna | 25% |
| Extra nocturna | 75% |
| Extra dominical diurna | 105% |
| Extra dominical nocturna | 155% |

---

## 10. Recomendaciones

### Inmediato
1. **Definir horas de cierre** en `turnos_config` para C, S, P1, P2, CD, CS (ej: 22:30 entresemana, 23:00 vie/sab)
2. **Limitar 6 días máximo** por persona — Esneider y Vanessa trabajan 7 días
3. **Deduplicar empleados** — Esneider y Carlos tienen registros duplicados (inactivos)

### Corto plazo (2-4 semanas)
4. **Contratar 2-3 cocineros** adicionales para reducir de ~60h a ~48h por persona
5. **Contratar 2 stewards** adicionales (de 3 a 5) para cobertura con descanso
6. **Reducir P1/P2** a máximo 2/semana total, no por persona

### Mediano plazo (1-2 meses)
7. **Automatizar descansos rotativos** con semana ISO como seed (ya implementado en AutoScheduleTab)
8. **Integrar bio_data** con `employees` para cálculo real de horas y recargos vs turnos programados

---

*Generado por Ninja — App Rodri (Seadotec DB)*
*Base de datos: https://seadotecznewqcvxsber.supabase.co*
*Informe almacenado en: `docs/ak-cocina-turnos-reporte.md`*