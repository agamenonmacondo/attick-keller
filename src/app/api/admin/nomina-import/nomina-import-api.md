# nomina-import/route.ts

- **Que hace**: POST importa datos de nomina desde archivo Excel (xlsx)
- **Datos**: `pos_nomina_staff`, tablas de nomina (insert/upsrt)
- **Auth**: `getAdminUser` — roles super_admin, store_admin, nomina
- **Pitfalls**: Parsea Excel con xlsx library. Validaciones: cedula unica, campos obligatorios. Retorna resumen de filas importadas vs errores