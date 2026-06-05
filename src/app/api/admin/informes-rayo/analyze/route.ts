import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/utils/admin-auth'
import { runAnalysisPipeline } from '@/lib/informes-rayo/analysis-pipeline'

export async function POST(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { reportData } = body

    if (!reportData || !reportData.kpis) {
      return NextResponse.json({ error: 'No report data provided' }, { status: 400 })
    }

    const result = await runAnalysisPipeline(reportData)

    return NextResponse.json({
      analysis: result.analysis,
      source: result.source,
      error: result.error,
      durationMs: result.durationMs,
    })
  } catch (error: any) {
    console.error('[InformesRayo] Analysis error:', error)
    return NextResponse.json({ error: 'Error analyzing report' }, { status: 500 })
  }
}