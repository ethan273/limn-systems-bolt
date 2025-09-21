'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface RetentionCohortMatrixProps {
  data: Array<{
    cohort: string
    months: Array<{
      month: number
      rate: number
    }>
  }>
  title?: string
}

export function RetentionCohortMatrix({ 
  data, 
  title = "Cohort Retention Analysis" 
}: RetentionCohortMatrixProps) {
  
  const getRetentionColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-100 text-green-800 border-green-200'
    if (rate >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    if (rate >= 40) return 'bg-orange-100 text-orange-800 border-orange-200'
    return 'bg-red-100 text-red-800 border-red-200'
  }

  const getRetentionIntensity = (rate: number) => {
    if (rate >= 90) return 'opacity-100'
    if (rate >= 80) return 'opacity-90'
    if (rate >= 70) return 'opacity-80'
    if (rate >= 60) return 'opacity-70'
    if (rate >= 50) return 'opacity-60'
    if (rate >= 40) return 'opacity-50'
    if (rate >= 30) return 'opacity-40'
    return 'opacity-30'
  }

  const maxMonths = Math.max(...data.map(cohort => (cohort.months || []).length))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <p className="text-sm text-gray-600">
          Customer retention rates by acquisition cohort over time
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Header Row */}
          <div className="grid gap-2" style={{ gridTemplateColumns: `120px repeat(${maxMonths}, 1fr)` }}>
            <div className="text-sm font-medium text-gray-700 py-2">
              Cohort
            </div>
            {Array.from({ length: maxMonths }, (_, i) => (
              <div key={i} className="text-sm font-medium text-gray-700 py-2 text-center">
                Month {i}
              </div>
            ))}
          </div>

          {/* Data Rows */}
          <div className="space-y-2">
            {data.map((cohort) => (
              <div 
                key={cohort.cohort}
                className="grid gap-2"
                style={{ gridTemplateColumns: `120px repeat(${maxMonths}, 1fr)` }}
              >
                {/* Cohort Label */}
                <div className="text-sm font-medium text-gray-900 py-3 px-2 bg-gray-50 rounded">
                  {cohort.cohort}
                </div>
                
                {/* Retention Rates */}
                {(cohort.months || []).map((month, monthIndex) => (
                  <div
                    key={monthIndex}
                    className={`
                      relative py-3 px-2 text-center rounded text-sm font-medium border
                      ${getRetentionColor(month.rate)}
                      ${getRetentionIntensity(month.rate)}
                      hover:scale-105 transition-transform cursor-pointer
                    `}
                    title={`${cohort.cohort} - Month ${month.month}: ${month.rate}% retention`}
                  >
                    {month.rate}%
                  </div>
                ))}
                
                {/* Fill empty cells for shorter cohorts */}
                {(cohort.months || []).length < maxMonths && 
                  Array.from({ length: maxMonths - (cohort.months || []).length }, (_, i) => (
                    <div key={`empty-${i}`} className="py-3 px-2 bg-gray-100 rounded opacity-50" />
                  ))
                }
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center space-x-6 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-200 rounded border border-green-300" />
              <span className="text-xs text-gray-600">Excellent (80%+)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-200 rounded border border-yellow-300" />
              <span className="text-xs text-gray-600">Good (60-79%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-200 rounded border border-orange-300" />
              <span className="text-xs text-gray-600">Fair (40-59%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-200 rounded border border-red-300" />
              <span className="text-xs text-gray-600">Poor (&lt;40%)</span>
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">
                {Math.round(
                  data.reduce((sum, cohort) => 
                    sum + (cohort.months.find(m => m.month === 0)?.rate || 0), 0
                  ) / data.length
                )}%
              </div>
              <div className="text-sm text-gray-600">Avg Starting Rate</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">
                {Math.round(
                  data.reduce((sum, cohort) => {
                    const month3 = cohort.months.find(m => m.month === 3)
                    return sum + (month3?.rate || 0)
                  }, 0) / data.length
                )}%
              </div>
              <div className="text-sm text-gray-600">Avg 3-Month Retention</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">
                {Math.round(
                  data.reduce((sum, cohort) => {
                    const lastMonth = cohort.months[(cohort.months || []).length - 1]
                    return sum + (lastMonth?.rate || 0)
                  }, 0) / data.length
                )}%
              </div>
              <div className="text-sm text-gray-600">Avg Long-term Retention</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}