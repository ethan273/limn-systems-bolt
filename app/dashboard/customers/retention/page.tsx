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
import { RetentionCohortMatrix } from '@/components/retention-cohort-matrix'
import { ChurnRiskIndicator } from '@/components/churn-risk-indicator'
import { SimpleChart } from '@/components/charts/simple-chart'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  AlertTriangle,
  Target,
  Heart,
  Download,
  RefreshCw,
  UserX,
  UserCheck,
  MessageCircle,
  Gift
} from 'lucide-react'

interface RetentionAnalysis {
  metrics: {
    current_month_retention: number
    six_month_retention: number
    twelve_month_retention: number
    monthly_churn_rate: number
  }
  cohort_retention: Array<{
    cohort: string
    months: Array<{month: number, rate: number}>
  }>
  at_risk_customers: Array<{
    customer_id: string
    name: string
    risk_score: number
    warning_signs: string[]
    recommended_action: string
    last_order_date: string
    total_revenue: number
  }>
  retention_drivers: Array<{
    factor: string
    impact_percentage: number
    affected_customers: number
    description: string
  }>
  lifecycle_stages: Array<{
    stage: string
    count: number
    percentage: number
    avg_clv: number
    color: string
  }>
  win_back_opportunities: Array<{
    customer_id: string
    name: string
    churned_date: string
    previous_clv: number
    win_back_potential: number
    recommended_offer: string
  }>
}

