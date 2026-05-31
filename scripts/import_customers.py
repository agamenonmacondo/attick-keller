#!/usr/bin/env python3
"""
CSV Import Script: Attick & Keller POS → Supabase
Cleans 29,103 records → ~21,054 unique customers
Deduplicates by phone, auto-classifies loyalty tier, enriches stats.

Usage:
  python import_customers.py [--dry-run] [--limit N]

Requires: pip install supabase python-dotenv
"""

import csv
import re
import sys
import os
import json
from datetime import datetime
from collections import defaultdict

# ============================================================
# Config
# ============================================================
CSV_PATH = '/home/mod/.hermes/cache/documents/doc_d8acbf1e75c3_attic-keller-clientes---3ef4ef91-a307-48f2-bd52-6bae4f78bb2c.csv'
RESTAURANT_ID = 'e4a8f7a2-1b3d-4c5e-9f8a-2d3b4c5e6f7a'  # Will be read from env or hardcoded

# ============================================================
# Cleaning functions
# ============================================================

def parse_date(date_str):
    """Parse POS date like '14 Apr 2026' → '2026-04-14' or None"""
    if not date_str or not date_str.strip():
        return None
    date_str = date_str.strip()
    formats = ['%d %b %Y', '%d %B %Y', '%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y']
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue
    return None

def is_valid_phone(phone):
    """Check if phone is a real Colombian phone number"""
    if not phone:
        return False
    digits = re.sub(r'[^0-9]', '', phone)
    # Too short or too long
    if len(digits) < 10 or len(digits) > 15:
        return False
    # Repeated/sequential digits (junk like 1111111)
    if len(set(digits)) <= 3:
        return False
    # Specific patterns: all same digit after country code
    if re.match(r'^57(\d)\1{6,}', digits):
        return False
    return True

def clean_phone(phone):
    """Normalize Colombian phone number"""
    if not phone:
        return None
    phone = phone.strip()
    if not phone:
        return None
    return phone

def auto_classify_tier(total_reservas, tipo_original):
    """Auto-classify customer tier based on reservation count"""
    if tipo_original and tipo_original.lower() == 'recurrente':
        if total_reservas >= 11:
            return 'vip'
        elif total_reservas >= 6:
            return 'habitual'
        elif total_reservas >= 4:
            return 'frecuente'
        return 'ocasional'
    
    if total_reservas == 0:
        return 'prospecto'
    elif total_reservas == 1:
        return 'nuevo'
    elif total_reservas <= 3:
        return 'ocasional'
    elif total_reservas <= 5:
        return 'frecuente'
    elif total_reservas <= 10:
        return 'habitual'
    else:
        return 'vip'

def is_recurring(total_reservas):
    """Determine if customer is recurring (2+ visits)"""
    return total_reservas >= 2

def parse_bool(val):
    """Parse Spanish boolean strings"""
    if not val:
        return False
    return val.strip().lower() in ['sí', 'si', 'yes', '1', 'true']

def safe_int(val):
    """Safely parse integer from CSV"""
    if not val:
        return 0
    try:
        return int(float(str(val).replace(',', '')))
    except (ValueError, TypeError):
        return 0

def safe_float(val):
    """Safely parse float from CSV"""
    if not val:
        return 0.0
    try:
        return float(str(val).replace(',', '').replace('$', ''))
    except (ValueError, TypeError):
        return 0.0

# ============================================================
# Main: Read, clean, deduplicate, transform
# ============================================================

