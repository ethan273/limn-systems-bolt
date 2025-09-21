/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Check authentication - using getUser() for security
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        debug: {
          hasUser: false,
          userError: userError?.message || 'No user found',
          hasCookies: !!request.headers.get('cookie')
        }
      }, { status: 401 })
    }

    // Get comprehensive shop drawings summary
    const { data: drawings, error } = await supabase
      .from('shop_drawings_list')
      .select('*')

    if (error) {
      console.error('Shop drawings summary query error:', error)
      return NextResponse.json({
        error: 'Failed to fetch shop drawings summary',
        details: error.message
      }, { status: 500 })
    }

    const drawingsArray = drawings || []
    
    // Calculate summary statistics
    const totalDrawings = drawingsArray.length
    const pendingApproval = drawingsArray.filter((d: any) => d.status === 'submitted' || d.status === 'under_review').length
    const approvedToday = drawingsArray.filter((d: any) => {
      if (!d.completed_date) return false
      const today = new Date().toISOString().split('T')[0]
      return d.completed_date.split('T')[0] === today && d.status === 'approved'
    }).length
    
    const now = new Date()
    const overdue = drawingsArray.filter((d: any) => {
      if (!d.due_date || d.status === 'completed' || d.status === 'approved') return false
      return new Date(d.due_date) < now
    }).length

    // Calculate average approval time (in days)
    const completedDrawings = drawingsArray.filter((d: any) => d.completed_date && d.created_at)
    const avgApprovalTime = completedDrawings.length > 0
      ? completedDrawings.reduce((sum: any, d: any) => {
          const created = new Date(d.created_at).getTime()
          const completed = new Date(d.completed_date).getTime()
          return sum + (completed - created) / (1000 * 60 * 60 * 24) // Convert to days
        }, 0) / completedDrawings.length
      : 0

    // Calculate revision rate
    const totalRevisions = drawingsArray.reduce((sum: any, d: any) => sum + (d.revision_number || 1), 0)
    const revisionRate = totalDrawings > 0 ? ((totalRevisions - totalDrawings) / totalDrawings) * 100 : 0

    // Status breakdown
    const statusCounts = drawingsArray.reduce((acc: any, drawing: any) => {
      const status = drawing.status || 'pending'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count: count as number,
      percentage: totalDrawings > 0 ? ((count as number) / totalDrawings) * 100 : 0,
      color: getStatusColor(status)
    }))

    const summary = {
      total_drawings: totalDrawings,
      pending_approval: pendingApproval,
      approved_today: approvedToday,
      overdue: overdue,
      average_approval_time: Math.round(avgApprovalTime * 10) / 10,
      revision_rate: Math.round(revisionRate * 10) / 10,
      status_breakdown: statusBreakdown
    }

    return NextResponse.json({
      success: true,
      data: summary
    })

  } catch (error) {
    console.error('Shop drawings summary API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: (error as Error).message
    }, { status: 500 })
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'approved': return '#10B981'
    case 'under_review': return '#3B82F6'
    case 'submitted': return '#F59E0B'
    case 'rejected': return '#EF4444'
    case 'revision_required': return '#F59E0B'
    case 'draft': return '#6B7280'
    default: return '#6B7280'
  }
}