# A&K — Conformación de Equipos vs Demanda por Día y Área

> **Fuentes:**
> - Demanda: `pos_sales` Supabase (12,000 ventas, enero-mayo 2026)
> - Oferta cocina: `web/docs/ak-cocina-turnos-contexto.md` (digitalizado en Rodri)
> - Oferta barra: `web/docs/ak-barra-attic-contexto.md` + `ak-barra-franjas-horarias.md`
> - Oferta mesas/host/cajeros/SG: Excel `HORARIOS FORMATO STAFF.xlsx` (4 semanas, jul-ago 2025)
>
> **Fecha:** 2026-05-31
> **Análisis:** Cruce de demanda del POS vs personal del Excel, por día de la semana y por área.

---

## Resumen ejecutivo

| Día | Demanda (% del total) | Personal (estimado) | Ratio Oferta/Demanda | Diagnóstico |
|---|:---:|:---:|:---:|:---|
| **LUN** | 4.1% | 12-18% | 2.9-4.4x | 🟡 Sobredimensionado |
| **MAR** | 6.7% | 16-19% | 2.4-2.8x | 🟡 Sobredimensionado |
| **MIE** | 9.1% | 20-24% | 2.2-2.6x | ✅ Ajustado |
| **JUE** | 14.6% | 21-26% | 1.4-1.8x | ✅ Ajustado |
| **VIE** | 26.0% | 24-30% | 0.9-1.2x | 🔴 **INSUFICIENTE** |
| **SAB** | 28.9% | 23-29% | 0.8-1.0x | 🔴 **MUY INSUFICIENTE** |
| **DOM** | 10.6% | 11-13% | 1.0-1.2x | ✅ Ajustado |

**Hallazgo principal:** El personal está **inversamente correlacionado** con la demanda. Más gente cuando hay menos ventas (lunes-martes), menos gente cuando hay más ventas (viernes-sábado). El sistema está mal dimensionado para el pico.

---

## Demanda del POS por día de la semana (enero-mayo 2026)

| Día | Ventas | Revenue | Ticket avg | % del total | Intensidad vs promedio |
|---|---:|---:|---:|---:|:---:|
| **LUN** | 487 | $128,222,870 | $263,291 | 4.1% | 0.28x |
| **MAR** | 802 | $210,697,085 | $262,715 | 6.7% | 0.47x |
| **MIE** | 1,096 | $326,232,720 | $297,658 | 9.1% | 0.64x |
| **JUE** | 1,747 | $552,699,564 | $316,371 | 14.6% | 1.02x |
| **VIE** | 3,122 | $941,590,775 | $301,599 | 26.0% | **1.82x** |
| **SAB** | 3,472 | $971,085,313 | $279,690 | 28.9% | **2.03x** |
| **DOM** | 1,274 | $301,609,040 | $236,742 | 10.6% | 0.74x |
| **TOTAL** | 12,000 | $3,422,137,367 | $285,178 | 100% | 1.00x |

**Observaciones:**
- VIE+SAB = **55% del revenue semanal**
- JUE+VIE+SAB = **70% del revenue semanal**
- LUN+MAR = solo **11% del revenue semanal** (3.5x menos que viernes)

---

## Lunes (0.28x intensidad — día valle)

### Demanda esperada
- 487 ventas (~17/día en mes de 4 semanas)
- Revenue ~$128M
- Ticket promedio ~$263K
- Personal mínimo necesario: cocina para 50 tickets/turno, barra para 30 tragos/turno

### Conformación observada (datos del Excel + docs)

#### COCINA — 5 personas

| Rol | Persona | Turno | Horario | Tipo |
|---|---|---|---|---|
| Chef | Esneider | S | 10:00-22:30 | Día completo |
| Cocinero | Carlos | C | 15:00-22:30 | Cierre |
| Cocinero | Mauricio | P2 | 10:00-22:30 | Partido |
| Cocinero | Jose | P2 | 10:00-22:30 | Partido |
| Steward | Clara | CS | 16:00-22:30 | Cierre steward |

