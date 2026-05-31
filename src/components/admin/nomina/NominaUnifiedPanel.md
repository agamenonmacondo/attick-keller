# NominaUnifiedPanel.tsx

- **Que hace**: Panel unificado de nomina con 3 tabs: Operativo (biometrico), Contable (delega a NominaContablePanel) y Costos vs Ventas (analisis de costos operativos comparados con ventas)
- **Datos**: Hook `useNomina(from, to)` para operativo, `useNominaOpsCosts(from, to)` para costos; delega contable a `NominaContablePanel`; sub-componentes duplicados de NominaPanel (HoursBarChart, StaffDetailPanel)
- **Dependencias**: NominaContablePanel, AnimatedCard, Phosphor icons, useNomina, useNominaOpsCosts
- **Pitfalls**: Componente mas grande (~1038 lineas) — `HoursBarChart` y `StaffDetailPanel` estan duplicados de NominaPanel en vez de compartirse. Las fechas default se calculan con `currentMonthRange()` y se sobre-escriben con periodos disponibles del API