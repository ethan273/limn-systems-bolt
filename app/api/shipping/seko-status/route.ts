import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Check Seko integration status from configuration table
    const { data: integration, error } = await supabase
      .from('integration_status')
      .select('*')
      .eq('service_name', 'seko_logistics')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch Seko status' }, { status: 500 })
    }

    // If no integration record exists, return default status
    if (!integration) {
      const fallbackStatus = {
        connection_status: 'disconnected' as const,
        last_sync: null,
        api_calls_today: 0,
        rate_limit_remaining: 1000,
        service_availability: {
          ground: false,
          air: false,
          ocean: false,
          white_glove: false
        },
        last_error: null,
        configuration: {
          api_endpoint: 'https://api.sekologistics.com',
          timeout_seconds: 30,
          retry_attempts: 3
        }
      }

      return NextResponse.json({
        success: true,
        data: fallbackStatus
      })
    }

    // Parse integration data
    const status = {
      connection_status: integration.status || 'disconnected',
      last_sync: integration.last_sync_date,
      api_calls_today: integration.api_calls_today || 0,
      rate_limit_remaining: integration.rate_limit_remaining || 1000,
      service_availability: integration.service_availability || {
        ground: false,
        air: false,
        ocean: false,
        white_glove: false
      },
      last_error: integration.last_error,
      configuration: integration.configuration || {
        api_endpoint: 'https://api.sekologistics.com',
        timeout_seconds: 30,
        retry_attempts: 3
      }
    }

    // Test connection if status shows connected but it's been more than 1 hour since last sync
    if (status.connection_status === 'connected' && status.last_sync) {
      const lastSyncTime = new Date(status.last_sync).getTime()
      const oneHourAgo = Date.now() - (60 * 60 * 1000)
      
      if (lastSyncTime < oneHourAgo) {
        // Perform a lightweight connection test
        try {
          await testSekoConnection()
          
          // Update last sync time
          await supabase
            .from('integration_status')
            .update({ 
              last_sync_date: new Date().toISOString(),
              status: 'connected'
            })
            .eq('service_name', 'seko_logistics')
        } catch (testError) {
          console.error('Seko connection test failed:', testError)
          
          // Update status to error
          await supabase
            .from('integration_status')
            .update({ 
              status: 'error',
              last_error: testError instanceof Error ? testError.message : 'Connection test failed'
            })
            .eq('service_name', 'seko_logistics')
          
          status.connection_status = 'error'
          status.last_error = testError instanceof Error ? testError.message : 'Connection test failed'
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: status,
      last_checked: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching Seko integration status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()
    const supabase = await createServerSupabaseClient()

    if (action === 'test_connection') {
      try {
        await testSekoConnection()
        
        // Update integration status
        await supabase
          .from('integration_status')
          .upsert({
            service_name: 'seko_logistics',
            status: 'connected',
            last_sync_date: new Date().toISOString(),
            service_availability: {
              ground: true,
              air: true,
              ocean: true,
              white_glove: true
            }
          })

        return NextResponse.json({
          success: true,
          message: 'Connection test successful',
          connection_status: 'connected'
        })
      } catch (testError) {
        console.error('Seko connection test failed:', testError)
        
        // Update integration status with error
        await supabase
          .from('integration_status')
          .upsert({
            service_name: 'seko_logistics',
            status: 'error',
            last_error: testError instanceof Error ? testError.message : 'Connection test failed',
            service_availability: {
              ground: false,
              air: false,
              ocean: false,
              white_glove: false
            }
          })

        return NextResponse.json({
          success: false,
          message: 'Connection test failed',
          error: testError instanceof Error ? testError.message : 'Connection test failed',
          connection_status: 'error'
        }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Error updating Seko integration status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Mock function to test Seko connection
// In a real implementation, this would make an actual API call to Seko
async function testSekoConnection(): Promise<void> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Simulate occasional connection failures for testing
  if (Math.random() < 0.1) { // 10% chance of failure
    throw new Error('Seko API temporarily unavailable')
  }
  
  // Connection successful
  return
}