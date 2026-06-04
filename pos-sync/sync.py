"""
SYNC INCREMENTAL INTELIGENTE
- Primera corrida: trae TODO desde May 27 + items + pagos + zona
- Corridas subsecuentes: solo ventas NUEVAS desde la ultima fecha en Supabase
- KPIs: solo recalcula las ventas sincronizadas (no todas)
- Costos/catálogos: solo con --full, o primera corrida

Ejecutar:
    python sync.py          # sync rapido: ventas + items + pagos + KPIs (~2 min)
    python sync.py --full   # sync completo: agrega catálogos + 12 tablas costos (~5 min)
"""
import os, sys, time, re, requests, pyodbc
from datetime import datetime, timedelta
from decimal import Decimal
from collections import defaultdict

try: sys.stdout.reconfigure(line_buffering=True)
except: pass

DIR = os.path.dirname(os.path.abspath(__file__))
cfg = {}
with open(os.path.join(DIR, "config.env")) as fh:
    for ln in fh:
        ln = ln.strip()
        if ln and not ln.startswith("#") and "=" in ln:
            k, v = ln.split("=", 1)
            cfg[k.strip()] = v.strip()

URL = cfg["SUPABASE_URL"]
KEY = cfg["SUPABASE_SERVICE_KEY"]
SQL_HOST = cfg["SQL_SERVER"]
SQL_DB = cfg["SQL_DATABASE"]
REST_ID = cfg["RESTAURANT_ID"]

HDR_GET = {"apikey": KEY, "Authorization": "Bearer " + KEY}
HDR_POST = {"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json", "Prefer": "return=minimal"}
LOG_FILE = os.path.join(DIR, "sync_hourly.log")

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = "[%s] %s" % (ts, msg)
    print(line)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as fh:
            fh.write(line + "\n")
    except: pass

def to_float(v):
    if isinstance(v, Decimal): return float(v)
    if v is None: return 0.0
    try: return float(v)
    except (ValueError, TypeError): return 0.0

def to_int(v):
    if isinstance(v, Decimal): return int(v)
    if v is None: return 0
    return int(v)

def to_bool(v):
    if v is None: return False
    if isinstance(v, bool): return v
    return bool(v)

def derive_zone(table_code):
    if not table_code: return "TEE PEE"
    t = table_code.upper().strip()
    if re.match(r'^(ATICO|ATTI|ATK|ATIC|MINITIPI|ATIKO)', t): return "ATICO"
    if re.match(r'^(FDS|HGF|GFD|DSA|HG|FG|FD|DJ)', t): return "KELLER"
    if re.match(r'^(MK[123]|SP|SOFA|JORG|999|888|777|666|555|444)', t): return "SHOTS"
    return "TEE PEE"

def getconn():
    for drv in ["{ODBC Driver 11 for SQL Server}", "{SQL Server}", "{ODBC Driver 17 for SQL Server}"]:
        try:
            s = f"DRIVER={drv};SERVER={SQL_HOST};DATABASE={SQL_DB};Trusted_Connection=yes;"
            return pyodbc.connect(s, timeout=10)
        except: continue
    raise Exception("No se pudo conectar")

def parse_colombian_date(v):
    if not v: return None
    if isinstance(v, datetime): return v.isoformat()
    s = str(v).strip().replace("\xa0", " ")
    if "T" in s and len(s) >= 10: return s[:19]
    m = re.match(r"(\d{1,2})/(\d{1,2})/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(.*)", s)
    if m:
        d, mo, y, h, mi, s2 = m.groups()[:6]
        ampm = (m.group(7) or "").strip().lower()
        hour = int(h)
        if "p" in ampm and hour < 12: hour += 12
        elif "a" in ampm and hour == 12: hour = 0
        if hour > 23 or hour < 0: return None
        try: return "%04d-%02d-%02dT%02d:%02d:%02d" % (int(y), int(mo), int(d), hour, int(mi), int(s2))
        except: return None
    return None

def get_max_date():
    """Retorna la ultima fecha en Supabase como string YYYY-MM-DD HH:MM:SS"""
    r = requests.get(
        f"{URL}/rest/v1/pos_sales?select=opened_at&order=opened_at.desc&limit=1&opened_at=not.is.null",
        headers=HDR_GET, timeout=30
    )
    if r.status_code == 200 and r.json():
        return r.json()[0]["opened_at"][:19].replace("T", " ")
    return None

def batch_upsert(table, rows, batch_size=200, on_conflict=None):
    """Upsert (insert or update) batches. Uses Prefer header for merge-duplicates.
    Returns UUID-enriched rows for pos_sales so we can map folio→id."""
    if not rows: return [], 0, 0
    hdr = {
        "apikey": KEY,
        "Authorization": "Bearer " + KEY,
        "Content-Type": "application/json",
        "Prefer": "return=representation,resolution=merge-duplicates"
    }
    all_returned = []
    errors = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i+batch_size]
        for attempt in range(5):
            try:
                url = URL + "/rest/v1/" + table
                if on_conflict:
                    url += "?on_conflict=" + on_conflict
                r = requests.post(
                    url,
                    headers=hdr,
                    json=batch,
                    timeout=60
                )
                if r.status_code in (200, 201):
                    all_returned.extend(r.json())
                    break
                else:
                    if attempt < 4: time.sleep(2 ** attempt)
                    else:
                        log("  ERROR upsert %s batch %d: %d %s" % (table, i, r.status_code, r.text[:300]))
                        errors += len(batch)
                        break
            except Exception as e:
                if attempt < 4: time.sleep(2 ** attempt)
                else:
                    log("  EXCEPTION upsert %s: %s" % (table, str(e)))
                    errors += len(batch)
                    break
        time.sleep(0.1)
    return all_returned, len(rows) - errors, errors