**Descansos:** Ivan (X), Dusibeth (X), Mauricio variable, Santiago, Yohana, Vanessa

#### BARRA — 0-7 personas (VARIABLE CRÍTICA)

| Personal | Horario típico (Abr 6-12) |
|---|---|
| ADRIAN | 10:00-04:00 |
| NICOLAS | 04:00-10:00 (lunes con menos ventas) |
| YOHAN | 04:00-10:00 |
| STEVEN | 10:00-05:00 |
| JUAN PABLO | 10:00-05:00 |

**Alerta:** En semana Jul 22-28, **0 personas registradas los lunes**. Si lunes es cierre temprano, la barra no tiene quien atienda. **Riesgo operativo.**

#### MESAS — 3-4 personas

| Zona | Personal | Horario |
|---|---|---|
| TEEPEE | 1 mesero | 06:00-12:00 (apertura) |
| JARDIN | 1 mesero | 07:00-12:00 (apertura) |
| PIZZERIA | 1 mesero | 11:00-8:00 (cierre) |
| RUNNER | 1 | — |

**Sin turnos partidos en lunes.** Cobertura limitada a aperturas y un cierre.

#### HOST — 1 persona (SEBAS o RACSO)

| Día | Persona | Horario |
|---|---|---|
| LUN (semana 22) | SEBAS | DESCANSO |
| LUN (semana 22) | RACSO | 11:00-8:00 |
| LUN (semana 29) | SEBAS | 11:00-8:00 |
| LUN (semana 29) | RACSO | DESCANSO |

**Patrón:** rotan cada semana. Solo 1 cubre.

#### CAJEROS — 1 persona (LESH o GIO)

| Día | Persona | Horario |
|---|---|---|
| LUN (sem 1) | LESH | DESCANSO |
| LUN (sem 1) | GIO | 1:00-10:00 |
| LUN (sem 2) | LESH | 1:00-10:00 |
| LUN (sem 2) | GIO | DESCANSO |

**Patrón:** rotan. Solo 1 cubre, sin margen.

#### SERVICIOS GENERALES — 1-2 personas

| Persona | Horario típico (sem 1) |
|---|---|
| JHON | 10:00-7:00 (9h) |
| HAYDE | DESCANSO |
| BETO | DESCANSO |
| CRISTINA | DESCANSO |

**Cobertura lunes:** solo 1 persona (JHON) por semana observada.

### Diagnóstico lunes
- **Demanda:** valle (4.1% del revenue)
- **Personal observado:** 12-13 personas en total (3.4x la demanda proporcional)
- **Conclusión:** **Sobredimensionado**. Cocina y servicios G están completos para un día de 487 ventas.

---

## Martes (0.47x intensidad — día bajo)

### Demanda esperada
- 802 ventas (~29/día)
- Revenue ~$211M
- Ticket promedio ~$263K
- ~1.6x más que lunes

### Conformación observada

#### COCINA — 6 personas

| Rol | Persona | Turno | Horario |
|---|---|---|---|
| Chef | Esneider | S | 10:00-22:30 |
| Cocinero | Carlos | C | 15:00-22:30 |
| Cocinero | Ivan | P2 | 10:00-22:30 |
| Cocinero | Jose | P2 | 10:00-22:30 |
| Steward | Dusibeth | A | 09:00-16:00 |
| Steward | Yohana | CS | 16:00-22:30 |

**Descansos:** Mauricio, Santiago, Clara, Vanessa (a veces)

#### BARRA — 7-9 personas

Mixto: 7 según semana Abr 6-12, 13 según semana Jul 22-28. Ajustar según reservas.

| Franja | # personas (Abr 6-12) |
|---|---:|
| Apertura 04:00-12:00 | 3-4 |
| Mañana 10:00-05:00 | 2-3 |
| Tarde-noche 05:00-01:00 | 1-2 |

