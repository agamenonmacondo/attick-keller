# ANALISIS FINAL — App Turnos y Nomina A&K
## feat-014: Pestaña Asignacion de Turnos, Estimacion de Costos y Performance

**Fecha:** Mayo 2026  
**Autor:** Ninja (basado en auditoria de datos cruzados contra Supabase POS, Rodri DB y Excel HORARIOS FORMATO STAFF)  
**Estado:** ANALISIS — No avanzar a implementacion hasta que este documento este aprobado al 100%

---

## 1. QUE ESTAMOS CONSTRUYENDO

Una nueva pestana dentro del panel admin existente de A&K (/admin) que permite:

1. **Lideres de area** (Esneider, Walter, Veronica) planeen, asignen y publiquen turnos semanales para su equipo
2. **Admin** (Alejandro) vea costos de nomina estimados en tiempo real por turno, area y semana
3. **Colaboradores** vean sus turnos, marquen entrada/salida con geolocalizacion, reporten novedades
4. **Performance** compare horas planificadas vs. reales, detecte excesos y alerte sobre cumplimiento legal

**NO es:** una app standalone, un replacement del Excel, ni un modulo de nomina contable.

---

## 2. DATOS VERIFICADOS — BASE DE LA IMPLEMENTACION

### 2.1 Plantilla C75 (38 personas verificadas contra Supabase real)

**Fuente:** Query directa a `pos_nomina_staff WHERE sede='C75'` y cruce con `nomina_detalle`, `nomina_he_recargos`, `nomina_provisiones` para periodo **ABRIL 2026** (estado: ABIERTO)

|| Area | Ctd | Personas verificadas | Salario líder | Salario std | Obs |
|------|-----|----------------------|---------------|-------------|-----|
| Cocina | 11 | Esneider (JEFE $2.5M) + 5 AUX COCINA ($1.75M) + Nicolas (AUX $1.8M) + Leidy (PASANTE $1.75M) + 3 STEWARD ($1.75M) | $2,500,000 | $1,750,905 | Nicolas es Pizzero en Rodri, AUX COCINA en nomina |
| Barra | 7 | Walter (JEFE BAR $3M) + Ashlye (JEFE BAR 50% PROPINAS $1.75M) + Lizeth (BARTENDER $875K MT) + 4 AUX BAR ($1.75M) | $3,000,000 | $1,750,905 | Lizeth es medio tiempo; Excel tiene +7 bartenders no en nomina C75 |
| Servicio | 13 | Veronica (JEFE $2.75M) + Leonardo (SUB JEFE $1.92M) + 7 MESERO ($1.75M) + Neidy (MESERA $0 propinas) + Bryan (HOST $1.75M) + Leshlye (CAJERA $1.75M) + Gio (CAJERO real $1.75M) | $2,750,000 | $1,750,905 | Gio=Bryan discrepancia cargo; 6 cross-training Mesas-Barra |
| Apoyo | 5 | Cristina (SERVICIOS GENERALES $1.75M) + Beto (SERVICIOS GENERALES $1.75M) + Javier (INGENIERO SONIDO $1.75M) + Nathalia (ASESOR VENTAS $1.9M) + Sofia (PASANTE ADMIN $1.75M) | — | $1,750,905 | No participan en turnos de produccion |
| Sin cargo | 2 | Leanis Carolina AULAR BRANCHO ($1.75M, duplicada) + Omar David RICO CABRA ($1.75M, Rodri=Pizzero) | — | $1,750,905 | Requieren decision manual |

### 2.1.1 Nomina Contable Real — ABRIL 2026 (datos verificados de la BD)

**Fuente:** `nomina_detalle` + `nomina_he_recargos` + `nomina_provisiones` para C75, periodo ABRIL 2026

**Resumen por area:**

| Area | # | Sal. Devengado | Recargos HE/RN/RD | Propinas | Total Devengado | Deducciones | Neto a Pagar | Provisiones Patron. | Costo Total |
|------|---|---------------|-------------------|----------|----------------|-------------|-------------|--------------------|------------|
| Cocina | 11 | $20,612,490 | $3,623,988 | $16,064,676 | $37,544,275 | $1,942,502 | $6,877,609 — $4,447,485 | *ver detalle* | *ver detalle* |
| Barra | 7 | $11,252,357 | $2,040,860 | $9,573,060 | $20,510,537 | | | | |
| Servicio | 13 | $21,574,405 | $3,517,447 | $22,387,144 | $44,474,531 | | | | |
| Apoyo | 5 | $8,003,428 | $195,704 | $903,088 | $9,337,864 | | | | |

**TOTAL C75 — ABRIL 2026:**

| Concepto | Valor |
|----------|-------|
| Salario Devengado | $59,236,530 |
| Auxilio Transporte | $7,888,008 |
| HE/RN/RD Recargos | $10,739,704 |
| Propinas | $53,843,939 |
| Auxilio No Salarial | $2,422,600 |
| **Total Devengado** | **$127,872,850** |
| Salud Empleado (deduccion) | $2,828,815 |
| Pension Empleado (deduccion) | $2,828,815 |
| Otros Pagos Realizados | *(ver detalle individual)* |
| Prestamos/Consumos | *(ver detalle individual)* |
| **Total Deducciones** | **$10,741,910** |
| **Neto a Pagar** | **$117,130,941** |
| | |
| Provisiones Patronales | |
| — Salud Empleado | $2,828,815 |
| — Pension Empleado | $2,828,815 |
| — Pension Empleador | $6,786,479 |
| — ARL Empleador | $1,576,729 |
| — Caja Compensacion | $2,828,815 |
| — Cesantias | *(ver provisiones individual)* |
| — Prima | *(ver provisiones individual)* |
| — Vacaciones | *(ver provisiones individual)* |
| — Intereses Cesantias | *(ver provisiones individual)* |
| | |
| **COSTO TOTAL REAL = Neto + Provisiones** | **~$130M COP/mes** |

