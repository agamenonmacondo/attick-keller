# 📋 PLAN DE MEJORA — Panel de Clientes & Mailing Masivo
## Attick & Keller — Abril 2026

---

## 🔴 PROBLEMAS CRÍTICOS (resolver ahora)

### 1. Filtros no funcionan al aplicar
**Causa:** El hook `useCustomers` llama a la API con los parámetros correctos, pero la API de customers tiene **graceful degradation** que omite los filtros de stats/tags cuando fallan. Sin embargo, el filtro de `has_email` sí funciona (es directo en la query de customers). Los filtros de `min_visits` y `last_visit_days` buscan en `customer_stats` donde TODOS los registros tienen `total_visits=0` y `last_visit_date=null`, entonces el filtro devuelve 0 resultados (correcto, pero nada que mostrar).

**Fix:**
- ✅ El `has_email` funciona (12 de 12 clientes TIENEN email)
- ⚠️ `last_visit_days` y `min_visits` devuelven vacío porque ningún cliente tiene visitas registradas
- Fix: Poblar `customer_stats` con datos iniciales o hacer que los filtros devuelvan "0 resultados" con un mensaje claro en vez de pantalla vacía

### 2. Campañas de email fallan — "Batch 1: fetch failed"
**Causa:** El endpoint POST de campaigns usa un patrón **fire-and-forget** (async IIFE sin await, línea 202). En Vercel Serverless, la función se termina ANTES de que el fetch a Resend complete.

**Fix:** Cambiar a **background function** o **await directo** (campañas pequeñas <100 emails) o **Vercel Cron + tabla de jobs**

### 3. 2 campañas stuck en "sending"
**Causa:** Se crearon pero nunca se procesaron (fire-and-forget falló silenciosamente)
**Fix:** Limpiar estado + corregir el mecanismo de envío

---

## 🟡 MEJORAS DE FUNCIONALIDAD

### 4. Historial de emails en barra desplegable
**Ahora:** No hay forma de ver qué emails se han enviado
**Propuesta:**
- Componente `CampaignHistory` — barra desplegable (collapsible) debajo del composer
- Lista de campañas pasadas con: nombre, fecha, destinatarios, % enviado, % fallido
- Click para ver detalle (lista de recipients con status)
- Badge de estado: ✅ completed | ⏳ sending | ❌ failed
- API: GET `/api/admin/campaigns` ya existe, solo falta el componente

### 5. Carga de imágenes en campañas
**Ahora:** Solo texto plano en el body del email
**Propuesta:**
- Upload de imágenes al composer (drag & drop o file picker)
- Optimización automática a WebP (sharp/next-image)
- Storage en Supabase Storage (bucket `campaign-images`)
- Insertar como `<img src="...">` en el HTML del body
- Preview visual del email con imágenes

### 6. Optimización WebP para assets del restaurante
- Conversión automática de imágenes subidas
- Next.js `<Image>` component con formatos optimizados
- CDN de Vercel para cache

---

## 🟢 ARQUITECTURA PROPUESTA

### Flujo de Mailing Masivo Mejorado

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│  Admin UI    │───>│  API POST    │───>│  Supabase   │
│  (Composer)  │    │  /campaigns  │    │  campaigns  │
└─────────────┘    └──────┬───────┘    └─────────────┘
                          │
                   [await directo]
                          │
                          ▼
               ┌──────────────────┐
               │  Resend Batch API │
               │  (100 per batch)  │
               └────────┬─────────┘
                        │
                        ▼
               ┌──────────────────┐
               │  Update status    │
               │  en BD (recipients│
               │  + campaign)      │
               └──────────────────┘
```

### Para campañas grandes (>100 emails):
- Opción A: **Vercel Cron** que procese batches cada minuto
- Opción B: **Process en background** con `waitUntil` de Vercel
- Opción C: **Tabla de jobs** que un endpoint `/api/admin/campaigns/process` va consumiendo

---

## 📦 TABLAS DE BD NECESARIAS

| Tabla | Estado | Uso |
|-------|--------|-----|
| `email_campaigns` | ✅ Existe | Metadata de campañas |
| `campaign_recipients` | ✅ Existe | Tracking por recipient |
| `customer_tags` | ✅ Poblada (5 tags) | Etiquetas de segmentación |
| `customer_tag_links` | ✅ Existe | Relación many-to-many |
| `customer_stats` | ✅ Existe | Stats (vacías, poblar) |

### Nueva tabla sugerida: `campaign_images`
```sql
CREATE TABLE campaign_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES email_campaigns(id),
  url TEXT NOT NULL,
  alt_text TEXT,
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🗂️ PLAN DE EJECUCIÓN

### Fase 1 — Fixes críticos (1-2 horas)
1. [ ] Fix campañas: cambiar fire-and-forget por await directo
2. [ ] Limpiar campañas stuck en "sending"
3. [ ] Poblar `customer_stats` con datos iniciales para que filtros funcionen
4. [ ] Fix: filtros con 0 resultados muestran mensaje claro

### Fase 2 — Historial de emails (1 hora)
5. [ ] Crear componente `CampaignHistory.tsx`
6. [ ] Barra desplegable con lista de campañas
7. [ ] Badge de estado + métricas rápidas
8. [ ] Integrar en `CustomersPanel.tsx`

### Fase 3 — Imágenes en campañas (2 horas)
9. [ ] Crear Supabase Storage bucket `campaign-images`
10. [ ] API endpoint para upload + optimización WebP
11. [ ] Integrar upload en `CampaignComposer.tsx`
12. [ ] Preview visual con imágenes

### Fase 4 — Mailing masivo robusto (2 horas)
13. [ ] Implementar process de campañas grande por batches
14. [ ] Progress bar en UI mientras envía
15. [ ] Retry automático de fallidos
16. [ ] Dashboard de métricas (open rate, click rate vía Resend webhooks)

---

## 📊 ESTADO ACTUAL

- **Clientes:** 12 (todos con email)
- **Etiquetas:** 5 (VIP, Frecuente, Nuevo, Cumpleaños, Sin reserva)
- **Campañas:** 3 (1 failed, 2 stuck en "sending")
- **Resend quota:** ~52 emails/mes restantes (plan free)
- **Resend daily:** 5 emails/día (rate limit actual)

---

*Generado: 2026-04-30 — Ninja*