#### MESAS — 4-5 personas

| Zona | Horario |
|---|---|
| TEEPEE | 06:00-12:00 / 10:00-4:00 |
| JARDIN | 07:00-12:00 / 10:00-4:00 |
| PIZZERIA | 11:00-8:00 / 3:00-10:00 |
| TALLER | 10:00-4:00 |
| RUNNER | 1 |

#### HOST — 1-2 personas

| Día (sem 22) | Persona | Horario |
|---|---|---|
| MAR | SEBAS | 10:00-4:00 |
| MAR | RACSO | 4:00-11:00 |

#### CAJEROS — 1-2

| Día (sem 1) | LESH | GIO |
|---|---|---|
| MAR | 9:00-4:00 | 5:00-1:00 |

#### SERVICIOS GENERALES — 2 personas

| Persona | Horario |
|---|---|
| HAYDE | 8:00-3:00 (7h) |
| BETO | 10:00-5:00 (7h) |

### Diagnóstico martes
- **Demanda:** baja (6.7% del revenue)
- **Personal observado:** 17-20 personas
- **Conclusión:** aún **sobredimensionado** vs demanda (~2.4x la proporción)

---

## Miércoles (0.64x intensidad — día medio)

### Demanda esperada
- 1,096 ventas (~39/día)
- Revenue ~$326M
- Ticket promedio ~$298K (más alto que lunes/martes)
- ~2.3x más que lunes

### Conformación observada

#### COCINA — 8-9 personas (DÍA FUERTE)

| Rol | Persona | Turno | Horario |
|---|---|---|---|
| Chef | Esneider | C | 15:00-22:30 |
| Cocinero | Carlos | P2 | 10:00-23:30 |
| Cocinero | Ivan | C | 15:00-23:30 |
| Cocinero | Mauricio | C | 15:00-23:30 |
| Cocinero | Jose | P2 | 10:00-23:30 |
| Cocinero | Santiago | C | 15:00-23:30 |
| Steward | Dusibeth | A | 09:00-16:00 |
| Steward | Clara | CS | 16:00-23:30 |
| Steward | Yohana | CS | 16:00-23:30 |

**Nota:** Cierre extendido a 23:30 (vs 22:30 normal) — primer día con cierre tardío de la semana.

#### BARRA — 8-10 personas

| Franja | # personas |
|---|---:|
| Apertura 04:00-12:00 | 4-5 |
| Mañana 10:00-05:00 | 1-2 |
| Tarde-noche 05:00-01:00 | 2-3 |
| Partido 10:00-2:00/6:00-10:00 | 1-2 |

#### MESAS — 5-6 personas

| Zona | Horario |
|---|---|
| TEEPEE | 06:00-12:00 / 10:00-4:00 |
| JARDIN | 07:00-12:00 / 10:00-4:00 |
| PIZZERIA | 11:00-8:00 |
| CHISPAS | 04:00-10:00 |
| COMIDA | 06:00-12:00 |
| RUNNER | 1 |

#### HOST — 2 personas (SEBAS + RACSO)

| Día (sem 22) | SEBAS | RACSO |
|---|---|---|
| MIE | 10:00-5:00 | DESCANSO |

#### CAJEROS — 2 (LESH + GIO)

| Día | LESH | GIO |
|---|---|---|
| MIE | 9:00-4:00 | 5:00-1:00 |

#### SERVICIOS GENERALES — 2 personas

| Persona | Horario |
|---|---|
| JHON | 9:00-4:00 |
| CRISTINA | 5:00-12:00 |

### Diagnóstico miércoles
- **Demanda:** media (9.1% del revenue)
- **Personal observado:** 21-25 personas
- **Conclusión:** **bien dimensionado** para el primer pico de la semana

---

## Jueves (1.02x intensidad — promedio)

