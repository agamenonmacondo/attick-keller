# ParametrosTab.tsx

- **Que hace**: Muestra parametros de nomina (salario, auxilio, recargos) y listado de empleados activos/inactivos
- **Datos**: data.params, data.employees — de useRodriData
- **Dependencias**: useRodriData, formatParam helper (exportado)
- **Pitfalls**: formatParam tiene logica especial por key (salario en COP, recargos en %, horas con sufijo); JSON configs muestran Ver config
