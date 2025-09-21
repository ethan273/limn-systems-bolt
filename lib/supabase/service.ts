import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Service Role Supabase Client
 * Used for server-side operations that need elevated privileges
 * Only use in API routes and server components that require admin access
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // During build time, environment variables might not be available
  // Return a mock client to prevent build failures
  if (!supabaseUrl || !serviceRoleKey) {
    if (process.env.NODE_ENV === 'development' || process.env.NEXT_PHASE === 'phase-production-build') {
      console.warn('Supabase service client: Missing environment variables during build/dev')
      // Return a minimal mock client that won't be used during build
      return {
        from: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) })
      } as unknown as ReturnType<typeof createSupabaseClient>
    }
    throw new Error(
      'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Export for compatibility
export const supabaseService = createClient
export default createClient