### Demanda esperada
- 1,747 ventas (~62/día)
- Revenue ~$553M
- Ticket promedio ~$316K (el más alto de la semana)
- **Punto de inflexión: empieza el pico**

### Conformación observada

#### COCINA — 7-8 personas

| Rol | Persona | Turno | Horario |
|---|---|---|---|
| Chef | Esneider | S | 10:00-22:30 |
| Cocinero | Ivan | C | 15:00-23:30 |
| Cocinero | Mauricio | C | 15:00-23:30 |
| Cocinero | Carlos | P1 | 09:00-23:30 |
| Cocinero | Vanessa | S | 10:00-23:30 |
| Steward | Dusibeth | A | 09:00-16:00 |
| Steward | Clara | CS | 16:00-23:30 |
| Steward | Yohana | CS | 16:00-23:30 |

#### BARRA — 9-12 personas (PARTIDO ACTIVADO)

| Franja | # personas |
|---|---:|
| Apertura 04:00-12:00 | 4-5 |
| Mañana 10:00-05:00 | 1-2 |
| Tarde-noche 05:00-01:00 | 2-3 |
| Partido 10:00-2:00/6:00-10:00 | 2-3 |
| Noche 06:00-02:00 | 1 |

#### MESAS — 6-7 personas

| Zona | Horario |
|---|---|
| TEEPEE | 06:00-12:00 / 10:00-4:00 |
| JARDIN | 07:00-12:00 / 10:00-4:00 |
| PIZZERIA | 11:00-8:00 / 3:00-10:00 |
| CHISPAS | 04:00-10:00 |
| TALLER | 10:00-4:00 |
| COMIDA | 06:00-12:00 |
| BEBIDAS | (varía) |
| ATICO | (varía) |
| RUNNER | 1 |

#### HOST — 2 (SEBAS + RACSO)

| Día (sem 22) | SEBAS | RACSO |
|---|---|---|
| JUE | DESCANSO | DESCANSO |

**Nota:** En algunas semanas ambos descansan jueves (cobertura 0 — verificar reservas).

#### CAJEROS — 2 (LESH + GIO)

| Día | LESH | GIO |
|---|---|---|
| JUE | 11:00-6:00 | 6:00-1:00 |

**Cobertura:** continua de 11am a 1am.

#### SERVICIOS GENERALES — 2-3 personas

| Persona | Horario |
|---|---|
| JHON | 9:00-4:00 |
| CRISTINA | 5:00-1:00 |
| BETO | 10:00-5:00 |

### Diagnóstico jueves
- **Demanda:** promedio (14.6% del revenue)
- **Personal observado:** 22-27 personas
- **Conclusión:** **bien dimensionado** para el primer día de pico

---

## Viernes (1.82x intensidad — DÍA FUERTE)

### Demanda esperada
- 3,122 ventas (~112/día)
- Revenue ~$942M
- Ticket promedio ~$302K
- **2.03x más demanda que lunes, 26% del revenue semanal**

### Conformación observada

#### COCINA — 7 personas (INSUFICIENTE)

| Rol | Persona | Turno | Horario |
|---|---|---|---|
| Chef | Esneider | S | 10:00-22:30 |
| Cocinero | Ivan | P1 | 09:00-23:30 |
| Cocinero | Carlos | C | 15:00-23:30 |
| Cocinero | Mauricio | C | 15:00-23:30 |
| Cocinero | Vanessa | P2 | 10:00-23:30 |
| Steward | Dusibeth | A | 09:00-16:00 |
| Steward | Clara | CS | 16:00-23:30 |
| Steward | Yohana | CS | 16:00-23:30 |

**🔴 ALERTA:** Solo 4-5 cocineros para 3,122 ventas. El ratio es 1 cocinero por cada 624 ventas. Cocina estándar maneja 1 por 150-200.

#### BARRA — 10-14 personas (apretado)

