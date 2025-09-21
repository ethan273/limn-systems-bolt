'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface VarianceChartProps {
  data: Array<{
    category: string
    budget: number
    actual: number
    variance: number
    variance_percent: number
  }>
  type?: 'bar' | 'waterfall' | 'trend'
  title?: string
}

export function VarianceChart({ data, type = 'bar', title = 'Budget vs Actual' }: VarianceChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount))
  }

  if (type === 'bar') {
    const maxAmount = Math.max(
      ...data.map(item => Math.max(item.budget, item.actual))
    )

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-900">{item.category}</span>
                  <div className="flex space-x-4 text-xs text-gray-600">
                    <span>Budget: {formatCurrency(item.budget)}</span>
                    <span>Actual: {formatCurrency(item.actual)}</span>
                  </div>
                </div>
                
                <div className="relative">
                  {/* Budget bar (background) */}
                  <div className="w-full bg-blue-100 rounded h-4">
                    <div 
                      className="bg-blue-300 h-full rounded"
                      style={{ 
                        width: `${(item.budget / maxAmount) * 100}%` 
                      }}
                    />
                  </div>
                  
                  {/* Actual bar (overlay) */}
                  <div 
                    className={`absolute top-0 h-4 rounded ${
                      item.actual > item.budget 
                        ? 'bg-red-500' 
                        : 'bg-green-500'
                    }`}
                    style={{ 
                      width: `${Math.min((item.actual / maxAmount) * 100, 100)}%` 
                    }}
                  />
                  
                  {/* Variance indicator */}
                  {item.variance !== 0 && (
                    <div 
                      className="absolute top-0 bottom-0 flex items-center text-white text-xs font-medium px-2"
                      style={{ 
                        left: `${Math.min((Math.min(item.budget, item.actual) / maxAmount) * 100, 85)}%` 
                      }}
                    >
                      {item.variance > 0 ? '+' : ''}{item.variance_percent.toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Legend */}
          <div className="flex justify-center space-x-6 mt-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-3 bg-blue-300 rounded" />
              <span>Budget</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-3 bg-green-500 rounded" />
              <span>Under Budget</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-3 bg-red-500 rounded" />
              <span>Over Budget</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (type === 'waterfall') {
    const totalBudget = data.reduce((sum, item) => sum + item.budget, 0)
    const totalActual = data.reduce((sum, item) => sum + item.actual, 0)
    const totalVariance = totalActual - totalBudget

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(totalBudget)}
                </div>
                <div className="text-sm text-gray-600">Total Budget</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-800">
                  {formatCurrency(totalActual)}
                </div>
                <div className="text-sm text-gray-600">Total Actual</div>
              </div>
              <div className={`p-4 rounded-lg ${
                totalVariance >= 0 ? 'bg-red-50' : 'bg-green-50'
              }`}>
                <div className={`text-2xl font-bold ${
                  totalVariance >= 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {totalVariance >= 0 ? '+' : ''}{formatCurrency(totalVariance)}
                </div>
                <div className="text-sm text-gray-600">
                  Variance ({((totalVariance / totalBudget) * 100).toFixed(1)}%)
                </div>
              </div>
            </div>

            {/* Category breakdown */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">By Category</h4>
              {data.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium">{item.category}</span>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-gray-600">{formatCurrency(item.budget)}</span>
                    <span className="text-gray-600">→</span>
                    <span className="text-gray-800 font-medium">{formatCurrency(item.actual)}</span>
                    <span className={`font-medium ${
                      item.variance >= 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      ({item.variance >= 0 ? '+' : ''}{item.variance_percent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Default: simple table view
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-gray-900">Category</th>
                <th className="text-right py-3 px-2 font-medium text-gray-900">Budget</th>
                <th className="text-right py-3 px-2 font-medium text-gray-900">Actual</th>
                <th className="text-right py-3 px-2 font-medium text-gray-900">Variance</th>
                <th className="text-right py-3 px-2 font-medium text-gray-900">%</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-3 px-2 font-medium">{item.category}</td>
                  <td className="py-3 px-2 text-right text-gray-600">
                    {formatCurrency(item.budget)}
                  </td>
                  <td className="py-3 px-2 text-right font-medium">
                    {formatCurrency(item.actual)}
                  </td>
                  <td className={`py-3 px-2 text-right font-medium ${
                    item.variance >= 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {item.variance >= 0 ? '+' : ''}{formatCurrency(item.variance)}
                  </td>
                  <td className={`py-3 px-2 text-right text-sm ${
                    item.variance_percent >= 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {item.variance_percent >= 0 ? '+' : ''}{item.variance_percent.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}