# ShiftTypeModal.tsx

- **Que hace**: Modal CRUD para crear/editar tipos de turno (horarios). Define codigo, nombre, area, horas ordinarias/nocturnas, entrada/salida, y turnos partidos (1-2 segmentos)
- **Datos**: Recibe `onClose`, `onSaved`, `shiftType` (null = crear, objeto = editar). Persiste via `POST/PATCH /api/admin/shift-types`
- **Dependencias**: `@phosphor-icons/react` (X, Check, Plus, Minus), `calcularHorasSegmento` local, `ShiftType/ShiftTypeSegment` types
- **Estados**: `isOpen` controla visibilidad del modal con animacion de entrada. Formulario con nombre, codigo, area, entrada/salida base, horas (calculadas automaticamente), y segmentos para turnos partidos
- **Pitfalls**:
  - **Hooks antes del return**: El `useMemo` de `horasValidas` DEBE estar antes de `if (!isOpen) return null` — si esta despues, React crashea porque cambia la cantidad de hooks entre renders (fixeado Jun 2026)
  - El calculo de horas segmento usa logica local de minutos — no depende de `calcularHorasSegmento` del costCalculator
  - `is_split` se activa cuando hay al menos 2 segmentos con entrada y salida validas
  - Los segmentos se persisten como `shift_type_segments[]` en la API

| Fecha | Agente | Cambio |
|-------|--------|--------|
| 2026-06-02 | Ninja | Creacion del doc. Fix hooks antes del return |
