# A&K — Hoja de Ruta (ROADMAP.md)

> **Actualizado:** 2026-06-04 por Ale + Ninja
> **Regla:** Ale define las prioridades. Ninja propone, pero no decide.

---

## Fase 1: Cimientos (AHORA — 2 semanas)

**Objetivo:** Dejar de adivinar. Todo cambio verificado antes de producción.

### 1.1 Sync automático cada hora ✅ Plan listo

- Script `sync_pos_incremental.py` (leer SQL Server → Supabase)
- Windows Task Scheduler en PC del restaurante
- Log rotativo `sync_hourly.log`

### 1.2 Health check automatizado ✅ Script listo

- `health_check.py` — 5 chequeos (frescura, conteo, consistencia, huérfanos, anomalías)
- Ejecución manual. Cron job cuando el sync esté corriendo.
- Umbrales ajustables: `MAX_DATA_AGE_HOURS`, `REVENUE_CONSISTENCY_MARGIN`, etc.

### 1.3 Protocolo de desarrollo 🔜 Pendiente

- Pre-deploy checklist (spec → test → código → staging → verify → deploy)
- Staging environment en Vercel (preview deployments, es gratis)
- Regla: si no pasa en staging, no llega a prod.

### 1.4 Documentación viva ✅ Hecho (STATE, DECISIONS, PROTOCOL, ROADMAP)

- 4 archivos en raíz del proyecto
- Actualizados por Ninja después de cada sesión significativa

---

## Fase 2: Confiabilidad (PRÓXIMO — 1 mes)

**Objetivo:** Que el sistema se monitoree solo y alerte antes de que Ale detecte un bug.

### 2.1 Cron job de health check

- Cada 6 horas, verificar integridad de datos
- Alerta por Telegram si algo falla (datos viejos, inconsistencia, conteo anómalo)
- No requiere intervención humana

### 2.2 Tests mínimos de integración

- 5-10 tests que cubran los bugs que ya tuvimos (IDs con espacios, `.in()` truncado, cache compartida)
- Ejecutar antes de cada deploy
- No necesitan ser exhaustivos — solo cubrir los patrones de fallo conocidos

### 2.3 Alertas de sync

- Si el sync horario falla 3 veces seguidas → Telegram
- Si el health check detecta datos >3h viejos → Telegram

---

## Fase 3: Expansión (FUTURO — 3 meses)

**Objetivo:** Multi-restaurante, mobile app para líderes de zona.

### 3.1 App móvil para líderes de zona

- Dashboard simplificado: KPIs del día, revenue por zona, turnos
- Responsive (ya está) pero con vistas específicas para mobile
- Autenticación por líder de zona (solo ve sus datos)

### 3.2 Sincronización de costos en tiempo real

- Actualmente los costos se importan manualmente
- Ideal: que el sync horario también actualice `pos_ingredients`, `pos_ingredient_costs`, `pos_recipe_warehouses`
- Requiere: identificar la fuente en SQL Server (tablas `insumos`, `costos_insumos`)

### 3.3 Multi-restaurante

- El esquema ya soporta `restaurant_id` en todas las tablas
- Falta: selector de restaurante en UI, filtros en APIs, RLS por restaurante
- Solo si A&K abre una segunda sede

---

## Parking Lot (ideas sin fecha)

| Idea | Prioridad | Notas |
|---|---|---|
| Tab de revenue por mesa | Baja | Descartado por ahora (3,036 códigos sin normalizar) |
| Integración con Rappi/Plataformas delivery | Media | Las ventas delivery ya están en el POS como zona "domicilio" |
| Panel de inventario (stock insumos) | Media | Los datos están en `pos_recipe_warehouses` pero sin cantidades |
|| Exportación de reportes PDF | Alta → En progreso | Informes Rayo ⚡: Fase 1 lista (KPIs + períodos). Fases 2-4: IA + PDF |
| Notificaciones push a líderes (fin de turno) | Baja | Depende de app móvil |
