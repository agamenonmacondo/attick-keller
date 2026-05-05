#!/usr/bin/env python3
"""Seed reservations for a full week with different occupancy levels.
Usage: python3 seed-week.py
"""
import urllib.request, json, random
from datetime import datetime, timedelta

# ─── Config ──────────────────────────────────────────────────────────
with open('.env.local') as f:
    env = f.read()

service_key = supa_url = None
for line in env.split('\n'):
    if 'SUPABASE_SERVICE_ROLE_KEY' in line:
        service_key = line.split('=', 1)[1].strip()
    if 'NEXT_PUBLIC_SUPABASE_URL' in line:
        supa_url = line.split('=', 1)[1].strip()

HEADERS = {
    'apikey': service_key,
    'Authorization': f'Bearer {service_key}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}
RESTAURANT_ID = 'a0000000-0000-0000-0000-000000000001'

def api_get(table, select='*', extra=''):
    url = f'{supa_url}/rest/v1/{table}?select={select}'
    if extra:
        url += '&' + extra
    req = urllib.request.Request(url, headers={'apikey': service_key, 'Authorization': f'Bearer {service_key}'})
    return json.loads(urllib.request.urlopen(req, timeout=15).read())

def api_post(table, records):
    data = json.dumps(records).encode('utf-8')
    req = urllib.request.Request(f'{supa_url}/rest/v1/{table}', data=data, headers=HEADERS, method='POST')
    return json.loads(urllib.request.urlopen(req, timeout=15).read())

def api_delete(table, filter_str):
    url = f'{supa_url}/rest/v1/{table}?{filter_str}'
    req = urllib.request.Request(url, headers={'apikey': service_key, 'Authorization': f'Bearer {service_key}'}, method='DELETE')
    return urllib.request.urlopen(req, timeout=15).status

# ─── Load data ──────────────────────────────────────────────────────
print("Cargando datos...")
zones = api_get('table_zones', 'id,name')
tables = api_get('tables', 'id,number,capacity,zone_id,is_active')
active_tables = [t for t in tables if t['is_active']]
customers = api_get('customers', 'id,full_name,phone,restaurant_id')
r1_customers = [c for c in customers if c.get('restaurant_id') == RESTAURANT_ID]

ZONE_MAP = {z['id']: z['name'] for z in zones}
TOTAL_CAPACITY = sum(t['capacity'] for t in active_tables)
print(f"  {len(zones)} zonas, {len(active_tables)} mesas ({TOTAL_CAPACITY} asientos), {len(r1_customers)} clientes")

# ─── Create fake customers if needed ────────────────────────────────
FAKE_CUSTOMERS = [
    ('María García', '3101112222'), ('Carlos Rodríguez', '3102223333'),
    ('Ana Martínez', '3103334444'), ('Luis López', '3104445555'),
    ('Carmen Pérez', '3105556666'), ('Diego Sánchez', '3106667777'),
    ('Laura Ramírez', '3107778888'), ('Andrés Torres', '3108889999'),
    ('Valentina Díaz', '3109990000'), ('Jorge Morales', '3110001111'),
    ('Patricia Ruiz', '3111112222'), ('Fernando Castro', '3112223333'),
    ('Sofía Vargas', '3113334444'), ('Roberto Ortiz', '3114445555'),
    ('Natalia Gómez', '3115556666'), ('Mauricio Herrera', '3116667777'),
    ('Daniela Silva', '3117778888'), ('Camilo Mendoza', '3118889999'),
    ('Isabella Rojas', '3119990000'), ('Sebastián Jiménez', '3120001111'),
    ('Alejandra Muñoz', '3121112222'), ('Ricardo León', '3122223333'),
    ('Andrea Correa', '3123334444'), ('Felipe Arias', '3124445555'),
    ('Juliana Moreno', '3125556666'), ('Santiago Pardo', '3126667777'),
    ('Mariana Mejía', '3127778888'), ('Daniel Duque', '3128889999'),
    ('Carolina Castellanos', '3129990000'), ('David Ospina', '3130001111'),
]

if len(r1_customers) < 30:
    print("Creando clientes de prueba...")
    new_cust = [{'full_name': n, 'phone': p, 'restaurant_id': RESTAURANT_ID} for n, p in FAKE_CUSTOMERS]
    try:
        created = api_post('customers', new_cust)
        r1_customers.extend(created)
        print(f"  {len(created)} clientes creados")
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:300]
        print(f"  Error creando clientes: {e.code} - {body}")
        r1_customers = [c for c in api_get('customers', 'id,full_name,phone,restaurant_id') if c.get('restaurant_id') == RESTAURANT_ID]
        print(f"  Total clientes: {len(r1_customers)}")

# ─── Clean old seed reservations ────────────────────────────────────
print("Limpiando reservas de prueba anteriores...")
try:
    api_delete('reservations', 'special_requests=like.*[SEED]*')
    print("  Borradas reservas seed anteriores")
except Exception as e:
    print(f"  Nota: {e}")

# ─── Generate reservations ─────────────────────────────────────────
TIME_SLOTS = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30']
PARTY_WEIGHTS = [2]*15 + [3]*10 + [4]*12 + [5]*3 + [6]*6 + [8]*4 + [10]*2 + [12]*1  # weighted

def get_duration(party_size):
    if party_size <= 4: return 2.0
    if party_size <= 8: return 2.5
    return 3.0

def add_minutes(start_h, start_m, mins):
    total = start_h * 60 + start_m + mins
    return total // 60, total % 60

