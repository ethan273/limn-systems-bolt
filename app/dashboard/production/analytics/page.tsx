'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/ui/page-header'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Alert } from '@/components/ui/alert'
import { EfficiencyCard } from '@/components/efficiency-card'
import { ProductionFunnel } from '@/components/production-funnel'
import { SimpleChart } from '@/components/charts/simple-chart'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Factory,
  Clock,
  TrendingUp,
  Target,
  Package,
  CheckCircle,
  AlertTriangle,
  Download,
  RefreshCw
} from 'lucide-react'

interface ProductionAnalytics {
  efficiency_rate: number
  average_lead_time: number
  quality_pass_rate: number
  on_time_delivery: number
  current_wip: number
  capacity_utilization: number
  stage_metrics: Array<{
    stage: string
    stage_order: number
    item_count: number
    avg_duration: number
    target_duration: number
    bottleneck_score: number
    utilization: number
  }>
  daily_metrics: Array<{
    date: string
    efficiency: number
    completed: number
    started: number
    items_in_progress: number
  }>
  production_funnel: Array<{
    stage: string
    item_count: number
    conversion_rate: number
  }>
  manufacturer_performance: Array<{
    name: string
    efficiency_rate: number
    quality_score: number
    avg_lead_time: number
    current_load: number
  }>
}

export default function ProductionAnalyticsPage() {
  const [analytics, setAnalytics] = useState<ProductionAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('30d')
  const [refreshing, setRefreshing] = useState(false)


  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/production/analytics?period=${period}`)
      if (!response.ok) {
        throw new Error('Failed to load production analytics')
      }

      const data = await response.json()
      setAnalytics(data)
    } catch (err) {
      console.error('Error loading analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAnalytics()
    setRefreshing(false)
  }

  const getBottleneckSeverity = (score: number) => {
    if (score > 0.5) return { label: 'Critical', color: 'bg-red-100 text-red-800' }
    if (score > 0.25) return { label: 'Warning', color: 'bg-yellow-100 text-yellow-800' }
    if (score > 0.1) return { label: 'Minor', color: 'bg-blue-100 text-blue-800' }
    return { label: 'Normal', color: 'bg-green-100 text-green-800' }
  }

  const formatDuration = (days: number) => {
    return `${days.toFixed(1)} days`
  }

  if (loading && !analytics) {
    return (
      <div className="space-y-6">
        <PageHeader title="Production Analytics" />
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Analytics"
        description="Monitor production efficiency, identify bottlenecks, and optimize capacity"
        actions={
          <div className="flex items-center space-x-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
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

      {analytics && (
        <>
          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            <EfficiencyCard
              title="Overall Efficiency"
              value={analytics.efficiency_rate}
              target={85}
              format="percentage"
              icon={TrendingUp}
              trend={2.3}
              trendPeriod="vs last month"
            />
            <EfficiencyCard
              title="Average Lead Time"
              value={analytics.average_lead_time}
              target={14}
              format="days"
              icon={Clock}
              trend={-1.2}
              trendPeriod="vs target"
            />
            <EfficiencyCard
              title="Quality Pass Rate"
              value={analytics.quality_pass_rate}
              target={95}
              format="percentage"
              icon={CheckCircle}
              trend={0.8}
              trendPeriod="vs last month"
            />
            <EfficiencyCard
              title="On-Time Delivery"
              value={analytics.on_time_delivery}
              target={90}
              format="percentage"
              icon={Target}
              trend={-2.1}
              trendPeriod="vs last month"
            />
            <EfficiencyCard
              title="Current WIP"
              value={analytics.current_wip}
              format="number"
              icon={Package}
              subtitle="Items in progress"
            />
            <EfficiencyCard
              title="Capacity Utilization"
              value={analytics.capacity_utilization}
              target={80}
              format="percentage"
              icon={Factory}
              trend={5.2}
              trendPeriod="vs last month"
            />
          </div>

          {/* Production Funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ProductionFunnel 
                data={analytics.production_funnel} 
                title="Production Flow Analysis" 
              />
            </div>
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">
                        Efficiency up 2.3% this month
                      </span>
                    </div>
                  </div>
                  
                  {analytics.stage_metrics.find(s => s.bottleneck_score > 0.3) && (
                    <div className="p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-medium text-red-800">
                          Bottleneck detected in {analytics.stage_metrics.find(s => s.bottleneck_score > 0.3)?.stage}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        Quality rate above target
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SimpleChart
              data={(analytics.daily_metrics || []).slice(-14).map(d => ({
                label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                value: d.efficiency
              }))}
              type="line"
              title="Efficiency Trend (Last 14 Days)"
              height={250}
              valueFormatter={(v) => `${v.toFixed(1)}%`}
            />

            <SimpleChart
              data={analytics.stage_metrics
                .sort((a, b) => a.stage_order - b.stage_order)
                .map(s => ({
                  label: s.stage,
                  value: s.avg_duration,
                  target: s.target_duration
                }))}
              type="bar"
              title="Stage Duration vs Target"
              height={250}
              showTarget={true}
              valueFormatter={(v) => `${v.toFixed(1)} days`}
            />
          </div>

          {/* Bottleneck Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stage Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stage</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">Avg Duration</TableHead>
                      <TableHead className="text-right">Target</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead className="text-right">Utilization</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.stage_metrics
                      .sort((a, b) => a.stage_order - b.stage_order)
                      .map((stage) => {
                        const variance = ((stage.avg_duration - stage.target_duration) / stage.target_duration) * 100
                        const severity = getBottleneckSeverity(stage.bottleneck_score)
                        
                        return (
                          <TableRow key={stage.stage}>
                            <TableCell className="font-medium">{stage.stage}</TableCell>
                            <TableCell className="text-right">{stage.item_count}</TableCell>
                            <TableCell className="text-right">{formatDuration(stage.avg_duration)}</TableCell>
                            <TableCell className="text-right">{formatDuration(stage.target_duration)}</TableCell>
                            <TableCell className={`text-right font-medium ${
                              variance > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-right">{stage.utilization.toFixed(1)}%</TableCell>
                            <TableCell>
                              <Badge className={severity.color} variant="outline">
                                {severity.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    }
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Manufacturer Performance */}
          {(analytics.manufacturer_performance || []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Manufacturer Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {(analytics.manufacturer_performance || []).map((manufacturer) => (
                    <div key={manufacturer.name} className="p-4 border border-gray-200 rounded-lg">
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">{manufacturer.name}</h4>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Efficiency</span>
                            <span className="font-medium">{manufacturer.efficiency_rate.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Quality Score</span>
                            <span className="font-medium">{manufacturer.quality_score.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Lead Time</span>
                            <span className="font-medium">{manufacturer.avg_lead_time.toFixed(1)} days</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Current Load</span>
                            <span className="font-medium">{manufacturer.current_load} items</span>
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t border-gray-100">
                          <Badge 
                            className={
                              manufacturer.efficiency_rate >= 85 
                                ? 'bg-green-100 text-green-800' 
                                : manufacturer.efficiency_rate >= 75
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                            }
                            variant="outline"
                          >
                            {manufacturer.efficiency_rate >= 85 ? 'Excellent' : 
                             manufacturer.efficiency_rate >= 75 ? 'Good' : 'Needs Improvement'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}