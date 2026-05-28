# Turnos de Cocina — Contexto (App Rodri)

**Ultima actualizacion:** Mayo 2026
**Fuente:** App Rodri (Seadotec DB) — tablas `employees`, `schedules`, `turnos_config`

---

## Plantilla Cocina: 11 personas, 3 roles

### 1. Esneider — Chef Principal
Coordinacion de brigada, pedidos especiales, supervision de linea. Presencia en todos los servicios.

| Dia | Turno | Horario | Funcion |
|-----|-------|---------|---------|
| Dom | X | Descanso | Libre |
| Lun | S | 10:00-22:30 | Cobertura completa todo el dia |
| Mar | S | 10:00-22:30 | Cobertura completa todo el dia |
| Mie | C | 15:00-22:30 | Cobertura tarde |
| Jue | S | 10:00-22:30 | Cobertura completa todo el dia |
| Vie | S | 10:00-22:30 | Cobertura completa todo el dia |
| Sab | A | 09:00-16:00 | Setup del dia mas pesado |

### 2. Ivan — Cocinero
Linea caliente, preparacion, emplatado.

| Dia | Turno | Horario | Funcion |
|-----|-------|---------|---------|
| Dom | C | 15:00-22:30 | Cierre domingo |
| Lun | X | Descanso | Libre |
| Mar | P2 | 10:00-22:30 | Partido, cobertura pico |
| Mie | C | 15:00-23:30 | Cierre miercoles |
| Jue | C | 15:00-23:30 | Cierre jueves |
| Vie | P1 | 09:00-23:30 | Partido, cobertura viernes |
| Sab | CD | 14:00-22:30 | Cierre domestico sabado |

### 3. Mauricio — Cocinero
Linea caliente, preparacion, emplatado.

| Dia | Turno | Horario | Funcion |
|-----|-------|---------|---------|
| Dom | P2 | 10:00-22:30 | Partido, cobertura domingo |
| Lun | P2 | 10:00-22:30 | Partido, cobertura lunes |
| Mar | X | Descanso | Libre |
| Mie | C | 15:00-23:30 | Cierre miercoles |
| Jue | C | 15:00-23:30 | Cierre jueves |
| Vie | C | 15:00-23:30 | Cierre viernes |
| Sab | C | 15:00-22:30 | Cierre sabado |

### 4. Carlos — Cocinero
Linea caliente, preparacion, emplatado.

| Dia | Turno | Horario | Funcion |
|-----|-------|---------|---------|
| Dom | X | Descanso | Libre |
| Lun | C | 15:00-22:30 | Cierre lunes |
| Mar | C | 15:00-22:30 | Cierre martes |
| Mie | P2 | 10:00-23:30 | Partido, cobertura miercoles |
| Jue | P1 | 09:00-23:30 | Partido, cobertura jueves |
| Vie | C | 15:00-23:30 | Cierre viernes |
| Sab | A | 09:00-16:00 | Apertura sabado |

### 5. Santiago — Cocinero
Linea caliente, preparacion, emplatado. (Semana parcial en W16)

| Dia | Turno | Horario | Funcion |
|-----|-------|---------|---------|
| Dom | P2 | 10:00-22:30 | Partido, cobertura domingo |
| Lun | C | 15:00-22:30 | Cierre lunes |
| Mar | X | Descanso | Libre |
| Mie | C | 15:00-23:30 | Cierre miercoles |

### 6. Jose — Cocinero
Linea caliente, preparacion, emplatado. (Semana parcial en W16)

| Dia | Turno | Horario | Funcion |
|-----|-------|---------|---------|
| Dom | X | Descanso | Libre |
| Lun | P2 | 10:00-22:30 | Partido, cobertura lunes |
| Mar | P2 | 10:00-22:30 | Partido, cobertura martes |
| Mie | P2 | 10:00-23:30 | Partido, cobertura miercoles |

### 7. Vanessa — Cocinera
Linea caliente, preparacion, emplatado. (En W16: VAC Lun-Mie, trabaja Jue-Sab)

| Dia | Turno | Horario | Funcion |
|-----|-------|---------|---------|
| Jue | S | 10:00-23:30 | Cobertura completa jueves |
| Vie | P2 | 10:00-23:30 | Partido, cobertura viernes |
| Sab | P1 | 09:00-22:30 | Partido, cobertura sabado |

### 8. Turnante — Cocinero (cobertura rotativa)
Cubre huecos por descansos, vacaciones o incapacidad. Asignacion variable por semana.

### 9. Dusibeth — Steward
Aseo, limpieza de cocina, organizacion de insumos, apoyo logistico. Siempre en turno A (apertura).

