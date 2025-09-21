import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { portalNotificationService } from '@/lib/services/portal-notification'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customer_id')

    // Check if user is authenticated and is an employee
    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userEmail = session.user.email
    if (!userEmail?.endsWith('@limn.us.com')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    if (customerId) {
      // Get specific customer portal access info
      const { data: customer, error } = await supabase
        .from('customers')
        .select(`
          id,
          first_name,
          last_name,
          email,
          company_name,
          portal_access,
          last_portal_login,
          portal_access_granted_at,
          portal_access_granted_by
        `)
        .eq('id', customerId)
        .single()

      if (error) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
      }

      // Get portal settings
      const { data: settings } = await supabase
        .from('portal_settings')
        .select('*')
        .eq('customer_id', customerId)
        .single()

      // Get recent session activity
      const { data: recentSessions } = await supabase
        .from('portal_sessions')
        .select('*')
        .eq('customer_id', customerId)
        .order('started_at', { ascending: false })
        .limit(5)

      return NextResponse.json({
        customer,
        settings: settings || {
          show_production_tracking: true,
          show_financial_details: false,
          show_shipping_info: true,
          allow_document_upload: true,
          allow_design_approval: true
        },
        recent_sessions: recentSessions || []
      })
    } else {
      // Get all customers with portal access summary
      const { data: customers, error } = await supabase
        .from('customers')
        .select(`
          id,
          first_name,
          last_name,
          email,
          company_name,
          portal_access,
          last_portal_login,
          created_at
        `)
        .order('created_at', { ascending: false })

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
      }

      return NextResponse.json({ customers: customers || [] })
    }
  } catch (error: unknown) {
    console.error('Portal access API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { customer_id, portal_access, settings } = body

    // Check if user is authenticated and is an employee
    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userEmail = session.user.email
    if (!userEmail?.endsWith('@limn.us.com')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Validate required fields
    if (!customer_id || typeof portal_access !== 'boolean') {
      return NextResponse.json({ 
        error: 'Missing required fields: customer_id, portal_access' 
      }, { status: 400 })
    }

    // Update customer portal access
    const { error: customerError } = await supabase
      .from('customers')
      .update({
        portal_access,
        portal_access_granted_at: portal_access ? new Date().toISOString() : null,
        portal_access_granted_by: portal_access ? session.user.id : null
      })
      .eq('id', customer_id)

    if (customerError) {
      return NextResponse.json({ 
        error: 'Failed to update customer portal access' 
      }, { status: 500 })
    }

    // Send portal access notification if access is granted
    if (portal_access) {
      try {
        // Get customer details for notification
        const { data: customerData } = await supabase
          .from('customers')
          .select('id, first_name, last_name, email, phone, company_name')
          .eq('id', customer_id)
          .single()

        if (customerData) {
          // Generate magic link
          const magicLinkResult = await portalNotificationService.generateMagicLink(
            customerData.email,
            60 // 1 hour expiration
          )

          if (magicLinkResult.success && magicLinkResult.magic_link) {
            // Get customer notification preferences
            const preferences = await portalNotificationService.getCustomerNotificationPreferences(customer_id)

            // Send notification
            const notificationResult = await portalNotificationService.sendPortalAccessNotification(
              {
                id: customerData.id,
                first_name: customerData.first_name || undefined,
                last_name: customerData.last_name || undefined,
                email: customerData.email,
                phone: customerData.phone || undefined,
                company_name: customerData.company_name || undefined
              },
              magicLinkResult.magic_link,
              {
                sendEmail: preferences.email_enabled,
                sendSMS: preferences.sms_enabled && !!customerData.phone,
                language: preferences.language
              }
            )

            // Log notification result (don't fail the main request if notification fails)
            if (!notificationResult.success) {
              console.error('Portal access notification failed:', notificationResult.errors)
            }
          } else {
            console.error('Failed to generate magic link:', magicLinkResult.error)
          }
        }
      } catch (notificationError) {
        console.error('Error sending portal access notification:', notificationError)
        // Don't fail the main request if notification fails
      }
    }

    // Update portal settings if provided
    if (settings && portal_access) {
      const { error: settingsError } = await supabase
        .from('portal_settings')
        .upsert({
          customer_id,
          show_production_tracking: settings.show_production_tracking ?? true,
          show_financial_details: settings.show_financial_details ?? false,
          show_shipping_info: settings.show_shipping_info ?? true,
          allow_document_upload: settings.allow_document_upload ?? true,
          allow_design_approval: settings.allow_design_approval ?? true,
          updated_at: new Date().toISOString()
        })

      if (settingsError) {
        console.error('Error updating portal settings:', settingsError)
        // Don't fail the request if settings update fails
      }
    } else if (!portal_access) {
      // Remove portal settings if access is revoked
      await supabase
        .from('portal_settings')
        .delete()
        .eq('customer_id', customer_id)
    }

    // End any active portal sessions if access is revoked
    if (!portal_access) {
      await supabase
        .from('portal_sessions')
        .update({
          ended_at: new Date().toISOString(),
          is_active: false
        })
        .eq('customer_id', customer_id)
        .eq('is_active', true)
    }

    return NextResponse.json({ 
      success: true,
      message: `Portal access ${portal_access ? 'granted' : 'revoked'} successfully`
    })
  } catch (error: unknown) {
    console.error('Portal access update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { customer_id, settings } = body

    // Check if user is authenticated and is an employee
    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userEmail = session.user.email
    if (!userEmail?.endsWith('@limn.us.com')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Validate required fields
    if (!customer_id || !settings) {
      return NextResponse.json({ 
        error: 'Missing required fields: customer_id, settings' 
      }, { status: 400 })
    }

    // Verify customer has portal access
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('portal_access')
      .eq('id', customer_id)
      .single()

    if (customerError || !customer?.portal_access) {
      return NextResponse.json({ 
        error: 'Customer does not have portal access' 
      }, { status: 400 })
    }

    // Update portal settings
    const { error: settingsError } = await supabase
      .from('portal_settings')
      .upsert({
        customer_id,
        show_production_tracking: settings.show_production_tracking ?? true,
        show_financial_details: settings.show_financial_details ?? false,
        show_shipping_info: settings.show_shipping_info ?? true,
        allow_document_upload: settings.allow_document_upload ?? true,
        allow_design_approval: settings.allow_design_approval ?? true,
        updated_at: new Date().toISOString()
      })

    if (settingsError) {
      return NextResponse.json({ 
        error: 'Failed to update portal settings' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Portal settings updated successfully'
    })
  } catch (error: unknown) {
    console.error('Portal settings update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}