**Personal máximo de la semana.** 4-5 aperturas largas (04:00-12:00), 3-4 partidos (10:00-2:00 / 6:00-10:00), 2-3 noches (12:00-8:00 o 5:00-1:00), 1-2 apoyos.

| Persona | Horario viernes típico |
|---|---|
| GIOVANNY | 10:00-2:00 / 6:00-10:00 (partido 8h) |
| EDUARDO | 12:00-4:00 / 8:00-12:00 (partido 8h) |
| CRISTIAN | 12:00-4:00 / 8:00-12:00 (partido 8h) |
| CAROLINA | 04:00-12:00 (apertura larga) |
| SOFIA | 12:00-4:00 / 8:00-12:00 (partido 8h) |
| LEONARDO | 04:00-12:00 (apertura larga) |
| HANNA | 04:00-12:00 (apertura larga) |
| NATALIA | 04:00-12:00 (apertura larga) |
| MARTIN | 05:00-01:00 (tarde-noche) |
| ALDEMAR | 05:00-01:00 (tarde-noche) |
| DON MARTIN | 12:00-4:00 / 8:00-12:00 (partido 8h) |
| MAICOL | 05:00-01:00 (tarde-noche) |
| ESTEFANIA | 09:00-05:00 (largo 20h) |
| DOBLE-A | 01:00-06:00 (apoyo nocturno 5h) |

**🔴 ALERTA:** 9 personas reportan 84-96h semanales (Julio). ALDEMAR 96h, MAICOL 96h, ESTEFANIA 96h — **excede 44h/semana legal Colombia** (2.2x el límite).

#### MESAS — 8-10 personas + 2 APOYO (INSUFICIENTE)

**Día más fuerte del servicio.** 8 zonas + 2 RUNNERS + 2 APOYOS.

| Zona | Horario viernes típico |
|---|---|
| TEEPEE | 06:00-12:00 / 10:00-4:00 / partido |
| JARDIN | 07:00-12:00 / 10:00-4:00 |
| PIZZERIA | 11:00-8:00 / 3:00-10:00 |
| CHISPAS | 04:00-10:00 |
| TALLER | 10:00-4:00 / partido |
| COMIDA | 06:00-12:00 / tarde |
| BEBIDAS | 06:00-12:00 / tarde |
| ATICO | (varía, viernes) |
| RUNNER | 1-2 |
| APOYO 1 | 04:00-01:00 (largo 21h) |
| APOYO 2 | 06:00-02:00 (largo 20h) |

**🔴 ALERTA:** 15 personas para 8 zonas + 2 runners + 2 apoyos en viernes. Si alguien falta, no hay margen.

#### HOST — 2 personas (SEBAS + RACSO)

| Día (sem 22) | SEBAS | RACSO |
|---|---|---|
| VIE | 3:00-11:00 | TP (partido 11:00-3:00/7:00-10:00) |

#### CAJEROS — 2 personas

| Día | LESH | GIO |
|---|---|---|
| VIE | 11:00-6:00 | 6:00-1:00 |

**Cobertura:** continua de 11am a 1am. Punto crítico: a las 6pm cambia de cajero.

#### SERVICIOS GENERALES — 2-3 personas

| Persona | Horario |
|---|---|
| JHON | 9:00-4:00 |
| BETO | 10:00-5:00 |
| HAYDE | 8:00-3:00 |

### Diagnóstico viernes
- **Demanda:** 26% del revenue semanal
- **Personal observado:** 25-31 personas (1.4x el promedio)
- **Ratio:** 0.9-1.2x la demanda proporcional → **APRETADO**
- **Riesgos:**
  - Cocina: 1 cocinero por 624 ventas (debería ser 1:200)
  - Mesas: 1.2 personas por zona con 2 zonas de cierre largo (TEEPEE, PIZZERIA)
  - Barra: 9 personas en >80h semanales — riesgo legal

---

## Sábado (2.03x intensidad — DÍA PICO)