**Top 5 Neto a Pagar:**

| # | Nombre | Cargo | Sal. Devengado | Propinas | Recargos | Devengado Total | Neto |
|---|--------|-------|---------------|----------|----------|----------------|------|
| 1 | Walter Villamoros | JEFE DE BAR | $3,000,000 | $1,722,088 | $396,136 | $6,367,319 | $6,095,628 |
| 2 | Veronica Medina | JEFE DE SERVICIO | $2,750,000 | $1,722,088 | $310,625 | $6,081,808 | $5,690,958 |
| 3 | Mauricio Laverde | AUX DE COCINA | $1,750,905 | $1,722,088 | $940,728 | $4,662,816 | $4,447,485 |
| 4 | Ivan Felipe Larrahondo | AUX DE COCINA | $1,750,905 | $1,722,088 | $844,431 | $4,566,518 | $4,342,267 |
| 5 | Nicolas Alfaro | AUX DE COCINA | $1,800,000 | $1,722,088 | $875,871 | $4,647,054 | $4,274,984 |

**Top 3 Recargos HE/RN/RD mas altos:**

| # | Nombre | Cargo | HEN | RDD | HDDN | HEDD | Total Recargos |
|---|--------|-------|-----|-----|------|------|----------------|
| 1 | Mauricio Laverde | AUX COCINA | $527,279 | $220,057 | $146,837 | — | $940,728 |
| 2 | Ivan Felipe Larrahondo | AUX COCINA | $497,433 | $222,842 | — | $73,220 | $844,431 |
| 3 | Esneider Blanco | JEFE DE COCINA | — | $278,409 | — | $209,091 | $487,500 |

**Observaciones de nomina:**
- Propinas representan **42% del total devengado** ($53.8M de $127.9M)
- 28 de 35 tienen registros de HE/Recargos (7 sin recargos en el periodo)
- Lizeth (BARTENDER MT) y Yohana (STEWARD) aparecen con medio salario devengado ($875K y $875K) — confirma estatus medio tiempo
- Brandon Mejia (AUX BAR) tiene solo $175K devengado — posible ingreso tardio o medio tiempo reducido
- NEIDY ROJAS tiene salario $0 en BD pero aparece con propinas y neto positivo — confirma que vive de propinas
- Ashlye recibe auxilio no salarial de $1,000,000 (JEFE BAR 50% PROPINAS)
- Walter recibe auxiliary no salarial de $1,050,000
- Sofia (PASANTE ADMIN) no tiene recargos ni propinas regulares

### 2.2 Discrepancias encontradas (verificar con Rodri/Alejandro)

| # | Persona | Cargo nomina | Rol operativo real | Decision |
|---|---------|-------------|---------------------|----------|
| 1 | GIOVANNY POMPEYO | MESERO | Cajero | Dejar MESERO en nomina, reflejar CAJERO en user_roles |
| 2 | BRYAN SIERRA | MESERO | Host | Dejar MESERO en nomina, reflejar HOST en user_roles |
| 3 | NICOLAS ALFARO | AUX COCINA | Pizzero (en Rodri) | Dejar AUX COCINA, agregar secondary_areas=['cocina'] |
| 4 | LEANIS AULAR BRANCHO | SIN CARGO | — | Eliminar duplicado (ya existe como BRACHO=MESERA) |
| 5 | OMAR RICO CABRA | SIN CARGO | Pizzero (en Rodri) | Asignar a Cocina |
| 6 | NEIDY ROJAS | MESERA | — | Salario $0, posiblemente solo propinas |
| 7 | LIZETH CASALLAS | BARTENDER | — | Salario $875K = medio tiempo, confirmar es_medio_tiempo |
| 8 | WENDY ALDANA | AUX COCINA | — | Rodri tiene "Vanessa" que puede ser Wendy. Verificar |

### 2.3 Personas en Excel/Nomina pero NO en la otra base

**En Excel pero NO en nomina C75:** SEBAS, RACSO, JHON, HAYDE (Host/Servicios Generales) + ~14 bartenders de barra (ADRIAN, STEVEN, JUAN PABLO, HELENA, JUANSE, DAYANA, CRISTIAN, SOFIA, HANNA, NATALIA, ALDEMAR, MAICOL, Doble-A, GIOVANNY-barra). Posiblemente de C85 o contratos informales.

**En nomina C75 pero NO en Excel de horarios:** OSCAR MORENO (MESERO), ANGIE RODRIGUEZ (AUX BAR), BRANDON MEJIA (AUX BAR). Pueden ser nuevos o con horarios variables.

### 2.4 Tabla de aliases necesaria

Se necesita una tabla `staff_aliases` para conectar apodos del Excel y Rodri con los nombres completos de nomina. 25+ aliases verificados (BENJA, GIO, LESH, MANOLO, DON MARTIN, EDUARDO, etc.). Ver `docs/ak-staff-verificado-impl.md` seccion 3 para el SQL completo.

---

## 3. FUNCIONES DE LA APP — Desglose completo

### 3.1 Cronograma Semanal (Lider de Area + Admin)

**Quien lo usa:** Esneider (Cocina), Walter (Barra), Veronica (Servicio), Alejandro (todas)

**Pantalla principal — Grilla Semanal:**
- Selector de area (Cocina / Barra / Servicio) con badge de cantidad de personas
- Selector de semana ISO (2026-W23, etc.) con navegacion anterior/siguiente
- Indicador de estado: Borrador / Publicado / Aprobado
- Grilla 7 columnas (Lun-Dom) x N filas (empleados del area)
- Cada celda: dropdown con turnos del area (ej. Cocina: A, C, S, P1, P2, CD, CS, X)
- Columna "X" = Descanso obligatorio (1 por semana por ley colombiana)
- Fila de totales: horas semanales por persona + costo estimado
- Pie de grilla: total horas area, costo total estimado, alertas legales

