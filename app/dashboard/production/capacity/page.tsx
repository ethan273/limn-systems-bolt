'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/ui/page-header'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Alert } from '@/components/ui/alert'
import { CapacityGauge } from '@/components/capacity-gauge'
import { SimpleChart } from '@/components/charts/simple-chart'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Settings,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  RefreshCw,
  Download
} from 'lucide-react'

interface CapacityAnalysis {
  stages: Array<{
    name: string
    stage_order: number
    current_load: number
    max_capacity: number
    utilization_percent: number
    projected_overflow_date?: string
    recommended_capacity: number
  }>
  schedule: Array<{
    order_id: string
    order_number: string
    customer_name: string
    priority: string
    start_date: string
    end_date: string
    current_stage: string
    stages: Array<{
      stage: string
      estimated_start: string
      estimated_end: string
      duration_days: number
    }>
  }>
  capacity_forecast: Array<{
    date: string
    total_demand: number
    total_capacity: number
    utilization_percent: number
    bottleneck_stage?: string
  }>
  recommendations: string[]
  resource_allocation: Array<{
    resource_type: string
    allocated: number
    available: number
    efficiency: number
  }>
}

export default function ProductionCapacityPage() {
  const [analysis, setAnalysis] = useState<CapacityAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [planningPeriod, setPlanningPeriod] = useState('month')
  const [refreshing, setRefreshing] = useState(false)


  const loadCapacityAnalysis = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/production/capacity?period=${planningPeriod}`)
      if (!response.ok) {
        throw new Error('Failed to load capacity analysis')
      }

      const data = await response.json()
      setAnalysis(data)
    } catch (err) {
      console.error('Error loading capacity analysis:', err)
      setError(err instanceof Error ? err.message : 'Failed to load capacity analysis')
    } finally {
      setLoading(false)
    }
  }, [planningPeriod])

  useEffect(() => {
    loadCapacityAnalysis()
  }, [loadCapacityAnalysis])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadCapacityAnalysis()
    setRefreshing(false)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'normal': return 'bg-blue-100 text-blue-800'
      case 'low': return 'bg-gray-100 text-slate-900'
      default: return 'bg-gray-100 text-slate-900'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading && !analysis) {
    return (
      <div className="space-y-6">
        <PageHeader title="Production Capacity Planning" />
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Capacity Planning"
        description="Optimize resource allocation and schedule production efficiently"
        actions={
          <div className="flex items-center space-x-2">
            <Select value={planningPeriod} onValueChange={setPlanningPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
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

      {analysis && (
        <>
          {/* Capacity Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <CapacityGauge data={analysis.stages} title="Stage Capacity Overview" />
            </div>
            
            {/* Resource Allocation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resource Allocation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(analysis.resource_allocation || []).map((resource) => (
                    <div key={resource.resource_type} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{resource.resource_type}</span>
                        <span className="text-sm text-slate-600">
                          {resource.allocated}/{resource.available}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            resource.efficiency >= 90 ? 'bg-green-500' :
                            resource.efficiency >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ 
                            width: `${Math.min(100, (resource.allocated / resource.available) * 100)}%` 
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>Efficiency: {resource.efficiency.toFixed(1)}%</span>
                        <span>
                          {((resource.allocated / resource.available) * 100).toFixed(1)}% utilized
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Capacity Forecast */}
          <SimpleChart
            data={(analysis.capacity_forecast || []).slice(0, 14).map(f => ({
              label: formatDate(f.date),
              value: f.utilization_percent,
              target: 80 // Target utilization
            }))}
            type="line"
            title="Capacity Utilization Forecast (Next 14 Days)"
            height={250}
            showTarget={true}
            valueFormatter={(v) => `${v.toFixed(1)}%`}
          />

          {/* Recommendations */}
          {(analysis.recommendations || []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Capacity Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(analysis.recommendations || []).map((recommendation, index) => {
                    const isUrgent = recommendation.toLowerCase().includes('critical') || 
                                   recommendation.toLowerCase().includes('exceed')
                    const isWarning = recommendation.toLowerCase().includes('warning') || 
                                    recommendation.toLowerCase().includes('90%')
                    
                    return (
                      <div key={index} className={`p-3 rounded-lg border ${
                        isUrgent ? 'border-red-200 bg-red-50' :
                        isWarning ? 'border-yellow-200 bg-yellow-50' :
                        'border-blue-200 bg-blue-50'
                      }`}>
                        <div className="flex items-start space-x-3">
                          {isUrgent ? (
                            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          ) : isWarning ? (
                            <Clock className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          )}
                          <p className={`text-sm ${
                            isUrgent ? 'text-red-800' :
                            isWarning ? 'text-yellow-800' :
                            'text-blue-800'
                          }`}>
                            {recommendation}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Production Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Production Schedule Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Current Stage</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(analysis.schedule || []).slice(0, 10).map((item) => {
                      const isOverdue = new Date(item.end_date) < new Date() && item.current_stage !== 'Completed'
                      const isUrgent = item.priority === 'urgent'
                      
                      return (
                        <TableRow key={item.order_id}>
                          <TableCell className="font-medium">
                            {item.order_number}
                          </TableCell>
                          <TableCell>{item.customer_name}</TableCell>
                          <TableCell>
                            <Badge className={getPriorityColor(item.priority)} variant="outline">
                              {item.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.current_stage}</TableCell>
                          <TableCell>{formatDate(item.start_date)}</TableCell>
                          <TableCell>{formatDate(item.end_date)}</TableCell>
                          <TableCell>
                            {isOverdue ? (
                              <Badge className="bg-red-100 text-red-800" variant="outline">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Overdue
                              </Badge>
                            ) : isUrgent ? (
                              <Badge className="bg-orange-100 text-orange-800" variant="outline">
                                <Clock className="w-3 h-3 mr-1" />
                                Urgent
                              </Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800" variant="outline">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                On Track
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              
              {(analysis.schedule || []).length > 10 && (
                <div className="mt-4 text-center">
                  <Button variant="outline" size="sm">
                    View All {(analysis.schedule || []).length} Orders
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Capacity Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Current Load</CardTitle>
                <Settings className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analysis.stages.reduce((sum, stage) => sum + stage.current_load, 0)}
                </div>
                <p className="text-xs text-slate-500">
                  items across all stages
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
                <Target className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analysis.stages.reduce((sum, stage) => sum + stage.max_capacity, 0)}
                </div>
                <p className="text-xs text-slate-500">
                  maximum items
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Utilization</CardTitle>
                <TrendingUp className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(analysis.stages || []).length > 0 
                    ? ((analysis.stages.reduce((sum, stage) => sum + stage.utilization_percent, 0) / (analysis.stages || []).length).toFixed(1))
                    : '0'}%
                </div>
                <p className="text-xs text-slate-500">
                  across all stages
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bottlenecks</CardTitle>
                <AlertTriangle className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {(analysis.stages || []).filter(stage => stage.utilization_percent > 90).length}
                </div>
                <p className="text-xs text-slate-500">
                  stages over 90%
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}