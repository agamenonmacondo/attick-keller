import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/utils/admin-auth'
import { runAnalysisPipelineV2 } from '@/lib/informes-rayo/analysis-pipeline-v2'

export async function POST(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { reportData } = body

    if (!reportData || !reportData.kpis) {
      return NextResponse.json({ error: 'No report data provided' }, { status: 400 })
    }

    const result = await runAnalysisPipelineV2(reportData)

    return NextResponse.json({
      analysis: result.analysis,
      source: result.source,
      error: result.error,
      durationMs: result.durationMs,
    })
  } catch (error: any) {
    console.error('[InformesRayo] Analysis v2 error:', error)
    return NextResponse.json({ error: 'Error analyzing report' }, { status: 500 })
  }
}
