'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/ui/page-header'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Alert } from '@/components/ui/alert'
import { VarianceChart } from '@/components/variance-chart'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Download, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Calendar,
  BarChart3
} from 'lucide-react'

interface VarianceCategory {
  name: string
  budget: number
  actual: number
  variance: number
  variance_percent: number
  trend: 'up' | 'down' | 'stable'
}

interface VarianceInsights {
  top_overruns: Array<{ category: string; amount: number; percent: number }>
  top_savings: Array<{ category: string; amount: number; percent: number }>
  projected_year_end: number
  recommendations: string[]
}

interface VarianceAnalysis {
  period: string
  categories: VarianceCategory[]
  insights: VarianceInsights
  chart_data: {
    waterfall: Array<{ category: string; value: number; type: 'budget' | 'actual' | 'variance' }>
    trend: Array<{ month: string; budget: number; actual: number }>
  }
}

interface Period {
  id: string
  name: string
  start_date: string
  end_date: string
}

export default function BudgetVariancePage() {
  const [analysis, setAnalysis] = useState<VarianceAnalysis | null>(null)
  const [periods, setPeriods] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')

  const loadPeriods = useCallback(async () => {
    try {
      const response = await fetch('/api/budgets')
      if (!response.ok) {
        throw new Error('Failed to load periods')
      }
      const data = await response.json()
      setPeriods(data.periods)
      
      // Auto-select the first period if available
      if ((data.periods || []).length > 0 && !selectedPeriod) {
        setSelectedPeriod(data.periods[0].id)
      }
    } catch (err) {
      console.error('Error loading periods:', err)
      setError('Failed to load periods')
    }
  }, [selectedPeriod])

  const loadVarianceAnalysis = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/budgets/variance?period_id=${selectedPeriod}`)
      if (!response.ok) {
        throw new Error('Failed to load variance analysis')
      }

      const data = await response.json()
      setAnalysis(data)
    } catch (err) {
      console.error('Error loading variance analysis:', err)
      setError(err instanceof Error ? err.message : 'Failed to load variance analysis')
    } finally {
      setLoading(false)
    }
  }, [selectedPeriod])

  useEffect(() => {
    loadPeriods()
  }, [loadPeriods])

  useEffect(() => {
    if (selectedPeriod) {
      loadVarianceAnalysis()
    }
  }, [selectedPeriod, loadVarianceAnalysis])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-red-500" />
      case 'down':
        return <TrendingDown className="w-4 h-4 text-green-500" />
      default:
        return <div className="w-4 h-4" />
    }
  }

  const getVarianceColor = (variance: number) => {
    return variance >= 0 ? 'text-red-600' : 'text-green-600'
  }

  const handleExportReport = () => {
    // In a real implementation, this would generate and download a PDF or Excel file
    alert('Export functionality would be implemented here')
  }

  if (loading && !analysis) {
    return (
      <div className="space-y-6">
        <PageHeader title="Budget Variance Analysis" />
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budget Variance Analysis"
        description="Analyze spending patterns and identify budget deviations"
        actions={
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleExportReport}>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        }
      />

      {error && (
        <Alert variant="error">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </Alert>
      )}

      {/* Period Selector */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-600">Period:</span>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            {periods.map((period) => (
              <SelectItem key={period.id} value={period.id}>
                {period.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {analysis && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top Overrun</CardTitle>
                <TrendingUp className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                {(analysis.insights.top_overruns || []).length > 0 ? (
                  <>
                    <div className="text-lg font-bold text-red-600">
                      {analysis.insights.top_overruns[0].category}
                    </div>
                    <div className="text-sm text-red-500">
                      +{formatCurrency(analysis.insights.top_overruns[0].amount)} 
                      ({analysis.insights.top_overruns[0].percent.toFixed(1)}%)
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-slate-500">No overruns</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top Savings</CardTitle>
                <TrendingDown className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                {(analysis.insights.top_savings || []).length > 0 ? (
                  <>
                    <div className="text-lg font-bold text-green-600">
                      {analysis.insights.top_savings[0].category}
                    </div>
                    <div className="text-sm text-green-500">
                      -{formatCurrency(analysis.insights.top_savings[0].amount)} 
                      ({analysis.insights.top_savings[0].percent.toFixed(1)}%)
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-slate-500">No savings</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Projected Year-End</CardTitle>
                <BarChart3 className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {formatCurrency(analysis.insights.projected_year_end)}
                </div>
                <div className="text-sm text-slate-500">
                  Based on current trends
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Variance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <VarianceChart
              data={(analysis.categories || []).map(cat => ({
                category: cat.name,
                budget: cat.budget,
                actual: cat.actual,
                variance: cat.variance,
                variance_percent: cat.variance_percent
              }))}
              type="bar"
              title="Budget vs Actual by Category"
            />
            <VarianceChart
              data={(analysis.categories || []).map(cat => ({
                category: cat.name,
                budget: cat.budget,
                actual: cat.actual,
                variance: cat.variance,
                variance_percent: cat.variance_percent
              }))}
              type="waterfall"
              title="Variance Summary"
            />
          </div>

          {/* Detailed Variance Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>Detailed Variance Analysis</span>
                <Badge variant="outline" className="ml-2">
                  {analysis.period}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Variance $</TableHead>
                      <TableHead className="text-right">Variance %</TableHead>
                      <TableHead className="text-center">Trend</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(analysis.categories || []).map((category, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {category.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(category.budget)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(category.actual)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${getVarianceColor(category.variance)}`}>
                          {category.variance >= 0 ? '+' : ''}
                          {formatCurrency(Math.abs(category.variance))}
                        </TableCell>
                        <TableCell className={`text-right ${getVarianceColor(category.variance)}`}>
                          {category.variance >= 0 ? '+' : ''}
                          {category.variance_percent.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-center">
                          {getTrendIcon(category.trend)}
                        </TableCell>
                        <TableCell className="text-center">
                          {category.variance_percent >= 10 ? (
                            <Badge className="bg-red-100 text-red-800" variant="outline">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Alert
                            </Badge>
                          ) : category.variance_percent >= 5 ? (
                            <Badge className="bg-yellow-100 text-yellow-800" variant="outline">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Warning
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800" variant="outline">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              OK
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Insights & Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Issues */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-red-600">
                  Areas Requiring Attention
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(analysis.insights.top_overruns || []).length > 0 ? (
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Budget Overruns</h4>
                    <div className="space-y-2">
                      {(analysis.insights.top_overruns || []).slice(0, 3).map((overrun, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                          <span className="font-medium">{overrun.category}</span>
                          <div className="text-right">
                            <div className="text-red-600 font-medium">
                              +{formatCurrency(overrun.amount)}
                            </div>
                            <div className="text-sm text-red-500">
                              {overrun.percent.toFixed(1)}% over
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    <p>No budget overruns detected</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-blue-600">
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(analysis.insights.recommendations || []).map((recommendation, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-medium text-blue-800">
                        {index + 1}
                      </div>
                      <p className="text-sm text-slate-600">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}