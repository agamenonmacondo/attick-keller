# shift-checkout/route.ts

- **Que hace**: POST registra check-out (salida) de un empleado; GET lista checkouts del dia
- **Datos**: `shift_checkins` (actualiza hora de salida)
- **Auth**: `getAdminUser` o `getEmployeeUser`
- **Pitfalls**: Checkout actualiza el registro de checkin existente (set check_out_time). Empleado solo checkout su propio registro