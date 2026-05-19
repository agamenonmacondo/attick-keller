#!/usr/bin/env python3
"""
Upload cleaned customers to Supabase using REST API.
Handles customer creation + stats upsert in batches.

Usage:
  python import_to_supabase.py [--dry-run] [--batch-size 100]
"""

import json
import sys
import os
import time
import requests
from dotenv import load_dotenv

# ============================================================
# Config
# ============================================================

# Load env
env_paths = [
    '/mnt/f/attick-keller/web/.env.local',
    '/mnt/f/attick-keller/web/.env.supabase',
    '/mnt/f/attick-keller/web/.env',
]
for p in env_paths:
    if os.path.exists(p):
        load_dotenv(p)

SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '').rstrip('/')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
RESTAURANT_ID = 'a0000000-0000-0000-0000-000000000001'

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Missing Supabase credentials")
    print(f"   URL: {'✓' if SUPABASE_URL else '✗'}")
    print(f"   KEY: {'✓' if SUPABASE_SERVICE_KEY else '✗'}")
    sys.exit(1)

print(f"✓ Supabase URL: {SUPABASE_URL}")
print(f"✓ Service key: ...{SUPABASE_SERVICE_KEY[-8:]}")

HEADERS = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
}

INPUT_PATH = '/tmp/ak_customers_cleaned.json'
dry_run = '--dry-run' in sys.argv
batch_size = 100
if '--batch-size' in sys.argv:
    batch_size = int(sys.argv[sys.argv.index('--batch-size') + 1])


def sb_insert(table, records):
    """Insert records into Supabase table via REST API"""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    resp = requests.post(url, headers=HEADERS, json=records, timeout=30)
    if resp.status_code in (200, 201):
        return resp.json()
    else:
        raise Exception(f"Insert error {resp.status_code}: {resp.text[:500]}")


def sb_select(table, select='*', filters=None, limit=1000, offset=0):
    """Select records from Supabase table"""
    url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}&limit={limit}&offset={offset}"
    if filters:
        for key, val in filters.items():
            url += f"&{key}={val}"
    resp = requests.get(url, headers=HEADERS, timeout=30)
    if resp.status_code == 200:
        return resp.json()
    else:
        raise Exception(f"Select error {resp.status_code}: {resp.text[:500]}")


