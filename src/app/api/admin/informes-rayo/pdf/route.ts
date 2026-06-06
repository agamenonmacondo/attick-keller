import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/utils/admin-auth'
import { generatePDFHtml } from '@/lib/informes-rayo/pdf-generator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { data, from, to, analysis, productHourly } = body

    if (!data || !from || !to) {
      return NextResponse.json({ error: 'Missing required fields: data, from, to' }, { status: 400 })
    }

    // Generate HTML
    const html = generatePDFHtml({ data, from, to, analysis, productHourly })

    // Launch Chromium via @sparticuz/chromium-min
    const sparticuz = await import('@sparticuz/chromium')
    const chromiumModule = sparticuz.default
    const executablePath = await chromiumModule.executablePath()

    const { chromium } = await import('playwright-core')
    const browser = await chromium.launch({
      args: chromiumModule.args,
      executablePath,
      headless: true,
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle' })
    const pdfBuffer: Buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    })
    await browser.close()

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Informe-Rayo-${from}-${to}.pdf"`,
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[PDF] Generation failed:', msg)
    return NextResponse.json(
      { error: 'Error generando PDF: ' + msg },
      { status: 500 }
    )
  }
}