**Interacciones:**
- Click en celda → dropdown con turnos del area filtrados
- Click en "X" → descanso obligatorio
- Celda roja si >44h semanales o >8h diarias (alerta legal)
- Celda amarilla si <1 descanso semanal
- Arrastrar turno entre celdas (drag & drop)
- Boton "Generar malla optima" → algoritmo de AutoScheduleTab adaptado a 3 areas
- Boton "Publicar" → cambia estado a published → email a colaboradores
- Boton "Duplicar semana" → copia cronograma a otra semana

**Costo estimado en tiempo real:**
- Cada turno muestra su costo estimado: `valor_hora × horas × recargos`
- Valor hora = `salario_mensual / 30 / 8` (individual por empleado)
- Recargos calculados automaticamente: nocturno 35%, dominical 75%, HE diurna 25%, HE nocturna 75%
- Total fila = suma de costos de la semana para ese empleado
- Total area = suma de todos los empleados del area
- Comparador: presupuesto vs. real vs. estimacion

**24 codigos de turno verificados:**

| Codigo | Nombre | Area | Entrada | Salida | HO | HN | Obs |
|--------|--------|------|---------|--------|----|----|-----|
| A | Apertura | cocina | 09:00 | 16:00 | 7.0 | 0 | turno manana cocina |
| C | Cierre | cocina | 15:00 | 22:30 | 6.0 | 1.5 | turno tarde cocina |
| S | Seguido | cocina | 10:00 | 22:30 | 10.5 | 1.5 | supera 8h, genera HE |
| P1 | Partido 9 | cocina | 09:00 | 22:30 | 9.0 | 1.5 | turno partido largo |
| P2 | Partido 10 | cocina | 10:00 | 22:30 | 10.0 | 1.5 | turno partido largo |
| CS | Cierre Steward | cocina | 16:00 | 22:30 | 4.5 | 1.5 | turno corto steward |
| CD | Cierre Domestic@ | cocina | 14:00 | 22:30 | 5.5 | 1.5 | turno medio cocina |
| B1 | Apertura Bar | barra | 16:00 | 00:00 | 5.0 | 3.0 | nocturno barra |
| B2 | Manana Bar | barra | 10:00 | 17:00 | 7.0 | 0 | manana barra |
| B3 | Noche Bar | barra | 18:00 | 02:00 | 1.0 | 6.0 | nocturno barra |
| B4 | Largo Bar | barra | 16:00 | 01:00 | 4.0 | 6.0 | nocturno largo |
| B5 | Partido Bar | barra | 12:00 | 00:00 | 6.0 | 4.0 | partido barra |
| B6 | Noche Corta | barra | 17:00 | 23:00 | 2.0 | 4.0 | corta barra |
| BA | Barback Madrugada | barra | 01:00 | 06:00 | 0.0 | 5.0 | madrugada barra |
| M1 | Manana Host | servicio | 10:00 | 16:00 | 6.0 | 0 | host manana |
| T1 | Tarde Host | servicio | 14:00 | 20:00 | 5.0 | 1.0 | host tarde |
| N1 | Noche Estandar | servicio | 18:00 | 01:00 | 1.0 | 6.0 | noche servicio |
| N2 | Noche Larga | servicio | 17:00 | 01:00 | 2.0 | 6.0 | noche larga servicio |
| P1L | Partido Largo | servicio | 11:00 | 00:00 | 5.0 | 5.0 | partido servicio largo |
| P2L | Partido Corto | servicio | 11:00 | 23:00 | 5.0 | 4.0 | partido servicio corto |
| MA1 | Madrugada | servicio | 01:00 | 10:00 | 6.0 | 3.0 | madrugada servicio |
| MC | Manana Corta | servicio | 10:00 | 15:00 | 5.0 | 0 | corta servicio |
| CJA | Cajero Apertura | servicio | 09:00 | 16:00 | 7.0 | 0 | cajero dia |
| CJN | Cajero Noche | servicio | 17:00 | 01:00 | 2.0 | 6.0 | cajero noche |

### 3.2 Performance (Lider + Admin)

**Quien lo usa:** Alejandro, Esneider, Walter, Veronica

**Dashboard de performance por area y periodo:**
- KPIs: horas ordinarias, nocturnas, extras, recargo nocturno, recargo dominical
- Costo total estimado vs. presupuesto
- Grafico de barras apiladas: HO vs HN por dia y empleado
- Tabla expandible por empleado: nombre, HO, HN, HED, HEN, RN, total, costo, % legal
- Alertas automaticas: ">44h semanales", "7 dias sin descanso", ">8h diarias"
- Filtro por periodo (semana, mes) y area
- Comparacion con datos bio de Rodri (horas reales vs. asignadas)

**Fuente de datos:**
- Asignados: shift_assignments (lo que se planeo)
- Reales: bio_reporte de Rodri (lo que realmente se trabajo)
- Si no hay datos bio para una semana, mostrar solo estimacion

### 3.3 Mi Turno (Colaborador)

**Quien lo usa:** Ivan, Carlos, Benja, Leshlye, etc. (38 colaboradores C75)

**Vista del colaborador:**
- Su semana: dia por dia con tipo de turno, entrada y salida
- Total de horas estimadas y costo estimado
- Boton "Check-in" (registra hora + ubicacion GPS)
- Boton "Check-out" (registra hora + ubicacion GPS)
- Boton "Reportar contingencia" (no puedo ir, llegue tarde, permiso, incapacidad)
- Historial de semanas anteriores

