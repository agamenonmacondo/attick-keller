import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const groupId = searchParams.get('group_id') || '';
  const linkedOnly = searchParams.get('linked') === 'true';
  const unlinkedOnly = searchParams.get('unlinked') === 'true';
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  let qb = supabase
    .from('pos_products')
    .select('pos_product_id, name, pos_group_id, use_dining, use_delivery, visible_menu', { count: 'exact' })
    .order('pos_group_id')
    .order('name')
    .range(offset, offset + limit - 1);

  if (query) {
    qb = qb.ilike('name', `%${query}%`);
  }
  if (groupId) {
    qb = qb.eq('pos_group_id', groupId);
  }

  const { data: products, error, count } = await qb;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get mapping info (which products are already linked to menu items)
  const productIds = (products || []).map(p => p.pos_product_id);
  const { data: mappings } = await supabase
    .from('pos_menu_mapping')
    .select('pos_product_id, menu_item_id, confidence, verified')
    .in('pos_product_id', productIds);

  const mappingMap = new Map((mappings || []).map(m => [m.pos_product_id, m]));

  // Enrich with group names
  const groupIds = [...new Set((products || []).map(p => p.pos_group_id))];
  const { data: groups } = await supabase
    .from('pos_product_groups')
    .select('pos_group_id, name')
    .in('pos_group_id', groupIds);
  const groupMap = new Map((groups || []).map(g => [g.pos_group_id, g.name]));

  const enriched = (products || []).map(p => {
    const mapping = mappingMap.get(p.pos_product_id);
    return {
      ...p,
      groupName: groupMap.get(p.pos_group_id) || p.pos_group_id,
      linkedToMenuItem: mapping?.menu_item_id || null,
      confidence: mapping?.confidence || null,
      verified: mapping?.verified || false
    };
  });

  // Filter by linked/unlinked status
  let filtered = enriched;
  if (linkedOnly) {
    filtered = enriched.filter(p => p.linkedToMenuItem);
  } else if (unlinkedOnly) {
    filtered = enriched.filter(p => !p.linkedToMenuItem);
  }

  return NextResponse.json({
    products: filtered,
    total: count || 0,
    limit,
    offset
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { pos_product_id, category_id, name, description, price, restaurant_id } = body;

  if (!pos_product_id || !category_id || !restaurant_id) {
    return NextResponse.json({ error: 'pos_product_id, category_id, and restaurant_id are required' }, { status: 400 });
  }

  // Get POS product info
  const { data: posProduct } = await supabase
    .from('pos_products')
    .select('pos_product_id, name, pos_group_id')
    .eq('pos_product_id', pos_product_id)
    .single();

  // Get price from POS
  const { data: posPrice } = await supabase
    .from('pos_product_prices')
    .select('price, price_before_tax')
    .eq('pos_product_id', pos_product_id)
    .limit(1)
    .single();

  // Create menu item
  const menuItemName = name || posProduct?.name || '';
  const menuItemPrice = price || posPrice?.price || 0;

  // Get max sort_order in category
  const { data: maxSort } = await supabase
    .from('menu_items')
    .select('sort_order')
    .eq('category_id', category_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const { data: menuItem, error } = await supabase
    .from('menu_items')
    .insert({
      restaurant_id,
      category_id,
      name: menuItemName,
      description: description || '',
      price: menuItemPrice,
      pos_product_id,
      pos_group_id: posProduct?.pos_group_id || null,
      is_available: true,
      is_featured: false,
      sort_order: (maxSort?.sort_order || 0) + 1
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create mapping
  await supabase
    .from('pos_menu_mapping')
    .upsert({
      menu_item_id: menuItem.id,
      pos_product_id,
      confidence: 'manual',
      verified: true
    }, { onConflict: 'menu_item_id,pos_product_id' });

  return NextResponse.json({ menuItem }, { status: 201 });
}