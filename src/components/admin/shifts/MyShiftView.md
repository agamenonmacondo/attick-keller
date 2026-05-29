# MyShiftView.tsx

- **Que hace**: Vista personal del empleado: muestra sus turnos de la semana con check-in/out y costo estimado
- **Datos**: GET /api/admin/shift-my-week?week_str=X; GET /api/admin/shift-schedules?area=X
- **Dependencias**: Phosphor icons, calcCOP/getWeekDates, tipos ShiftType
- **Pitfalls**: Carga shift types segun area del empleado; check-in/out requiere geolocalizacion
