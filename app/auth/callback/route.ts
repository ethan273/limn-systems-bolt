/* eslint-disable @typescript-eslint/no-unused-vars */
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  const userType = searchParams.get('type')
  
  // Auth callback processing
  
  // Handle OAuth errors first
  if (error) {
    return NextResponse.redirect(`${origin}/auth?error=${error}&details=${encodeURIComponent(errorDescription || '')}`)
  }
  
  if (code) {
    const supabase = await createServerSupabaseClient()
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        return NextResponse.redirect(`${origin}/auth?error=auth_failed&details=${encodeURIComponent(error.message)}`)
      }

      // OAuth code exchange successful

      if (data.session) {
        const userEmail = data.session.user.email
        
        // Ensure user profile exists (optional but recommended)
        try {
          const { error: profileError } = await supabase.rpc('ensure_current_user_profile')
          if (profileError) {
            // Profile creation warning (non-blocking)
          }
        } catch (profileErr) {
          // Continue with authentication even if profile creation fails
        }

        // Route based on user email domain and type
        
        if (userType === 'employee') {
          // Verify employee has @limn.us.com email
          if (userEmail?.endsWith('@limn.us.com')) {
            return NextResponse.redirect(`${origin}/dashboard`)
          } else {
            // Sign out non-company users trying to use employee login
            await supabase.auth.signOut()
            return NextResponse.redirect(`${origin}/auth?error=invalid_employee_email`)
          }
        } else if (userType === 'customer') {
          // Prevent employees from using customer portal
          if (userEmail?.endsWith('@limn.us.com')) {
            await supabase.auth.signOut()
            return NextResponse.redirect(`${origin}/auth?error=employee_use_sso`)
          } else {
            return NextResponse.redirect(`${origin}/portal`)
          }
        } else {
          // Default routing based on email domain
          if (userEmail?.endsWith('@limn.us.com')) {
            return NextResponse.redirect(`${origin}/dashboard`)
          } else {
            return NextResponse.redirect(`${origin}/portal`)
          }
        }
      }
    } catch (error) {
      return NextResponse.redirect(`${origin}/auth?error=callback_failed`)
    }
  }

  // Return to auth page if no code or other issues
  return NextResponse.redirect(`${origin}/auth?error=no_code`)
}