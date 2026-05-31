# RodriPanel.tsx

- **Que hace**: Panel principal de App Rodri con 6 sub-tabs: Product Mix, Turnos & Nomina, Equipos Diarios, Parametros, Simulador, Horarios Auto
- **Datos**: Hook useRodriData central — provee data a todos los tabs
- **Dependencias**: Todos los tabs de rodri + useRodriData
- **Pitfalls**: Si useRodriData da error, muestra boton de reintentar; loading es spinner global
