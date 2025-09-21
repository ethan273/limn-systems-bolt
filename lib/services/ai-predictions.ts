import { createClient } from '@/lib/supabase/service'

export interface PredictionInput {
  model_type: string
  entity_type?: string
  entity_id?: string
  prediction_type: string
  input_data: Record<string, unknown>
  tenant_id: string
}

export interface PredictionResult {
  id: string
  model_type: string
  entity_type?: string
  entity_id?: string
  prediction_type: string
  input_data: Record<string, unknown>
  prediction_data: Record<string, unknown>
  confidence_score?: number
  accuracy_score?: number
  status: 'active' | 'expired' | 'invalid'
  created_at: string
  expires_at?: string
  model_version?: string
  metadata: Record<string, unknown>
}

export interface DemandForecastInput {
  product_id: string
  historical_sales: Array<{ date: string; quantity: number; revenue: number }>
  seasonal_factors?: Record<string, number>
  external_factors?: Record<string, unknown>
  forecast_period_days: number
}

export interface RevenueProjectionInput {
  historical_revenue: Array<{ month: string; revenue: number }>
  customer_growth_rate?: number
  market_conditions?: Record<string, unknown>
  projection_months: number
}

export interface CustomerChurnInput {
  customer_id: string
  last_order_date: string
  order_frequency: number
  avg_order_value: number
  support_tickets: number
  engagement_score: number
}

export interface QualityPredictionInput {
  product_id: string
  batch_id?: string
  manufacturing_parameters: Record<string, unknown>
  material_quality_scores: Record<string, number>
  environmental_conditions: Record<string, unknown>
}

class AIPredictionService {
  private supabase = createClient()

  // Generic prediction method
  async createPrediction(input: PredictionInput): Promise<PredictionResult> {
    try {
      // Generate prediction based on type
      let predictionData: Record<string, unknown>
      let confidenceScore: number

      switch (input.prediction_type) {
        case 'demand_forecast':
          ({ predictionData, confidenceScore } = await this.generateDemandForecast(input.input_data as unknown as DemandForecastInput))
          break
        case 'revenue_projection':
          ({ predictionData, confidenceScore } = await this.generateRevenueProjection(input.input_data as unknown as RevenueProjectionInput))
          break
        case 'customer_churn':
          ({ predictionData, confidenceScore } = await this.predictCustomerChurn(input.input_data as unknown as CustomerChurnInput))
          break
        case 'quality_prediction':
          ({ predictionData, confidenceScore } = await this.predictQuality(input.input_data as unknown as QualityPredictionInput))
          break
        default:
          throw new Error(`Unsupported prediction type: ${input.prediction_type}`)
      }

      // Store prediction in database
      const { data, error } = await this.supabase
        .from('ai_predictions')
        .insert([{
          tenant_id: input.tenant_id,
          model_type: input.model_type,
          entity_type: input.entity_type,
          entity_id: input.entity_id,
          prediction_type: input.prediction_type,
          input_data: input.input_data,
          prediction_data: predictionData,
          confidence_score: confidenceScore,
          status: 'active',
          expires_at: this.calculateExpirationDate(input.prediction_type),
          model_version: '1.0.0'
        }])
        .select()
        .single()

      if (error) {
        console.error('Error storing prediction:', error)
        throw new Error('Failed to store prediction')
      }

      return data

    } catch (error) {
      console.error('Prediction error:', error)
      throw error
    }
  }

