# Staff Verificado — Listo para Implementación
## A&K Shift Scheduling & Nómina (feat-014)

**Fecha:** Mayo 2026  
**Fuentes:** Supabase POS (pos_nomina_staff), Rodri DB (employees), Excel HORARIOS FORMATO STAFF  
**Estado:** Datos cruzados y verificados. Pendientes decisiones marcadas con ⚠️

---

## 1. RESUMEN EJECUTIVO

- **38 empleados C75** en pos_nomina_staff (base de nómina oficial)
- **20 empleados** en Rodri (solo Cocina/Pizzería, referencia operativa)
- **3 áreas operativas:** Cocina (11), Barra (7), Servicio (13)
- **5 Apoyo:** no participan en turnos de producción
- **2 Sin cargo:** requieren asignación manual
- **6 personas en cross-training** Mesas↔Barra (informal, sin formalizar)

---

## 2. PLANTILLA C75 — DATOS VERIFICADOS DE SUPABASE

### 2.1 COCINA (11 personas)

| # | Nombre Completo | Cargo Nómina | Salario | Apodo Excel | Apodo Rodri | En Rodri? |
|---|---|---|---|---|---|---|
| 1 | ESNEIDER BLANCO CASTILLO | JEFE DE COCINA | $2,500,000 | Esneider | Esneider | Sí (2 regs: Jefe + Chef) |
| 2 | JUAN PABLO NARVAEZ REINOSO | AUX COCINA | $1,750,905 | — | — | No |
| 3 | NICOLAS STIVEN ALFARO FONSECA | AUX COCINA | $1,800,000 | — | Nicolas (Pizzero) | Sí (como Pizzero) |
| 4 | IVAN FELIPE LARRAHONDO CARABALI | AUX COCINA | $1,750,905 | — | Iván | Sí |
| 5 | CARLOS STEVEN SUAREZ HERRERA | AUX COCINA | $1,750,905 | — | Carlos | Sí (2 regs, uno inactivo) |
| 6 | MAURICIO LAVERDE GUTIERREZ | AUX COCINA | $1,750,905 | — | Mauricio | Sí |
| 7 | WENDY VANNESA ALDANA CHILA | AUX COCINA | $1,750,905 | — | ⚠️ Vanessa? | ⚠️ Posible discrepancia de nombre |
| 8 | LEIDY CATALINA ROZO MARTINEZ | PASANTE AUX COCINA | $1,750,905 | — | — | No |
| 9 | YOHANA ALEXI CRUZ PADUA | STEWARD | $1,750,905 | — | Yohana | Sí |
| 10 | DUCIBETH ARIOLA PUSHAINA URIYU | STEWARD | $1,750,905 | — | Dusibeth | Sí |
| 11 | CLARA EDUVINA GONZALEZ GUTIERREZ | STEWARD | $1,750,905 | — | Clara | Sí |

**Observaciones Cocina:**
- NICOLAS: nómina = Aux Cocina, Rodri = Pizzero. Probablemente rota entre cocina y pizzería.
- WENDY vs Vanessa: apellido "ALDANA CHILA" puede ser la persona que Rodri registra como "Vanessa". ⚠️ Verificar.
- ESNEIDER está duplicado en Rodri (2 registros: "Jefe de cocina" inactivo + "Chef Principal" activo).
- RODRI tiene personas que NO están en nómina: Pedro (Steward, inactivo), Javier (Cocinero, inactivo), Turnante (Cocinero, activo), Santiago, Jose.

### 2.2 BARRA (7 personas)

