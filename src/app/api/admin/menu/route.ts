import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()

  const [categoriesRes, itemsRes] = await Promise.all([
    sb
      .from('menu_categories')
      .select('id, name, description, icon, sort_order, is_active')
      .eq('restaurant_id', RESTAURANT_ID)
      .order('sort_order'),
    sb
      .from('menu_items')
      .select('id, name, description, price, category_id, image_url, is_featured, is_available, sort_order')
      .eq('restaurant_id', RESTAURANT_ID)
      .order('sort_order'),
  ])

  if (categoriesRes.error) return NextResponse.json({ error: categoriesRes.error.message }, { status: 500 })
  if (itemsRes.error) return NextResponse.json({ error: itemsRes.error.message }, { status: 500 })

  return NextResponse.json({
    categories: categoriesRes.data || [],
    items: itemsRes.data || [],
  })
}