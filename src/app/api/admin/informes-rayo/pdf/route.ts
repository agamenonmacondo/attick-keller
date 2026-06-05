import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'
import { generateProductHourlyPDF } from '@/lib/informes-rayo/pdf-generator'

export async function POST(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const body = await request.json()
    const { from, to, zone } = body

    if (!from || !to) {
      return NextResponse.json({ error: 'from and to are required' }, { status: 400 })
    }

    // Fetch product hourly data from Supabase
    const sb = getServiceClient()
    const { data: productHourly, error } = await sb.rpc('pos_dashboard_product_hourly', {
      p_from: from,
      p_to: to,
      p_zone: zone || 'all',
    })

    if (error) {
      console.error('[PDF] RPC error:', error)
      return NextResponse.json({ error: 'Error fetching product data' }, { status: 500 })
    }

    if (!productHourly || productHourly.length === 0) {
      return NextResponse.json({ error: 'No hay datos de productos para este período' }, { status: 404 })
    }

    // Generate PDF buffer via Playwright + HTML
    const pdfBuffer = await generateProductHourlyPDF({
      data: {}, // minimal — PDF only needs productHourly
      from,
      to,
      productHourly: productHourly as any[],
    })

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Informe-Productos-Hora-${from}-${to}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err: any) {
    console.error('[PDF] Generation error:', err)
    return NextResponse.json({ error: err.message || 'Error generating PDF' }, { status: 500 })
  }
}