| Dia | Turno | Horario | Funcion |
|-----|-------|---------|---------|
| Dom | A | 09:00-16:00 | Apertura, limpieza profunda |
| Lun | X | Descanso | Libre |
| Mar | A | 09:00-16:00 | Apertura, limpieza |
| Mie | A | 09:00-16:00 | Apertura, limpieza |
| Jue | A | 09:00-16:00 | Apertura, limpieza |
| Vie | A | 09:00-16:00 | Apertura, limpieza |
| Sab | A | 09:00-16:00 | Apertura, limpieza |

### 10. Clara — Steward
Aseo, limpieza de cocina, organizacion de insumos. Siempre en turno CS (cierre steward).

| Dia | Turno | Horario | Funcion |
|-----|-------|---------|---------|
| Lun | CS | 16:00-22:30 | Cierre steward lunes |
| Mar | CS | 16:00-22:30 | Cierre steward martes |
| Mie | CS | 16:00-23:30 | Cierre steward miercoles |
| Jue | CS | 16:00-23:30 | Cierre steward jueves |
| Vie | CS | 16:00-23:30 | Cierre steward viernes |
| Sab | X | Descanso | Libre |

### 11. Yohana — Steward
Aseo, limpieza de cocina, organizacion de insumos. Siempre en turno CS (cierre steward).

| Dia | Turno | Horario | Funcion |
|-----|-------|---------|---------|
| Lun | X | Descanso | Libre |
| Mar | CS | 16:00-22:30 | Cierre steward martes |
| Mie | CS | 16:00-23:30 | Cierre steward miercoles |
| Jue | CS | 16:00-23:30 | Cierre steward jueves |
| Vie | CS | 16:00-23:30 | Cierre steward viernes |
| Sab | CS | 16:00-22:30 | Cierre steward sabado |

---

## Cobertura por dia

| Dia | Chef | Cocineros | Stewards | Total |
|-----|:----:|:---------:|:--------:|:-----:|
| Dom | Esneider(X) | Ivan(C), Mauricio(P2), Santiago(P2) | Dusibeth(A) | 4 |
| Lun | Esneider(S) | Carlos(C), Mauricio(P2), Jose(P2), Ivan(X) | Clara(CS) | 5 |
| Mar | Esneider(S) | Carlos(C), Ivan(P2), Jose(P2), Santiago(X) | Dusibeth(A), Yohana(CS) | 6 |
| Mie | Esneider(C) | Carlos(P2), Ivan(C), Mauricio(C), Jose(P2), Santiago(C) | Dusibeth(A), Clara(CS), Yohana(CS) | 8 |
| Jue | Esneider(S) | Ivan(C), Mauricio(C), Carlos(P1), Vanessa(S) | Dusibeth(A), Clara(CS), Yohana(CS) | 7 |
| Vie | Esneider(S) | Ivan(P1), Carlos(C), Mauricio(C), Vanessa(P2) | Dusibeth(A), Clara(CS), Yohana(CS) | 7 |
| Sab | Esneider(A) | Ivan(CD), Carlos(A), Mauricio(C), Vanessa(P1) | Dusibeth(A), Yohana(CS) | 6 |

---

## Diccionario de turnos

| Codigo | Nombre | Entrada | Salida | Duracion |
|--------|--------|---------|--------|----------|
| A | Apertura | 09:00 | 16:00 | 7h |
| C | Cierre | 15:00 | ~22:30-23:30 | 7.5-8.5h |
| S | Seguido | 10:00 | ~22:30-23:30 | 12-13h |
| P1 | Partido 9 | 09:00 | ~22:30-23:30 | 13-14h |
| P2 | Partido 10 | 10:00 | ~22:30-23:30 | 12-13h |
| CD | Cierre Domestic | 14:00 | ~22:30 | 8.5h |
| CS | Cierre Steward | 16:00 | ~22:30-23:30 | 6.5-7.5h |
| X | Descanso | — | — | 0h |
| VAC | Vacaciones | — | — | 0h |
| INC | Incapacidad | — | — | 0h |
| FEST | Festivo | — | — | 0h |

---

## Notas

- Horas de cierre (C, S, P1, P2, CD, CS) varian segun volumen. Entresemana ~22:30, Vie/Sab ~23:00-23:30.
- Turnos partidos (P1/P2) incluyen pausa de 2-3h entre jornada manana y tarde.
- Esneider trabaja 7 dias en W16 (sin descanso). Vanessa en VAC Lun-Mie, compensa Vie-Sab con turnos pesados.
- Santiago y Jose tienen semanas parciales en W16 (solo 4 dias asignados).
- Los stewards (Dusibeth, Clara, Yohana) tienen patrones fijos: Dusibeth siempre A, Clara y Yohana siempre CS.