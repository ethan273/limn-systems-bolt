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
      .from('report_schedules')
      .insert({
        ...body,
        created_by: user.id,
        schedule_config: {
          time: body.time,
          day: body.day,
          date: body.date
        }
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error scheduling report:', error)
    return NextResponse.json({ error: 'Failed to schedule report' }, { status: 500 })
  }
}