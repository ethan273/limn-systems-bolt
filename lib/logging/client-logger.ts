// Client-side logging utilities that don't depend on server components
// Safe to use in pages directory and client components

import { createClient } from '@/lib/supabase/client'

// Log levels for different types of events
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info', 
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Log categories for different system areas
export enum LogCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATABASE = 'database',
  API = 'api',
  SECURITY = 'security',
  AUDIT = 'audit',
  PERFORMANCE = 'performance',
  SYSTEM = 'system'
}

// Structured log entry interface
export interface LogEntry {
  level: LogLevel;
  category: LogCategory;
  message: string;
  timestamp: Date;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  stackTrace?: string;
  userAgent?: string;
  ipAddress?: string;
}

class ClientLogger {
  private isProduction = process.env.NODE_ENV === 'production'
  
  // Main logging method
  async log(entry: LogEntry): Promise<void> {
    try {
      // Always log to console in development
      if (!this.isProduction) {
        this.logToConsole(entry)
      }

      // Log to database for important levels
      if (entry.level === LogLevel.ERROR || entry.level === LogLevel.CRITICAL) {
        await this.logToDatabase(entry)
      }
    } catch (error) {
      // Fallback to console if database logging fails
      console.error('Failed to log entry:', error, entry)
    }
  }

  // Convenience methods
  async debug(category: LogCategory, message: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.log({
      level: LogLevel.DEBUG,
      category,
      message,
      timestamp: new Date(),
      metadata
    })
  }

  async info(category: LogCategory, message: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.log({
      level: LogLevel.INFO,
      category,
      message,
      timestamp: new Date(),
      metadata
    })
  }

  async warn(category: LogCategory, message: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.log({
      level: LogLevel.WARN,
      category,
      message,
      timestamp: new Date(),
      metadata
    })
  }

  async error(category: LogCategory, message: string, error?: Error, metadata?: Record<string, unknown>): Promise<void> {
    await this.log({
      level: LogLevel.ERROR,
      category,
      message,
      timestamp: new Date(),
      stackTrace: error?.stack,
      metadata
    })
  }

  async critical(category: LogCategory, message: string, error?: Error, metadata?: Record<string, unknown>): Promise<void> {
    await this.log({
      level: LogLevel.CRITICAL,
      category,
      message,
      timestamp: new Date(),
      stackTrace: error?.stack,
      metadata
    })
  }

  // Console logging for development
  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString()
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.category}]`
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.metadata || '')
        break
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.metadata || '')
        break
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.metadata || '')
        break
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(prefix, entry.message, entry.metadata || '')
        if (entry.stackTrace) {
          console.error('Stack trace:', entry.stackTrace)
        }
        break
    }
  }

  // Database logging (using client-side Supabase)
  private async logToDatabase(entry: LogEntry): Promise<void> {
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('system_logs')
        .insert({
          level: entry.level,
          category: entry.category,
          message: entry.message,
          timestamp: entry.timestamp.toISOString(),
          user_id: entry.userId,
          request_id: entry.requestId,
          metadata: entry.metadata,
          stack_trace: entry.stackTrace,
          user_agent: entry.userAgent,
          ip_address: entry.ipAddress
        })

      if (error) {
        console.error('Failed to log to database:', error)
      }
    } catch (error) {
      console.error('Database logging error:', error)
    }
  }
}

// Export singleton instance
export const clientLogger = new ClientLogger()

// Export for backwards compatibility
export const secureLogger = clientLogger