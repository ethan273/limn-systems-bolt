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
    const { searchParams } = new URL(request.url)
    
    const status = searchParams.get('status') || 'all'
    const priority = searchParams.get('priority') || 'all'
    const assignedTo = searchParams.get('assigned_to') || 'all'
    const customer = searchParams.get('customer') || 'all'
    const search = searchParams.get('search') || ''
    const dateRange = searchParams.get('date_range') || '30d'

    // Build query with proper filters - start simple and expand
    let query = supabase
      .from('shop_drawings_list')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply filters
    if (status !== 'all') {
      query = query.eq('status', status)
    }
    if (priority !== 'all') {
      query = query.eq('priority', priority)
    }
    if (assignedTo !== 'all') {
      query = query.eq('assigned_to', assignedTo)
    }
    if (customer !== 'all') {
      query = query.ilike('customer_name', `%${customer}%`)
    }
    if (search) {
      query = query.or(`project_name.ilike.%${search}%,drawing_type.ilike.%${search}%,notes.ilike.%${search}%`)
    }

    // Apply date range filter
    if (dateRange !== 'all') {
      const days = parseInt(dateRange.replace('d', ''))
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      query = query.gte('created_at', startDate.toISOString())
    }

    const { data, error } = await query

    if (error) {
      console.error('Shop drawings query error:', error)
      
      // If table doesn't exist, return empty data with helpful message
      if (error.code === '42P01' || error.code === '42703') {
        return NextResponse.json({
          success: true,
          data: [],
          count: 0,
          message: 'Shop drawings table not found. Please run database migrations.',
          filters: { status, priority, assigned_to: assignedTo, customer, search, date_range: dateRange }
        })
      }
      
      return NextResponse.json({
        error: 'Failed to fetch shop drawings',
        details: error.message
      }, { status: 500 })
    }

    // Transform data for frontend - use whatever columns exist
    const shopDrawings = (data || []).map((drawing: any) => ({
      id: drawing.id,
      shop_drawing_id: drawing.shop_drawing_id || drawing.id,
      drawing_number: drawing.drawing_number || drawing.shop_drawing_id || 'N/A',
      title: drawing.title || 'Untitled Drawing',
      description: drawing.description || '',
      order_id: drawing.order_id,
      customer_name: drawing.customer_name || 'N/A',
      project_name: drawing.project_name || 'Untitled Project',
      item_name: drawing.item_name || '',
      drawing_type: drawing.drawing_type || 'General',
      status: drawing.status || 'draft',
      priority: drawing.priority || 'normal',
      assigned_to: drawing.assigned_to || 'Unassigned',
      revision_number: drawing.revision_number || 1,
      submitted_date: drawing.submitted_date,
      due_date: drawing.due_date,
      approved_date: drawing.approved_date,
      completed_date: drawing.completed_date,
      file_path: drawing.file_path,
      file_size: drawing.file_size,
      file_type: drawing.file_type,
      notes: drawing.notes || '',
      approval_notes: drawing.approval_notes,
      rejection_reason: drawing.rejection_reason,
      notification_sent: drawing.notification_sent || false,
      manufacturing_ready: drawing.manufacturing_ready || false,
      created_at: drawing.created_at,
      updated_at: drawing.updated_at,
      created_by: drawing.created_by || 'System'
    }))

    return NextResponse.json({
      success: true,
      data: shopDrawings,
      count: shopDrawings.length,
      filters: {
        status,
        priority,
        assigned_to: assignedTo,
        customer,
        search,
        date_range: dateRange
      }
    })

  } catch (error) {
    console.error('Shop drawings API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: (error as Error).message
    }, { status: 500 })
  }
}