| # | Nombre Completo | Cargo Nómina | Salario | Apodo Excel | Notas |
|---|---|---|---|---|---|
| 1 | WALTER VILLAMOROS RODRIGUEZ | JEFE DE BAR | $3,000,000 | Mello | Posiblemente Walter = Mello |
| 2 | ASHLYE STEPHANIE TELLEZ VALDERRAMA | JEFE BAR 50% PROPINAS | $1,750,905 | ASHLEY | OK |
| 3 | LIZETH DAYANNA CASALLAS ORTIZ | BARTENDER | $875,452 | — | Medio tiempo ($875K) |
| 4 | MANUEL ALEJANDRO NORENA RENZA | AUX BAR | $1,750,905 | MANOLO | Manuel = Manolo |
| 5 | ANGIE JULIETH RODRIGUEZ CUBILLOS | AUX BAR | $1,750,905 | — | No visible en Excel |
| 6 | YOHAN FELIPE MORA ESCOBAR | AUX BAR | $1,750,905 | YOHAN | OK |
| 7 | BRANDON ESTIVEN MEJIA OLAYA | AUX BAR | $1,750,905 | — | No visible en Excel |

**Observaciones Barra:**
- Solo 7 en nómina, pero Excel de barra tiene hasta 14 activos por semana (abril) y 15 en julio. La diferencia: hay bartenders que no están en nómina C75 (ADRIAN, STEVEN, JUAN PABLO, HELENA, JUANSE, DAYANA, y los de julio: CRISTIAN, SOFIA, HANNA, NATALIA, ALDEMAR, MAICOL, GIOVANNY).
- ⚠️ **WALTER = MELLO?** Verificar con Rodri/Excel.
- ANGIE y BRANDON no aparecen en el Excel de horarios pero están en nómina. Pueden ser nuevos o con horarios variables.

### 2.3 SERVICIO (13 personas)

| # | Nombre Completo | Cargo Nómina | Salario | Apodo Excel | Rol Excel | Notas |
|---|---|---|---|---|---|---|
| 1 | VERONICA FRANCHESKA MEDINA MOLINA | JEFE DE SERVICIO | $2,750,000 | — | — | Líder, no rola turnos |
| 2 | LEONARDO SUAREZ RODRIGUEZ | SUB JEFE SERVICIO | $1,923,500 | LEONARDO | Mesas + Barra | Cross-training |
| 3 | DAVID BENJAMIN CUBILLOS VARGAS | MESERO | $1,750,905 | BENJA | Mesas | |
| 4 | GIOVANNY ALDAIR POMPEYO ORTIZ | MESERO | $1,750,905 | GIO | CAJERO | ⚠️ Cargo nómina ≠ rol operativo |
| 5 | MARTIN FERNANDO ORREGO DELGADO | MESERO | $1,750,905 | MARTIN | Mesas + Barra | Cross-training |
| 6 | YELSON EDUARDO RUIZ ALMEIDA | MESERO | $1,750,905 | EDUARDO | Mesas + Barra | ⚠️ Yelson Eduardo = EDUARDO |
| 7 | RONAL FERNANDO ANZOLA CORREDOR | MESERO | $1,750,905 | RONALD | Mesas | |
| 8 | OSCAR ALBERTO MORENO MANCIPE | MESERO | $1,750,905 | — | — | No visible en Excel |
| 9 | BRYAN ALBERTO SIERRA TORRES | MESERO | $1,750,905 | BRYAN | HOST | ⚠️ Cargo nómina ≠ rol operativo |
| 10 | MARTIN EDUARDO ORREGO ROJAS | MESERO | $1,750,905 | DON MARTIN | Mesas + Barra | Cross-training |
| 11 | NEIDY STEFANIA ROJAS | MESERA | $0 | STEFANIA / ESTEFANIA | Mesas + Barra | Salario $0 = propinas only? |
| 12 | LEANIS CAROLINA AULAR BRACHO | MESERA | $1,750,905 | CAROLINA | Mesas + Barra | Cross-training |
| 13 | LESHLYE MICHELLE TELLEZ VALDERRAMA | CAJERA ADMINISTRATIVO | $1,750,905 | LESH / LESHLYE | Cajera | Cajera principal |