# Occupancy by day of week (0=Mon)
# Lun: 35%, Mar: 40%, Mie: 55%, Jue: 65%, Vie: 85%, Sab: 95%, Dom: 30%
OCCUPANCY = {0: 0.35, 1: 0.40, 2: 0.55, 3: 0.65, 4: 0.85, 5: 0.95, 6: 0.30}
SOURCES = ['web', 'web', 'web', 'phone', 'phone', 'phone']
STATUSES_BY_OCC = {
    0.35: ['confirmed']*8 + ['pre_paid']*2,
    0.40: ['confirmed']*8 + ['pre_paid']*2 + ['pending']*1,
    0.55: ['confirmed']*7 + ['pre_paid']*3 + ['pending']*1,
    0.65: ['confirmed']*6 + ['pre_paid']*3 + ['pending']*2 + ['seated']*1,
    0.85: ['confirmed']*5 + ['pre_paid']*4 + ['seated']*3,
    0.95: ['confirmed']*4 + ['pre_paid']*4 + ['seated']*4,
    0.30: ['confirmed']*9 + ['pending']*1,
}

random.seed(42)
reservations = []
start_date = datetime(2026, 5, 5)  # Tomorrow

for day_offset in range(7):
    day = start_date + timedelta(days=day_offset)
    dow = day.weekday()
    occupancy = OCCUPANCY.get(dow, 0.5)
    target_seats = int(TOTAL_CAPACITY * occupancy)
    statuses = STATUSES_BY_OCC.get(occupancy, ['confirmed'])
    
    print(f"\n  {day.strftime('%A %d/%m')} (dow={dow}): target {target_seats} asientos ({occupancy*100:.0f}%)")
    
    # Track table usage per day: table_id -> list of (start_minutes, end_minutes)
    table_schedule = {t['id']: [] for t in active_tables}
    day_seated = 0
    day_reservations = 0
    
    # Generate reservations per time slot
    for slot in TIME_SLOTS:
        sh, sm = map(int, slot.split(':'))
        slot_start_min = sh * 60 + sm
        
        # Peak hours get more reservations
        if slot in ('19:00', '19:30', '20:00'):
            slot_target = int(target_seats * 0.20)  # 20% of daily target per peak slot
        elif slot in ('18:00', '18:30'):
            slot_target = int(target_seats * 0.08)  # 8% for early slots
        else:
            slot_target = int(target_seats * 0.12)  # 12% for late slots
        
        slot_filled = 0
        attempts = 0
        while slot_filled < slot_target and attempts < 30:
            attempts += 1
            party_size = random.choice(PARTY_WEIGHTS)
            duration = get_duration(party_size)
            end_h, end_m = add_minutes(sh, sm, int(duration * 60))
            slot_end_min = slot_start_min + int(duration * 60)
            
            # If end time past 23:30, skip
            if end_h >= 23 and end_m > 30:
                continue
            
            time_end = f'{end_h:02d}:{end_m:02d}'
            
            # Find a suitable table (best fit)
            candidates = []
            for t in active_tables:
                if t['capacity'] < party_size:
                    continue
                # Check availability
                conflict = False
                for (s, e) in table_schedule[t['id']]:
                    if slot_start_min < e and slot_end_min > s:
                        conflict = True
                        break
                if conflict:
                    continue
                # Score: prefer tables with capacity close to party_size
                waste = t['capacity'] - party_size
                candidates.append((waste, t))
            
            if not candidates:
                continue
            
            # Sort by waste (lowest first)
            candidates.sort(key=lambda x: x[0])
            # Use best fit (lowest waste), but sometimes use a worse fit for variety
            if random.random() < 0.7:
                best_table = candidates[0][1]
            else:
                idx = min(random.randint(0, 2), len(candidates)-1)
                best_table = candidates[idx][1]
            
            customer = random.choice(r1_customers)
            status = random.choice(statuses)
            source = random.choice(SOURCES)
            
            res = {
                'restaurant_id': RESTAURANT_ID,
                'customer_id': customer['id'],
                'date': day.strftime('%Y-%m-%d'),
                'time_start': slot,
                'time_end': time_end,
                'party_size': party_size,
                'status': status,
                'source': source,
                'table_id': best_table['id'],
                'special_requests': '[SEED] Reserva de prueba',
            }
            reservations.append(res)
            table_schedule[best_table['id']].append((slot_start_min, slot_end_min))
            day_seated += party_size
            slot_filled += party_size
            day_reservations += 1
        
    print(f"    {day_reservations} reservas, ~{day_seated} asientos")

print(f"\nTotal reservas generadas: {len(reservations)}")

# ─── Insert in batches ──────────────────────────────────────────────
print("\nInsertando reservas en lotes...")
batch_size = 25
inserted = 0
errors = 0
for i in range(0, len(reservations), batch_size):
    batch = reservations[i:i+batch_size]
    try:
        created = api_post('reservations', batch)
        inserted += len(created)
        print(f"  Lote {i//batch_size + 1}: {len(created)} OK")
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:300] if hasattr(e, 'read') else str(e)
        print(f"  Lote {i//batch_size + 1}: Error {e.code} - {body[:100]}")
        # Try one by one
        for r in batch:
            try:
                api_post('reservations', [r])
                inserted += 1
            except:
                errors += 1

print(f"\n{'='*50}")
print(f"✅ {inserted}/{len(reservations)} reservas insertadas ({errors} errores)")
print(f"    Semana: {start_date.strftime('%d/%m')} - {(start_date + timedelta(days=6)).strftime('%d/%m')}")