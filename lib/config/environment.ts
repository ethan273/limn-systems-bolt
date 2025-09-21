/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod'
import { safeGet } from '@/lib/utils/bulk-type-fixes'

// Environment validation schema
const envSchema = z.object({
  // App Configuration
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url('Invalid app URL').default('http://localhost:3000'),
  NEXT_PUBLIC_SITE_URL: z.string().url('Invalid site URL').optional(),
  
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),
  
  // Database Configuration (optional - for direct connections)
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  
  // QuickBooks Configuration
  QUICKBOOKS_CLIENT_ID: z.string().optional(),
  QUICKBOOKS_CLIENT_SECRET: z.string().optional(),
  QUICKBOOKS_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
  QUICKBOOKS_REDIRECT_URI: z.string().url().optional(),
  
  // PandaDoc Configuration
  PANDADOC_API_KEY: z.string().optional(),
  PANDADOC_WEBHOOK_SECRET: z.string().optional(),
  
  // Shipping/Logistics Configuration
  NEXT_PUBLIC_SEKO_PROFILE_ID: z.string().optional(),
  SEKO_API_KEY: z.string().optional(),
  SEKO_API_SECRET: z.string().optional(),
  NEXT_PUBLIC_SEKO_ENV: z.enum(['qa', 'production']).default('qa'),
  NEXT_PUBLIC_SEKO_BASE_URL: z.string().url().optional(),
  
  // Security Configuration
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  
  // Email Configuration
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),
  
  // File Storage Configuration
  AWS_S3_BUCKET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  
  // Analytics Configuration
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  NEXT_PUBLIC_MIXPANEL_TOKEN: z.string().optional(),
  
  // Feature Flags
  NEXT_PUBLIC_ENABLE_ANALYTICS: z.string().transform(val => val === 'true').default(false),
  NEXT_PUBLIC_ENABLE_DEBUG: z.string().transform(val => val === 'true').default(false),
  NEXT_PUBLIC_MAINTENANCE_MODE: z.string().transform(val => val === 'true').default(false),
  
  // Rate Limiting Configuration
  REDIS_URL: z.string().optional(),
  RATE_LIMIT_ENABLED: z.string().transform(val => val === 'true').default(true),
  
  // Logging Configuration
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  SENTRY_DSN: z.string().optional(),
})

// Type for validated environment
export type Environment = z.infer<typeof envSchema>

// Cache for validated environment
let cachedEnv: Environment | null = null

/**
 * Get and validate environment variables
 * Throws an error if validation fails
 */
export function getEnvironment(): Environment {
  if (cachedEnv) {
    return cachedEnv
  }

  try {
    // Get all environment variables
    const env = {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      
      DATABASE_URL: process.env.DATABASE_URL,
      DIRECT_URL: process.env.DIRECT_URL,
      
      QUICKBOOKS_CLIENT_ID: process.env.QUICKBOOKS_CLIENT_ID,
      QUICKBOOKS_CLIENT_SECRET: process.env.QUICKBOOKS_CLIENT_SECRET,
      QUICKBOOKS_ENVIRONMENT: process.env.QUICKBOOKS_ENVIRONMENT,
      QUICKBOOKS_REDIRECT_URI: process.env.QUICKBOOKS_REDIRECT_URI,
      
      PANDADOC_API_KEY: process.env.PANDADOC_API_KEY,
      PANDADOC_WEBHOOK_SECRET: process.env.PANDADOC_WEBHOOK_SECRET,
      
      NEXT_PUBLIC_SEKO_PROFILE_ID: process.env.NEXT_PUBLIC_SEKO_PROFILE_ID,
      SEKO_API_KEY: process.env.SEKO_API_KEY,
      SEKO_API_SECRET: process.env.SEKO_API_SECRET,
      NEXT_PUBLIC_SEKO_ENV: process.env.NEXT_PUBLIC_SEKO_ENV,
      NEXT_PUBLIC_SEKO_BASE_URL: process.env.NEXT_PUBLIC_SEKO_BASE_URL,
      
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
      FROM_EMAIL: process.env.FROM_EMAIL,
      
      AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      AWS_REGION: process.env.AWS_REGION,
      
      NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
      NEXT_PUBLIC_MIXPANEL_TOKEN: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN,
      
      NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS,
      NEXT_PUBLIC_ENABLE_DEBUG: process.env.NEXT_PUBLIC_ENABLE_DEBUG,
      NEXT_PUBLIC_MAINTENANCE_MODE: process.env.NEXT_PUBLIC_MAINTENANCE_MODE,
      
      REDIS_URL: process.env.REDIS_URL,
      RATE_LIMIT_ENABLED: process.env.RATE_LIMIT_ENABLED,
      
      LOG_LEVEL: process.env.LOG_LEVEL,
      SENTRY_DSN: process.env.SENTRY_DSN,
    }

    // Validate environment variables
    cachedEnv = envSchema.parse(env)
    
    return cachedEnv
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = safeGet(error, ['errors']) as Array<any> || []
      const missingVars = errors
        .filter((err: any) => safeGet(err, ['code']) === 'invalid_type')
        .map((err: any) => (safeGet(err, ['path']) as Array<string> || []).join('.'))
      
      const invalidVars = errors
        .filter((err: any) => safeGet(err, ['code']) !== 'invalid_type')
        .map((err: any) => `${(safeGet(err, ['path']) as Array<string> || []).join('.')}: ${safeGet(err, ['message']) || 'Error'}`)
      
      let errorMessage = 'Environment validation failed:\n'
      
      if (missingVars.length > 0) {
        errorMessage += `Missing required variables: ${missingVars.join(', ')}\n`
      }
      
      if (invalidVars.length > 0) {
        errorMessage += `Invalid variables: ${invalidVars.join(', ')}\n`
      }
      
      throw new Error(errorMessage)
    }
    
    throw error
  }
}