**Observaciones Servicio:**
- ⚠️ **GIOVANNY POMPEYO**: nómina dice MESERO, pero en Excel es CAJERO. Su cargo real es cajero.
- ⚠️ **BRYAN SIERRA**: nómina dice MESERO, pero en Excel es HOST. Su rol operativo es host.
- ⚠️ **YELSON EDUARDO RUIZ** = "EDUARDO" en Excel (segundo nombre).
- ⚠️ **MARTIN EDUARDO ORREGO** = "DON MARTIN" en Excel (para distinguirlo de MARTIN FERNANDO).
- **NEIDY STEFANIA ROJAS**: salario $0 — probablemente trabaja solo por propinas.
- **6 personas en cross-training Mesas↔Barra**: Leonardo, Martin F., Yelson Eduardo, Martin E., Carolina, Stefania.
- SEBAS y RACSO (Host en Excel) NO están en nómina C75. Son de otra sede o contrato diferente.

### 2.4 APOYO (5 personas — NO en turnos de producción)

| # | Nombre Completo | Cargo Nómina | Salario | Apodo Excel | Decisión |
|---|---|---|---|---|---|
| 1 | MARIA CRISTINA ALFARO FONSECA | SERVICIOS GENERALES | $1,750,905 | CRISTINA | ⚠️ ¿A qué área asignar? |
| 2 | EDILBERTO AGUILAR RAMIREZ | SERVICIOS GENERALES | $1,750,905 | BETO | ⚠️ ¿A qué área asignar? |
| 3 | JAVIER JAMPIER DUQUE BUITRAGO | INGENIERO DE SONIDO | $1,750,905 | — | ⚠️ ¿A qué área asignar? |
| 4 | NATHALIA ANDREA GONZALEZ HENAO | ASESOR COM VENTAS | $1,900,000 | — | ⚠️ ¿A qué área asignar? |
| 5 | SOFIA PEREZ SANCHEZ | PASANTE ADMINISTRATIVA | $1,750,905 | — | ⚠️ ¿A qué área asignar? |

**Recomendación:** Servicios Generales (Cristina y Beto) → Servicio. Ingeniero de Sonido → Servicio (está en el restaurante durante servicio). Asesor de Ventas → Barra (vende en barra). Pasante Administrativa → Apoyo (no en producción).

### 2.5 SIN CARGO (2 personas — requieren asignación manual)

| # | Nombre Completo | Salario | En Rodri como | Decisión |
|---|---|---|---|---|
| 1 | LEANIS CAROLINA AULAR BRANCHO | $1,750,905 | — | ⚠️ DUPLICADA — YA existe como MESERA con apellido BRACHO. Eliminar este registro. |
| 2 | OMAR DAVID RICO CABRA | $1,750,905 | Omar cabra (Pizzero) | ⚠️ Rodri dice Pizzería. ¿Cocina o Servicio? |

---

## 3. TABLA DE ALIAS (Apodo → Nombre Completo)

Para conectar los datos del Excel con la nómina, se necesita esta tabla:

```sql
CREATE TABLE staff_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES pos_nomina_staff(id),
  alias TEXT NOT NULL,
  source TEXT, -- 'excel', 'rodri', 'interno'
  UNIQUE(alias, source)
);
```

