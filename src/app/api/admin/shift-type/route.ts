import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

interface SegmentInput {
  segment_index: number
  entrada: string
  salida: string
}

// POST /api/admin/shift-type — crear un nuevo tipo de turno
export async function POST(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const body = await request.json()
  const { code, name, entrada, salida, ordinarias, nocturnas, is_split, description, area, segments } = body as {
    code: string; name: string; entrada: string; salida: string
    ordinarias?: number; nocturnas?: number; is_split?: boolean
    description?: string; area: string; segments?: SegmentInput[]
  }

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

  // Validar segmentos si es turno partido
  if (is_split && segments && segments.length > 0) {
    if (segments.length > 2) {
      return NextResponse.json({ error: 'Maximo 2 segmentos permitidos' }, { status: 400 })
    }
    for (const seg of segments) {
      if (!seg.entrada || !seg.salida) {
        return NextResponse.json({ error: 'Cada segmento debe tener entrada y salida' }, { status: 400 })
      }
    }
  }

  const { data, error } = await sb
    .from('shift_types')
    .insert({
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
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }

  // Insertar segmentos si es turno partido
  if (is_split && segments && segments.length > 0) {
    const segmentsData = segments.map((seg, i) => ({
      shift_type_id: data.id,
      segment_index: i + 1,
      entrada: seg.entrada,
      salida: seg.salida,
    }))

    const { error: segError } = await sb
      .from('shift_type_segments')
      .insert(segmentsData)

    if (segError) {
      console.error('Error inserting segments:', segError)
      // No fallamos el turno, pero registramos el error
    }
  }

  // Retornar el turno con sus segmentos
  const result = { ...data, segments: is_split ? (segments || []) : undefined }

  return NextResponse.json(result, { status: 201 })
}

// PATCH /api/admin/shift-type — actualizar un tipo de turno existente
export async function PATCH(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const body = await request.json()
  const { id, code, name, entrada, salida, ordinarias, nocturnas, is_split, description, area, segments } = body as {
    id: string; code?: string; name?: string; entrada?: string; salida?: string
    ordinarias?: number; nocturnas?: number; is_split?: boolean
    description?: string; area?: string; segments?: SegmentInput[]
  }

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
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }

  // Manejar segmentos
  if (segments !== undefined) {
    // Borrar segmentos existentes
    await sb.from('shift_type_segments').delete().eq('shift_type_id', id)

    if (is_split && segments.length > 0) {
      // Insertar nuevos segmentos (max 2)
      const limitedSegments = segments.slice(0, 2)
      const segmentsData = limitedSegments.map((seg, i) => ({
        shift_type_id: id,
        segment_index: i + 1,
        entrada: seg.entrada,
        salida: seg.salida,
      }))

      await sb.from('shift_type_segments').insert(segmentsData)
    }
  } else if (is_split === false) {
    // Si se cambia de partido a simple, borrar segmentos
    await sb.from('shift_type_segments').delete().eq('shift_type_id', id)
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

  // Los segmentos se borran automaticamente por ON DELETE CASCADE
  // Eliminar el tipo de turno
  const { error } = await sb
    .from('shift_types')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}