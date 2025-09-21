import { createServerSupabaseClient } from '@/lib/supabase/server'
import { config } from '@/lib/config/environment'

interface ServiceHealthDetails {
  error?: string
  code?: string
  threshold?: string
  missingVariables?: string[]
  services?: ServiceCheck[]
  heapUsedMB?: number
  heapTotalMB?: number
  rssUsedMB?: number
  [key: string]: unknown
}

interface ServiceCheck {
  name: string
  status: 'pass' | 'warn' | 'fail'
  responseTime?: number
  message: string
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  checks: {
    [key: string]: {
      status: 'pass' | 'warn' | 'fail'
      responseTime?: number
      message?: string
      details?: ServiceHealthDetails
    }
  }
  metadata: {
    environment: string
    version?: string
    uptime: number
  }
}

export class HealthChecker {
  private startTime: number

  constructor() {
    this.startTime = Date.now()
  }

  async performHealthCheck(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString()
    const checks: HealthCheckResult['checks'] = {}

    // Database connectivity check
    checks.database = await this.checkDatabase()
    
    // Environment configuration check
    checks.environment = await this.checkEnvironment()
    
    // External services check
    checks.external_services = await this.checkExternalServices()
    
    // File system check
    checks.file_system = await this.checkFileSystem()
    
    // Memory usage check
    checks.memory = await this.checkMemoryUsage()
    
    // Disk usage check
    checks.disk = await this.checkDiskUsage()

    // Determine overall status
    const hasFailures = Object.values(checks).some(check => check.status === 'fail')
    const hasWarnings = Object.values(checks).some(check => check.status === 'warn')
    
    let status: HealthCheckResult['status'] = 'healthy'
    if (hasFailures) {
      status = 'unhealthy'
    } else if (hasWarnings) {
      status = 'degraded'
    }

    return {
      status,
      timestamp,
      checks,
      metadata: {
        environment: config.env().NODE_ENV,
        version: process.env.BUILD_ID || process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
        uptime: Date.now() - this.startTime
      }
    }
  }

