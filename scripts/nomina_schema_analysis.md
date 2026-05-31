# Análisis: Integración Nómina ATICO → Supabase A&K

## BD Principal A&K (pbllaipsdfypelnwrvpy.supabase.co)

### Tablas ya existentes relevantes

| Tabla | Propósito | Columnas clave |
|-------|-----------|----------------|
| `pos_nomina_staff` | Empleados nómina (biómetro) | id, cedula, nombre_completo, pos_staff_id, es_medio_tiempo |
| `pos_nomina_daily` | Asistencia diaria (biómetro) | staff_id, fecha, ho, hed, hen, hdd, hdn, rn, total_horas, horas_extras, es_dominical, cl75, shift_number, hora_entrada, hora_salida |
| `pos_staff` | Staff del POS | id, nombre, rol, etc. |
| `pos_sales` | Ventas POS | total, propina, pos_staff_id, fecha |
| `pos_shifts` | Turnos POS | staff_id, fecha, etc. |

### Lo que YA tiene la BD:
- Datos biométricos de abril 2026 (horas HO, HED, HEN, RN, etc. por día y empleado)
- Cédulas y nombres de empleados
- Ventas/propinas por empleado del POS
- Panel de nómina funcionando con estos datos

### Lo que FALTA (no existe en la BD):

| Concepto | Origen Excel | Tabla propuesta |
|----------|-------------|-----------------|
| Periodo mensual de nómina | Hoja 1 (cabecera) | `nomina_periodos` |
| Registro mensual por empleado | Hoja 1 (filas) | `nomina_detalle` |
| Desglose HE/RN/RD($) | Hoja 2 (HE-REC) | `nomina_he_recargos` |
| Salario individual | Hoja 1 (col 10-11) | Extender `pos_nomina_staff` |
| Novedades (vac/inc/perm) | Hoja 3-4 (novedades) | `nomina_novedades` |
| Provisiones sociales | Hoja 5 | `nomina_provisiones` |
| Propinas mensuales sede | Hoja 1 (pie) | `nomina_propinas` |
| Deducciones (salud/pensión/préstamos) | Hoja 1 (cols 24-27) | `nomina_detalle` |
| Sedes (C75/C85/Kinder/Admin) | Implícito en filas | `sedes` o campo en `pos_nomina_staff` |
| Modalidad (completo/medio/pasante) | Hoja 1 (col 5) | Extender `pos_nomina_staff` |
| Fecha ingreso | Hoja 1 (col 6) | Extender `pos_nomina_staff` |
| Cargo | Hoja 1 (col 8) | Extender `pos_nomina_staff` |
| Banco/cuenta | Hoja 3 (cols 6-7 ingreso) | Extender `pos_nomina_staff` |

## Decisión de diseño: ¿Dónde poner la nómina?

### Opción A: Mismo Supabase A&K (RECOMENDADO)
- `pos_nomina_staff` ya tiene cédula y nombre — **extenderlo** con salario, cargo, modalidad, sede_id
- `pos_nomina_daily` ya tiene HE/RN diarias — **complementar** con tabla mensual de valores ($)
- Nueva tabla `nomina_detalle` para devengado/deducciones/neto
- Nueva tabla `nomina_novedades` para vacaciones/incapacidades
- Nueva tabla `nomina_provisiones` para provisiones sociales
- Nueva tabla `nomina_propinas` para resumen mensual propinas
- Ventaja: Un solo panel admin, datos vinculados al POS y biómetro

### Opción B: Supabase Seadotec (Rodri)
- Ya tiene `employees` sin cédula, salario individual, ni nómina contable
- Separado del POS/ventas de A&K
- Requiere vinculación cruzada entre BDs

### Recomendación: **Opción A** — todo en la BD principal de A&K

## Mapeo Datos Excel → BD A&K

### Extensión de `pos_nomina_staff`
Campos nuevos a agregar:
- `salario` NUMERIC(15,2) — salario básico mensual (varía por empleado)
- `cargo` TEXT — cargo del empleado
- `modalidad` TEXT — COMPLETO/MEDIO_TIEMPO/PASANTE_PRODUCTIVO/PASANTE_LECT
- `sede` TEXT — 'C75', 'C85', 'KINDER', 'ADMIN'
- `fecha_ingreso` DATE
- `aplica_propinas` BOOLEAN DEFAULT true
- `auxilio_no_salarial` NUMERIC(15,2) DEFAULT 0
- `banco` TEXT
- `cuenta_bancaria` TEXT

### Nuevas tablas

**nomina_periodos** — Período mensual por sede:
- id, periodo (TEXT), fecha_inicio, fecha_fin, sede, estado, totales

**nomina_detalle** — 1 registro por empleado × mes × sede:
- id, periodo_id, staff_id (→ pos_nomina_staff), sede
- dias_laborados, salario_basico, salario_devengado
- auxilio_transporte, propinas_prometido, auxilio_no_salarial
- recargos_he_rn_rd, propinas
- total_devengado
- salud, pension, pagos_realizados, prestamos_consumos
- total_deducciones, neto_a_pagar, ibc

**nomina_he_recargos** — Desglose $ de HE/RN/RD (mensual):
- id, periodo_id, staff_id, sede
- hed_horas, hed_valor, hed_total
- hen_horas, hen_valor, hen_total
- rn_horas, rn_valor_hora, rn_total
- rd_diurno_horas, rd_diurno_valor, rd_diurno_total
- rd_nocturno_horas, rd_nocturno_valor, rd_nocturno_total
- hedd_horas, hedd_valor, hedd_total
- hddn_horas, hddn_valor, hddn_total
- total_recargos

**nomina_novedades** — Vacaciones/incapacidades/permisos:
- id, periodo_id, staff_id, sede
- tipo, observacion, fecha_inicio, fecha_fin, dias, aplicada

**nomina_provisiones** — Provisiones sociales mensuales:
- id, periodo_id, staff_id, sede
- provisiones_salud, provisiones_sociales, base_vacaciones
- salud_empleado, pension_empleado
- pension_empleador, arl_empleador, caja_empleador
- cesantias_empleador, prima_empleador, vacaciones_empleador
- intereses_cesantias_empleador, total_provision_empleador

**nomina_propinas** — Resumen propinas por sede/mes:
- id, periodo_id, sede
- total_propinas_ventas, prometidos, propina_para_rep
- dias_laborados_total, valor_dia_propina

## Vinculación con datos existentes

- `nomina_detalle.staff_id` → `pos_nomina_staff.id` (mismo empleado)
- `nomina_he_recargos.staff_id` → `pos_nomina_staff.id`
- `pos_nomina_daily` tiene horas por día → `nomina_he_recargos` tiene los TOTALES mensuales en $
- Ambos complementarios: daily = horas por día, he_recargos = valores $ mensuales

## Próximos pasos

1. **DDL en Supabase Dashboard** — Ejecutar `nomina_ddl_ak.sql` 
2. **Matching empleados** — Vincular cédulas del Excel con `pos_nomina_staff.cedula`
3. **Script importación** — `import_nomina_ak.py` que usa la API REST de A&K (no Seadotec)
4. **Actualizar API route** — Extender `/api/admin/nomina` para incluir datos contables
5. **Actualizar NominaPanel** — Mostrar devengado, deducciones, neto, propinas