**Geolocalizacion:**
- `navigator.geolocation.getCurrentPosition()` del browser
- Guardar {lat, lng, accuracy, timestamp} en JSONB
- Verificar proximidad al restaurante (radio configurable, default 200m)
- NO bloquear check-in si GPS no disponible — solo registrar sin ubicacion
- Informativo, no restrictivo (no es un candado)

### 3.4 Panel Equipo (Extension del existente)

**Panel Equipo actual:** CRUD basico de usuarios con roles super_admin, store_admin, host.

**Extensiones necesarias:**
- Agregar roles `lider_area` y `colaborador` al dropdown (sin tocar los roles existentes super_admin, store_admin, host)
- Campo `area` para lider_area (cocina, barra, servicio)
- Campo `pos_nomina_staff_id` para colaborador (vincular con registro de nomina)
- Campo `secondary_areas` para cross-training
- Vista del colaborador muestra solo sus turnos y check-in/out

**REGLA:** No se eliminan ni modifican los roles existentes. Solo se agregan los dos nuevos.

---

## 4. MODELO DE DATOS — 6 tablas nuevas

### 4.1 Tablas nuevas (SQL)

```sql
-- 1. Catalogo de tipos de turno (24 codigos)
CREATE TABLE shift_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,              -- 'A', 'C', 'B1', 'N1', etc.
  name TEXT NOT NULL,              -- 'Apertura', 'Cierre', etc.
  area TEXT NOT NULL,              -- 'cocina' | 'barra' | 'servicio'
  entrada TIME NOT NULL,           -- hora de entrada
  salida TIME NOT NULL,            -- hora de salida
  ordinarias DECIMAL(4,1) NOT NULL, -- horas ordinarias (antes de 19:00 o despues de 6:00)
  nocturnas DECIMAL(4,1) NOT NULL DEFAULT 0, -- horas nocturnas (19:00-06:00)
  is_split BOOLEAN DEFAULT FALSE, -- turno partido (no implementado en fase 1)
  description TEXT,
  UNIQUE(code, area)
);

-- 2. Cronogramas semanales
CREATE TABLE shift_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  area TEXT NOT NULL,              -- 'cocina' | 'barra' | 'servicio'
  week_str TEXT NOT NULL,          -- '2026-W23'
  created_by UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'published' | 'approved'
  version INT NOT NULL DEFAULT 1,
  total_estimated_cost DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(area, week_str, version)
);

-- 3. Asignaciones (turno por persona por dia)
CREATE TABLE shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES shift_schedules(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES pos_nomina_staff(id),
  day_index INT NOT NULL,          -- 0=Dom, 1=Lun, ..., 6=Sab
  shift_code TEXT NOT NULL,         -- referencia a shift_types.code
  entrada TIME,                    -- override si personalizado
  salida TIME,                      -- override si personalizado
  novedad TEXT,                     -- 'vacaciones' | 'incapacidad' | 'permiso' | 'turnante'
  turnante_nombre TEXT,             -- nombre del turnante si novedad='turnante'
  is_overtime BOOLEAN DEFAULT FALSE,
  estimated_hours DECIMAL(4,1),
  estimated_cost DECIMAL(12,2),
  checkin_at TIMESTAMPTZ,
  checkout_at TIMESTAMPTZ,
  checkin_location JSONB,
  checkout_location JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(schedule_id, employee_id, day_index)
);

-- 4. Novedades y check-in/out
CREATE TABLE shift_novedades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES pos_nomina_staff(id),
  schedule_id UUID REFERENCES shift_schedules(id),
  date DATE NOT NULL,
  type TEXT NOT NULL,               -- 'checkin' | 'checkout' | 'falta' | 'tarde' | 'permiso' | 'incapacidad'
  checkin_at TIMESTAMPTZ,
  checkout_at TIMESTAMPTZ,
  location JSONB,                   -- {lat, lng, accuracy}
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Aliases de empleados
CREATE TABLE staff_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES pos_nomina_staff(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  source TEXT CHECK (source IN ('excel', 'rodri', 'interno', 'colombia')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(alias, source)
);

-- 6. Modificaciones a tablas existentes
ALTER TABLE pos_nomina_staff ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE pos_nomina_staff ADD COLUMN IF NOT EXISTS secondary_areas TEXT[] DEFAULT '{}';

-- Extension de user_roles
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS pos_nomina_staff_id UUID REFERENCES pos_nomina_staff(id);
```

### 4.2 Cantidad de registros estimados

| Tabla | Registros iniciales | Crecimiento/semana | Crecimiento/mes |
|-------|---------------------|--------------------|-----------------|
| shift_types | 24 | 0 (fijo) | 0 |
| shift_schedules | 3 (1 por area) | 3 | ~12 |
| shift_assignments | ~266 (38 personas × 7 dias) | ~266 | ~1,064 |
| shift_novedades | 0 | ~200-400 | ~800-1,600 |
| staff_aliases | 25 | 0 (crecimiento lento) | ~1-2 |
| pos_nomina_staff (modificado) | 38 | 0 (cambio manual) | 0 |

**Estimacion anual:** ~4,800 assignments × 12 meses = ~57,600 registros de asignaciones + ~9,600 novedades = **~67,400 registros/anio**. Totalmente manejable para Supabase.

---

## 5. ROLES Y PERMISOS

| Rol | Quien | Ve | Edita | Permisos especificos |
|-----|-------|----|----|-----|
| super_admin | Alejandro | Todas las areas | Todo | Crear usuarios, eliminar, configurar parametros |
| store_admin | (futuro) | Todas las areas | Todo | Ver costos globales, publicar cronogramas |
| lider_area | Esneider, Walter, Veronica | Solo su area | Turnos de su area | Crear/editar/publicar cronogramas, ver performance de su area |
| colaborador | Ivan, Carlos, Benja, etc. | Sus turnos propios | Check-in/out, novedades | Ver su semana, marcar entrada/salida, reportar contingencias |
| host | (existente) | Nada de turnos | Nada | Sin acceso a pestana de Turnos |

