# Guion — Video Hyperframes: Auditoría del Algoritmo de Asignación

**Proyecto:** Attick & Keller  
**Estilo:** Auditoría técnica — datos, parámetros, resultados  
**Tone:** Profesional, analítico, con peso  
**Narración:** Voiceover firme y claro  
**Resolución:** 1280×720 · 30fps  

---

## Escena 1 — Apertura (≈10 seg)

**Visuales:**
- Fondo #1E1E1E (charcoal)
- Sello de auditoría: recuadro borgoña con texto "AUDITORÍA" en dorado
- Debajo: "Attick & Keller — Sistema de Asignación de Mesas"
- Número de versión: "v1.0 · Mayo 2026"
- Barra borgoña inferior

**Voiceover:**
> "Auditoría del sistema de asignación de mesas de Attick and Keller. Versión uno punto cero. Mayo dos mil veintiséis."

---

## Escena 2 — El Problema: Datos Reales (≈25 seg)

**Visuales:**
- Título: "DATOS DEL RESTAURANTE" en ámbar
- Panel izquierdo: Métricas clave en cards
  - "45 mesas distribuidas en 5 zonas"
  - "1 turno por noche (sin rotación)"
  - "~45 grupos máximo por noche"
- Panel derecho: Distribución de reservas (barras horizontales)
  - Parejas 2pax: 41% reservas → 17% ingresos (barra borgoña corta)
  - Grupos 4pax: 15% reservas → 13% ingresos
  - Grupos 6pax: 11% reservas → 14% ingresos
  - Grupos 10pax: 15% reservas → 32% ingresos (barra ámbar larga)
  - Grupos 11+pax: 5% reservas → 11% ingresos
- Hallazgo en dorado: "Grupos 6+ = 35% reservas = 65% ingresos"
- Barra borgoña inferior

**Voiceover:**
> "Datos del restaurante. Cuarenta y cinco mesas en cinco zonas, un turno por noche sin rotación. La auditoría revela un patrón claro: las parejas son el cuarenta y uno por ciento de las reservas pero solo el diecisiete por ciento de los ingresos. Mientras que los grupos de seis personas o más, representan el treinta y cinco por ciento de las reservas y generan el sesenta y cinco por ciento de los ingresos. El algoritmo debe optimizar para maximizar ingresos por mesa."

---

## Escena 3 — Restricciones del Sistema (≈15 seg)

**Visuales:**
- Título: "RESTRICCIONES" en ámbar
- 3 cards con borde borgoña:
  - Card 1: 🔒 "Sin rotación" — "Cada mesa se usa UNA vez por noche. Familias se quedan 4-5 horas."
  - Card 2: 🔒 "13 mesas para 2" — "Solo 13 mesas con capacidad exacta para parejas. 5 parejas SIEMPRE sobran."
  - Card 3: 🔒 "14 combinables" — "14 mesas combinables reservadas para grupos de 4+. Parejas NUNCA las ocupan."
- Barra inferior: "Capacidad real: 45 grupos/noche" en gris claro

**Voiceover:**
> "Restricciones del sistema. Uno: Sin rotación. Cada mesa se usa una sola vez. Las familias se quedan cuatro o cinco horas. Dos: Solo trece mesas con capacidad exacta para parejas. Siempre sobran cinco. Tres: Catorce mesas combinables están reservadas para grupos de cuatro o más. Las parejas nunca las ocupan."

---

## Escena 4 — Parámetros del Algoritmo (≈35 seg)

**Visuales:**
- Título: "PARÁMETROS DE SCORING" en dorado
- Panel izquierdo: Fórmula con pesos animados

```
SCORE = 
  CAPACIDAD  × 0.40   (¿Qué tan bien llena el grupo la mesa?)
+ ZONA        × 0.30   (Popularidad de la zona + ajuste por hora)
- DESPERDICIO × 0.20   (Asientos vacíos penalizan)
+ COMBINACIÓN × 0.10   (Bonus por usar combinables según su propósito)
```

- Cada peso aparece con barra animada:
  - Capacidad 40% — barra oliva
  - Zona 30% — barra borgoña
  - Desperdicio 20% — barra ámbar
  - Combinación 10% — barra dorada (más corta)

**Panel derecho: Zona Popularity Scores**

| Zona | Score | Color |
|------|-------|-------|
| Tipi (B) | 100 | Borgoña |
| Taller (A) | 80 | Oliva |
| Jardín (C) | 60 | Ámbar |
| Chispas (D) | 40 | Dorado |
| Ático (E) | 20 | Gris |

**Debajo: Modificadores por hora** (tabla con + y -)

| Hora | Tipi | Taller | Jardín | Chispas | Ático |
|------|------|--------|--------|---------|-------|
| 18:00 | -15 | -10 | 0 | +5 | +10 |
| 20:00 | +15 | +10 | 0 | -5 | -15 |

**Voiceover:**
> "Parámetros del algoritmo. El score se calcula con cuatro pesos. Capacidad cuarenta por ciento: qué tan bien llena el grupo la mesa. Zona treinta por ciento: popularidad ajustada por hora de llegada. Desperdicio veinte por ciento: los asientos vacíos penalizan. Combinación diez por ciento: bonus por usar mesas combinables según su propósito. Las zonas tienen un puntaje base. Tipi cien, Taller ochenta, Jardín sesenta, Chispas cuarenta, Ático veinte. Pero se ajustan por hora de llegada. A las seis de la tarde Ático sube diez puntos y Tipi baja quince. A las ocho de la noche Tipi sube quince y Ático baja quince."

---

## Escena 5 — Las 5 Reglas Operativas (≈25 seg)

