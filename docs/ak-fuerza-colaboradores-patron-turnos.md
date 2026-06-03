# Fuerza de Colaboradores — Patrón de Turnos Día a Día

**Fecha**: Junio 2026  
**Fuentes**: App Rodri (Seadotec) + Supabase A&K (shift_assignments)  
**Semanas analizadas**: W15, W16, W17, W20 (Rodri) + Mayo 2026 (Supabase)

---

## 1. Estructura de la Fuerza Laboral

### Cocina (Rodri — 11 activos)

| Nombre | Cargo | Días/semana | Turnos frecuentes |
|---|---|---|---|
| Esneider | Chef Principal | 6-7 | A, C, P1, P2 — apertura + cierre |
| Iván | Cocinero | 5-6 | P2, C, S, P1 |
| Mauricio | Cocinero | 5-6 | P2, C, X |
| Carlos | Cocinero | 5-6 | P1, P2, C, A |
| Santiago | Cocinero | 5-6 | C, S, P2 |
| Jose | Cocinero | 5-6 | C, P2, A |
| Vanessa | Cocinera | 5-6 | A, C, X |
| Turnante | Cocinero (flotante) | 4-5 | S, P2 |
| Clara | Steward | 5-6 | CS, C, A, P1 |
| Dusibeth | Steward | 5-6 | P1, P2, S, C |
| Yohana | Steward | 4-5 | CS, S, X |

### Pizzería (Rodri — 3 activos)

| Nombre | Cargo | Días/semana | Turnos frecuentes |
|---|---|---|---|
| Omar Cabra | Pizzero | 4-5 | A, S, P2, X |
| Nicolas | Pizzero | 5-6 | C, P2, S |
| Stefania | Pizzera | 3-4 | C (Jue-Sáb) |

### Staff general (Supabase — 49 registros)

Distribuidos entre Salón, Barra, Cocina, Host, Cajeros, Servicios Generales.  
Los shift_assignments en Supabase cubren principalmente **Salón/Meseros** y **Host**.

---

## 2. Conformación Diaria — Patrón General

### Promedio de personal por día

| Día | Cocina | Pizzería | **Total** |
|---|---|---|---|
| Domingo | 4.7 | 2.0 | **6-7** |
| Lunes | 5.0 | 2.0 | **7** |
| Martes | 5.0 | 2.0 | **7** |
| Miércoles | 5.0 | 2.0 | **7** |
| Jueves | 4.3 | 3.0 | **7-8** |
| Viernes | 4.3 | 3.0 | **7-8** |
| Sábado | 4.0 | 3.0 | **7** |

**Nota**: W16 es la semana más representativa (10-12 personas/día). W17 y W20 están incompletas (datos parciales de solo 2-3 personas).

---

## 3. Tipos de Turno por Día

### Leyenda de códigos

| Código | Nombre | Horario | Horas |
|---|---|---|---|
| **A** | Apertura | 09:00 – 16:00 | 7h |
| **S** | Seguido | 09:00 – 14:00 | 5h |
| **C** | Cierre | 15:00 – 22:30 | 7.5h |
| **P1** | Partido 1 | 09-14 + 17-22:30 | 10.5h |
| **P2** | Partido 2 | 11-16 + 17-22:30 | 10.5h |
| **CD** | Cierre Doméstico | 14:00 – 22:30 | 8.5h |
| **CS** | Cierre Steward | 16:00 – 22:30 | 6.5h |
| **X** | Descanso | — | 0h |
| **VAC** | Vacaciones | — | 0h |
| **INC** | Incapacidad | — | 0h |

### Frecuencia de turnos por día

| Día | Turnos más frecuentes | Patrón |
|---|---|---|
| **Domingo** | X(4), P2(3), P1(3), VAC(2) | Día de mayor descanso. Staff reducido. |
| **Lunes** | X(4), C(4), P2(2) | Inicio de semana tranquilo. |
| **Martes** | P2(3), C(3), S(3) | Equilibrio apertura/cierre. |
| **Miércoles** | C(5), P2(5) | Mucho cierre. Preparación fin de semana. |
| **Jueves** | C(4), S(4), CS(2) | Aumenta cobertura. Entra refuerzo pizzería. |
| **Viernes** | C(5), P2(3), P1(2) | Máximo cierre. Día de más volumen. |
| **Sábado** | C(3), A(3), X(3) | Repartido entre apertura, cierre y descanso. |