**Mapeo lider → area:**
- Cocina: Esneider Blanco Castillo
- Barra: Walter Villamoros Rodriguez
- Servicio: Veronica Francheska Medina Molina

---

## 6. CALCULOS DE NOMINA — Logica detallada

### 6.1 Valor hora individual

```
valor_hora = salario_mensual / 30 / 8
```

Ejemplos:
- Walter (JEFE BAR $3M): valor_hora = $12,500
- Veronica (JEFE SERVICIO $2.75M): valor_hora = $11,458
- Estándar ($1,750,905): valor_hora = $7,295.44
- Lizeth (BARTENDER MT $875,452): valor_hora = $3,647.72

### 6.2 Costo por turno

```
costo_turno = (HO × valor_hora) + (HN × valor_hora × 1.35) + HE_diurna + HE_nocturna + recargo_dominical

donde:
- HO = horas ordinarias (antes de 19:00 y despues de 6:00)
- HN = horas nocturnas (19:00-06:00)
- HE_diurna = max(0, horas_exceso_diario - HN) × valor_hora × 0.25
- HE_nocturna = max(0, horas_exceso_diario - HN_ya_contadas) × valor_hora × 0.75
- recargo_dominical = (HO + HN) × valor_hora × 0.75 (SI es domingo)
```

### 6.3 Ejemplos reales de costo por turno

**Turno S (Seguido, Cocina) — Lunes (no dominical):**
- Horas: 10.5 HO + 1.5 HN = 12h total
- Exceso sobre 8h: 4h HE
- salario estandar $1,750,905 → valor_hora = $7,295.44
- Base: (10.5 + 1.5) × $7,295.44 = $87,545
- Recargo nocturno: 1.5 × $7,295.44 × 0.35 = $3,830
- HE diurna: (10.5 - 8) × $7,295.44 × 0.25 = $456
- HE nocturna: (4 - HE_ya_contada) × $7,295.44 × 0.75 = calculado segun distribucion
- Total estimado: ~$94,000-$98,000 por turno

**Turno N1 (Noche Servicio, Lunes):**
- 1.0 HO + 6.0 HN = 7h total (no genera HE)
- Recargo nocturno: 6.0 × $7,295.44 × 0.35 = $15,320
- Base: 7 × $7,295.44 = $51,068
- Total: ~$66,388

### 6.4 Costo semanal y mensual REAL — Datos verificados ABRIL 2026

**Fuente:** Nómina contable real de la BD (nomina_detalle + nomina_he_recargos + nomina_provisiones)

| Concepto | Valor Mensual |
|----------|--------------|
| Salario Devengado | $59,236,530 |
| Auxilio Transporte | $7,888,008 |
| HE/RN/RD Recargos | $10,739,704 |
| Propinas | $53,843,939 |
| Auxilio No Salarial | $2,422,600 |
| **Total Devengado** | **$127,872,850** |
| Deducciones (Salud + Pension + otros) | $10,741,910 |
| **Neto a Pagar** | **$117,130,941** |
| + Provisiones Patronales | ~$13M |
| **COSTO TOTAL REAL C75** | **~$130M COP/mes** |

**Desglose por area (nomina contable real):**

| Area | Colaboradores | Sal. Devengado | HE/RN/RD | Propinas | Total Devengado | Neto a Pagar |
|------|-------------|---------------|----------|----------|----------------|-------------|
| Cocina | 11 | $20,612,490 | $3,623,988 | $16,064,676 | $37,544,275 | *individual* |
| Barra | 7 | $11,252,357 | $2,040,860 | $9,573,060 | $20,510,537 | *individual* |
| Servicio | 13 | $21,574,405 | $3,517,447 | $22,387,144 | $44,474,531 | *individual* |
| Apoyo | 5 | $8,003,428 | $195,704 | $903,088 | $9,337,864 | *individual* |

**Costo semanal estimado (dividiendo mensual / 4.33):**

| Area | Empleados | Costo semanal estimado |
|------|----------|----------------------|
| Cocina | 11 | ~$8,667,000 |
| Barra | 7 | ~$4,734,000 |
| Servicio | 13 | ~$10,251,000 |
| Apoyo | 5 | ~$2,156,000 |
| **Total** | **36** | **~$25,808,000** |

**Costo mensual total C75 con provisiones:** ~$130M COP/mes

### 6.5 Parametros legales (de Rodri DB)

| Parametro | Valor |
|-----------|-------|
| Jornada semanal | 44h |
| Jornada diaria | 8h |
| Recargo nocturno (19:00-06:00) | 35% |
| Recargo dominical | 75% |
| HE diurna | +25% |
| HE nocturna | +75% |
| HE dominical diurna | +105% |
| HE dominical nocturna | +155% |
| Auxilio transporte | $249,095 (solo si salario < 2x minimo) |

---

## 7. TECNOLOGIA — Stack existente y nuevo

### 7.1 Stack actual (ya existe en el proyecto)

| Componente | Tecnologia | Uso actual |
|-----------|-----------|-----------|
| Framework | Next.js 16.2 | Pages, API routes, SSR |
| UI | React 19, Tailwind CSS 4, Phosphor Icons | Todos los paneles |
| Graficos | Recharts 3.8 | POS Dashboard, ventas |
| Estado | React hooks (useState, useEffect) | Sin state global |
| Auth | Supabase Auth | Login, roles |
| DB | Supabase (PostgreSQL) | POS, nomina, rodri |
| Forms | React Hook Form 7 + Zod 4 | Forms de reservas, staff |
| Animaciones | Framer Motion 12 | AnimatedCard, transiciones |
| Calendario | React Day Picker 9 | Filtros de fecha |
| Testing | Vitest + Testing Library + Playwright | Tests unitarios y E2E |
| Deploy | Vercel | Produccion |

