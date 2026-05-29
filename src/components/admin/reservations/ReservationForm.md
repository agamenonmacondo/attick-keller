# ReservationForm.tsx

- **Que hace**: Formulario modal para crear nueva reserva con busqueda/creacion de cliente, seleccion de zona y horario
- **Datos**: Carga zonas de /api/admin/zones; busca clientes en /api/admin/customers/search; crea reserva via POST /api/admin/reservations; crea cliente via POST /api/admin/customers
- **Dependencias**: formatDate, formatTime, SERVICE_HOURS, Phosphor icons
- **Pitfalls**: Creacion de cliente nuevo requiere nombre + telefono; source default = phone
