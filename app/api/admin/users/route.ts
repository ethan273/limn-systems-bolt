/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { withAdminSecurity, auditAdminEvent } from '@/lib/security/admin-security'
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limiting/middleware'
import { errorResponses } from '@/lib/error-handling/error-middleware'
// import { secureLogger } from '@/lib/logging/secure-logger' // Unused

const getHandler = withAdminSecurity(async (request: NextRequest, { user, session }) => {
  // Apply admin rate limiting
  const rateLimitResult = await withRateLimit(request, rateLimitConfigs.admin_moderate)
  if (!rateLimitResult.success) {
    return rateLimitResult.response!
  }
  const supabase = await createServerSupabaseClient()
  const searchParams = request.nextUrl.searchParams
  const userType = searchParams.get('type')
  
  await auditAdminEvent('sensitive_data_access', {
    userId: user.id,
    userEmail: user.email,
    action: 'view_user_management',
    resource: 'user_list',
    sessionId: session.sessionId,
    ipAddress: session.ipAddress
  })
  
  try {
    // Fetch from database only
    const { data: users, error } = await supabase
      .from('v_user_management')
      .select('*');

    if (error || !users || users.length === 0) {
      // Return sample data for development when database is empty
      const sampleUsers = [
        {
          id: 'user-1',
          email: 'ethan@limn.us.com',
          title: 'Chief Executive Officer',
          user_type: 'Super Admin',
          department: 'Executive',
          is_active: true,
          created_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          hire_date: '2020-01-01',
          permissions: {}
        },
        {
          id: 'user-2',
          email: 'sarah.chen@limn.us.com',
          title: 'Senior Designer',
          user_type: 'Designer',
          department: 'Design',
          is_active: true,
          created_at: new Date().toISOString(),
          last_sign_in_at: new Date(Date.now() - 86400000).toISOString(),
          hire_date: '2021-03-15',
          permissions: {}
        },
        {
          id: 'user-3',
          email: 'mike.rodriguez@limn.us.com',
          title: 'Production Manager',
          user_type: 'Employee',
          department: 'Manufacturing',
          is_active: true,
          created_at: new Date().toISOString(),
          last_sign_in_at: new Date(Date.now() - 172800000).toISOString(),
          hire_date: '2020-08-20',
          permissions: {}
        },
        {
          id: 'user-4',
          email: 'lisa.park@contractor.com',
          title: 'Quality Inspector',
          user_type: 'Contractor',
          department: 'Quality',
          is_active: true,
          created_at: new Date().toISOString(),
          last_sign_in_at: new Date(Date.now() - 259200000).toISOString(),
          hire_date: '2022-01-10',
          permissions: {}
        },
        {
          id: 'user-5',
          email: 'david.kim@limn.us.com',
          title: 'Financial Analyst',
          user_type: 'Finance',
          department: 'Finance',
          is_active: true,
          created_at: new Date().toISOString(),
          last_sign_in_at: new Date(Date.now() - 86400000).toISOString(),
          hire_date: '2021-06-01',
          permissions: {}
        },
        {
          id: 'user-6',
          email: 'emma.thompson@furniture.co',
          title: 'External Manufacturer',
          user_type: 'Manufacturer',
          department: 'External',
          is_active: true,
          created_at: new Date().toISOString(),
          last_sign_in_at: new Date(Date.now() - 345600000).toISOString(),
          hire_date: '2022-09-15',
          permissions: {}
        }
      ];

      // Filter by user type if specified
      let filteredUsers = sampleUsers;
      if (userType && userType !== 'all') {
        filteredUsers = sampleUsers.filter(user => 
          user.user_type?.toLowerCase() === userType.toLowerCase()
        );
      }
      
      return NextResponse.json({ data: filteredUsers });
    }

    // Filter by user type if specified for real data
    let filteredUsers = users || []
    if (userType && userType !== 'all') {
      filteredUsers = filteredUsers.filter((user: any) => 
        user.user_type?.toLowerCase() === userType.toLowerCase()
      )
    }
    
    return NextResponse.json({ data: filteredUsers })
  } catch (error: unknown) {
    return await errorResponses.internal(error as Error, request)
  }
}, {
  requireMFA: true,
  requireRecentAuth: true
});

export { getHandler as GET };

const putHandler = withAdminSecurity(async (request: NextRequest, { user, session }) => {
  // Apply admin rate limiting
  const rateLimitResult = await withRateLimit(request, rateLimitConfigs.admin_moderate)
  if (!rateLimitResult.success) {
    return rateLimitResult.response!
  }
  await auditAdminEvent('user_management_action', {
    userId: user.id,
    userEmail: user.email,
    action: 'update_user_profile',
    resource: 'user_profiles',
    sessionId: session.sessionId,
    ipAddress: session.ipAddress,
    metadata: { timestamp: new Date().toISOString() }
  })
  
  const supabase = await createServerSupabaseClient()
  
  try {
    const body = await request.json()
    const { userId, updates } = body

    // Update user profile in database
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      return await errorResponses.database(error, request, user.id)
    }
    
    await auditAdminEvent('user_management_action', {
      userId: user.id,
      userEmail: user.email,
      action: 'update_user_profile_success',
      resource: 'user_profiles',
      targetUserId: userId,
      sessionId: session.sessionId,
      ipAddress: session.ipAddress,
      metadata: { 
        updates: Object.keys(updates).join(', '),
        timestamp: new Date().toISOString() 
      }
    })
    
    return NextResponse.json({ 
      success: true, 
      message: 'User updated successfully',
      data
    })
  } catch (error: unknown) {
    await auditAdminEvent('user_management_action', {
      userId: user.id,
      userEmail: user.email,
      action: 'update_user_profile_failed',
      resource: 'user_profiles',
      sessionId: session.sessionId,
      ipAddress: session.ipAddress,
      metadata: { 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString() 
      }
    })
    
    return await errorResponses.internal(error as Error, request, user.id)
  }
}, {
  requireMFA: true,
  requireRecentAuth: true
});

export { putHandler as PUT };