### 7.2 Nuevo codigo necesario

| Componente | Tecnologia | Estimacion LOC | Complejidad |
|-----------|-----------|---------------|------------|
| `ShiftSchedulePanel.tsx` | React + Tailwind | ~800 LOC | Alta — grilla interactiva, drag & drop |
| `ShiftGrid.tsx` | React + Tailwind | ~500 LOC | Alta — celdas editables, dropdowns, validaciones |
| `ShiftTypeDropdown.tsx` | React | ~120 LOC | Media |
| `CostEstimationBar.tsx` | React + Recharts | ~200 LOC | Media — calculos en tiempo real |
| `PerformanceDashboard.tsx` | React + Recharts | ~400 LOC | Alta — KPIs, graficos, alertas |
| `MyShiftView.tsx` | React + Tailwind | ~250 LOC | Media — vista colaborador |
| `CheckInOut.tsx` | React + Geolocation API | ~150 LOC | Media — GPS, validacion |
| `ContingencyReport.tsx` | React Hook Form + Zod | ~180 LOC | Baja |
| `shift-schedules/route.ts` | Next.js API | ~200 LOC | Media |
| `shift-assignments/route.ts` | Next.js API | ~250 LOC | Media — batch updates |
| `shift-performance/route.ts` | Next.js API | ~180 LOC | Media — agregaciones |
| `shift-my-week/route.ts` | Next.js API | ~120 LOC | Baja |
| `shift-checkin/route.ts` | Next.js API | ~100 LOC | Baja |
| `shift-checkout/route.ts` | Next.js API | ~80 LOC | Baja |
| `shift-novedades/route.ts` | Next.js API | ~100 LOC | Baja |
| `useShiftSchedule.ts` | React Hook | ~300 LOC | Alta — estado, optimistic updates |
| `useShiftPerformance.ts` | React Hook | ~200 LOC | Media |
| `costCalculator.ts` | Utils | ~150 LOC | Media — formulas de nomina |
| `shiftAlgorithm.ts` | Utils | ~400 LOC | Alta — adaptacion de AutoScheduleTab |
| SQL migrations | PostgreSQL | ~200 LOC | Media |
| Seed data (shift_types) | SQL | ~80 LOC | Baja |
| Seed aliases (staff_aliases) | SQL | ~100 LOC | Baja |
| Tests unitarios | Vitest | ~400 LOC | Media |
| Tests E2E | Playwright | ~300 LOC | Media |
| **TOTAL ESTIMADO** | | **~4,860 LOC** | |

### 7.3 Componentes reutilizables del proyecto existente

- `AdminShell.tsx` — ya tiene el tab routing
- `AdminTabBar.tsx` — agregar pestana "Turnos"
- `AnimatedCard.tsx` — para cards de KPIs
- `SectionHeading.tsx` — headings de secciones
- `formatCurrency.ts` — ya existe para formateo COP
- `useRodriData.ts` — hook existente que conecta con Rodri DB y tiene los parametros legales
- `AutoScheduleTab.tsx` — algoritmo de generacion de mallas existente (~1,500 LOC)
- `DesignSystem.md` — tema oscuro, tokens, colores

---

## 8. PLAN DE IMPLEMENTACION — 4 Fases

### Fase 1: Fundacion de datos (3-4 dias)

| Tarea | Detalle | Tiempo |
|-------|---------|--------|
| Crear tablas en Supabase | 4 tablas nuevas + 2 ALTER TABLE + seed data | 0.5 dia |
| Agregar area y secondary_areas | ALTER TABLE pos_nomina_staff | 0.5 dia |
| Mapeo cargo → area | 38 empleados, 36 automaticos, 2 manuales | 0.5 dia |
| Crear tabla staff_aliases | Tabla + 25+ seed records | 0.5 dia |
| Agregar roles lider_area y colaborador | Extension de user_roles, dropdown en TeamPanel | 1 dia |
| Vincular usuarios existentes | Esneider, Walter, Veronica → lider_area con su area | 0.5 dia |
| Importar 24 tipos de turno | INSERT de shift_types con HO/HN | 0.5 dia |

**Entregable Fase 1:** Tablas creadas, datos sembrados, roles funcionando. Se puede verificar en Supabase dashboard.

### Fase 2: Cronograma Semanal (5-7 dias)

| Tarea | Detalle | Tiempo |
|-------|---------|--------|
| ShiftSchedulePanel.tsx | Componente principal con selector de area y semana | 1 dia |
| ShiftGrid.tsx | Grilla interactiva 7×N con dropdowns y validaciones | 2 dias |
| Calculos de costo en tiempo real | costCalculator.ts + CostEstimationBar | 1 dia |
| API routes CRUD | shift-schedules + shift-assignments con batch | 1.5 dias |
| Auto-generacion de malla | Adaptar algoritmo de AutoScheduleTab | 1.5 dias |
| Publicacion y notificacion | Cambio de estado a published + email | 0.5 dia |

**Entregable Fase 2:** Lider de area puede crear, editar y publicar un cronograma semanal. Ve costos estimados en tiempo real.

### Fase 3: Performance Dashboard (3-4 dias)

| Tarea | Detalle | Tiempo |
|-------|---------|--------|
| PerformanceDashboard.tsx | KPIs, graficos, alertas legales | 2 dias |
| API route shift-performance | Agregaciones por area, empleado, periodo | 1 dia |
| Cruce con bio_reporte de Rodri | Horas reales vs. estimadas | 1 dia |

**Entregable Fase 3:** Admin y lideres ven dashboard de performance con comparacion planificado vs. real.

### Fase 4: Vista Colaborador (4-5 dias)