| Alias | Employee ID (pos_nomina_staff) | Nombre Completo |
|-------|-------------------------------|-----------------|
| Esneider | (id de ESNEIDER BLANCO) | ESNEIDER BLANCO CASTILLO |
| Walter / Mello | (id de WALTER VILLAMOROS) | WALTER VILLAMOROS RODRIGUEZ |
| Ashley | (id de ASHLYE TELLEZ) | ASHLYE STEPHANIE TELLEZ VALDERRAMA |
| Manolo | (id de MANUEL NORENA) | MANUEL ALEJANDRO NORENA RENZA |
| Yohan | (id de YOHAN MORA) | YOHAN FELIPE MORA ESCOBAR |
| Leonardo | (id de LEONARDO SUAREZ) | LEONARDO SUAREZ RODRIGUEZ |
| Benja | (id de DAVID CUBILLOS) | DAVID BENJAMIN CUBILLOS VARGAS |
| Gio / Giovanny | (id de GIOVANNY POMPEYO) | GIOVANNY ALDAIR POMPEYO ORTIZ |
| Martin | (id de MARTIN F. ORREGO) | MARTIN FERNANDO ORREGO DELGADO |
| Eduardo / Yelson | (id de YELSON RUIZ) | YELSON EDUARDO RUIZ ALMEIDA |
| Ronald / Ronal | (id de RONAL ANZOLA) | RONAL FERNANDO ANZOLA CORREDOR |
| Bryan | (id de BRYAN SIERRA) | BRYAN ALBERTO SIERRA TORRES |
| Don Martin / Martin E. | (id de MARTIN E. ORREGO) | MARTIN EDUARDO ORREGO ROJAS |
| Stefania / Estefania | (id de NEIDY ROJAS) | NEIDY STEFANIA ROJAS |
| Carolina / Leanis | (id de LEANIS AULAR) | LEANIS CAROLINA AULAR BRACHO |
| Lesh / Leshlye | (id de LESHLYE TELLEZ) | LESHLYE MICHELLE TELLEZ VALDERRAMA |
| Sebas | — | No en nómina C75 |
| Racso | — | No en nómina C75 |
| Cristina | (id de MARIA CRISTINA) | MARIA CRISTINA ALFARO FONSECA |
| Beto | (id de EDILBERTO) | EDILBERTO AGUILAR RAMIREZ |
| Jhon | — | No en nómina C75 |
| Hayde | — | No en nómina C75 |
| Ivan | (id de IVAN LARRAHONDO) | IVAN FELIPE LARRAHONDO CARABALI |
| Carlos | (id de CARLOS SUAREZ) | CARLOS STEVEN SUAREZ HERRERA |
| Mauricio | (id de MAURICIO) | MAURICIO LAVERDE GUTIERREZ |
| Clara | (id de CLARA) | CLARA EDUVINA GONZALEZ GUTIERREZ |
| Dusibeth | (id de DUCIBETH) | DUCIBETH ARIOLA PUSHAINA URIYU |
| Leidy | (id de LEIDY ROZO) | LEIDY CATALINA ROZO MARTINEZ |

**Personas en Excel pero NO en nómina C75:** SEBAS, RACSO, JHON, HAYDE, y los bartenders adicionales del Excel de Barra (ADRIAN, STEVEN, JUAN PABLO bar, HELENA, JUANSE, DAYANA, CRISTIAN, SOFIA barra, HANNA, NATALIA, ALDEMAR, MAICOL, GIOVANNY barra, Doble-A).

---

## 4. MAPEO FINAL CARGO → ÁREA (VERIFICADO)

### SQL de migración

```sql
-- Paso 1: Agregar columna area y secondary_areas
ALTER TABLE pos_nomina_staff ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE pos_nomina_staff ADD COLUMN IF NOT EXISTS secondary_areas TEXT[] DEFAULT '{}';

-- Paso 2: Mapeo automático cargo → área (C75 only)
-- 36 de 38 se asignan automáticamente

-- COCINA
UPDATE pos_nomina_staff SET area = 'cocina'
  WHERE sede = 'C75' AND (
    cargo ILIKE '%cocina%'
    OR cargo ILIKE '%steward%'
    OR cargo = 'PASANTE AUX COCINA'
  );

-- BARRA
UPDATE pos_nomina_staff SET area = 'barra'
  WHERE sede = 'C75' AND (
    cargo ILIKE '%bar%'
    OR cargo ILIKE '%bartender%'
  );

-- SERVICIO
UPDATE pos_nomina_staff SET area = 'servicio'
  WHERE sede = 'C75' AND (
    cargo ILIKE '%servicio%'
    OR cargo ILIKE '%meser%'
    OR cargo ILIKE '%cajer%'
  );

-- APOYO (pendiente decisión de Alejandro)
UPDATE pos_nomina_staff SET area = 'apoyo'
  WHERE sede = 'C75' AND (
    cargo ILIKE '%servicios generales%'
    OR cargo ILIKE '%ingeniero%'
    OR cargo ILIKE '%asesor%'
    OR cargo ILIKE '%pasante administr%'
  );

-- Paso 3: Cross-training (6 personas Mesas↔Barra)
UPDATE pos_nomina_staff SET secondary_areas = ARRAY['barra']
  WHERE sede = 'C75' AND nombre_completo IN (
    'LEONARDO SUAREZ RODRIGUEZ',
    'MARTIN FERNANDO ORREGO DELGADO',
    'YELSON EDUARDO RUIZ ALMEIDA',
    'MARTIN EDUARDO ORREGO ROJAS',
    'NEIDY STEFANIA ROJAS',
    'LEANIS CAROLINA AULAR BRACHO'
  );

-- Paso 4: Roles operativos que difieren del cargo (GIO = cajero, BRYAN = host)
-- Se refleja en user_roles.area, no en pos_nomina_staff.area
-- GIOVANNY y BRYAN siguen siendo MESERO en nómina pero su rol operativo es diferente

-- Paso 5: Eliminar LEANIS duplicada (SIN CARGO, apellido BRANCHO)
-- La misma persona ya está como MESERA con apellido BRACHO
-- ⚠️ EJECUTAR SOLO CON AUTORIZACIÓN DE ALEJANDRO
-- DELETE FROM pos_nomina_staff WHERE nombre_completo = 'LEANIS CAROLINA AULAR BRANCHO' AND cargo IS NULL;
```

