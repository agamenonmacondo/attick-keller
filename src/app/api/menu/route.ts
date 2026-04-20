import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [categoriesResult, itemsResult] = await Promise.all([
    sb
      .from('menu_categories')
      .select('id, name, sort_order')
      .eq('restaurant_id', 'a0000000-0000-0000-0000-000000000001')
      .order('sort_order'),
    sb
      .from('menu_items')
      .select('id, name, description, price, category_id')
      .eq('restaurant_id', 'a0000000-0000-0000-0000-000000000001')
      .order('name'),
  ])

  if (categoriesResult.error) {
    return NextResponse.json({ error: categoriesResult.error.message }, { status: 500 })
  }
  if (itemsResult.error) {
    return NextResponse.json({ error: itemsResult.error.message }, { status: 500 })
  }

  return NextResponse.json({
    categories: categoriesResult.data,
    items: itemsResult.data,
  })
}