| Tarea | Detalle | Tiempo |
|-------|---------|--------|
| MyShiftView.tsx | Vista "Mi Semana" del colaborador | 1 dia |
| CheckInOut.tsx | Check-in/out con geolocalizacion del browser | 1.5 dias |
| ContingencyReport.tsx | Formulario de novedades (falta, tarde, permiso, incapacidad) | 1 dia |
| API routes colaborador | shift-my-week, shift-checkin, shift-checkout, shift-novedades | 1 dia |
| Notificaciones por email | Templates de asignacion, recordatorio, alerta | 0.5 dia |

**Entregable Fase 4:** Colaboradores ven sus turnos, marcan entrada/salida, reportan contingencias.

---

## 9. ESTIMACION DE COSTO DE DESARROLLO

### 9.1 Tiempo estimado total

| Fase | Dias | Horas (8h/dia) | Complejidad |
|------|------|----------------|------------|
| Fase 1: Fundacion | 3-4 | 24-32h | Media |
| Fase 2: Cronograma | 5-7 | 40-56h | Alta |
| Fase 3: Performance | 3-4 | 24-32h | Media-Alta |
| Fase 4: Colaborador | 4-5 | 32-40h | Media |
| **Total** | **15-20 dias** | **120-160h** | |

### 9.2 Costo por hora de desarrollo

| Concepto | Rango Colombia | Rango LATAM | Rango US/EU |
|----------|---------------|------------|-------------|
| Desarrollador Senior React/Next.js | $80,000-$150,000 COP/h | $15-40 USD/h | $50-150 USD/h |
| Desarrollador Mid React/Next.js | $50,000-$80,000 COP/h | $10-25 USD/h | $30-80 USD/h |

### 9.3 Costo estimado del proyecto completo

**Escenario A — Ninja desarrolla (costo de oportunidad):**
- No hay costo directo en pesos. Es tiempo de desarrollo del bot.
- Aproximadamente 3-4 semanas calendar (considerando revisiones y pruebas).
- Costo de oportunidad: lo que Alejandro NO puede facturar en ese tiempo.

**Escenario B — Desarrollador senior externo (Colombia):**
- ~$120,000 COP/h × 140h = **$16,800,000 COP** (~$4,200 USD)
- Incluye: diseno, desarrollo, pruebas, despliegue, documentacion

**Escenario C — Desarrollador senior externo (US/EU):**
- ~$80 USD/h × 140h = **$11,200 USD** (~$44,800,000 COP)
- Incluye todo

**Escenario D — Agencia boutique:**
- ~$120-200 USD/h × 140h = **$16,800-$28,000 USD** (~$67-112M COP)
- Incluye PM, diseno UX, QA, devops

### 9.4 Costo incremental mensual (infraestructura)

| Recurso | Proveedor | Costo mensual |
|---------|----------|---------------|
| Supabase (tier actual) | Supabase | $0 (free tier) o $25 (pro) |
| Vercel (deploy) | Vercel | $0 (hobby) o $20 (pro) |
| Email service (Resend/SendGrid) | Resend | $0 (3,000 emails/mes) o $20 |
| Storage adicional (shifts data) | Supabase | Incluido en plan |
| **Total mensual adicional** | | **$0-$65 USD/mes** |

La app corre sobre la misma infraestructura existente. No requiere servidores adicionales.

---

## 10. DECISIONES PENDIENTES — Requieren aprobacion de Alejandro

### 10.1 Decisiones de datos (bloquean Fase 1)

| # | Decision | Opciones | Recomendacion | Impacto si no se decide |
|---|---------|---------|---------------|------------------------|
| 1 | LEANIS duplicada (BRANCHO sin cargo) | Eliminar registro duplicado / Mantener y asignar cargo | Eliminar duplicado | No se puede mapear correctamente 1 empleado |
| 2 | OMAR RICO (sin cargo en nomina, Pizzero en Rodri) | Asignar a Cocina como AUX COCINA / Asignar como PIZZERO nuevo cargo / Dejar SIN CARGO | Asignar a Cocina como AUX COCINA | 1 empleado sin area |
| 3 | Los 5 de Apoyo | Asignar a area operativa / Crear area "Apoyo" separada / No incluir en turnos | Cristina y Beto→Servicio, Javier→Servicio, Nathalia→Barra, Sofia→Apoyo (no turnos) | 5 empleados sin area funcional |
| 4 | GIOVANNY POMPEYO (MESERO → Cajero) | Corregir cargo en nomina / Dejar MESERO y reflejar en user_roles | Dejar MESERO en nomina, CAJERO en user_roles | Inconsistencia entre cargo y rol real |
| 5 | BRYAN SIERRA (MESERO → Host) | Corregir cargo en nomina / Dejar MESERO y reflejar en user_roles | Dejar MESERO en nomina, HOST en user_roles | Inconsistencia entre cargo y rol real |
| 6 | NEIDY ROJAS (salario $0) | Confirmar que es solo propinas / Asignar salario / Marcar como medio tiempo | Confirmar con Rodri | Salario $0 genera costo estimado = $0 |

### 10.2 Decisiones de funcionalidad (bloquean Fase 2-4)

