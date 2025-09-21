import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

// GET /api/portal/notifications/preferences - Get notification preferences
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get customer ID
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('email', user.email)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Get preferences
    const { data: preferences, error: preferencesError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('customer_id', customer.id)
      .order('category', { ascending: true })
      .order('channel', { ascending: true })

    if (preferencesError) {
      return NextResponse.json({ error: preferencesError.message }, { status: 500 })
    }

    return NextResponse.json({ preferences: preferences || [] })

  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/portal/notifications/preferences - Update notification preferences
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const { preferences } = body

    if (!Array.isArray(preferences)) {
      return NextResponse.json(
        { error: 'Preferences must be an array' },
        { status: 400 }
      )
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get customer ID
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('email', user.email)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Validate preferences structure
    for (const pref of preferences) {
      if (!pref.category || !pref.channel || typeof pref.enabled !== 'boolean') {
        return NextResponse.json(
          { error: 'Invalid preference structure. Each preference must have category, channel, and enabled fields' },
          { status: 400 }
        )
      }
    }

    // Delete existing preferences
    const { error: deleteError } = await supabase
      .from('notification_preferences')
      .delete()
      .eq('customer_id', customer.id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Insert new preferences
    const preferencesToInsert = preferences.map(pref => ({
      customer_id: customer.id,
      category: pref.category,
      channel: pref.channel,
      enabled: pref.enabled,
      frequency: pref.frequency || 'immediate',
      quiet_hours_start: pref.quiet_hours_start || null,
      quiet_hours_end: pref.quiet_hours_end || null
    }))

    const { data: insertedPreferences, error: insertError } = await supabase
      .from('notification_preferences')
      .insert(preferencesToInsert)
      .select()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_customer_id: customer.id,
      p_activity_type: 'settings_updated',
      p_entity_type: 'user',
      p_entity_id: customer.id,
      p_description: 'Updated notification preferences',
      p_metadata: { preference_count: preferences.length }
    })

    return NextResponse.json({ 
      success: true,
      preferences: insertedPreferences,
      message: 'Notification preferences updated successfully'
    })

  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}