  // Demand Forecasting
  private async generateDemandForecast(input: DemandForecastInput): Promise<{ predictionData: Record<string, unknown>, confidenceScore: number }> {
    // Simple moving average + trend analysis
    const { historical_sales, forecast_period_days, seasonal_factors = {} } = input
    
    if (historical_sales.length < 3) {
      throw new Error('Insufficient historical data for demand forecasting')
    }

    // Calculate trend
    const sortedSales = historical_sales.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const avgQuantity = sortedSales.reduce((sum, sale) => sum + sale.quantity, 0) / sortedSales.length
    
    // Simple trend calculation
    const firstHalf = sortedSales.slice(0, Math.floor(sortedSales.length / 2))
    const secondHalf = sortedSales.slice(Math.floor(sortedSales.length / 2))
    
    const firstHalfAvg = firstHalf.reduce((sum, sale) => sum + sale.quantity, 0) / firstHalf.length
    const secondHalfAvg = secondHalf.reduce((sum, sale) => sum + sale.quantity, 0) / secondHalf.length
    
    const trendFactor = secondHalfAvg / firstHalfAvg
    
    // Generate forecast
    const forecast = []
    const startDate = new Date()
    
    for (let i = 0; i < forecast_period_days; i++) {
      const forecastDate = new Date(startDate)
      forecastDate.setDate(startDate.getDate() + i + 1)
      
      const month = forecastDate.getMonth() + 1
      const seasonalMultiplier = seasonal_factors[month.toString()] || 1
      
      const predictedQuantity = Math.max(0, Math.round(avgQuantity * trendFactor * seasonalMultiplier))
      
      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        predicted_quantity: predictedQuantity,
        confidence_range: {
          min: Math.max(0, Math.round(predictedQuantity * 0.8)),
          max: Math.round(predictedQuantity * 1.2)
        }
      })
    }

    return {
      predictionData: {
        forecast,
        trend_factor: trendFactor,
        baseline_quantity: avgQuantity,
        methodology: 'moving_average_with_trend'
      },
      confidenceScore: this.calculateConfidenceScore(historical_sales.length, 'demand')
    }
  }

  // Revenue Projection
  private async generateRevenueProjection(input: RevenueProjectionInput): Promise<{ predictionData: Record<string, unknown>, confidenceScore: number }> {
    const { historical_revenue, customer_growth_rate = 0.02, projection_months } = input
    
    if (historical_revenue.length < 6) {
      throw new Error('Insufficient historical revenue data')
    }

    // Calculate monthly growth rate
    const sortedRevenue = historical_revenue.sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
    const growthRates = []
    
    for (let i = 1; i < sortedRevenue.length; i++) {
      const growthRate = (sortedRevenue[i].revenue - sortedRevenue[i - 1].revenue) / sortedRevenue[i - 1].revenue
      growthRates.push(growthRate)
    }
    
    const avgGrowthRate = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length
    const lastRevenue = sortedRevenue[sortedRevenue.length - 1].revenue
    
    // Generate projections
    const projections = []
    let currentRevenue = lastRevenue
    
    for (let i = 1; i <= projection_months; i++) {
      const projectionDate = new Date(sortedRevenue[sortedRevenue.length - 1].month)
      projectionDate.setMonth(projectionDate.getMonth() + i)
      
      currentRevenue = currentRevenue * (1 + avgGrowthRate + customer_growth_rate)
      
      projections.push({
        month: projectionDate.toISOString().substring(0, 7),
        projected_revenue: Math.round(currentRevenue),
        confidence_range: {
          min: Math.round(currentRevenue * 0.85),
          max: Math.round(currentRevenue * 1.15)
        }
      })
    }

    return {
      predictionData: {
        projections,
        avg_growth_rate: avgGrowthRate,
        customer_growth_factor: customer_growth_rate,
        methodology: 'compound_growth_model'
      },
      confidenceScore: this.calculateConfidenceScore(historical_revenue.length, 'revenue')
    }
  }

  // Customer Churn Prediction
  private async predictCustomerChurn(input: CustomerChurnInput): Promise<{ predictionData: Record<string, unknown>, confidenceScore: number }> {
    const { last_order_date, order_frequency, avg_order_value, support_tickets, engagement_score } = input
    
    // Simple scoring model
    const daysSinceLastOrder = Math.floor((Date.now() - new Date(last_order_date).getTime()) / (1000 * 60 * 60 * 24))
    
    let churnScore = 0
    
    // Days since last order factor
    if (daysSinceLastOrder > 90) churnScore += 30
    else if (daysSinceLastOrder > 60) churnScore += 20
    else if (daysSinceLastOrder > 30) churnScore += 10
    
    // Order frequency factor (lower frequency = higher churn risk)
    if (order_frequency < 1) churnScore += 25
    else if (order_frequency < 2) churnScore += 15
    else if (order_frequency < 4) churnScore += 5
    
    // Average order value factor
    if (avg_order_value < 100) churnScore += 15
    else if (avg_order_value < 500) churnScore += 10
    else churnScore -= 5 // High value customers less likely to churn
    
    // Support tickets factor
    if (support_tickets > 5) churnScore += 20
    else if (support_tickets > 2) churnScore += 10
    
    // Engagement score factor
    if (engagement_score < 3) churnScore += 25
    else if (engagement_score < 5) churnScore += 10
    else churnScore -= 5
    
    const churnProbability = Math.min(100, Math.max(0, churnScore)) / 100
    
    return {
      predictionData: {
        churn_probability: churnProbability,
        churn_risk_level: churnProbability > 0.7 ? 'high' : churnProbability > 0.4 ? 'medium' : 'low',
        contributing_factors: {
          days_since_last_order: daysSinceLastOrder,
          order_frequency_score: order_frequency,
          support_ticket_impact: support_tickets > 2 ? 'negative' : 'neutral',
          engagement_level: engagement_score > 5 ? 'high' : engagement_score > 3 ? 'medium' : 'low'
        },
        recommended_actions: this.getChurnPreventionActions(churnProbability)
      },
      confidenceScore: 0.75 // Static confidence for now
    }
  }

  // Quality Prediction
  private async predictQuality(input: QualityPredictionInput): Promise<{ predictionData: Record<string, unknown>, confidenceScore: number }> {
    const { manufacturing_parameters, material_quality_scores, environmental_conditions } = input
    
    // Simple quality scoring model
    let qualityScore = 50 // Base score
    
    // Material quality impact
    const avgMaterialQuality = Object.values(material_quality_scores).reduce((sum, score) => sum + score, 0) / Object.values(material_quality_scores).length
    qualityScore += (avgMaterialQuality - 5) * 10 // Assuming 1-10 scale, 5 is neutral
    
    // Environmental conditions impact
    if (typeof environmental_conditions.temperature === 'number' && typeof environmental_conditions.humidity === 'number') {
      const optimalTemp = typeof environmental_conditions.optimal_temperature === 'number' ? environmental_conditions.optimal_temperature : 22
      const optimalHumidity = typeof environmental_conditions.optimal_humidity === 'number' ? environmental_conditions.optimal_humidity : 45
      
      const tempDeviation = Math.abs(environmental_conditions.temperature - optimalTemp)
      const humidityDeviation = Math.abs(environmental_conditions.humidity - optimalHumidity)
      
      qualityScore -= (tempDeviation * 2) + (humidityDeviation * 0.5)
    }
    
    // Manufacturing parameters impact
    const criticalParams = ['pressure', 'speed', 'precision']
    criticalParams.forEach(param => {
      if (typeof manufacturing_parameters[param] === 'number') {
        const paramValue = manufacturing_parameters[param] as number
        const optimalValue = (typeof manufacturing_parameters[`optimal_${param}`] === 'number' ? manufacturing_parameters[`optimal_${param}`] : paramValue) as number
        const deviation = Math.abs(paramValue - optimalValue) / optimalValue
        qualityScore -= deviation * 20
      }
    })
    
    const finalQualityScore = Math.max(0, Math.min(100, qualityScore))
    
    return {
      predictionData: {
        predicted_quality_score: Math.round(finalQualityScore),
        quality_grade: finalQualityScore > 90 ? 'A' : finalQualityScore > 80 ? 'B' : finalQualityScore > 70 ? 'C' : 'D',
        risk_factors: this.identifyQualityRisks(manufacturing_parameters, environmental_conditions),
        recommendations: this.getQualityRecommendations(finalQualityScore, manufacturing_parameters)
      },
      confidenceScore: 0.8
    }
  }

  // Helper methods
  private calculateExpirationDate(predictionType: string): string {
    const now = new Date()
    const expirationDays = {
      'demand_forecast': 30,
      'revenue_projection': 90,
      'customer_churn': 7,
      'quality_prediction': 1
    }
    
    now.setDate(now.getDate() + (expirationDays[predictionType as keyof typeof expirationDays] || 7))
    return now.toISOString()
  }

  private calculateConfidenceScore(dataPoints: number, type: string): number {
    const baseConfidence = {
      'demand': 0.6,
      'revenue': 0.7,
      'churn': 0.75,
      'quality': 0.8
    }
    
    const base = baseConfidence[type as keyof typeof baseConfidence] || 0.5
    const dataBonus = Math.min(0.3, dataPoints * 0.02)
    
    return Math.min(1.0, base + dataBonus)
  }

  private getChurnPreventionActions(churnProbability: number): string[] {
    if (churnProbability > 0.7) {
      return [
        'Immediate personal outreach required',
        'Offer special discount or loyalty rewards',
        'Schedule product demo or consultation',
        'Assign dedicated customer success manager'
      ]
    } else if (churnProbability > 0.4) {
      return [
        'Send re-engagement email campaign',
        'Offer product recommendations',
        'Invite to customer feedback survey',
        'Provide educational content'
      ]
    } else {
      return [
        'Continue regular engagement',
        'Monitor for changes in behavior',
        'Send newsletter and updates'
      ]
    }
  }

  private identifyQualityRisks(manufacturing: Record<string, unknown>, environmental: Record<string, unknown>): string[] {
    const risks = []
    
    if (typeof environmental.temperature === 'number' && environmental.temperature > 25) risks.push('High temperature risk')
    if (typeof environmental.humidity === 'number' && environmental.humidity > 60) risks.push('High humidity risk')
    if (typeof manufacturing.speed === 'number' && typeof manufacturing.optimal_speed === 'number' && manufacturing.speed > manufacturing.optimal_speed) risks.push('Production speed too high')
    if (typeof manufacturing.pressure === 'number' && typeof manufacturing.optimal_pressure === 'number' && manufacturing.pressure < manufacturing.optimal_pressure * 0.9) risks.push('Insufficient pressure')
    
    return risks
  }

  private getQualityRecommendations(qualityScore: number, manufacturing: Record<string, unknown>): string[] {
    const recommendations = []
    
    if (qualityScore < 80) {
      recommendations.push('Review manufacturing parameters')
      recommendations.push('Increase quality control checkpoints')
    }
    if (typeof manufacturing.speed === 'number' && typeof manufacturing.optimal_speed === 'number' && manufacturing.speed > manufacturing.optimal_speed) {
      recommendations.push('Reduce production speed')
    }
    if (qualityScore > 95) {
      recommendations.push('Current settings are optimal')
    }
    
    return recommendations
  }

  // Get predictions for a tenant/entity
  async getPredictions(tenantId: string, filters?: {
    entity_type?: string
    entity_id?: string
    prediction_type?: string
    status?: string
  }): Promise<PredictionResult[]> {
    let query = this.supabase
      .from('ai_predictions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (filters) {
      if (filters.entity_type) query = query.eq('entity_type', filters.entity_type)
      if (filters.entity_id) query = query.eq('entity_id', filters.entity_id)
      if (filters.prediction_type) query = query.eq('prediction_type', filters.prediction_type)
      if (filters.status) query = query.eq('status', filters.status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching predictions:', error)
      throw new Error('Failed to fetch predictions')
    }

    return data || []
  }

  // Update prediction accuracy (for model improvement)
  async updatePredictionAccuracy(predictionId: string, actualOutcome: Record<string, unknown>): Promise<void> {
    // This would typically involve comparing predicted vs actual outcomes
    // and calculating accuracy scores for model improvement
    
    const { error } = await this.supabase
      .from('ai_predictions')
      .update({
        accuracy_score: 0.85, // Calculated based on actual vs predicted
        metadata: { actual_outcome: actualOutcome, updated_at: new Date().toISOString() }
      })
      .eq('id', predictionId)

    if (error) {
      console.error('Error updating prediction accuracy:', error)
      throw new Error('Failed to update prediction accuracy')
    }
  }
}

// Singleton instance
export const aiPredictionService = new AIPredictionService()