| # | Decision | Opciones | Recomendacion | Impacto |
|---|---------|---------|---------------|---------|
| 7 | Turnos >8h (Cocina tiene S=12.5h) | Prohibir y forzar turnos partidos / Permitir con HE automatico | Permitir con calculo automatico de HE | Afecta calculo de costos y alertas legales |
| 8 | Cross-training formal | Formalizar en secondary_areas / Dejarlo informal y manual | Formalizar en secondary_areas | Sin esto, 6 empleados no pueden ser asignados a 2 areas |
| 9 | Bartenders adicionales (no en nomina C75) | Incluirlos como registros sin salario / Ignorarlos hasta que esten en nomina | Ignorar hasta que esten en nomina C75 | No aparecen en la app |
| 10 | Check-in obligatorio o informativo | Obligatorio (bloquea si no esta en ubicacion) / Informativo (registra pero no bloquea) | Informativo con GPS | Si es obligativo, requiere mas logica |
| 11 | Como invitar colaboradores | Email con link / Admin crea cuentas manualmente / Codigo de verificacion SMS | Email con link (Supabase Auth built-in) | Afecta flujo de onboarding |
| 12 | Proveedor de email para notificaciones | Supabase Auth built-in / Resend / SendGrid / Ninguno (notificaciones in-app) | Resend (gratis hasta 3,000 emails/mes) | Sin notificaciones por email en Fase 2 |

### 10.3 Decisiones de diseno UX (bloquean implementacion visual)

| # | Decision | Opciones | Recomendacion |
|---|---------|---------|---------------|
| 13 | Nombre de la pestana | "Turnos" / "Turnos y Nomina" / "Fuerza Laboral" | "Turnos" (corto, claro) |
| 14 | Vista movil para colaboradores | Responsive en la misma app / PWA separada / Solo desktop | Responsive en la misma app |
| 15 | Colores de turnos en la grilla | Por area (Cocina=rojo, Barra=azul, Servicio=verde) / Por tipo (Apertura=manana, Cierre=noche) | Por tipo de turno con codificacion de color |
| 16 | Vista por defecto del lider | Su area automaticamente / Selector de area | Su area automaticamente (filtrar por user_roles.area) |

---

## 11. RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|-------------|---------|------------|
| Datos de nomina incorrectos | Media | Alto — costos mal calculados | Ya verificado contra DB real. Las 8 discrepancias estan documentadas y requieren decision. |
| Líderes no adoptan la app | Alta | Alto — sin datos reales | Involucrarlos desde Fase 1 que vean sus datos correctos. Demo visual antes de deploy. |
| Turnos >8h son ilegales | Alta | Medio — HE automatico resuelve | Calcular HE automatico. Alertar en rojo. No prohibir. |
| Bio reporte de Rodri no tiene datos para semanas futuras | Media | Bajo — solo afecta Performance | Performance compara con datos historicos, no necesita datos futuros. |
| GPS impreciso en check-in | Media | Bajo — es informativo | Registrar accuracy del GPS. No bloquear si GPS no disponible. |
| Supabase free tier limites (500MB, 50K rows) | Baja | Medio | 67K registros/anio puede alcanzar limites en 2-3 anos. Plan Pro ($25/mes) resuelve. |
| Cross-training no formalizado | Media | Medio | Formalizar 6 empleados en secondary_areas. Si no, no pueden ser asignados a ambas areas. |

---

## 12. CRITERIOS DE ACEPTACION

### Fase 1 — Fundacion de datos
- [ ] Las 4 tablas nuevas existen en Supabase con los campos documentados
- [ ] 38 empleados C75 tienen el campo `area` asignado correctamente
- [ ] 25+ aliases estan sembrados en `staff_aliases`
- [ ] 24 tipos de turno estan en `shift_types`
- [ ] Roles `lider_area` y `colaborador` funcionan en TeamPanel
- [ ] Los 3 lideres (Esneider, Walter, Veronica) pueden entrar y ver solo su area

### Fase 2 — Cronograma
- [ ] Un lider puede crear un cronograma semanal para su area
- [ ] Puede asignar turnos a 11/7/13 empleados (Cocina/Barra/Servicio)
- [ ] Los 24 codigos de turno aparecen en los dropdowns correctos por area
- [ ] El costo estimado se actualiza en tiempo real al cambiar un turno
- [ ] Alertas rojas aparecen si >44h semanales o >8h diarias
- [ ] Boton "Publicar" cambia estado y envia email
- [ ] Admin (Alejandro) ve las 3 areas

### Fase 3 — Performance
- [ ] Dashboard muestra KPIs: horas ordinarias, nocturnas, extras, costos
- [ ] Grafico de barras apiladas HO vs HN por empleado
- [ ] Alertas por empleado (>44h, sin descanso, >8h)
- [ ] Comparacion con datos bio de Rodri (si disponibles)

### Fase 4 — Colaborador
- [ ] Colaborador ve su semana con turnos asignados
- [ ] Puede hacer check-in con geolocalizacion
- [ ] Puede reportar contingencias (falta, tarde, permiso, incapacidad)
- [ ] Notificaciones por email al publicar cronograma

---

## 13. RESUMEN EJECUTIVO

**Que:** Nueva pestana "Turnos" en el admin de A&K para que lideres de area planifiquen turnos semanales, estimen costos de nomina en tiempo real, y controlen performance del equipo.

**Para quien:** 3 lideres de area (Esneider/Cocina, Walter/Barra, Veronica/Servicio), 1 admin (Alejandro), y 38 colaboradores C75.

**Cuanto:** 15-20 dias de desarrollo (120-160h). ~4,860 LOC nuevos. Costo infraestructura adicional: $0-$65 USD/mes.

**Datos:** 38 empleados C75 verificados contra Supabase real. 24 tipos de turno con HO/HN calculados. Nómina contable real ABRIL 2026: Total Devengado $127.9M, Neto $117.1M, Costo Total con provisiones ~$130M COP/mes. Propinas = 42% del devengado. 28/35 con HE/Recargos.

**Bloqueadores:** 12 decisiones pendientes (6 de datos, 4 de funcionalidad, 4 de UX). No avanzar sin resolver las de datos (Fase 1).

**Entregables por fase:** Fase 1 → tablas + datos. Fase 2 → grilla de turnos funcional. Fase 3 → dashboard performance. Fase 4 → vista colaborador con check-in/out.

---

*"Hasta que este documento este perfecto, no avanzamos." — Alejandro*