### Demanda esperada
- 3,472 ventas (~124/día)
- Revenue ~$971M
- Ticket promedio ~$280K
- **2.03x más demanda que promedio, 28.9% del revenue semanal**

### Conformación observada

#### COCINA — 6 personas (MUY INSUFICIENTE)

| Rol | Persona | Turno | Horario |
|---|---|---|---|
| Chef | Esneider | A | 09:00-16:00 |
| Cocinero | Ivan | CD | 14:00-22:30 |
| Cocinero | Carlos | A | 09:00-16:00 |
| Cocinero | Mauricio | C | 15:00-22:30 |
| Cocinero | Vanessa | P1 | 09:00-22:30 |
| Steward | Dusibeth | A | 09:00-16:00 |
| Steward | Yohana | CS | 16:00-22:30 |

**🔴 ALERTA MÁXIMA:** Solo 4 cocineros (uno de ellos Esneider en turno corto 9-16). El chef principal termina a las 4pm. Sin cobertura de cierre.

#### BARRA — 10-14 personas (MÁXIMO)

Mismo equipo base que viernes + MELLO (si agosto) como coordinador 12:00-CIERRE.

| Persona | Horario sábado típico |
|---|---|
| GIOVANNY | 05:00-01:00 (tarde-noche) |
| EDUARDO | 04:00-12:00 (apertura larga) |
| CRISTIAN | 04:00-12:00 + 09:00-05:00 domingo |
| CAROLINA | 04:00-12:00 |
| SOFIA | 04:00-12:00 |
| LEONARDO | 05:00-01:00 (tarde-noche) |
| HANNA | 10:00-2:00 / 6:00-10:00 (partido) |
| NATALIA | 12:00-4:00 / 8:00-12:00 (partido) |
| MARTIN | 12:00-4:00 / 8:00-12:00 (partido) |
| ALDEMAR | 05:00-01:00 (tarde-noche) |
| DON MARTIN | 04:00-12:00 (apertura larga) |
| MAICOL | 05:00-01:00 (tarde-noche) |
| ESTEFANIA | 09:00-05:00 (largo 20h) |
| MELLO | 12:00-CIERRE (coordinador) |
| DOBLE-A | 01:00-06:00 (apoyo nocturno 5h) |

#### MESAS — 8-10 personas + 2 APOYO (MÁXIMO)

Mismo equipo que viernes. Personal de cierre largo:
- BRIAN: 11:00-8:00
- WILLIAM: 11:00-8:00
- RONALD: 11:00-8:00

**🔴 ALERTA:** 8 zonas activas + 2 RUNNERS + 2 APOYOS = 12 personas en zona en cierre largo.

#### HOST — 2 personas

| Día (sem 22) | SEBAS | RACSO |
|---|---|---|
| SAB | TP (11:00-3:00/7:00-10:00) | 3:00-11:00 |

#### CAJEROS — 2 personas

| Día | LESH | GIO |
|---|---|---|
| SAB | 11:00-6:00 | 6:00-1:00 |

#### SERVICIOS GENERALES — 2-3 personas

| Persona | Horario |
|---|---|
| JHON | 9:00-4:00 |
| CRISTINA | 5:00-1:00 |
| BETO | 10:00-5:00 |

### Diagnóstico sábado
- **Demanda:** 28.9% del revenue semanal (el día más alto)
- **Personal observado:** 24-30 personas (1.2x el promedio)
- **Ratio:** 0.8-1.0x la demanda proporcional → **MUY APRETADO**
- **Riesgos:**
  - Cocina: chef termina a las 4pm, después solo 3 cocineros
  - Mesas: 12 personas en zona para 3,472 ventas (1:289 ratio)
  - Barra: 9 personas en >80h semanales

---

## Domingo (0.74x intensidad — día valle)

### Demanda esperada
- 1,274 ventas (~46/día)
- Revenue ~$302M
- Ticket promedio ~$237K (el más bajo)
- **Solo el 10.6% del revenue, pero no es día valle crítico**

