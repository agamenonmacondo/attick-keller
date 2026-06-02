import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

const RESTAURANT_ID = 'a0000000-0000-0000-0000-000000000001'

// POST /api/admin/shift-type — crear un nuevo tipo de turno
export async function POST(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const body = await request.json()
  const { code, name, entrada, salida, ordinarias, nocturnas, is_split, description, area } = body

  if (!code || !name || !entrada || !salida) {
    return NextResponse.json(
      { error: 'code, name, entrada y salida son requeridos' },
      { status: 400 }
    )
  }

  if (!area) {
    return NextResponse.json(
      { error: 'area es requerido' },
      { status: 400 }
    )
  }

  const { data, error } = await sb
    .from('shift_types')
    .insert({
      restaurant_id: RESTAURANT_ID,
      code,
      name,
      entrada,
      salida,
      ordinarias: ordinarias ?? 0,
      nocturnas: nocturnas ?? 0,
      is_split: is_split ?? false,
      description: description || null,
      area,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// PATCH /api/admin/shift-type — actualizar un tipo de turno existente
export async function PATCH(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const body = await request.json()
  const { id, code, name, entrada, salida, ordinarias, nocturnas, is_split, description, area } = body

  if (!id) {
    return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {}
  if (code !== undefined) updateData.code = code
  if (name !== undefined) updateData.name = name
  if (entrada !== undefined) updateData.entrada = entrada
  if (salida !== undefined) updateData.salida = salida
  if (ordinarias !== undefined) updateData.ordinarias = ordinarias
  if (nocturnas !== undefined) updateData.nocturnas = nocturnas
  if (is_split !== undefined) updateData.is_split = is_split
  if (description !== undefined) updateData.description = description
  if (area !== undefined) updateData.area = area

  const { data, error } = await sb
    .from('shift_types')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE /api/admin/shift-type?id=... — eliminar un tipo de turno
export async function DELETE(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
  }

  // Verificar que no haya asignaciones usando este tipo de turno
  const { data: shiftType } = await sb
    .from('shift_types')
    .select('code, area')
    .eq('id', id)
    .single()

  if (!shiftType) {
    return NextResponse.json({ error: 'Tipo de turno no encontrado' }, { status: 404 })
  }

  // Eliminar el tipo de turno
  const { error } = await sb
    .from('shift_types')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}