def main():
    print(f"{'[DRY RUN] ' if dry_run else ''}Loading cleaned customers...")
    
    with open(INPUT_PATH, 'r', encoding='utf-8') as f:
        customers = json.load(f)
    
    print(f"Loaded {len(customers):,} customers")
    
    # Phase 1: Check existing customers
    print("\n📋 Checking existing customers in Supabase...")
    existing_phones = set()
    existing_emails = set()
    
    if not dry_run:
        offset = 0
        while True:
            try:
                data = sb_select('customers', 'id,phone,email', 
                               filters={'restaurant_id': f'eq.{RESTAURANT_ID}'},
                               limit=1000, offset=offset)
                if not data:
                    break
                for row in data:
                    if row.get('phone'):
                        existing_phones.add(row['phone'])
                    if row.get('email'):
                        existing_emails.add(row['email'].lower())
                offset += 1000
                if len(data) < 1000:
                    break
            except Exception as e:
                print(f"  ⚠️ Error checking existing: {e}")
                break
        
        print(f"  Existing in DB: {len(existing_phones)} phones, {len(existing_emails)} emails")
    else:
        print("  [DRY RUN] Skipping existing check")
    
    # Phase 2: Filter out existing
    new_customers = []
    skipped = 0
    
    for cust in customers:
        if cust.get('phone') and cust['phone'] in existing_phones:
            skipped += 1
            continue
        if cust.get('email') and cust['email'] and cust['email'].lower() in existing_emails:
            skipped += 1
            continue
        new_customers.append(cust)
    
    print(f"\n  To import: {len(new_customers):,} (skipped {skipped:,} existing)")
    
    if len(new_customers) == 0:
        print("✅ No new customers to import.")
        return
    
    if dry_run:
        print(f"\n[DRY RUN] Would import {len(new_customers):,} customers in ~{len(new_customers)//batch_size + 1} batches")
        print(f"[DRY RUN] Estimated time: ~{(len(new_customers)//batch_size + 1) * 3} seconds")
        return
    
    # Phase 3: Insert in batches
    total_customers = 0
    total_stats = 0
    total_errors = 0
    
    num_batches = (len(new_customers) + batch_size - 1) // batch_size
    
    for batch_num in range(num_batches):
        start = batch_num * batch_size
        end = min(start + batch_size, len(new_customers))
        batch = new_customers[start:end]
        
        # Prepare customer records
        customer_records = []
        for c in batch:
            record = {
                'restaurant_id': RESTAURANT_ID,
                'full_name': (c['full_name'] or 'Sin Nombre')[:200],
            }
            if c.get('phone'):
                record['phone'] = c['phone']
            if c.get('email'):
                record['email'] = c['email']
            if c.get('birthday'):
                record['birthday'] = c['birthday']
            if c.get('points', 0) > 0:
                record['points'] = c['points']
            customer_records.append(record)
        
        # Insert customers
        try:
            inserted = sb_insert('customers', customer_records)
            total_customers += len(inserted)
            
            # Build phone/email → id map
            phone_to_id = {}
            email_to_id = {}
            for row in inserted:
                if row.get('phone'):
                    phone_to_id[row['phone']] = row['id']
                if row.get('email'):
                    email_to_id[row['email'].lower()] = row['id']
            
            # Prepare stats records
            stats_records = []
            for c in batch:
                cust_id = None
                if c.get('phone') and c['phone'] in phone_to_id:
                    cust_id = phone_to_id[c['phone']]
                elif c.get('email') and c['email'] and c['email'].lower() in email_to_id:
                    cust_id = email_to_id[c['email'].lower()]
                
                if not cust_id:
                    continue
                
                stat = {
                    'customer_id': cust_id,
                    'total_visits': c['total_visits'],
                    'total_spent': 0,
                    'loyalty_tier': c['loyalty_tier'],
                    'is_recurring': c['is_recurring'],
                }
                # Optional fields
                if c.get('last_visit_date'):
                    stat['last_visit_date'] = c['last_visit_date']
                if c.get('no_show_count', 0) > 0:
                    stat['no_show_count'] = c['no_show_count']
                if c.get('cancellations', 0) > 0:
                    stat['cancellations'] = c['cancellations']
                if c.get('total_party_size', 0) > 0:
                    stat['total_party_size'] = c['total_party_size']
                if c.get('avg_party_size', 0) > 0:
                    stat['avg_party_size'] = c['avg_party_size']
                if c.get('marketing_opt_in'):
                    stat['marketing_opt_in'] = True
                if c.get('blacklisted'):
                    stat['blacklisted'] = True
                if c.get('sex'):
                    stat['sex'] = c['sex']
                if c.get('tipo_cliente_original'):
                    stat['tipo_cliente_original'] = c['tipo_cliente_original']
                if c.get('allergies'):
                    stat['allergies'] = c['allergies'][:500]  # Truncate if needed
                
                stats_records.append(stat)
            
            # Insert stats
            if stats_records:
                stats_batch_size = 100
                for i in range(0, len(stats_records), stats_batch_size):
                    stats_batch = stats_records[i:i + stats_batch_size]
                    try:
                        sb_insert('customer_stats', stats_batch)
                        total_stats += len(stats_batch)
                    except Exception as e:
                        # Stats might fail if no new columns yet — that's OK
                        print(f"  ⚠️ Stats error (may need migration): {str(e)[:200]}")
                        total_errors += len(stats_batch)
            
            print(f"  ✅ Batch {batch_num + 1}/{num_batches}: {len(inserted)} customers, {len(stats_records)} stats")
            
        except Exception as e:
            print(f"  ❌ Batch {batch_num + 1} error: {str(e)[:300]}")
            total_errors += len(customer_records)
        
        # Rate limit
        if batch_num > 0 and batch_num % 10 == 0:
            time.sleep(0.5)
    
    print(f"\n{'═'*60}")
    print(f"Import complete!")
    print(f"  Customers: {total_customers:,}")
    print(f"  Stats: {total_stats:,}")
    print(f"  Errors: {total_errors}")
    print(f"  Skipped (existing): {skipped:,}")
    print(f"{'═'*60}")


if __name__ == '__main__':
    main()