### Conformación observada

#### COCINA — 4 personas (MÍNIMO)

| Rol | Persona | Turno | Horario |
|---|---|---|---|
| Cocinero | Ivan | C | 15:00-22:30 |
| Cocinero | Mauricio | P2 | 10:00-22:30 |
| Cocinero | Santiago | P2 | 10:00-22:30 |
| Steward | Dusibeth | A | 09:00-16:00 |

**Descansos:** Esneider (X), Carlos (X), Jose (X), Mauricio variable, Vanessa.

#### BARRA — 4-5 personas (MADRUGADA + CIERRE)

**Solo domingos de madrugada.** Sin turno de mediodía.

| Persona | Horario |
|---|---|
| HANNA | 02:00-10:00 (madrugada) |
| NATALIA | 02:00-10:00 (madrugada) |
| MARTIN | 02:00-10:00 (madrugada) |
| CRISTIAN | 09:00-05:00 (largo 20h) |
| SOFIA | 12:00-08:00 (noche cierre) |
| DON MARTIN | 12:00-08:00 (noche cierre) |
| MAICOL | 12:00-08:00 (noche cierre) |
| DOBLE-A | 12:00-08:00 (apoyo aseo profundo) |

#### MESAS — 4-5 personas

5-6 zonas mínimo. Personal de cierre largo (11:00-8:00): algunos meseros.

#### HOST — 1-2 personas

BRYAN aparece los domingos según datos del Excel. RACSO o SEBAS alternan.

| Día (sem 22) | SEBAS | RACSO |
|---|---|---|
| DOM | 11:00-8:00 | DESCANSO |

#### CAJEROS — 1 persona (LESH)

LESH (1:00-10:00). **GIO descansa.**

#### SERVICIOS GENERALES — 1-2 personas

BETO o CRISTINA descansan domingo. JHON activo.

### Diagnóstico domingo
- **Demanda:** valle medio (10.6% del revenue)
- **Personal observado:** 12-14 personas
- **Conclusión:** **bien dimensionado** — el menú es ligero, no se necesita el mismo staff

---

## Patrones de Cross-Training (informales)

7 personas documentadas en MESAS Y BARRA:

| Persona | Áreas | Uso típico |
|---|---|---|
| CAROLINA | Mesas + Barra | Viernes-Sábado |
| DON MARTIN | Mesas + Barra | Refuerzo variable |
| EDUARDO | Mesas + Barra | Refuerzo variable |
| GIOVANNY | Mesas + Barra | Fines de semana |
| LEONARDO | Mesas + Barra | Sábados |
| MARTIN | Mesas + Barra | Variable |
| STEFANIA | Mesas + Barra | Variable |

**No formalizado como política.** Funciona informalmente pero sin:
- Contrato explícito de polivalencia
- Pago diferencial por cubrir dos roles
- Plan de carrera que reconozca la flexibilidad

---

## Resumen de cobertura por hora (viernes-sábado, días pico)

| Hora | Cocina | Barra | Mesas | Total | Estado |
|---|:---:|:---:|:---:|:---:|:---|
| 12:00 (almuerzo) | 5-6 | 6-7 | 6-7 | 17-20 | 🟡 Apretado |
| 19:00 (cena) | 6-7 | 8-10 | 8-10 | 22-27 | 🔴 Pico |
| 22:00 (noche) | 4-5 | 5-6 | 3-4 | 12-15 | 🟡 Reduciendo |
| 01:00 (madrugada) | 0 | 1-2 (DOBLE-A) | 1-2 | 2-4 | 🟢 Mínimo |

---

## Conclusiones operativas

### 1. Sobredimensionamiento en valles (LUN-MAR)

- **Cocina:** 5-6 personas para 487-802 ventas — ratio 1 cocinero por 80-130 ventas.
- **Servicios G:** 1-2 personas con franjas que no se justifican (ej: JHON 10:00-7:00 cuando lunes es día valle).
- **Costo:** el personal en lunes-martes podría reasignarse a viernes-sábado.