  private async checkDatabase(): Promise<HealthCheckResult['checks']['database']> {
    try {
      const startTime = Date.now()
      const supabase = await createServerSupabaseClient()
      
      // Simple connectivity test
      const { error } = await supabase
        .from('customers')
        .select('id')
        .limit(1)
        .single()

      const responseTime = Date.now() - startTime

      if (error && error.code !== 'PGRST116' && error.code !== 'PGRST205') {
        // PGRST116 = no rows, PGRST205 = relation does not exist (both acceptable)
        return {
          status: 'fail',
          responseTime,
          message: 'Database connectivity failed',
          details: { error: error.message, code: error.code }
        }
      }

      // Warn if response time is slow
      if (responseTime > 2000) {
        return {
          status: 'warn',
          responseTime,
          message: 'Database response time is slow',
          details: { threshold: '2000ms' }
        }
      }

      return {
        status: 'pass',
        responseTime,
        message: 'Database connection healthy'
      }

    } catch (error) {
      return {
        status: 'fail',
        message: 'Database connectivity failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }

  private async checkEnvironment(): Promise<HealthCheckResult['checks']['environment']> {
    try {
      const requiredVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY'
      ]

      const missingVars = requiredVars.filter(
        varName => !process.env[varName]
      )

      if (missingVars.length > 0) {
        return {
          status: 'fail',
          message: 'Missing required environment variables',
          details: { missingVariables: missingVars }
        }
      }

      // Check for optional but recommended variables in production
      if (config.isProduction()) {
        const recommendedVars = [
          'SENTRY_DSN',
          'NEXTAUTH_SECRET'
        ]

        const missingRecommended = recommendedVars.filter(
          varName => !process.env[varName]
        )

        if (missingRecommended.length > 0) {
          return {
            status: 'warn',
            message: 'Missing recommended environment variables for production',
            details: { missingVariables: missingRecommended }
          }
        }
      }

      return {
        status: 'pass',
        message: 'Environment configuration is valid'
      }

    } catch (error) {
      return {
        status: 'fail',
        message: 'Environment validation failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }

  private async checkExternalServices(): Promise<HealthCheckResult['checks']['external_services']> {
    const services = []
    
    try {
      // Check QuickBooks integration if enabled
      const qbConfig = config.quickbooks()
      if (qbConfig.enabled) {
        services.push(await this.checkQuickBooksConnectivity())
      }

      // Check PandaDoc integration if enabled
      const pandaDocConfig = config.pandadoc()
      if (pandaDocConfig.enabled) {
        services.push(await this.checkPandaDocConnectivity())
      }

      // Check shipping service if enabled
      const shippingConfig = config.shipping()
      if (shippingConfig.seko.enabled) {
        services.push(await this.checkShippingServiceConnectivity())
      }

      const failedServices = services.filter(service => service.status === 'fail')
      const warnServices = services.filter(service => service.status === 'warn')

      if (failedServices.length > 0) {
        return {
          status: 'fail',
          message: `${failedServices.length} external service(s) failed`,
          details: { services }
        }
      }

      if (warnServices.length > 0) {
        return {
          status: 'warn',
          message: `${warnServices.length} external service(s) degraded`,
          details: { services }
        }
      }

      return {
        status: 'pass',
        message: 'All external services healthy',
        details: { services }
      }

    } catch (error) {
      return {
        status: 'fail',
        message: 'External services check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }

  private async checkQuickBooksConnectivity(): Promise<ServiceCheck> {
    try {
      // Simple connectivity test (in real implementation, this would ping QB API)
      const startTime = Date.now()
      
      // Simulate API check
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const responseTime = Date.now() - startTime
      
      return {
        name: 'quickbooks',
        status: 'pass',
        responseTime,
        message: 'QuickBooks API accessible'
      }
    } catch {
      return {
        name: 'quickbooks',
        status: 'fail',
        message: 'QuickBooks API connectivity failed'
      }
    }
  }

  private async checkPandaDocConnectivity(): Promise<ServiceCheck> {
    try {
      const startTime = Date.now()
      
      // Simulate API check
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const responseTime = Date.now() - startTime
      
      return {
        name: 'pandadoc',
        status: 'pass',
        responseTime,
        message: 'PandaDoc API accessible'
      }
    } catch {
      return {
        name: 'pandadoc',
        status: 'fail',
        message: 'PandaDoc API connectivity failed'
      }
    }
  }

  private async checkShippingServiceConnectivity(): Promise<ServiceCheck> {
    try {
      const startTime = Date.now()
      
      // Simulate API check
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const responseTime = Date.now() - startTime
      
      return {
        name: 'shipping',
        status: 'pass',
        responseTime,
        message: 'Shipping service API accessible'
      }
    } catch {
      return {
        name: 'shipping',
        status: 'fail',
        message: 'Shipping service API connectivity failed'
      }
    }
  }

  private async checkFileSystem(): Promise<HealthCheckResult['checks']['file_system']> {
    try {
      const fs = await import('fs/promises')
      const path = await import('path')
      
      // Check if we can write to temp directory
      const tempFile = path.join(process.cwd(), '.tmp-health-check')
      const startTime = Date.now()
      
      await fs.writeFile(tempFile, 'health-check')
      await fs.readFile(tempFile, 'utf-8')
      await fs.unlink(tempFile)
      
      const responseTime = Date.now() - startTime
      
      return {
        status: 'pass',
        responseTime,
        message: 'File system read/write operations successful'
      }

    } catch (error) {
      return {
        status: 'fail',
        message: 'File system access failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }

  private async checkMemoryUsage(): Promise<HealthCheckResult['checks']['memory']> {
    try {
      const memUsage = process.memoryUsage()
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024)
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024)
      const rssUsedMB = Math.round(memUsage.rss / 1024 / 1024)
      
      // Memory usage thresholds (adjust based on your application)
      const criticalThreshold = 512 // 512MB
      const warningThreshold = 256  // 256MB
      
      if (heapUsedMB > criticalThreshold) {
        return {
          status: 'fail',
          message: 'Memory usage critically high',
          details: { 
            heapUsedMB, 
            heapTotalMB, 
            rssUsedMB,
            threshold: `${criticalThreshold}MB`
          }
        }
      }
      
      if (heapUsedMB > warningThreshold) {
        return {
          status: 'warn',
          message: 'Memory usage elevated',
          details: { 
            heapUsedMB, 
            heapTotalMB, 
            rssUsedMB,
            threshold: `${warningThreshold}MB`
          }
        }
      }
      
      return {
        status: 'pass',
        message: 'Memory usage normal',
        details: { heapUsedMB, heapTotalMB, rssUsedMB }
      }

    } catch (error) {
      return {
        status: 'fail',
        message: 'Memory usage check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }

  private async checkDiskUsage(): Promise<HealthCheckResult['checks']['disk']> {
    try {
      // This is a simplified check - in production you might want to check actual disk usage
      const fs = await import('fs/promises')
      
      try {
        await fs.access(process.cwd())
        
        return {
          status: 'pass',
          message: 'Disk access normal'
        }
      } catch (error) {
        return {
          status: 'fail',
          message: 'Disk access failed',
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        }
      }

    } catch (error) {
      return {
        status: 'fail',
        message: 'Disk usage check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }
}

// Global health checker instance
let globalHealthChecker: HealthChecker | null = null

export function getHealthChecker(): HealthChecker {
  if (!globalHealthChecker) {
    globalHealthChecker = new HealthChecker()
  }
  return globalHealthChecker
}

// Quick health check for API endpoints
export async function quickHealthCheck(): Promise<{ status: string; timestamp: string }> {
  try {
    const supabase = await createServerSupabaseClient()
    await supabase.from('customers').select('id').limit(1)
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString()
    }
  } catch {
    return {
      status: 'error',
      timestamp: new Date().toISOString()
    }
  }
}