def main():
    dry_run = '--dry-run' in sys.argv
    limit = None
    if '--limit' in sys.argv:
        idx = sys.argv.index('--limit')
        limit = int(sys.argv[idx + 1])

    print(f"{'[DRY RUN] ' if dry_run else ''}Reading CSV...")
    
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    
    if limit:
        rows = rows[:limit]
    
    print(f"Read {len(rows):,} rows from CSV")
    
    # Phase 1: Clean each row
    cleaned = []
    stats = {
        'total_input': len(rows),
        'no_contact': 0,
        'invalid_phone': 0,
        'valid': 0,
    }
    
    for row in rows:
        nombre = (row.get('Nombres') or '').strip()
        apellido = (row.get('Apellidos') or '').strip()
        celular = (row.get('Celular') or '').strip()
        telefono = (row.get('Teléfono') or '').strip()
        email = (row.get('Email') or '').strip()
        
        # Skip records with NO contact info at all
        has_phone = is_valid_phone(celular) or is_valid_phone(telefono)
        has_email = email and '@' in email
        
        if not has_phone and not has_email:
            stats['no_contact'] += 1
            continue
        
        if not has_phone and not has_email:
            stats['invalid_phone'] += 1
            continue
        
        # Use celular as primary phone, fall back to telefono
        phone = clean_phone(celular) if is_valid_phone(celular) else clean_phone(telefono)
        
        # Full name
        full_name = f"{nombre} {apellido}".strip() or nombre or 'Sin Nombre'
        # Clean up double spaces
        full_name = re.sub(r'\s+', ' ', full_name).strip()
        
        # Stats
        total_reservas = safe_int(row.get('Total Reservas'))
        reservas_atendidas = safe_int(row.get('Reservas Atendidas'))
        no_show = safe_int(row.get('No-Show'))
        canceladas = safe_int(row.get('Reservas Canceladas'))
        personas_total = safe_int(row.get('Personas Totales'))
        personas_prom = safe_float(row.get('Personas promedio por reserva'))
        tipo_original = (row.get('Tipo de cliente') or '').strip()
        
        # Date
        last_visit = parse_date(row.get('Última Reserva') or '')
        
        # Compute tier
        loyalty_tier = auto_classify_tier(total_reservas, tipo_original)
        
        cleaned.append({
            'full_name': full_name[:200],  # DB field limit
            'phone': phone,
            'email': email.lower() if email else None,
            'birthday': parse_date(row.get('Cumpleaños') or ''),
            'points': safe_int(row.get('Puntos en mesa 24/7')),
            # Stats
            'total_visits': max(total_reservas, reservas_atendidas),
            'no_show_count': no_show,
            'cancellations': canceladas,
            'total_party_size': personas_total,
            'avg_party_size': personas_prom,
            'last_visit_date': last_visit,
            'loyalty_tier': loyalty_tier,
            'is_recurring': is_recurring(total_reservas),
            'tipo_cliente_original': tipo_original or None,
            'marketing_opt_in': parse_bool(row.get('Opt-In Marketing')),
            'blacklisted': parse_bool(row.get('ListaNegra')),
            'sex': (row.get('Sexo') or '').strip() or None,
            'allergies': (row.get('Alergias') or '').strip() or None,
            # Metadata for dedup
            '_total_reservas': total_reservas,  # For dedup priority
        })
        
        stats['valid'] += 1
    
    print(f"\nPhase 1 — Cleaning:")
    print(f"  Input:  {stats['total_input']:,}")
    print(f"  No contact (skipped): {stats['no_contact']:,}")
    print(f"  Valid:  {stats['valid']:,}")
    
    # Phase 2: Deduplicate by phone (keep record with most reservations)
    by_phone = defaultdict(list)
    by_email = defaultdict(list)
    no_phone = []
    
    for record in cleaned:
        if record['phone']:
            by_phone[record['phone']].append(record)
        elif record['email']:
            by_email[record['email']].append(record)
            no_phone.append(record)
    
    # Merge duplicates: keep the one with most reservations, merge data
    merged = []
    merge_stats = {'by_phone': 0, 'by_email': 0, 'duplicates_merged': 0}
    
    for phone, records in by_phone.items():
        if len(records) == 1:
            merged.append(records[0])
        else:
            # Sort by total_reservas descending, take best record
            records.sort(key=lambda x: x['_total_reservas'], reverse=True)
            best = records[0].copy()
            # Merge: fill missing fields from other records
            for other in records[1:]:
                if not best['email'] and other['email']:
                    best['email'] = other['email']
                if not best['birthday'] and other['birthday']:
                    best['birthday'] = other['birthday']
                if not best['allergies'] and other['allergies']:
                    best['allergies'] = other['allergies']
                # Sum stats from duplicates
                best['total_visits'] += other['total_visits']
                best['no_show_count'] += other['no_show_count']
                best['cancellations'] += other['cancellations']
                best['total_party_size'] += other['total_party_size']
                best['marketing_opt_in'] = best['marketing_opt_in'] or other['marketing_opt_in']
                best['blacklisted'] = best['blacklisted'] or other['blacklisted']
            # Recompute tier from merged stats
            best['loyalty_tier'] = auto_classify_tier(best['total_visits'], best['tipo_cliente_original'])
            best['is_recurring'] = is_recurring(best['total_visits'])
            if best['total_visits'] > 0:
                best['avg_party_size'] = round(best['total_party_size'] / best['total_visits'], 1)
            merged.append(best)
            merge_stats['duplicates_merged'] += len(records) - 1
    
    merge_stats['by_phone'] = len(by_phone)
    
    # Email-only records (no phone)
    for email, records in by_email.items():
        if len(records) == 1:
            merged.append(records[0])
        else:
            records.sort(key=lambda x: x['_total_reservas'], reverse=True)
            merged.append(records[0])
    
    merge_stats['by_email'] = len(by_email)
    
    # Remove internal metadata
    for record in merged:
        record.pop('_total_reservas', None)
    
    print(f"\nPhase 2 — Deduplication:")
    print(f"  Unique phones: {merge_stats['by_phone']:,}")
    print(f"  Email-only: {merge_stats['by_email']:,}")
    print(f"  Duplicates merged: {merge_stats['duplicates_merged']:,}")
    print(f"  Final unique customers: {len(merged):,}")
    
    # Tier distribution
    tier_dist = defaultdict(int)
    for r in merged:
        tier_dist[r['loyalty_tier']] += 1
    print(f"\nTier distribution:")
    for tier in ['prospecto', 'nuevo', 'ocasional', 'frecuente', 'habitual', 'vip']:
        print(f"  {tier:12s}: {tier_dist[tier]:,}")
    print(f"  {'unknown':12s}: {tier_dist.get('', 0):,}")
    
    # Write output JSON for Supabase import
    output_path = '/tmp/ak_customers_cleaned.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Written {len(merged):,} cleaned customers to {output_path}")
    
    # Also write a summary report
    report = {
        'input_rows': stats['total_input'],
        'no_contact_skipped': stats['no_contact'],
        'valid_after_cleaning': stats['valid'],
        'duplicates_merged': merge_stats['duplicates_merged'],
        'final_unique_customers': len(merged),
        'tier_distribution': dict(tier_dist),
        'marketing_opt_in': sum(1 for r in merged if r['marketing_opt_in']),
        'blacklisted': sum(1 for r in merged if r['blacklisted']),
        'with_email': sum(1 for r in merged if r['email']),
        'with_phone': sum(1 for r in merged if r['phone']),
        'total_no_shows': sum(r['no_show_count'] for r in merged),
        'total_visits': sum(r['total_visits'] for r in merged),
        'total_party_size': sum(r['total_party_size'] for r in merged),
    }
    
    report_path = '/tmp/ak_import_report.json'
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    print(f"📊 Report written to {report_path}")
    
    if dry_run:
        print(f"\n[DRY RUN] No data was sent to Supabase.")
        print(f"[DRY RUN] Run without --dry-run to actually import.")
    else:
        print(f"\n⚠️  To import to Supabase, run the upload phase:")
        print(f"   python import_to_supabase.py")
    
    return merged

if __name__ == '__main__':
    main()