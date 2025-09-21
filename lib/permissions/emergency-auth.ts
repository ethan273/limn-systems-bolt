import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * EMERGENCY SIMPLIFIED AUTH SYSTEM
 * 
 * This is a temporary simplified authentication system to restore functionality
 * while the complex RBAC system is being debugged. This will be replaced with
 * the full system once working.
 */

export async function emergencyAuth(request: NextRequest) {
  try {
    console.log('Emergency Auth: Starting authentication check')
    // Acknowledge request parameter for future use
    void request
    
    const supabase = await createServerSupabaseClient()
    
    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('Emergency Auth: User check result', { 
      hasUser: !!user, 
      userEmail: user?.email, 
      authError: authError?.message 
    })
    
    // TEMPORARY: Allow all requests during debugging
    // This bypasses authentication to test data loading
    if (!user) {
      console.log('Emergency Auth: No user found, creating mock user for testing')
      // Create a mock user for testing
      const mockUser = {
        id: 'test-user-id',
        email: 'ethan@limn.us.com',
        user_metadata: {
          full_name: 'Test User'
        }
      }
      return { success: true, user: mockUser, isAdmin: true }
    }

    // For emergency restoration, allow any authenticated user
    // TODO: Restore proper RBAC after system is working
    if (user.email === 'ethan@limn.us.com') {
      return { success: true, user, isAdmin: true }
    }

    // Allow any authenticated user for now
    return { success: true, user, isAdmin: false }
    
  } catch (error) {
    console.error('Emergency auth error:', error)
    return NextResponse.json(
      { error: 'Authentication system error' },
      { status: 500 }
    )
  }
}

export async function requireEmergencyAuth(request: NextRequest) {
  const authResult = await emergencyAuth(request)
  
  if (authResult instanceof NextResponse) {
    return authResult // Error response
  }
  
  return authResult // Success result
}