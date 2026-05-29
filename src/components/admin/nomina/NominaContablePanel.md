# NominaContablePanel.tsx

- **Que hace**: Panel contable de nomina con 5 sub-tabs: Detalle (por empleado), HE/Recargos, Provisiones, Novedades y Propinas — selector de periodo y sede
- **Datos**: Hook `useNominaContable()` — periodos y sedes disponibles del propio hook; tipos `NominaContableDetalle`, `NominaContableResumen`, `NominaContablePropinas`, `NominaContableHERecargo`, `NominaContableProvision`, `NominaContableNovedad`
- **Dependencias**: AnimatedCard, Phosphor icons, SEDE_LABELS (C75, C85, KINDER, ADMIN)
- **Pitfalls**: `formatCOP` esta duplicado de NominaPanel; loslabels de sede estan hardcoded — si se agregan nuevas sedes hay que actualizar el mapa SEDE_LABELS