def batch_post(table, rows, batch_size=200, return_data=False):
    """Insert batches (no upsert). Used for items/payments where we delete-then-insert."""
    if not rows: return (0, 0, []) if return_data else (0, 0)
    inserted = errors = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i+batch_size]
        for attempt in range(5):
            try:
                r = requests.post(URL + "/rest/v1/" + table, headers=HDR_POST, json=batch, timeout=60)
                if r.status_code in (200, 201, 409):
                    inserted += len(batch)
                    break
                else:
                    if attempt < 4: time.sleep(2 ** attempt)
                    else:
                        log("  ERROR batch %d: %d %s" % (i, r.status_code, r.text[:200]))
                        errors += len(batch)
            except Exception as e:
                if attempt < 4: time.sleep(2 ** attempt)
                else:
                    log("  EXCEPTION: %s" % str(e))
                    errors += len(batch)
        time.sleep(0.1)
    return inserted, errors

def batch_patch(table, updates, batch_size=100):
    if not updates: return 0
    patched = 0
    for i in range(0, len(updates), batch_size):
        batch = updates[i:i+batch_size]
        for uid, data in batch:
            for attempt in range(2):
                try:
                    r = requests.patch(f"{URL}/rest/v1/{table}?id=eq.{uid}", headers=HDR_POST, json=data, timeout=15)
                    if r.status_code in (200, 204): patched += 1; break
                except: pass
    return patched

def batch_delete(table, sale_ids, batch_size=50):
    deleted = 0
    for i in range(0, len(sale_ids), batch_size):
        batch = sale_ids[i:i+batch_size]
        ids = ",".join(str(s) for s in batch)
        try:
            r = requests.delete(f"{URL}/rest/v1/{table}?pos_sale_id=in.({ids})", headers=HDR_POST, timeout=30)
            if r.status_code in (200, 204): deleted += len(batch)
        except: pass
        time.sleep(0.05)
    return deleted

# ── Flag global: --full = sync completo (catálogos + costos) ──
DO_FULL = "--full" in sys.argv

