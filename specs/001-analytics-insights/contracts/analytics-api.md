# API Contract: Analytics Endpoints

**Feature**: 001-analytics-insights
**Date**: 2026-05-18

## GET /api/admin/customers/analytics

**Auth**: Requires admin session cookie

**Response** (extended):

```json
{
  "totalCustomers": 20413,
  "totalVisits": 45000,
  "totalNoShows": 5600,
  "totalSpent": 0,
  "avgSpendPerVisit": null,
  "recurring": 2908,
  "withPhone": 16954,
  "withEmail": 10045,
  "withBoth": 9966,
  "withNeither": 4843,
  "recent30": 320,
  "recent90": 890,
  "segments": {
    "none": 14661,
    "new": 5648,
    "occasional": 102,
    "regular": 2,
    "vip": 0
  },
  "retention": {
    "oneTime": 26195,
    "twoToThree": 2551,
    "fourToFive": 264,
    "sixToTen": 82,
    "vip": 11
  },
  "noShowRisk": {
    "noRisk": 23521,
    "lowRisk": 5255,
    "medRisk": 304,
    "highRisk": 23
  },
  "reactivation": {
    "dormantClients": 26195,
    "reachableWhatsApp": 16000,
    "reachableEmail": 8500,
    "notReachable": 4843
  }
}
```

**Error responses**:
- `401` — No auth session
- `403` — Not admin
- `500` — Database error

**Performance**: Uses `count=exact` for contact metrics, `fetchAll(999)` for stats. Should load in < 3s.

---

## GET /api/admin/customers/analytics/no-show-today

**Auth**: Requires admin session cookie

**Query params**:
- `date` (optional) — ISO date string, defaults to today

**Response**:

```json
{
  "date": "2026-05-18",
  "alerts": [
    {
      "id": "uuid",
      "customerName": "Juan Pérez",
      "customerPhone": "+57300123456",
      "reservationTime": "19:30",
      "partySize": 4,
      "noShowCount": 3,
      "riskLevel": "medium",
      "tableZone": "Terraza"
    }
  ],
  "totalAtRisk": 5,
  "totalReservationsToday": 12
}
```

**Risk levels**:
- `low`: no_show_count = 1
- `medium`: no_show_count = 2-3
- `high`: no_show_count >= 4

**Performance**: Only queries today's reservations (max ~30), fast.

---

## GET /api/admin/customers/analytics/trends

**Auth**: Requires admin session cookie

**Query params**:
- `weeks` (optional) — Number of weeks to return, default 8

**Response**:

```json
{
  "trends": [
    {
      "week": "2026-W20",
      "label": "May 12-18",
      "activeCount": 85,
      "newCount": 32,
      "noShowCount": 5,
      "reservationCount": 120,
      "retentionPct": 37.6
    }
  ]
}
```

**Performance**: Aggregates reservations by week. 8 queries for 8 weeks, or single query with GROUP BY. Should be < 2s.

---

## GET /api/admin/customers/analytics/table-demand

**Auth**: Requires admin session cookie

**Response**:

```json
{
  "demand": {
    "size2": 70.1,
    "size4": 20.3,
    "size6": 5.8,
    "size8plus": 3.8
  },
  "supply": {
    "size2": 15.6,
    "size4": 48.9,
    "size6": 24.4,
    "size8plus": 11.1
  },
  "mismatch": true,
  "recommendation": "Considerar convertir mesas de 4 en mesas de 2 — el 70% de la demanda es para 2 personas pero solo el 16% de las mesas son para 2."
}
```

**Performance**: Two simple count queries (reservations + tables), fast.

---

## GET /api/admin/customers/analytics/vip-inactive

**Auth**: Requires admin session cookie

**Query params**:
- `days` (optional) — Minimum days since last visit, default 30

**Response**:

```json
{
  "vipInactive": [
    {
      "id": "uuid",
      "customerName": "Emilio Marquez",
      "phone": "+57300111111",
      "lastVisitDate": "2026-04-01",
      "totalVisits": 26,
      "daysSinceLastVisit": 47,
      "loyaltyTier": "vip"
    }
  ],
  "count": 3,
  "totalVIPs": 11
}
```

**Performance**: Uses `loyalty_tier = 'vip'` AND `last_visit_date < now() - interval '30 days'`. Fast query.

---

## POST /api/admin/campaigns

**Auth**: Requires admin session cookie

**Request body**:

```json
{
  "segment": "dormant",
  "channel": "whatsapp",
  "template": "Hola {name}, hace tiempo no te vemos en Attick & Keller 💚 Tu última visita fue el {last_visit}. Te esperamos de vuelta con un 10% de descuento. Reserva: https://attick-keller.com/reservar"
}
```

**Response** (v1 — no actual sending):

```json
{
  "segment": "dormant",
  "channel": "whatsapp",
  "audience": 16000,
  "message": "Hola [nombre], hace tiempo no te vemos en Attick & Keller 💚 Tu última visita fue el [fecha]. Te esperamos de vuelta con un 10% de descuento. Reserva: https://attick-keller.com/reservar",
  "note": "Copia este mensaje y envíalo por WhatsApp Business. Variables: {name}, {last_visit}. Para envío automático, integra WhatsApp Business API en v2.",
  "status": "template_ready"
}
```

**Note**: v1 does NOT send messages. It generates a template that the admin copies to WhatsApp manually.