export default function CustomerRetentionPage() {
  const [retention, setRetention] = useState<RetentionAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('12m')
  const [refreshing, setRefreshing] = useState(false)

  const loadRetentionAnalysis = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/customers/retention?period=${period}`)
      if (!response.ok) {
        throw new Error('Failed to load retention analysis')
      }

      const data = await response.json()
      setRetention(data as RetentionAnalysis)
    } catch (err) {
      console.error('Error loading retention analysis:', err)
      setError(err instanceof Error ? err.message : 'Failed to load retention analysis')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    loadRetentionAnalysis()
  }, [period, loadRetentionAnalysis])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadRetentionAnalysis()
    setRefreshing(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading && !retention) {
    return (
      <div className="space-y-6">
        <PageHeader title="Customer Retention Analysis" />
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Retention Analysis"
        description="Monitor customer retention, identify churn risks, and discover win-back opportunities"
        actions={
          <div className="flex items-center space-x-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6m">Last 6 months</SelectItem>
                <SelectItem value="12m">Last 12 months</SelectItem>
                <SelectItem value="24m">Last 24 months</SelectItem>
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

      {retention && (
        <>
          {/* Retention Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <EfficiencyCard
              title="Current Month Retention"
              value={retention.metrics.current_month_retention}
              target={90}
              format="percentage"
              icon={UserCheck}
              trend={1.2}
              trendPeriod="vs last month"
            />
            <EfficiencyCard
              title="6-Month Retention"
              value={retention.metrics.six_month_retention}
              target={75}
              format="percentage"
              icon={Heart}
              trend={-0.8}
              trendPeriod="vs previous period"
            />
            <EfficiencyCard
              title="12-Month Retention"
              value={retention.metrics.twelve_month_retention}
              target={65}
              format="percentage"
              icon={Target}
              trend={2.3}
              trendPeriod="vs previous year"
            />
            <EfficiencyCard
              title="Monthly Churn Rate"
              value={retention.metrics.monthly_churn_rate}
              format="percentage"
              icon={UserX}
              trend={-1.2}
              trendPeriod="vs last month"
            />
          </div>

          {/* Cohort Retention Matrix */}
          <RetentionCohortMatrix
            data={retention.cohort_retention}
            title="Cohort Retention Analysis"
          />

          {/* Lifecycle Stages and Retention Drivers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Lifecycle Stages */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer Lifecycle Distribution</CardTitle>
                <p className="text-sm text-slate-600">
                  Distribution of customers across lifecycle stages
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(retention.lifecycle_stages || []).map((stage, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        <div>
                          <div className="font-medium text-slate-900">{stage.stage}</div>
                          <div className="text-sm text-slate-600">
                            Avg CLV: {formatCurrency(stage.avg_clv)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-slate-900">{stage.count}</div>
                        <div className="text-sm text-slate-600">{stage.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Retention Drivers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Retention Drivers</CardTitle>
                <p className="text-sm text-slate-600">
                  Factors that improve customer retention rates
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(retention.retention_drivers || []).map((driver, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-900">{driver.factor}</span>
                        <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                          +{driver.impact_percentage}%
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-gradient-to-r from-green-400 to-green-600"
                          style={{ width: `${Math.min(100, driver.impact_percentage * 2)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>{driver.description}</span>
                        <span>{driver.affected_customers} customers</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* At-Risk Customers */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">High-Risk Customers</CardTitle>
                  <p className="text-sm text-slate-600">
                    Customers with elevated churn risk requiring immediate attention
                  </p>
                </div>
                <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">
                  {(retention.at_risk_customers || []).length} at risk
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(retention.at_risk_customers || []).slice(0, 5).map((customer) => (
                  <ChurnRiskIndicator
                    key={customer.customer_id}
                    riskScore={customer.risk_score}
                    customerName={customer.name}
                    warningSignsArray={customer.warning_signs}
                    recommendedAction={customer.recommended_action}
                    lastOrderDate={customer.last_order_date}
                    totalRevenue={customer.total_revenue}
                    compact={true}
                  />
                ))}
                
                {(retention.at_risk_customers || []).length > 5 && (
                  <div className="text-center pt-4">
                    <Button variant="outline" size="sm">
                      View All {(retention.at_risk_customers || []).length} At-Risk Customers
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Win-Back Opportunities */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Win-Back Opportunities</CardTitle>
                  <p className="text-sm text-slate-600">
                    Churned customers with high potential for re-engagement
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Launch Campaign
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Churned Date</TableHead>
                      <TableHead className="text-right">Previous CLV</TableHead>
                      <TableHead className="text-right">Win-Back Potential</TableHead>
                      <TableHead>Recommended Offer</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(retention.win_back_opportunities || []).map((opportunity) => (
                      <TableRow key={opportunity.customer_id}>
                        <TableCell>
                          <div className="font-medium text-slate-900">
                            {opportunity.name}
                          </div>
                          <div className="text-sm text-slate-500">
                            ID: {opportunity.customer_id}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDate(opportunity.churned_date)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(opportunity.previous_clv)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-green-600">
                            {formatCurrency(opportunity.win_back_potential)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">
                            {opportunity.recommended_offer}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <Button variant="outline" size="sm">
                              <Gift className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Retention Trend Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Retention Rate Trends */}
            <SimpleChart
              data={(retention.cohort_retention || []).slice(0, 6).map((cohort) => ({
                label: cohort.cohort,
                value: cohort.months.find(m => m.month === 3)?.rate || 0,
                target: 75
              }))}
              type="line"
              title="3-Month Retention Rate by Cohort"
              height={250}
              showTarget={true}
              valueFormatter={(v) => `${v.toFixed(1)}%`}
            />

            {/* Churn Risk Distribution */}
            <SimpleChart
              data={[
                { label: 'Low Risk (0-30)', value: 85 },
                { label: 'Medium Risk (31-60)', value: 25 },
                { label: 'High Risk (61-80)', value: 12 },
                { label: 'Critical Risk (81-100)', value: 5 }
              ].map(d => ({
                label: d.label,
                value: d.value,
                target: undefined
              }))}
              type="bar"
              title="Customer Churn Risk Distribution"
              height={250}
              valueFormatter={(v) => `${v} customers`}
            />
          </div>

          {/* Retention Action Center */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Retention Action Center</CardTitle>
              <p className="text-sm text-slate-600">
                Quick actions to improve customer retention
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <MessageCircle className="w-5 h-5 text-blue-600" />
                    <h4 className="font-medium text-blue-900">Re-engagement Campaign</h4>
                  </div>
                  <p className="text-sm text-blue-800 mb-3">
                    Send targeted emails to {(retention.at_risk_customers || []).length} at-risk customers
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    Launch Campaign
                  </Button>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <Gift className="w-5 h-5 text-green-600" />
                    <h4 className="font-medium text-green-900">Win-Back Offers</h4>
                  </div>
                  <p className="text-sm text-green-800 mb-3">
                    Create personalized offers for {(retention.win_back_opportunities || []).length} churned customers
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    Create Offers
                  </Button>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <Heart className="w-5 h-5 text-purple-600" />
                    <h4 className="font-medium text-purple-900">Loyalty Program</h4>
                  </div>
                  <p className="text-sm text-purple-800 mb-3">
                    Enroll high-value customers in exclusive loyalty programs
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    Manage Program
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}