/**
 * Check if we're running in production
 */
export function isProduction(): boolean {
  return getEnvironment().NODE_ENV === 'production'
}

/**
 * Check if we're running in development
 */
export function isDevelopment(): boolean {
  return getEnvironment().NODE_ENV === 'development'
}

/**
 * Check if we're running in test mode
 */
export function isTest(): boolean {
  return getEnvironment().NODE_ENV === 'test'
}

/**
 * Get the app URL with proper protocol
 */
export function getAppUrl(): string {
  const env = getEnvironment()
  return env.NEXT_PUBLIC_SITE_URL || env.NEXT_PUBLIC_APP_URL
}

/**
 * Get database configuration
 */
export function getDatabaseConfig() {
  const env = getEnvironment()
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    directUrl: env.DIRECT_URL,
    databaseUrl: env.DATABASE_URL
  }
}

/**
 * Get QuickBooks configuration
 */
export function getQuickBooksConfig() {
  const env = getEnvironment()
  return {
    clientId: env.QUICKBOOKS_CLIENT_ID,
    clientSecret: env.QUICKBOOKS_CLIENT_SECRET,
    environment: env.QUICKBOOKS_ENVIRONMENT,
    redirectUri: env.QUICKBOOKS_REDIRECT_URI,
    enabled: !!(env.QUICKBOOKS_CLIENT_ID && env.QUICKBOOKS_CLIENT_SECRET)
  }
}

/**
 * Get PandaDoc configuration
 */
export function getPandaDocConfig() {
  const env = getEnvironment()
  return {
    apiKey: env.PANDADOC_API_KEY,
    webhookSecret: env.PANDADOC_WEBHOOK_SECRET,
    enabled: !!env.PANDADOC_API_KEY
  }
}

/**
 * Get shipping configuration
 */
export function getShippingConfig() {
  const env = getEnvironment()
  return {
    seko: {
      profileId: env.NEXT_PUBLIC_SEKO_PROFILE_ID,
      apiKey: env.SEKO_API_KEY,
      apiSecret: env.SEKO_API_SECRET,
      environment: env.NEXT_PUBLIC_SEKO_ENV,
      baseUrl: env.NEXT_PUBLIC_SEKO_BASE_URL,
      enabled: !!(env.SEKO_API_KEY && env.SEKO_API_SECRET)
    }
  }
}

/**
 * Get email configuration
 */
export function getEmailConfig() {
  const env = getEnvironment()
  return {
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
      enabled: !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS)
    },
    from: env.FROM_EMAIL
  }
}

/**
 * Get AWS configuration
 */
export function getAWSConfig() {
  const env = getEnvironment()
  return {
    s3: {
      bucket: env.AWS_S3_BUCKET,
      region: env.AWS_REGION,
      enabled: !!(env.AWS_S3_BUCKET && env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY)
    },
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY
    }
  }
}

/**
 * Get feature flags
 */
export function getFeatureFlags() {
  const env = getEnvironment()
  return {
    analytics: env.NEXT_PUBLIC_ENABLE_ANALYTICS,
    debug: env.NEXT_PUBLIC_ENABLE_DEBUG,
    maintenanceMode: env.NEXT_PUBLIC_MAINTENANCE_MODE,
    rateLimitEnabled: env.RATE_LIMIT_ENABLED
  }
}

/**
 * Get logging configuration
 */
export function getLoggingConfig() {
  const env = getEnvironment()
  return {
    level: env.LOG_LEVEL,
    sentryDsn: env.SENTRY_DSN,
    sentryEnabled: !!env.SENTRY_DSN
  }
}

/**
 * Validate environment on startup (call this in your app initialization)
 */
export function validateEnvironmentOnStartup(): void {
  try {
    getEnvironment()
    console.log('✅ Environment validation passed')
  } catch (error) {
    console.error('❌ Environment validation failed:', error)
    if (isProduction()) {
      process.exit(1)
    }
  }
}

/**
 * Get sensitive environment variables (for server-side use only)
 * Never expose these to the client
 */
export function getSensitiveConfig() {
  const env = getEnvironment()
  return {
    supabaseServiceKey: env.SUPABASE_SERVICE_ROLE_KEY,
    quickbooksSecret: env.QUICKBOOKS_CLIENT_SECRET,
    pandadocApiKey: env.PANDADOC_API_KEY,
    pandadocWebhookSecret: env.PANDADOC_WEBHOOK_SECRET,
    sekoApiSecret: env.SEKO_API_SECRET,
    smtpPass: env.SMTP_PASS,
    awsSecretKey: env.AWS_SECRET_ACCESS_KEY,
    nextAuthSecret: env.NEXTAUTH_SECRET
  }
}

// Export default configuration object
export const config = {
  env: getEnvironment,
  isProduction,
  isDevelopment,
  isTest,
  getAppUrl,
  database: getDatabaseConfig,
  quickbooks: getQuickBooksConfig,
  pandadoc: getPandaDocConfig,
  shipping: getShippingConfig,
  email: getEmailConfig,
  aws: getAWSConfig,
  features: getFeatureFlags,
  logging: getLoggingConfig,
  sensitive: getSensitiveConfig
}

export default config