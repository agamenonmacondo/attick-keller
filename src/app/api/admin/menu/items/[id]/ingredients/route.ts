import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

// GET /api/admin/menu/items/[id]/ingredients — list ingredients for a menu item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id } = await params
  const sb = getServiceClient()

  // Verify menu item exists
  const { data: menuItem } = await sb
    .from('menu_items')
    .select('id')
    .eq('id', id)
    .eq('restaurant_id', RESTAURANT_ID)
    .single()

  if (!menuItem) return NextResponse.json({ error: 'Plato no encontrado' }, { status: 404 })

  const { data, error } = await sb
    .from('menu_item_ingredients')
    .select(`
      id,
      pos_ingredient_id,
      quantity,
      created_at,
      pos_ingredients (
        pos_ingredient_id,
        name,
        unit,
        is_composite,
        pos_category_id
      ),
      pos_ingredient_costs (
        pos_ingredient_id,
        avg_cost,
        cost,
        cost_with_tax
      )
    `)
    .eq('menu_item_id', id)
    .eq('restaurant_id', RESTAURANT_ID)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })

  // Flatten joined data
  const ingredients = (data || []).map((row: Record<string, unknown>) => {
    const ing = Array.isArray(row.pos_ingredients)
      ? row.pos_ingredients[0]
      : row.pos_ingredients as Record<string, unknown> | null
    const cost = Array.isArray(row.pos_ingredient_costs)
      ? row.pos_ingredient_costs[0]
      : row.pos_ingredient_costs as Record<string, unknown> | null

    return {
      id: row.id,
      pos_ingredient_id: row.pos_ingredient_id,
      quantity: row.quantity,
      created_at: row.created_at,
      name: ing?.name ?? null,
      unit: ing?.unit ?? null,
      is_composite: ing?.is_composite ?? null,
      avg_cost: cost?.avg_cost ?? null,
      cost: cost?.cost ?? null,
      cost_with_tax: cost?.cost_with_tax ?? null,
    }
  })

  return NextResponse.json({ ingredients })
}

// POST /api/admin/menu/items/[id]/ingredients — add ingredient to menu item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id } = await params
  const sb = getServiceClient()
  const body = await request.json()
  const { pos_ingredient_id, quantity } = body

  if (!pos_ingredient_id) {
    return NextResponse.json({ error: 'pos_ingredient_id requerido' }, { status: 400 })
  }
  if (quantity === undefined || quantity === null || Number(quantity) < 0) {
    return NextResponse.json({ error: 'quantity requerido y debe ser ≥ 0' }, { status: 400 })
  }

  // Verify menu item exists
  const { data: menuItem } = await sb
    .from('menu_items')
    .select('id')
    .eq('id', id)
    .eq('restaurant_id', RESTAURANT_ID)
    .single()

  if (!menuItem) return NextResponse.json({ error: 'Plato no encontrado' }, { status: 404 })

  // Check for duplicate
  const { data: existing } = await sb
    .from('menu_item_ingredients')
    .select('id')
    .eq('menu_item_id', id)
    .eq('pos_ingredient_id', pos_ingredient_id)
    .eq('restaurant_id', RESTAURANT_ID)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'Este ingrediente ya está asociado a este plato' },
      { status: 409 }
    )
  }

  const { data, error } = await sb
    .from('menu_item_ingredients')
    .insert({
      restaurant_id: RESTAURANT_ID,
      menu_item_id: id,
      pos_ingredient_id,
      quantity: Number(quantity),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })

  return NextResponse.json({ ingredient: data }, { status: 201 })
}

// PATCH /api/admin/menu/items/[id]/ingredients — update ingredient quantity
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id } = await params
  const sb = getServiceClient()
  const body = await request.json()
  const { pos_ingredient_id, quantity } = body

  if (!pos_ingredient_id) {
    return NextResponse.json({ error: 'pos_ingredient_id requerido' }, { status: 400 })
  }
  if (quantity === undefined || quantity === null || Number(quantity) < 0) {
    return NextResponse.json({ error: 'quantity requerido y debe ser ≥ 0' }, { status: 400 })
  }

  const { data, error } = await sb
    .from('menu_item_ingredients')
    .update({ quantity: Number(quantity) })
    .eq('menu_item_id', id)
    .eq('pos_ingredient_id', pos_ingredient_id)
    .eq('restaurant_id', RESTAURANT_ID)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Ingrediente no encontrado en este plato' }, { status: 404 })

  return NextResponse.json({ ingredient: data })
}

// DELETE /api/admin/menu/items/[id]/ingredients — remove ingredient from menu item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id } = await params
  const sb = getServiceClient()

  // Support both body and query param for pos_ingredient_id
  let pos_ingredient_id: string | undefined

  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try {
      const body = await request.json()
      pos_ingredient_id = body.pos_ingredient_id
    } catch {
      // no body
    }
  }

  if (!pos_ingredient_id) {
    const { searchParams } = new URL(request.url)
    pos_ingredient_id = searchParams.get('pos_ingredient_id') || undefined
  }

  if (!pos_ingredient_id) {
    return NextResponse.json({ error: 'pos_ingredient_id requerido' }, { status: 400 })
  }

  const { error } = await sb
    .from('menu_item_ingredients')
    .delete()
    .eq('menu_item_id', id)
    .eq('pos_ingredient_id', pos_ingredient_id)
    .eq('restaurant_id', RESTAURANT_ID)

  if (error) return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })

  return NextResponse.json({ success: true })
}