### Resultado esperado del mapeo

| Área | Cantidad | Cargos incluidos |
|------|----------|-----------------|
| cocina | 11 | JEFE DE COCINA (1), AUX COCINA (6), PASANTE AUX COCINA (1), STEWARD (3) |
| barra | 7 | JEFE DE BAR (1), JEFE BAR 50% PROPINAS (1), BARTENDER (1), AUX BAR (4) |
| servicio | 13 | JEFE DE SERVICIO (1), SUB JEFE SERVICIO (1), MESERO (8), MESERA (2), CAJERA (1) |
| apoyo | 5 | SERVICIOS GENERALES (2), INGENIERO DE SONIDO (1), ASESOR COM VENTAS (1), PASANTE ADMINISTRATIVA (1) |
| NULL | 2 | LEANIS BRANCHO (duplicada), OMAR RICO (sin cargo) |

---

## 5. DISCREPANCIAS CARGO NÓMINA vs. ROL OPERATIVO

| Persona | Cargo Nómina | Rol Operativo (Excel) | Acción sugerida |
|---------|-------------|----------------------|----------------|
| GIOVANNY POMPEYO | MESERO | Cajero | Mantener MESERO en nómina, marcar como host/cajero en user_roles |
| BRYAN SIERRA | MESERO | Host | Mantener MESERO en nómina, marcar como host en user_roles |
| NICOLAS ALFARO | AUX COCINA | Pizzero (en Rodri) | Mantener AUX COCINA, secondary_areas=['cocina'] |
| OMAR RICO | SIN CARGO | Pizzero (en Rodri) | ⚠️ Asignar a cocina con cargo PIZZERO o AUX COCINA |
| LEANIS AULAR (BRANCHO) | SIN CARGO | — | ⚠️ Eliminar registro duplicado |
| LIZETH CASALLAS | BARTENDER | — | Salario $875,452 = medio tiempo, verificar es_medio_tiempo=true |

---

## 6. TABLA STAFF_ALIASES (SQL)

