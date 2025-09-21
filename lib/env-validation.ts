// Production Environment Validation
// This ensures all critical environment variables are present before the app starts

export interface EnvironmentConfig {
  NODE_ENV: string
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  NEXT_PUBLIC_APP_URL: string
}

const requiredEnvVars = [
  'NODE_ENV',
  'NEXT_PUBLIC_SUPABASE_URL', 
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL'
] as const

export function validateEnvironment(): EnvironmentConfig {
  const missing: string[] = []
  const invalid: string[] = []
  
  // Check for missing variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar)
    }
  }
  
  // Check for placeholder values in production
  if (process.env.NODE_ENV === 'production') {
    const placeholderPatterns = [
      'your_supabase_project_url',
      'your_supabase_anon_key', 
      'your_supabase_service_role_key',
      'your-production-domain.com',
      'localhost'
    ]
    
    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar]
      if (value && placeholderPatterns.some(pattern => value.includes(pattern))) {
        invalid.push(`${envVar} contains placeholder value: ${value}`)
      }
    }
  }
  
  // Report issues
  if (missing.length > 0 || invalid.length > 0) {
    console.error('❌ Environment Validation Failed:')
    
    if (missing.length > 0) {
      console.error('Missing required environment variables:')
      missing.forEach(envVar => console.error(`  - ${envVar}`))
    }
    
    if (invalid.length > 0) {
      console.error('Invalid environment variable values:')
      invalid.forEach(issue => console.error(`  - ${issue}`))
    }
    
    if (process.env.NODE_ENV === 'production') {
      console.error('\n🔧 To fix this:')
      console.error('1. Copy .env.production.template to your production environment')
      console.error('2. Replace all placeholder values with real production values')
      console.error('3. Ensure all secrets are properly secured')
      throw new Error('Production environment validation failed')
    }
    
    console.warn('⚠️  Environment issues detected (development mode)')
  } else {
    console.log('✅ Environment validation passed')
  }
  
  return {
    NODE_ENV: process.env.NODE_ENV!,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL!
  }
}

// Auto-validate on import in production
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  validateEnvironment()
}