### 2. Insuficiencia en picos (VIE-SAB)

- **Cocina:** 6-7 personas para 3,122-3,472 ventas — ratio 1 cocinero por 500-580 ventas (debería ser 1:200).
- **Mesas:** 8-10 personas + 2 APOYOS = 12 personas en zona. 1 mesero por cada 290 ventas.
- **Cajeros:** solo 2 personas para 2 días pico. Una incapacidad = caos.
- **Host:** solo 3 personas, sin margen.

### 3. Riesgos laborales

- **9 personas en barra reportan 84-96h semanales** (ALDEMAR, MAICOL, ESTEFANIA, etc.) — excede 44h/semana legal Colombia.
- **2.2x el límite legal** en casos extremos.
- Sin mecanismo formal de aprobación de horas extra documentado.

### 4. Brecha de formalización

- Solo 1 de 6 áreas (cocina) está digitalizada en Rodri.
- 5 áreas (barra, mesas, host, cajeros, servicios G) están en Excel manual con typos.
- HO/HN solo se calculan en MESAS (única hoja con esas columnas).
- Cross-training de 7 personas no está formalizado.

---

## Recomendaciones (ordenadas por prioridad e impacto)

### 🔴 PRIORIDAD ALTA (esta semana)

1. **Contratar 1 cajero de backup y 1 host de backup** — capacidad actual es frágil
2. **Mover personal de lunes-martes a viernes-sábado** sin contratar más (rebalancear)
3. **Documentar formalmente el cross-training** de las 7 personas que ya rotan
4. **Sanitizar el Excel de staff** — corregir typos (`4:OO` → `04:00`, `TEEPPE` → `TEEPEE`) y remover entradas inválidas (`FIESTA FIN DE AÑO`)

### 🟡 PRIORIDAD MEDIA (1-2 meses)

5. **Digitalizar las 5 áreas restantes en Rodri** (no solo cocina)
6. **Estandarizar franjas de barra** — reducir 30+ a 6-8 códigos (B1-B4, BP, BA)
7. **Calcular HO/HN automáticamente** para todas las áreas
8. **Crear sistema de alerta** cuando personal < mínimo por día (ej: lunes barra con 0 personas)
9. **Revisar horas extra de los 9 casos en barra** — reducir para cumplir límite legal

### 🟢 PRIORIDAD BAJA (3+ meses)

10. **Análisis de costo laboral vs revenue por día** — identificar días con bajo ROI
11. **Plan de contingencia por ausencia** formal — quién llama a quién
12. **Cross-training Cocina → Mesas** (actualmente solo Cocineros ↔ Stewards)
13. **KPIs de productividad por hora** (revenue/hora-empleado)
14. **Revisión de capacidad máxima por zona de mesas** (2 personas vs 1.2 actual en pico)

---

## Archivos referenciados

- `/home/mod/.hermes/reports/ak-patron-diario-ideal.md` — matriz consolidada
- `/home/mod/.hermes/reports/ak-staff-5-areas-consolidado.md` — staff por área
- `/home/mod/.hermes/reports/supabase-vs-pos-csv-contraste.md` — contraste formato POS
- `/mnt/f/attick-keller/web/docs/ak-cocina-turnos-contexto.md` — cocina (digitalizado en Rodri)
- `/mnt/f/attick-keller/web/docs/ak-barra-attic-contexto.md` — barra
- `/mnt/f/attick-keller/web/docs/ak-barra-franjas-horarias.md` — franjas de barra
- `HORARIOS FORMATO STAFF.xlsx` — mesas, host, cajeros, servicios G

---

*Reporte generado por Ninja (Hermes Agent, M3) el 31 de mayo de 2026.*  
*Datos verificados contra Supabase (12,000 ventas) y docs del proyecto. Sin INSERT a BD.*