```sql
CREATE TABLE IF NOT EXISTS staff_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES pos_nomina_staff(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  source TEXT CHECK (source IN ('excel', 'rodri', 'interno', 'colombia')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(alias, source)
);

-- Seed de aliases conocidos
INSERT INTO staff_aliases (employee_id, alias, source) VALUES
  ((SELECT id FROM pos_nomina_staff WHERE nombre_completo = 'ESNEIDER BLANCO CASTILLO'), 'Esneider', 'rodri'),
  ((SELECT id FROM pos_nomina_staff WHERE nombre_completo = 'WALTER VILLAMOROS RODRIGUEZ'), 'Mello', 'excel'),
  ((SELECT id FROM pos_nomina_staff WHERE nombre_completo = 'ASHLYE STEPHANIE TELLEZ VALDERRAMA'), 'ASHLEY', 'excel'),
  ((SELECT id FROM pos_nomina_staff WHERE nombre_completo = 'MANUEL ALEJANDRO NORENA RENZA'), 'MANOLO', 'excel'),
  ((SELECT id FROM pos_nomina_staff WHERE nombre_completo = 'YOHAN FELIPE MORA ESCOBAR'), 'YOHAN', 'excel'),
  ((SELECT id FROM pos_nomina_staff WHERE nombre_completo = 'LEONARDO SUAREZ RODRIGUEZ'), 'LEONARDO', 'excel'),
  ((SELECT id FROM pos_nomina_staff WHERE nombre_completo = 'DAVID BENJAMIN CUBILLOS VARGAS'), 'BENJA', 'excel'),
  ((SELECT id FROM pos_nomina_staff WHERE nombre_completo = 'GIOVANNY ALDAIR POMPEYO ORTIZ'), 'GIO', 'excel'),
  ((SELECT id FROM pos_nomina_staff WHERE nombre_completo = 'MARTIN FERNANDO ORREGO DELGADO'), 'MARTIN', 'excel'),
  ((SELECT id FROM pos_nomina_staff WHERE nombre_completo = 'YELSON EDUARDO RUIZ ALMEIDA'), 'EDUARDO', 'excel'),
  ((SELECT id FROM pos_nomina_staff WHERE nombre_completo = 'RONAL FERNANDO ANZOLA CORREDOR'), 'RONALD', 'excel'),
  ((SELECT id FROM pos_nomina_staff WHERE nombre_completo = 'BRYAN ALBERTO SIERRA TORRES'), 'BRYAN', 'excel'),
  ((SELECT id FROM pos_nomina_staff WHERE nombre_completo = 'MARTIN EDUARDO ORREGO ROJAS'), 'DON MARTIN', 'excel'),
  ((SELECT id FROM pos_nomina_staff WHERE nombre_completo = 'NEIDY STEFANIA ROJAS'), 'STEFANIA', 'excel'),
  ((SELECT id FROM pos_nomina_staff WHERE nombre_completo = 'LEANIS CAROLINA AULAR BRACHO'), 'CAROLINA', 'excel'),
  ((SELECT id FROM pos_nomina_staff WHERE nombre_completo = 'LESHLYE MICHELLE TELLEZ VALDERRAMA'), 'LESH', 'excel'),
  ((SELECT id FROM pos_nomina_staff WHERE nombre_completo = 'MARIA CRISTINA ALFARO FONSECA'), 'CRISTINA', 'excel'),
  ((SELECT id FROM pos_nomina_staff WHERE nombre_completo = 'EDILBERTO AGUILAR RAMIREZ'), 'BETO', 'excel'),
  ((SELECT id FROM pos_nomina_staff WHERE nombre_completo = 'IVAN FELIPE LARRAHONDO CARABALI'), 'Iván', 'rodri'),
  ((SELECT id FROM pos_nomina_staff WHERE nombre_completo = 'CARLOS STEVEN SUAREZ HERRERA'), 'Carlos', 'rodri'),
  ((SELECT id FROM pos_nomina_staff WHERE nombre_completo = 'MAURICIO LAVERDE GUTIERREZ'), 'Mauricio', 'rodri'),
  ((SELECT id FROM pos_nomina_staff WHERE nombre_completo = 'CLARA EDUVINA GONZALEZ GUTIERREZ'), 'Clara', 'rodri'),
  ((SELECT id FROM pos_nomina_staff WHERE nombre_completo = 'DUCIBETH ARIOLA PUSHAINA URIYU'), 'Dusibeth', 'rodri'),
  ((SELECT id FROM pos_nomina_staff WHERE nombre_completo = 'YOHANA ALEXI CRUZ PADUA'), 'Yohana', 'rodri'),
  ((SELECT id FROM pos_nomina_staff WHERE nombre_completo = 'LEIDY CATALINA ROZO MARTINEZ'), 'Leidy', 'interno');
```

---

## 7. VERIFICACIÓN DE SALARIOS (desde Supabase real)

