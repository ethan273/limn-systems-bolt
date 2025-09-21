/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface BudgetTransaction {
  id: string
  date: string
  description: string
  amount: number
  category: string
  user_email?: string
  reference?: string
  type: 'expense' | 'allocation' | 'adjustment'
}

interface BudgetDetail {
  id: string
  name: string
  category: string
  department: string
  period_name: string
  budget_amount: number
  actual_amount: number
  remaining: number
  variance: number
  variance_percentage: number
  status: 'on_track' | 'at_risk' | 'over_budget'
  created_at: string
  transactions: BudgetTransaction[]
  forecast: {
    current_run_rate: number
    projected_end_amount: number
    days_remaining: number
    recommended_actions: string[]
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { id: budgetId } = await context.params

  try {
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get budget details with period information
    const { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .select(`
        *,
        financial_periods!inner(
          id,
          name,
          start_date,
          end_date
        )
      `)
      .eq('id', budgetId)
      .single()

    if (budgetError || !budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    // Get related cost tracking transactions
    const { data: costs, error: costError } = await supabase
      .from('cost_tracking')
      .select(`
        *
      `)
      .or(`budget_id.eq.${budgetId},and(category.eq.${budget.category},created_at.gte.${budget.financial_periods.start_date},created_at.lte.${budget.financial_periods.end_date})`)
      .order('created_at', { ascending: false })

    if (costError) {
      console.error('Error fetching transactions:', costError)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    // Transform cost tracking data to transaction format
    const transactions: BudgetTransaction[] = (costs || []).map((cost: any) => ({
      id: cost.id,
      date: cost.created_at,
      description: cost.description || `${cost.category} expense`,
      amount: cost.amount || 0,
      category: cost.category || budget.category,
      user_email: cost.user_email,
      reference: cost.order_id ? `Order: ${cost.order_id}` : undefined,
      type: 'expense' as const
    }))

    // Calculate actuals and metrics
    const actual_amount = transactions.reduce((sum, t) => sum + t.amount, 0)
    const remaining = budget.amount - actual_amount
    const variance = actual_amount - budget.amount
    const variance_percentage = budget.amount > 0 ? (variance / budget.amount) * 100 : 0

    // Calculate status
    let status: 'on_track' | 'at_risk' | 'over_budget'
    if (variance_percentage >= 10) {
      status = 'over_budget'
    } else if (variance_percentage >= 5 || (remaining / budget.amount) < 0.1) {
      status = 'at_risk'
    } else {
      status = 'on_track'
    }

    // Calculate forecast metrics
    const periodStart = new Date(budget.financial_periods.start_date)
    const periodEnd = new Date(budget.financial_periods.end_date)
    const now = new Date()
    
    const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
    const elapsedDays = Math.max(1, Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)))
    const remainingDays = Math.max(0, totalDays - elapsedDays)
    
    const current_run_rate = elapsedDays > 0 ? actual_amount / elapsedDays : 0
    const projected_end_amount = current_run_rate * totalDays

    // Generate recommendations
    const recommended_actions: string[] = []
    
    if (status === 'over_budget') {
      recommended_actions.push('Immediately review and reduce discretionary spending')
      recommended_actions.push('Consider requesting budget increase or reallocating from other categories')
    } else if (status === 'at_risk') {
      recommended_actions.push('Monitor spending closely for remainder of period')
      recommended_actions.push('Defer non-essential expenses to next period')
    } else {
      if (projected_end_amount < budget.amount * 0.8) {
        recommended_actions.push('Current spending is well below budget - consider accelerating planned initiatives')
      } else {
        recommended_actions.push('Spending is on track - maintain current pace')
      }
    }

    if (remainingDays > 0 && projected_end_amount > budget.amount) {
      const daily_reduction_needed = (projected_end_amount - budget.amount) / remainingDays
      recommended_actions.push(`Reduce daily spending by $${daily_reduction_needed.toFixed(2)} to stay within budget`)
    }

    const budgetDetail: BudgetDetail = {
      id: budget.id,
      name: budget.name,
      category: budget.category || 'General',
      department: budget.department || 'General',
      period_name: budget.financial_periods.name,
      budget_amount: budget.amount,
      actual_amount,
      remaining,
      variance,
      variance_percentage,
      status,
      created_at: budget.created_at,
      transactions,
      forecast: {
        current_run_rate,
        projected_end_amount,
        days_remaining: remainingDays,
        recommended_actions
      }
    }

    return NextResponse.json(budgetDetail)
  } catch (error) {
    console.error('Budget detail error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { id: budgetId } = await context.params

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { description, amount, category } = body

    // Validate required fields
    if (!description || !amount) {
      return NextResponse.json({ 
        error: 'Missing required fields: description, amount' 
      }, { status: 400 })
    }

    // Verify budget exists
    const { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .select('id, category')
      .eq('id', budgetId)
      .single()

    if (budgetError || !budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    // Create cost tracking entry
    const { data: newTransaction, error } = await supabase
      .from('cost_tracking')
      .insert([{
        budget_id: budgetId,
        description,
        amount: Number(amount),
        category: category || budget.category,
        user_id: user.id
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating transaction:', error)
      return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
    }

    return NextResponse.json({ transaction: newTransaction }, { status: 201 })
  } catch (error) {
    console.error('Transaction creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}