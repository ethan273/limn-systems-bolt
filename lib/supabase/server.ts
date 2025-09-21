import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During build time, environment variables might not be available
  if (!supabaseUrl || !supabaseAnonKey) {
    if (process.env.NODE_ENV === 'development' || process.env.NEXT_PHASE === 'phase-production-build') {
      console.warn('Supabase server client: Missing environment variables during build/dev')
      // Return a minimal mock client that won't be used during build
      return {
        from: () => ({ 
          select: () => ({ 
            single: () => Promise.resolve({ data: null, error: null }),
            eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) })
          }) 
        }),
        auth: {
          getSession: () => Promise.resolve({ data: { session: null }, error: null })
        }
      } as unknown as ReturnType<typeof createServerClient>
    }
    throw new Error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  const cookieStore = await cookies()

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component, ignore
          }
        },
      },
    }
  )
}

// Alias for compatibility
export const createClient = createServerSupabaseClient