| Nivel Salarial | Cargo | Salario | Personas |
|----------------|-------|---------|----------|
| Nivel 1 | JEFE DE BAR | $3,000,000 | 1 (Walter) |
| Nivel 2 | JEFE DE SERVICIO | $2,750,000 | 1 (Veronica) |
| Nivel 3 | JEFE DE COCINA | $2,500,000 | 1 (Esneider) |
| Nivel 4 | SUB JEFE SERVICIO | $1,923,500 | 1 (Leonardo) |
| Nivel 5 | ASESOR COM VENTAS | $1,900,000 | 1 (Nathalia) |
| Nivel 6 | AUX COCINA (Nicolas) | $1,800,000 | 1 (Nicolas) |
| Nivel 7 | Estándar | $1,750,905 | 29 personas |
| Nivel 8 | BARTENDER (medio tiempo) | $875,452.5 | 1 (Lizeth) |
| Nivel 9 | MESERA (propinas only) | $0 | 1 (Neidy Stefania) |

**Total nómina mensual C75 (sin auxilio):** ~$65,490,000 COP (38 personas)

---

## 8. DECISIONES PENDIENTES (⚠️ REQUIEREN ALEJANDRO)

1. **LEANIS CAROLINA AULAR BRANCHO** (SIN CARGO) → Eliminar registro duplicado. Ya existe como MESERA con apellido BRACHO. **¿Confirmo eliminación?**

2. **OMAR DAVID RICO CABRA** (SIN CARGO) → Rodri lo tiene como Pizzero. **¿Asignar a Cocina con cargo PIZZERO/AUX COCINA?**

3. **Los 5 de Apoyo** → **¿A qué área operativa?**
   - CRISTINA y BETO (Servicios Generales) → ¿Servicio?
   - JAVIER (Ingeniero Sonido) → ¿Servicio o Apoyo?
   - NATHALIA (Asesor Ventas) → ¿Barra o Apoyo?
   - SOFIA (Pasante Admin) → ¿Apoyo?

4. **GIOVANNY POMPEYO** → Nómina dice MESERO, operación dice CAJERO. **¿Corregir cargo a CAJERO en nómina o dejar como está y manejar en user_roles?**

5. **BRYAN SIERRA** → Nómina dice MESERO, operación dice HOST. **¿Corregir cargo a HOST en nómina o dejar como está?**

6. **NEIDY STEFANIA ROJAS** → Salario $0. **¿Confirma que trabaja solo por propinas? ¿Pasar a es_medio_tiempo=true?**

7. **WENDY ALDANA vs Vanessa (Rodri)** → ¿Son la misma persona? Nombres no coinciden.

8. **Bartenders adicionales del Excel** → ADRIAN, STEVEN, JUAN PABLO, HELENA, JUANSE, DAYANA, y los de julio (CRISTIAN, SOFIA, HANNA, NATALIA, ALDEMAR, MAICOL, Doble-A). **¿Están en nómina bajo otra sede (C85) o son informales?**

9. **SEBAS, RACSO, JHON, HAYDE** (Host y Servicios Generales en Excel) → **¿No están en nómina C75? ¿O están bajo otros nombres?**

10. **Cross-training** → Formalizar los 6 con `secondary_areas=['barra']` **¿Confirmo?**

---

## 9. CHECKLIST PRE-IMPLEMENTACIÓN

- [ ] Responder decisiones pendientes (12 puntos arriba)
- [ ] Ejecutar SQL: `ALTER TABLE pos_nomina_staff ADD COLUMN area TEXT` + `secondary_areas TEXT[]`
- [ ] Ejecutar SQL: `UPDATE pos_nomina_staff SET area = 'cocina'|'barra'|'servicio'|'apoyo'`
- [ ] Crear tabla `staff_aliases`
- [ ] Seed aliases conocidos
- [ ] Eliminar LEANIS duplicada (si Alejandro aprueba)
- [ ] Asignar OMAR (si Alejandro decide)
- [ ] Crear tablas: `shift_types`, `shift_schedules`, `shift_assignments`, `shift_novedades`
- [ ] Agregar roles `lider_area` y `colaborador` al Panel Equipo
- [ ] Agregar `area` y `pos_nomina_staff_id` a `user_roles`
- [ ] Importar 24 códigos de turno con HO/HN