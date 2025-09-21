import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('custom_reports')
      .insert({
        ...body,
        created_by: user.id
      })
      .select()
      .single()

    if (error) throw error

    // Trigger report generation
    await supabase
      .from('report_executions')
      .insert({
        custom_report_id: data.id,
        status: 'pending'
      })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error creating custom report:', error)
    return NextResponse.json({ error: 'Failed to create custom report' }, { status: 500 })
  }
}