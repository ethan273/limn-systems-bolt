import { NextRequest, NextResponse } from 'next/server'
import { aiPredictionService, PredictionInput } from '@/lib/services/ai-predictions'
import { withTenantIsolation, hasPermission } from '@/lib/middleware/tenant-isolation'

export async function POST(request: NextRequest) {
  return withTenantIsolation(request, async (req, context) => {
    // Check permissions
    if (!hasPermission(context, 'ai.predictions.create')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    try {
      const body = await req.json()
      
      const predictionInput: PredictionInput = {
        ...body,
        tenant_id: context.tenantId
      }

      const prediction = await aiPredictionService.createPrediction(predictionInput)

      return NextResponse.json({
        success: true,
        data: prediction
      })

    } catch (error) {
      console.error('AI prediction error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to create prediction',
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      )
    }
  })
}

export async function GET(request: NextRequest) {
  return withTenantIsolation(request, async (req, context) => {
    // Check permissions
    if (!hasPermission(context, 'ai.predictions.read')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    try {
      const url = new URL(req.url)
      const filters = {
        entity_type: url.searchParams.get('entity_type') || undefined,
        entity_id: url.searchParams.get('entity_id') || undefined,
        prediction_type: url.searchParams.get('prediction_type') || undefined,
        status: url.searchParams.get('status') || undefined,
      }

      const predictions = await aiPredictionService.getPredictions(context.tenantId, filters)

      return NextResponse.json({
        success: true,
        data: predictions,
        count: predictions.length
      })

    } catch (error) {
      console.error('Error fetching predictions:', error)
      return NextResponse.json(
        { 
          error: 'Failed to fetch predictions',
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      )
    }
  })
}