# ═════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════
def main():
    if DO_FULL:
        log("MODO: sync completo (--full)")
    else:
        log("MODO: sync rápido (ventas+KPIs. Usar --full para catálogos+costos)")
    log("=" * 60)
    log("SYNC INCREMENTAL - " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    log("=" * 60)

    # Determinar fecha de inicio con solape de 2 dias
    # (solo ventas recientes que puedan haber cambiado)
    last_date = get_max_date()
    if last_date:
        dt = datetime.strptime(last_date, "%Y-%m-%d %H:%M:%S") - timedelta(days=2)
        since = dt.strftime("%Y-%m-%d %H:%M:%S")
        log("Ultima venta en Supabase: %s" % last_date)
    else:
        # Nunca se ha sincronizado: arrancar desde May 1 con solape generoso
        since = "2026-05-01 00:00:00"
        log("Sin datos previos. Sync completo desde Mayo 1.")
    log("Sincronizando desde: %s" % since)

    # ── 1. VENTAS ──
    conn = getconn()
    cur = conn.cursor()

    cur.execute("""
        SELECT folio, idarearestaurant, mesa, idmesero, nopersonas,
               fecha, total, cancelado, tipodeservicio, idturno, subtotal,
               totalimpuesto1, propina, idcliente
        FROM cheques WHERE fecha > CONVERT(datetime, ?) ORDER BY fecha, folio
    """, since)
    cheques = cur.fetchall()
    log("Cheques SQL: %d" % len(cheques))

    if not cheques:
        log("No hay ventas nuevas.")
        # Aun asi, actualizar catalogos
        sync_catalogs(cur)
        conn.close()
        return

    min_f = min(to_int(c[0]) for c in cheques)
    max_f = max(to_int(c[0]) for c in cheques)

    # Descubrir columnas de cheqdet
    cheqdet_cols = [row.column_name.lower() for row in cur.columns(table="cheqdet")]
    cols_str = ", ".join(cheqdet_cols)
    cur.execute(f"SELECT {cols_str} FROM cheqdet WHERE foliodet BETWEEN {min_f} AND {max_f} ORDER BY foliodet, movimiento")
    items_raw = cur.fetchall()
    log("Items SQL: %d" % len(items_raw))

    cur.execute(f"SELECT folio, idformadepago, importe, propina, referencia FROM chequespagos WHERE folio BETWEEN {min_f} AND {max_f}")
    pagos_raw = cur.fetchall()
    log("Pagos SQL: %d" % len(pagos_raw))
    conn.close()

    # Construir ventas
    sales = []
    for c in cheques:
        tc = str(c[2]).strip() if c[2] is not None else "SIN MESA"
        tot = to_float(c[6]) if c[6] else 0
        tip = to_float(c[12]) if c[12] else 0
        fecha = parse_colombian_date(c[5])
        sales.append({
            "restaurant_id": REST_ID,
            "pos_folio": str(to_int(c[0])),
            "pos_series": "POS",
            "pos_table_code": tc,
            "party_size": to_int(c[4]) if c[4] is not None else 1,
            "pos_staff_id": str(c[3]).strip().zfill(2) if c[3] else "00",
            "pos_area_id": str(c[1]).strip().zfill(2) if c[1] else "01",
            "pos_customer_id": str(c[13]).strip() if c[13] else "000001",
            "pos_shift_id": str(to_int(c[9])) if c[9] is not None else None,
            "subtotal": to_float(c[10]) if c[10] else 0,
            "tax_amount": to_float(c[11]) if c[11] else 0,
            "tip_amount": tip,
            "total": tot,
            "total_with_tip": tot + tip,
            "is_cancelled": to_bool(c[7]),
            "is_paid": True,
            "station": "POS",
            "opened_at": fecha or "2026-01-01T00:00:00",
            "derived_zone_name": derive_zone(tc),
        })

    # Upsert ventas y obtener UUIDs directamente
    log("Upserteando %d ventas..." % len(sales))
    returned_sales, ins_s, err_s = batch_upsert("pos_sales", sales, 200, on_conflict="restaurant_id,pos_folio")
    log("  %d OK | %d errors" % (ins_s, err_s))

    # Construir mapa folio→UUID desde la respuesta del upsert
    folio_to_uuid = {}
    all_folios = sorted(set(s["pos_folio"] for s in sales))
    for row in returned_sales:
        folio_to_uuid[str(row["pos_folio"])] = row["id"]
    log("  UUIDs de upsert: %d/%d" % (len(folio_to_uuid), len(all_folios)))

    # Fallback: buscar UUIDs faltantes por consulta
    missing = [f for f in all_folios if f not in folio_to_uuid]
    if missing:
        log("  Buscando %d UUIDs faltantes..." % len(missing))
        missing_set = set(missing)
        for j in range(0, len(missing), 100):
            chunk = missing[j:j+100]
            for attempt in range(3):
                try:
                    r = requests.get(
                        URL + "/rest/v1/pos_sales?select=id,pos_folio&pos_folio=in.(" + ",".join(chunk) + ")",
                        headers=HDR_GET, timeout=30
                    )
                    if r.status_code == 200:
                        for row in r.json():
                            fid = str(row["pos_folio"])
                            folio_to_uuid[fid] = row["id"]
                            missing_set.discard(fid)
                        break
                    elif attempt < 2: time.sleep(1)
                except:
                    if attempt < 2: time.sleep(1)
        # Fallback paginacion si aun faltan
        if missing_set:
            log("  Fallback paginacion para %d UUIDs..." % len(missing_set))
            offset = 0
            while missing_set and offset < 50000:
                try:
                    r = requests.get(URL + "/rest/v1/pos_sales?select=id,pos_folio&limit=1000&offset=" + str(offset), headers=HDR_GET, timeout=30)
                    if r.status_code != 200: break
                    data = r.json()
                    if not data: break
                    for row in data:
                        fid = str(row["pos_folio"])
                        if fid in missing_set:
                            folio_to_uuid[fid] = row["id"]
                            missing_set.discard(fid)
                    if len(data) < 1000: break
                    offset += 1000
                except Exception as e:
                    log("  ERROR paginacion: %s" % str(e))
                    break
        log("  Final: %d/%d UUIDs" % (len(folio_to_uuid), len(all_folios)))

    # ── ITEMS ──
    col_idx = {name: i for i, name in enumerate(cheqdet_cols)}
    items_to_insert = []
    skipped = 0
    for row in items_raw:
        folio = str(to_int(row[col_idx["foliodet"]]))
        if folio not in folio_to_uuid: skipped += 1; continue
        item = {
            "restaurant_id": REST_ID,
            "pos_sale_id": folio_to_uuid[folio],
            "pos_folio": folio,
            "line_number": to_int(row[col_idx["movimiento"]]) if "movimiento" in col_idx else 0,
            "pos_product_id": str(row[col_idx["idproducto"]]).strip() if "idproducto" in col_idx and row[col_idx["idproducto"]] else "",
            "quantity": to_float(row[col_idx["cantidad"]]) if "cantidad" in col_idx else 1,
            "unit_price": to_float(row[col_idx["precio"]]) if "precio" in col_idx else 0,
            "comment": str(row[col_idx["comentario"]]) if "comentario" in col_idx and row[col_idx["comentario"]] else None,
        }
        if "descuento" in col_idx and row[col_idx["descuento"]] is not None:
            item["discount"] = to_float(row[col_idx["descuento"]])
        if "idimpuesto" in col_idx and row[col_idx["idimpuesto"]] is not None:
            item["tax_rate"] = to_float(row[col_idx["idimpuesto"]])
        if "idmesero" in col_idx and row[col_idx["idmesero"]] is not None:
            item["pos_staff_product"] = str(row[col_idx["idmesero"]]).strip()
        if "idestacion" in col_idx and row[col_idx["idestacion"]] is not None:
            item["station"] = str(row[col_idx["idestacion"]]).strip()
        if "preciocatalogo" in col_idx and row[col_idx["preciocatalogo"]] is not None:
            item["catalog_price"] = to_float(row[col_idx["preciocatalogo"]])
        items_to_insert.append(item)

    if skipped: log("  %d items sin UUID" % skipped)

    # ── PAGOS ──
    pagos_to_insert = []
    skipped_p = 0
    for row in pagos_raw:
        folio = str(to_int(row[0]))
        if folio not in folio_to_uuid: skipped_p += 1; continue
        pagos_to_insert.append({
            "restaurant_id": REST_ID,
            "pos_sale_id": folio_to_uuid[folio],
            "pos_folio": folio,
            "pos_payment_method_id": str(row[1]).strip().zfill(2) if row[1] else "01",
            "amount": to_float(row[2]) if row[2] else 0,
            "tip": to_float(row[3]) if row[3] else 0,
            "reference": str(row[4]) if row[4] else None,
        })
    if skipped_p: log("  %d pagos sin UUID" % skipped_p)

    # ── ITEMS/PAGOS: solo insertar los de ventas NUEVAS ──
    # Ventas que ya tienen items en Supabase se dejan intactas (no tocar)
    existing_with_items = set()
    for chunk_start in range(0, len(all_folios), 200):
        chunk = all_folios[chunk_start:chunk_start+200]
        folio_str = ",".join(chunk)
        try:
            r = requests.get(
                f"{URL}/rest/v1/pos_sale_items?select=pos_folio&pos_folio=in.({folio_str})&limit=100000",
                headers=HDR_GET, timeout=30)
            if r.status_code == 200:
                for row in r.json():
                    existing_with_items.add(str(row["pos_folio"]))
        except Exception as e:
            log("  WARN consultando items existentes: %s" % str(e))

    new_folios = [f for f in all_folios if f not in existing_with_items]
    log("Ventas nuevas: %d | ya con items (no tocar): %d" % (len(new_folios), len(existing_with_items)))

    # Solo procesar items/pagos de ventas NUEVAS
    new_folios_set = set(new_folios)
    items_new = [it for it in items_to_insert if it["pos_folio"] in new_folios_set]
    pagos_new = [pg for pg in pagos_to_insert if pg["pos_folio"] in new_folios_set]

    # Borrar items/pagos solo de ventas nuevas (por si hubo intento previo fallido)
    new_sale_ids = [folio_to_uuid[f] for f in new_folios if f in folio_to_uuid]
    if new_sale_ids:
        batch_delete("pos_sale_items", new_sale_ids)
        batch_delete("pos_sale_payments", new_sale_ids)

    log("Insertando %d items (solo ventas nuevas)..." % len(items_new))
    ins_i, err_i = batch_post("pos_sale_items", items_new, 200)
    log("  %d OK | %d errors" % (ins_i, err_i))

    log("Insertando %d pagos (solo ventas nuevas)..." % len(pagos_new))
    ins_p, err_p = batch_post("pos_sale_payments", pagos_new, 200)
    log("  %d OK | %d errors" % (ins_p, err_p))

    # ── RECALCULAR KPIs (solo ventas de este sync) ──
    all_sale_ids = [folio_to_uuid[f] for f in all_folios if f in folio_to_uuid]
    log("Recalculando KPIs para %d ventas..." % len(all_sale_ids))
    sale_id_filter = ",".join('"' + sid + '"' for sid in all_sale_ids)

    # item_count y food_total: solo items de las ventas sincronizadas
    r = requests.get(
        f"{URL}/rest/v1/pos_sale_items?select=pos_sale_id,quantity,unit_price&pos_sale_id=in.({sale_id_filter})&limit=100000",
        headers=HDR_GET, timeout=120)
    if r.status_code == 200:
        stats = defaultdict(lambda: {"item_count": 0, "food_total": 0.0})
        for i in r.json():
            sid = i["pos_sale_id"]
            qty = i.get("quantity", 0) or 0
            stats[sid]["item_count"] += int(qty)
            stats[sid]["food_total"] += qty * (i.get("unit_price", 0) or 0)
        updates = [(sid, {"item_count": s["item_count"], "food_total": s["food_total"]})
                   for sid, s in stats.items() if s["item_count"] > 0]
        n = batch_patch("pos_sales", updates)
        log("  item_count: %d ventas" % n)

    # card_paid / cash_paid: solo pagos de las ventas sincronizadas
    r = requests.get(
        f"{URL}/rest/v1/pos_sale_payments?select=pos_sale_id,pos_payment_method_id,amount&pos_sale_id=in.({sale_id_filter})&limit=100000",
        headers=HDR_GET, timeout=120)
    if r.status_code == 200:
        card = defaultdict(float)
        cash = defaultdict(float)
        for p in r.json():
            sid = p["pos_sale_id"]
            amt = p.get("amount", 0) or 0
            if p.get("pos_payment_method_id") in ("01", "1"): cash[sid] += amt
            else: card[sid] += amt
        updates = []
        for sid in set(card.keys()) | set(cash.keys()):
            updates.append((sid, {"card_paid": card.get(sid, 0), "cash_paid": cash.get(sid, 0)}))
        n = batch_patch("pos_sales", updates)
        log("  card/cash_paid: %d ventas" % n)

    # ── CATALOGOS (siempre, son ligeros) ──
    conn2 = getconn()
    cur2 = conn2.cursor()
    sync_catalogs(cur2)
    conn2.close()

    # ── COSTOS (siempre, con incremental para purchases) ──
    sync_costs()

    log("=" * 60)
    log("OK: %d ventas | %d items | %d pagos" % (ins_s, ins_i, ins_p))
    log("=" * 60)


def sync_catalogs(cur):
    """Actualiza catalogos (ligero, upsert)"""
    cur.execute("SELECT idarearestaurant, descripcion, idtiposervicio FROM areasrestaurant")
    areas = [{"restaurant_id": REST_ID, "pos_area_id": str(r[0]).strip().zfill(2),
              "name": (r[1] or "").strip(), "service_type": to_int(r[2]) or 1, "is_active": True}
             for r in cur.fetchall()]
    a, _ = batch_post("pos_areas", areas)
    log("  areas: %d" % a)

    cur.execute("SELECT idmesero, nombre, tipo, visible FROM meseros")
    staff = [{"restaurant_id": REST_ID, "pos_staff_id": str(r[0]).strip().zfill(2),
              "name": (r[1] or "").strip(), "staff_type": to_int(r[2]) if r[2] is not None else 1,
              "is_visible": to_bool(r[3])} for r in cur.fetchall()]
    s, _ = batch_post("pos_staff", staff)
    log("  staff: %d" % s)

    cur.execute("SELECT idformadepago, descripcion FROM formasdepago")
    pm = [{"restaurant_id": REST_ID, "pos_payment_method_id": str(r[0]).strip().zfill(2),
           "name": (r[1] or "").strip()} for r in cur.fetchall()]
    p, _ = batch_post("pos_payment_methods", pm)
    log("  payment_methods: %d" % p)

    cur.execute("SELECT idgrupo, descripcion, clasificacion FROM grupos")
    gr = [{"restaurant_id": REST_ID, "pos_group_id": str(r[0]).strip(),
           "name": (r[1] or "").strip(), "is_subgroup": False,
           "classification": to_int(r[2]) if r[2] is not None else None} for r in cur.fetchall()]
    g, _ = batch_post("pos_product_groups", gr)
    log("  groups: %d" % g)

    cur.execute("SELECT idproducto, descripcion, idgrupo FROM productos")
    prod = [{"restaurant_id": REST_ID, "pos_product_id": str(r[0]).strip(),
             "name": (r[1] or "").strip(), "pos_group_id": str(r[2]).strip() if r[2] else None,
             "use_dining": True, "use_delivery": True, "use_quick": True,
             "visible_menu": True, "visible_kiosk": True} for r in cur.fetchall()]
    pr, _ = batch_post("pos_products", prod)
    log("  products: %d" % pr)

    cur.execute("SELECT idturno, apertura, cierre, cajero, idestacion FROM turnos")
    shifts = [{"restaurant_id": REST_ID, "pos_shift_id": str(to_int(r[0])),
               "opened_at": r[1].isoformat() if r[1] else None,
               "closed_at": r[2].isoformat() if r[2] else None,
               "cashier": str(r[3]).strip() if r[3] else None,
               "station": str(r[4]).strip() if r[4] else None,
               "is_closed": bool(r[2])} for r in cur.fetchall()]
    sh, _ = batch_post("pos_shifts", shifts)
    log("  shifts: %d" % sh)


# ═════════════════════════════════════════════════
# SYNC DE COSTOS (11 tablas)
# ═════════════════════════════════════════════════
def sync_costs():
    """Sincroniza tablas de costos desde SQL Server a Supabase (upsert full)"""
    conn = getconn()
    cur = conn.cursor()
    log("--- Sincronizando COSTOS ---")

    # 1. pos_ingredient_categories (21 rows) — gruposi
    cur.execute("SELECT idgruposi, descripcion, idgruposiclasificacion, prioridad FROM gruposi")
    rows = cur.fetchall()
    data = [{"restaurant_id": REST_ID, "pos_category_id": str(r[0]).strip(),
             "name": (r[1] or "").strip(),
             "classification": str(r[2]).strip() if r[2] else None,
             "priority": to_int(r[3]) if r[3] is not None else 0} for r in rows]
    _, ok, err = batch_upsert("pos_ingredient_categories", data, 200, on_conflict="restaurant_id,pos_category_id")
    log("  ingredient_categories: %d OK | %d err" % (ok, err))

    # 2. pos_warehouses (6 rows) — almacen
    cur.execute("SELECT idalmacen, nombre, tipo FROM almacen")
    rows = cur.fetchall()
    data = [{"restaurant_id": REST_ID, "pos_warehouse_id": str(r[0]).strip(),
             "name": (r[1] or "").strip(),
             "warehouse_type": to_int(r[2]) if r[2] is not None else 1} for r in rows]
    _, ok, err = batch_upsert("pos_warehouses", data, 200, on_conflict="restaurant_id,pos_warehouse_id")
    log("  warehouses: %d OK | %d err" % (ok, err))

    # 3. pos_ingredients (996 rows) — insumos
    cur.execute("SELECT idinsumo, descripcion, idgruposi, unidad, elaborado, rendimientoelaborado, minutosalerta, minutospreparacion FROM insumos")
    rows = cur.fetchall()
    data = [{"restaurant_id": REST_ID, "pos_ingredient_id": str(r[0]).strip(),
             "name": (r[1] or "").strip(),
             "pos_category_id": str(r[2]).strip() if r[2] else None,
             "unit": str(r[3]).strip() if r[3] else None,
             "is_composite": bool(r[4]) if r[4] is not None else False,
             "yield": float(r[5]) if r[5] is not None else 1.0,
             "alert_minutes": to_int(r[6]) if r[6] is not None else None,
             "prep_minutes": to_int(r[7]) if r[7] is not None else None} for r in rows]
    _, ok, err = batch_upsert("pos_ingredients", data, 200, on_conflict="restaurant_id,pos_ingredient_id")
    log("  ingredients: %d OK | %d err" % (ok, err))

    # 4. pos_ingredient_costs (996 rows) — insumosdetalle
    cur.execute("""SELECT idinsumo, idempresa, inventariable, costo, costopromedio,
                   impuesto1, impuesto2, impuesto3, costoconimpuestos, merma, descargar,
                   estatus, costoestandar, idarea FROM insumosdetalle""")
    rows = cur.fetchall()
    data = [{"restaurant_id": REST_ID,
             "pos_ingredient_id": str(r[0]).strip(),
             "pos_company_id": str(r[1]).strip(),
             "inventory_track": bool(r[2]) if r[2] is not None else True,
             "cost": to_float(r[3]),
             "avg_cost": to_float(r[4]),
             "tax1": to_float(r[5]) if r[5] is not None else 0,
             "tax2": to_float(r[6]) if r[6] is not None else 0,
             "tax3": to_float(r[7]) if r[7] is not None else 0,
             "cost_with_tax": to_float(r[8]) if r[8] is not None else 0,
             "waste": to_float(r[9]) if r[9] is not None else 0,
             "deduct": bool(r[10]) if r[10] is not None else True,
             "status": to_int(r[11]) if r[11] is not None else 1,
             "standard_cost": to_float(r[12]) if r[12] is not None else None,
             "pos_area_id": str(r[13]).strip() if r[13] else None} for r in rows]
    _, ok, err = batch_upsert("pos_ingredient_costs", data, 200, on_conflict="restaurant_id,pos_ingredient_id,pos_company_id")
    log("  ingredient_costs: %d OK | %d err" % (ok, err))

    # 5. pos_product_prices (862 rows) — productosdetalle (solo campos relevantes)
    cur.execute("""SELECT idproducto, idempresa, precio, impuesto1, impuesto2, impuesto3,
                   preciosinimpuestos, bloqueado, precioabierto, idarea FROM productosdetalle""")
    rows = cur.fetchall()
    data = []
    for r in rows:
        pid = str(r[0]).strip()
        if not pid: continue
        data.append({"restaurant_id": REST_ID, "pos_product_id": pid,
                     "pos_company_id": str(r[1]).strip(),
                     "price": to_float(r[2]),
                     "tax1": to_float(r[3]) if r[3] is not None else 0,
                     "tax2": to_float(r[4]) if r[4] is not None else 0,
                     "tax3": to_float(r[5]) if r[5] is not None else 0,
                     "price_before_tax": to_float(r[6]) if r[6] is not None else None,
                     "is_blocked": bool(r[7]) if r[7] is not None else False,
                     "is_open_price": bool(r[8]) if r[8] is not None and r[8] != 0 else False,
                     "pos_area_id": str(r[9]).strip() if r[9] else None})
    _, ok, err = batch_upsert("pos_product_prices", data, 200, on_conflict="restaurant_id,pos_product_id,pos_company_id")
    log("  product_prices: %d OK | %d err" % (ok, err))

    # 6. pos_product_recipes (2270 rows) — costos
    cur.execute("SELECT idproducto, idinsumo, cantidad, idempresa FROM costos")
    rows = cur.fetchall()
    data = []
    for r in rows:
        pid = str(r[0]).strip()
        iid = str(r[1]).strip()
        if not pid or not iid: continue
        data.append({"restaurant_id": REST_ID, "pos_product_id": pid,
                     "pos_ingredient_id": iid,
                     "quantity": to_float(r[2]) if r[2] is not None else 0,
                     "pos_company_id": str(r[3]).strip() if r[3] else None})
    _, ok, err = batch_upsert("pos_product_recipes", data, 200, on_conflict="restaurant_id,pos_product_id,pos_ingredient_id,pos_company_id")
    log("  product_recipes: %d OK | %d err" % (ok, err))

    # 7. pos_composite_ingredients (1619 rows) — elaborados
    cur.execute("SELECT idelaborado, idinsumo, cantidad FROM elaborados")
    rows = cur.fetchall()
    data = []
    for r in rows:
        cid = str(r[0]).strip()
        iid = str(r[1]).strip()
        if not cid or not iid: continue
        data.append({"restaurant_id": REST_ID, "composite_id": cid,
                     "ingredient_id": iid,
                     "quantity": to_float(r[2]) if r[2] is not None else 0})
    _, ok, err = batch_upsert("pos_composite_ingredients", data, 200, on_conflict="restaurant_id,composite_id,ingredient_id")
    log("  composite_ingredients: %d OK | %d err" % (ok, err))

    # 8. pos_suppliers (180 rows) — proveedores
    cur.execute("""SELECT idproveedor, nombre, razonsocial, direccion, codigopostal,
                   telefono, fax, email, rfc, credito, usarcostosasignados, estatus FROM proveedores""")
    rows = cur.fetchall()
    data = [{"restaurant_id": REST_ID, "pos_supplier_id": str(r[0]).strip(),
             "name": (r[1] or "").strip(),
             "business_name": (r[2] or "").strip() or None,
             "address": (r[3] or "").strip() or None,
             "postal_code": (r[4] or "").strip() or None,
             "phone": (r[5] or "").strip() or None,
             "fax": (r[6] or "").strip() or None,
             "email": (r[7] or "").strip() or None,
             "rfc": (r[8] or "").strip() or None,
             "credit": bool(r[9]) if r[9] is not None and r[9] != 0 else False,
             "use_assigned_costs": bool(r[10]) if r[10] is not None else False,
             "status": to_int(r[11]) if r[11] is not None else 1} for r in rows]
    _, ok, err = batch_upsert("pos_suppliers", data, 200, on_conflict="restaurant_id,pos_supplier_id")
    log("  suppliers: %d OK | %d err" % (ok, err))

    # 9. pos_purchases — incremental (ultimos 2 dias) o full (--full)
    if DO_FULL:
        cur.execute("""SELECT idcompra, idempresa, folio, fechaaplicacion, idproveedor,
                       foliofactura, cancelado, fechavencimiento, usuariocancelo, usuario,
                       referencia, descuento, subtotal, impuesto1, impuesto2, impuesto3, total FROM compras""")
    else:
        cur.execute("""SELECT idcompra, idempresa, folio, fechaaplicacion, idproveedor,
                       foliofactura, cancelado, fechavencimiento, usuariocancelo, usuario,
                       referencia, descuento, subtotal, impuesto1, impuesto2, impuesto3, total
                       FROM compras WHERE fechaaplicacion >= DATEADD(day, -2, GETDATE())""")
    rows = cur.fetchall()
    # COLUMNAS: idcompra(0), idempresa(1), folio(2), fechaaplicacion(3 DATE), idproveedor(4),
    #           foliofactura(5), cancelado(6 BOOL), fechavencimiento(7 DATE), usuariocancelo(8), usuario(9),
    #           referencia(10), descuento(11), subtotal(12), impuesto1(13), impuesto2(14), impuesto3(15), total(16)
    data = []
    recent_purchase_ids = set()
    for r in rows:
        applied = r[3].isoformat() if r[3] else None
        due_date = r[7].isoformat() if r[7] else None
        pid = str(r[0])
        recent_purchase_ids.add(pid)
        data.append({"restaurant_id": REST_ID,
                     "pos_purchase_id": pid,
                     "pos_company_id": str(r[1]).strip() if r[1] else None,
                     "folio": str(r[2]).strip() if r[2] else None,
                     "applied_date": applied,
                     "pos_supplier_id": str(r[4]).strip() if r[4] else None,
                     "invoice_folio": str(r[5]).strip() if r[5] else None,
                     "is_cancelled": bool(r[6]) if r[6] is not None else False,
                     "due_date": due_date,
                     "cancelled_by": str(r[8]).strip() if r[8] else None,
                     "created_by": str(r[9]).strip() if r[9] else None,
                     "reference": str(r[10]).strip() if r[10] else None,
                     "discount": to_float(r[11]) if r[11] is not None else 0,
                     "subtotal": to_float(r[12]) if r[12] is not None else 0,
                     "tax1": to_float(r[13]) if r[13] is not None else 0,
                     "tax2": to_float(r[14]) if r[14] is not None else 0,
                     "tax3": to_float(r[15]) if r[15] is not None else 0,
                     "total": to_float(r[16]) if r[16] is not None else 0})
    _, ok, err = batch_upsert("pos_purchases", data, 200, on_conflict="restaurant_id,pos_purchase_id")
    log("  purchases: %d filas (recientes) | %d OK | %d err" % (len(data), ok, err))

    # 10. pos_purchase_items — incremental (solo de compras recientes) o full (--full)
    data = []
    if DO_FULL:
        cur.execute("""SELECT idcompra, idinsumo, costo, descuento, impuesto1, impuesto1importe,
                       impuesto2, impuesto2importe, impuesto3, impuesto3importe,
                       importesinimpuestos, importeconimpuestos, idalmacen, cantidad FROM comprasmovtos""")
        rows = cur.fetchall()
        for r in rows:
            data.append({"restaurant_id": REST_ID,
                         "pos_purchase_id": str(r[0]),
                         "pos_ingredient_id": str(r[1]).strip() if r[1] else None,
                         "cost": to_float(r[2]),
                         "discount": to_float(r[3]) if r[3] is not None else 0,
                         "tax1": to_float(r[4]) if r[4] is not None else 0,
                         "tax1_amount": to_float(r[5]) if r[5] is not None else 0,
                         "tax2": to_float(r[6]) if r[6] is not None else 0,
                         "tax2_amount": to_float(r[7]) if r[7] is not None else 0,
                         "tax3": to_float(r[8]) if r[8] is not None else 0,
                         "tax3_amount": to_float(r[9]) if r[9] is not None else 0,
                         "amount_before_tax": to_float(r[10]) if r[10] is not None else 0,
                         "amount_with_tax": to_float(r[11]) if r[11] is not None else 0,
                         "pos_warehouse_id": str(r[12]).strip() if r[12] else None,
                         "quantity": to_float(r[13]) if r[13] is not None else 0})
    elif recent_purchase_ids:
        id_list = ",".join(sorted(recent_purchase_ids))
        cur.execute("""SELECT idcompra, idinsumo, costo, descuento, impuesto1, impuesto1importe,
                       impuesto2, impuesto2importe, impuesto3, impuesto3importe,
                       importesinimpuestos, importeconimpuestos, idalmacen, cantidad
                       FROM comprasmovtos WHERE idcompra IN (%s)""" % id_list)
        rows = cur.fetchall()
        for r in rows:
            data.append({"restaurant_id": REST_ID,
                         "pos_purchase_id": str(r[0]),
                         "pos_ingredient_id": str(r[1]).strip() if r[1] else None,
                         "cost": to_float(r[2]),
                         "discount": to_float(r[3]) if r[3] is not None else 0,
                         "tax1": to_float(r[4]) if r[4] is not None else 0,
                         "tax1_amount": to_float(r[5]) if r[5] is not None else 0,
                         "tax2": to_float(r[6]) if r[6] is not None else 0,
                         "tax2_amount": to_float(r[7]) if r[7] is not None else 0,
                         "tax3": to_float(r[8]) if r[8] is not None else 0,
                         "tax3_amount": to_float(r[9]) if r[9] is not None else 0,
                         "amount_before_tax": to_float(r[10]) if r[10] is not None else 0,
                         "amount_with_tax": to_float(r[11]) if r[11] is not None else 0,
                         "pos_warehouse_id": str(r[12]).strip() if r[12] else None,
                         "quantity": to_float(r[13]) if r[13] is not None else 0})
    else:
        log("  purchase_items: omitido (sin compras recientes)")

    if data:
        _, ok, err = batch_upsert("pos_purchase_items", data, 200, on_conflict="restaurant_id,pos_purchase_id,pos_ingredient_id")
        log("  purchase_items: %d filas | %d OK | %d err" % (len(data), ok, err))

    # 11. pos_stock_thresholds (17 rows) — stockinsumos
    cur.execute("SELECT idinsumo, idalmacen, stockminimo, stockideal, stockmaximo, idempresa FROM stockinsumos")
    rows = cur.fetchall()
    data = [{"restaurant_id": REST_ID,
             "pos_ingredient_id": str(r[0]).strip(),
             "pos_warehouse_id": str(r[1]).strip() if r[1] else None,
             "min_stock": to_float(r[2]) if r[2] is not None else 0,
             "ideal_stock": to_float(r[3]) if r[3] is not None else 0,
             "max_stock": to_float(r[4]) if r[4] is not None else 0,
             "pos_company_id": str(r[5]).strip() if r[5] else None} for r in rows]
    _, ok, err = batch_upsert("pos_stock_thresholds", data, 200, on_conflict="restaurant_id,pos_ingredient_id,pos_warehouse_id,pos_company_id")
    log("  stock_thresholds: %d OK | %d err" % (ok, err))

    # 12. pos_recipe_warehouses (24089 rows) — recetasalmacenes
    # DEDUPLICAR: SQL Server tiene filas repetidas con misma clave compuesta,
    # ON CONFLICT DO UPDATE no permite duplicados en el mismo batch.
    cur.execute("SELECT idproducto, idarearestaurant, idalmacen, idempresa, idinsumo FROM recetasalmacenes")
    rows = cur.fetchall()
    seen = {}
    for r in rows:
        pid = str(r[0]).strip()
        iid = str(r[4]).strip()
        if not pid or not iid: continue
        aid = str(r[1]).strip() if r[1] else ""
        wid = str(r[2]).strip() if r[2] else ""
        key = (pid, iid, wid, aid)
        seen[key] = {"restaurant_id": REST_ID, "pos_product_id": pid,
                     "pos_area_id": str(r[1]).strip() if r[1] else None,
                     "pos_warehouse_id": str(r[2]).strip() if r[2] else None,
                     "pos_company_id": str(r[3]).strip() if r[3] else None,
                     "pos_ingredient_id": iid}
    data = list(seen.values())
    log("  recipe_warehouses: %d filas SQL → %d deduplicadas" % (len(rows), len(data)))
    _, ok, err = batch_upsert("pos_recipe_warehouses", data, 200, on_conflict="restaurant_id,pos_product_id,pos_ingredient_id,pos_warehouse_id,pos_area_id")
    log("  recipe_warehouses: %d OK | %d err" % (ok, err))

    conn.close()
    log("--- COSTOS SYNC COMPLETO ---")


if __name__ == "__main__":
    main()