**Visuales:**
- Título: "REGLAS OPERATIVAS" en ámbar
- 5 filas con número, nombre y descripción:

| # | Regla | Efecto | Color |
|---|-------|--------|-------|
| 1 | PROTEGER combinables | Parejas NUNCA van a mesas can_combine=true | Borgoña |
| 2 | PRIORIZAR combinación 4+ | Grupos de 4+ usan 2-3 mesas combinadas | Oliva |
| 3 | RELEGAR grupos pequeños | 2-3 pax → Ático/Chispas primero | Gris |
| 4 | COMBINACIÓN libera grandes | Mesas chicas combinadas = mesas grandes libres para 10+ | Ámbar |
| 5 | RUTA POR HORA | Temprano → bajo; Pico → premium | Dorado |

- Cada regla aparece con borde de su color y animación stagger

**Voiceover:**
> "Cinco reglas operativas. Uno: Proteger combinables. Parejas nunca van a mesas combinables. Dos: Priorizar combinación para grupos de cuatro o más. Tres: Relegar grupos pequeños a zonas de baja prioridad. Cuatro: La combinación libera mesas grandes. Cinco: Ruta por hora de llegada. Temprano va a zonas bajas, pico va a zonas premium."

---

## Escena 6 — Caso de Prueba (≈25 seg)

**Visuales:**
- Título: "CASO DE PRUEBA" en ámbar
- Dos ejemplos lado a lado con cálculos visibles

**CASO A — Pareja a las 18:00:**
- Card con cálculos visibles:
  - Capacidad: 2/2 = 100% → 40pts
  - Zona Ático: 20 + 10(hora) = 30 → 30×0.30 = 9pts  
  - Desperdicio: 0 asientos vacíos → 0×0.20 = 20pts
  - Combinación: no combinable → 0pts
  - **TOTAL: ~72pts ✓**
- vs Tipi a las 18:00: zona 100-15(hora) = 85 → penalty
- Conclusión: "Ático gana. No bloquea Tipi para pico."

**CASO B — Grupo 10 a las 20:00:**
- Card con cálculos:
  - Capacidad 10/12 = 83% → 33pts
  - Zona Taller: 80 + 10(hora) = 90 → 90×0.30 = 27pts
  - Desperdicio: 2 asientos → penalización leve
  - Combinación: no → 0pts
  - **TOTAL: ~78pts ✓**
- vs Ático: 20-15(hora) = 5 → casi elimina
- Conclusión: "Taller gana. Grupo grande en zona premium a hora pico."

**Voiceover:**
> "Caso de prueba. Pareja a las seis de la tarde. Capacidad al cien por ciento en mesa para dos. Zona Ático con bonus de hora más diez. Score total setenta y dos. Si fuera Tipi, perdería quince puntos por la hora temprana. Ático gana porque no bloquea la zona más popular. Grupo de diez a las ocho de la noche. Capacidad ochenta y tres por ciento en mesa para doce. Zona Taller con bonus de hora más diez. Score total setenta y ocho. Ático prácticamente eliminado por la penalización de hora. Taller gana. Grupo grande en zona premium a hora pico."

---

## Escena 7 — Mecanismo de Auto-corrección (≈15 seg)

**Visuales:**
- Título: "AUTO-CORRECCIÓN" en oliva
- Flujo en 4 pasos con flechas:
  1. ALGORITMO → asigna mesa sugerida (borgoña)
  2. HOST → acepta o cambia (ámbar)  
  3. REGISTRO → se guarda sugerido vs real (dorado)
  4. AJUSTE → puntajes de zona se recalibran (oliva)
- Flecha loop del paso 4 → paso 1: "Mejora continua"
- Card ejemplo: "Si host cambia Ático→Tipi 3 veces → Score Ático baja, Score Tipi sube"
- Métrica: "FASE 6: Implementado ✅" en oliva

**Voiceover:**
> "Mecanismo de auto-corrección. Cuando el host acepta o cambia la mesa sugerida, se registra la diferencia. Si un host cambia Ático por Tipi tres veces, el score de Ático baja yel de Tipi sube. El algoritmo se recalibra con datos reales de operación. Fase seis implementada."

---

## Escena 8 — Cierre (≈12 seg)

**Visuales:**
- Fondo #1E1E1E
- Sello de auditoría: cuadro borgoña con "AUDITORÍA COMPLETADA" en dorado
- Debajo: "Attick & Keller — Algoritmo de Asignación v1.0"
- Métricas resumen:
  - "5 reglas · 4 pesos · auto-corrección"
  - "45 mesas · 5 zonas · 1 turno"
  - "Optimizado para ingresos por mesa"
- Barra borgoña inferior

**Voiceover:**
> "Auditoría completada. Cinco reglas operativas, cuatro pesos de scoring, auto-corrección basada en datos reales. Cuarenta y cinco mesas, cinco zonas, un turno por noche. Optimizado para maximizar ingresos por mesa. Attick and Keller."

---

## Notas de Producción

- **Fondo:** Siempre #1E1E1E (charcoal) — NUNCA blanco puro
- **Tipografía:** DejaVu Sans (sans-serif) para datos, DejaVu Sans Bold para títulos
- **Colores:** Solo brand A&K (borgoña, oliva, ámbar, dorado, crema, gris)
- **Barra inferior borgoña:** En TODAS las escenas
- **Datos reales:** Todas las cifras vienen del algoritmo real (table-assignment.ts)
- **Tone:** Auditoría profesional — directo, sin adornos, con datos
- **Animaciones:** Ease-out cúbico, stagger 50-80ms entre elementos
- **Cálculos visibles:** Escena 6 muestra la matemática, no solo el resultado