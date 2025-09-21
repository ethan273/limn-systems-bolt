'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageWrapper } from '@/components/layouts/page-wrapper'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Alert } from '@/components/ui/alert'
import { BudgetCard } from '@/components/budget-card'
import { BudgetForm } from '@/components/budget-form'
import { 
  Plus, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Calendar,
  Filter
} from 'lucide-react'

interface BudgetWithActuals {
  id: string
  name: string
  category: string
  department: string
  period_id: string
  period_name?: string
  budget_amount: number
  actual_amount: number
  variance: number
  variance_percentage: number
  status: 'on_track' | 'at_risk' | 'over_budget'
  remaining: number
  burn_rate: number
  created_at: string
  updated_at: string
}

interface BudgetSummary {
  total_budget: number
  total_spent: number
  total_variance: number
  overall_variance_percent: number
  average_burn_rate: number
  count_by_status: {
    on_track: number
    at_risk: number
    over_budget: number
  }
}

interface Period {
  id: string
  name: string
  start_date: string
  end_date: string
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetWithActuals[]>([])
  const [summary, setSummary] = useState<BudgetSummary | null>(null)
  const [periods, setPeriods] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  
  // Form state
  const [showBudgetForm, setShowBudgetForm] = useState(false)
  const [editingBudget, setEditingBudget] = useState<BudgetWithActuals | null>(null)

  const loadBudgets = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (selectedPeriod && selectedPeriod !== 'all') {
        params.set('period_id', selectedPeriod)
      }
      if (selectedDepartment && selectedDepartment !== 'all') {
        params.set('department', selectedDepartment)
      }
      if (selectedStatus && selectedStatus !== 'all') {
        params.set('status', selectedStatus)
      }

      const response = await fetch(`/api/budgets?${params}`)
      if (!response.ok) {
        throw new Error('Failed to load budgets')
      }

      const data = await response.json()
      setBudgets(data.budgets)
      setSummary(data.summary)
      setPeriods(data.periods)
    } catch (err) {
      console.error('Error loading budgets:', err)
      setError(err instanceof Error ? err.message : 'Failed to load budgets')
    } finally {
      setLoading(false)
    }
  }, [selectedPeriod, selectedDepartment, selectedStatus])

  useEffect(() => {
    loadBudgets()
  }, [selectedPeriod, selectedDepartment, selectedStatus, loadBudgets])

  const handleCreateBudget = async (formData: {
    name: string
    category: string
    department: string
    period_id: string
    amount: number
  }) => {
    try {
      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create budget')
      }

      await loadBudgets() // Refresh the list
    } catch (err) {
      console.error('Error creating budget:', err)
      throw err // Re-throw so form can handle the error
    }
  }

  const handleEditBudget = (id: string) => {
    const budget = budgets.find(b => b.id === id)
    if (budget) {
      setEditingBudget(budget)
      setShowBudgetForm(true)
    }
  }

  const handleDeleteBudget = async (id: string) => {
    if (!confirm('Are you sure you want to delete this budget?')) {
      return
    }

    try {
      const response = await fetch(`/api/budgets/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete budget')
      }

      await loadBudgets() // Refresh the list
    } catch (err) {
      console.error('Error deleting budget:', err)
      setError('Failed to delete budget')
    }
  }

  const handleViewDetails = (id: string) => {
    window.location.href = `/dashboard/budgets/${id}`
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }


  // Get unique departments for filter
  const departments = Array.from(new Set(budgets.map(b => b.department))).sort()

  if (loading && budgets.length === 0) {
    return (
      <PageWrapper title="Budget Management">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper
      title="Budget Management"
      description="Monitor budget performance and track spending across departments"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between -mt-4">
        <div></div>
          <Button onClick={() => setShowBudgetForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Budget
          </Button>
        </div>

      {error && (
        <Alert variant="error">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </Alert>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
              <DollarSign className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.total_budget)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <TrendingUp className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.total_spent)}</div>
              <div className="text-xs text-slate-500">
                {summary.total_budget > 0 && 
                  `${((summary.total_spent / summary.total_budget) * 100).toFixed(1)}% of budget`
                }
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Variance</CardTitle>
              <AlertTriangle className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                summary.total_variance >= 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {summary.total_variance >= 0 ? '+' : ''}{formatCurrency(Math.abs(summary.total_variance))}
              </div>
              <div className={`text-xs ${
                summary.overall_variance_percent >= 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {summary.overall_variance_percent >= 0 ? '+' : ''}{summary.overall_variance_percent.toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Burn Rate</CardTitle>
              <Calendar className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.average_burn_rate)}</div>
              <div className="text-xs text-slate-500">per month</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Summary */}
      {summary && (
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Badge className="bg-green-100 text-green-800" variant="outline">
              {summary.count_by_status.on_track} On Track
            </Badge>
            <Badge className="bg-yellow-100 text-yellow-800" variant="outline">
              {summary.count_by_status.at_risk} At Risk
            </Badge>
            <Badge className="bg-red-100 text-red-800" variant="outline">
              {summary.count_by_status.over_budget} Over Budget
            </Badge>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-600">Filters:</span>
        </div>

        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Periods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Periods</SelectItem>
            {periods.map((period) => (
              <SelectItem key={period.id} value={period.id}>
                {period.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((department) => (
              <SelectItem key={department} value={department}>
                {department}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="on_track">On Track</SelectItem>
            <SelectItem value="at_risk">At Risk</SelectItem>
            <SelectItem value="over_budget">Over Budget</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Budget Cards */}
      {budgets.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-slate-500 text-lg mb-4">No budgets found</div>
          <p className="text-slate-500 mb-6">Create your first budget to get started</p>
          <Button onClick={() => setShowBudgetForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Budget
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onEdit={handleEditBudget}
              onDelete={handleDeleteBudget}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      )}

      {/* Budget Form Modal */}
      <BudgetForm
        isOpen={showBudgetForm}
        onClose={() => {
          setShowBudgetForm(false)
          setEditingBudget(null)
        }}
        onSubmit={handleCreateBudget}
        initialData={editingBudget ? {
          name: editingBudget.name,
          category: editingBudget.category,
          department: editingBudget.department,
          period_id: editingBudget.period_id,
          amount: editingBudget.budget_amount
        } : undefined}
        periods={periods}
        />
      </div>
    </PageWrapper>
  )
}