---

## 4. Patrón Semanal — Día a Día

### Domingo
- **Cocina**: 4-5 personas. Mayoría en P1/P2 (partidos). Stewards con P1 o descanso.
- **Pizzería**: 1-2 personas. Pizzero en S (seguido), otro descansa.
- **Total**: ~7 personas. Equipo más reducido de la semana.

### Lunes
- **Cocina**: 5 personas. Descansos concentrados (4 descansan). Los que trabajan hacen C (cierre) o P1.
- **Pizzería**: 2 personas. Uno abre (A), otro cierra (C).
- **Total**: ~7. Día de transición post-domingo.

### Martes
- **Cocina**: 5 personas. Se activan P2 y S. Menos descansos que lunes.
- **Pizzería**: 2 personas. Apertura + Cierre.
- **Total**: ~7. Día estable.

### Miércoles
- **Cocina**: 5 personas. Día de MÁXIMO cierre — C(5) + P2(5). Stewards en CS.
- **Pizzería**: 2 personas. Uno en P2, otro en C.
- **Total**: ~7. Preparación para el fin de semana. Turnos largos (partidos).

### Jueves
- **Cocina**: 4-5 personas. Se mantiene C y S. Stewards activos.
- **Pizzería**: 3 personas. **Entra el refuerzo** (Stefania). C y P2.
- **Total**: ~7-8. Arranca el volumen.

### Viernes
- **Cocina**: 4-5 personas. Día PICO de cierre — C(5), P2(3), P1(2). Todo el mundo cierra.
- **Pizzería**: 3 personas. Cierre completo.
- **Total**: ~7-8. Mayor volumen de ventas.

### Sábado
- **Cocina**: 4 personas. Mitad cierra (C, CD), mitad abre (A). Stewards rotan.
- **Pizzería**: 3 personas. S (seguido), C (cierre), X (descanso).
- **Total**: ~7. Similar al viernes pero con más descansos.

---

## 5. Hallazgos Clave

### Carga horaria crítica
- Los turnos **P1 y P2 son de 10.5 horas** (partidos con split).
- Quien hace 5-6 días en P2 acumula **55-63 horas/semana** — muy por encima de las 44h legales.
- Esneider (Chef Principal) trabaja 6-7 días, frecuentemente ~70h/semana.

### Descanso
- El descanso se concentra en **Domingo y Lunes** (8-9 personas descansan entre ambos días).
- No hay un patrón fijo por persona — rota según la semana.
- Algunos colaboradores no tienen día libre garantizado.

### Estacionalidad
- **W16 (Abril)** es la semana con más personal — 10-12/día. Coincide con temporada alta.
- **W17** y **W20** tienen datos parciales (solo 2-3 personas registradas) — posiblemente semanas de vacaciones colectivas o datos incompletos en Rodri.

### Digitalización parcial
- Solo **Cocina (11) y Pizzería (3)** están en Rodri con asignación digital.
- Salón, Barra, Host y Servicios Generales (~35 personas) no tienen turnos digitalizados en Rodri.
- Los shift_assignments de Supabase cubren Salón/Host pero con datos limitados (127 asignaciones en 6 schedules).

---

## 6. Fuentes de Datos

| Sistema | Alcance | Estado |
|---|---|---|
| **Rodri (Seadotec)** | Cocina (11) + Pizzería (3) | Digitalizado, 4 semanas de datos |
| **Supabase shift_assignments** | Salón, Host, Cajeros | 127 asignaciones, 6 schedules |
| **Biométricos (SoftRestaurant)** | 39 empleados total | Sin asignar a equipos — solo registros de entrada/salida |
| **Excel de Barra/Attic** | 29 colaboradores históricos | Manual, sin estructura fija |
