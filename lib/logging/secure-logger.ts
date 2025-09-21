import { createServerSupabaseClient } from '@/lib/supabase/server';

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
  sessionId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTime?: number;
  metadata?: Record<string, unknown>;
  errorStack?: string;
}

// Secure logger class that replaces console logging
export class SecureLogger {
  private readonly isDevelopment: boolean;
  private readonly logToDatabase: boolean;
  private readonly logToFile: boolean;
  
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.logToDatabase = process.env.LOG_TO_DATABASE === 'true' || false;
    this.logToFile = process.env.LOG_TO_FILE === 'true' || false;
  }
  
  // Main logging method
  private async log(entry: LogEntry): Promise<void> {
    try {
      // Always log to console in development
      if (this.isDevelopment) {
        this.logToConsole(entry);
      }
      
      // Log to database for audit trail (production)
      if (this.logToDatabase && !this.isDevelopment) {
        await this.logToSupabase(entry);
      }
      
      // Log to file system if configured
      if (this.logToFile) {
        await this.logToFileSystem(entry);
      }
      
      // Send critical errors to monitoring service
      if (entry.level === LogLevel.CRITICAL || entry.level === LogLevel.ERROR) {
        await this.sendToMonitoring(entry);
      }
      
    } catch (error) {
      // Fallback: if logging fails, at least log to console
      console.error('Logger error:', error);
      console.error('Original log entry:', JSON.stringify(entry, null, 2));
    }
  }
  
  // Development console logging with formatting
  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.category}]`;
    
    const contextInfo = [
      entry.userId && `User: ${entry.userId}`,
      entry.requestId && `Req: ${entry.requestId}`,
      entry.method && entry.url && `${entry.method} ${entry.url}`,
      entry.statusCode && `Status: ${entry.statusCode}`
    ].filter(Boolean).join(' | ');
    
    const message = `${prefix} ${entry.message}${contextInfo ? ` (${contextInfo})` : ''}`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.metadata);
        break;
      case LogLevel.INFO:
        console.info(message, entry.metadata);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.metadata);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(message, entry.metadata);
        if (entry.errorStack) {
          console.error('Stack trace:', entry.errorStack);
        }
        break;
    }
  }
  
  // Database logging for production audit trail
  private async logToSupabase(entry: LogEntry): Promise<void> {
    try {
      const supabase = await createServerSupabaseClient();
      
      // Insert into system_logs table
      const { error } = await supabase
        .from('system_logs')
        .insert({
          level: entry.level,
          category: entry.category,
          message: entry.message,
          timestamp: entry.timestamp.toISOString(),
          user_id: entry.userId,
          session_id: entry.sessionId,
          request_id: entry.requestId,
          ip_address: entry.ipAddress,
          user_agent: entry.userAgent,
          method: entry.method,
          url: entry.url,
          status_code: entry.statusCode,
          response_time: entry.responseTime,
          metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
          error_stack: entry.errorStack
        });
      
      if (error) {
        throw error;
      }
      
    } catch (error) {
      // Don't throw - logging should not break the application
      console.error('Failed to log to database:', error);
    }
  }
  
  // File system logging (if configured)
  private async logToFileSystem(entry: LogEntry): Promise<void> {
    try {
      // Only import fs when needed
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const logDir = path.join(process.cwd(), 'logs');
      const logFile = path.join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`);
      
      // Ensure log directory exists
      try {
        await fs.mkdir(logDir, { recursive: true });
      } catch {
        // Directory might already exist, ignore error
      }
      
      // Format log entry as JSON line
      const logLine = JSON.stringify(entry) + '\n';
      
      // Append to log file
      await fs.appendFile(logFile, logLine, 'utf8');
      
    } catch (error) {
      console.error('Failed to log to file:', error);
    }
  }
  
  // Send critical errors to external monitoring service
  private async sendToMonitoring(entry: LogEntry): Promise<void> {
    try {
      // Example: Send to Sentry, DataDog, or similar service
      // This would be configured based on your monitoring setup
      
      if (process.env.SENTRY_DSN) {
        // Send to Sentry if configured
        // Implementation would go here
      }
      
      if (process.env.WEBHOOK_ERROR_URL) {
        // Send to webhook if configured
        const response = await fetch(process.env.WEBHOOK_ERROR_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            level: entry.level,
            category: entry.category,
            message: entry.message,
            timestamp: entry.timestamp.toISOString(),
            metadata: entry.metadata
          })
        });
        
        if (!response.ok) {
          throw new Error(`Webhook failed: ${response.status}`);
        }
      }
      
    } catch (error) {
      console.error('Failed to send to monitoring:', error);
    }
  }
  
  // Public logging methods
  async debug(message: string, metadata?: Record<string, unknown>, context?: Partial<LogEntry>): Promise<void> {
    await this.log({
      level: LogLevel.DEBUG,
      category: context?.category || LogCategory.SYSTEM,
      message,
      timestamp: new Date(),
      metadata,
      ...context
    });
  }
  
  async info(message: string, metadata?: Record<string, unknown>, context?: Partial<LogEntry>): Promise<void> {
    await this.log({
      level: LogLevel.INFO,
      category: context?.category || LogCategory.SYSTEM,
      message,
      timestamp: new Date(),
      metadata,
      ...context
    });
  }
  
  async warn(message: string, metadata?: Record<string, unknown>, context?: Partial<LogEntry>): Promise<void> {
    await this.log({
      level: LogLevel.WARN,
      category: context?.category || LogCategory.SYSTEM,
      message,
      timestamp: new Date(),
      metadata,
      ...context
    });
  }
  
  async error(message: string, metadata?: Record<string, unknown>, context?: Partial<LogEntry>): Promise<void> {
    await this.log({
      level: LogLevel.ERROR,
      category: context?.category || LogCategory.SYSTEM,
      message,
      timestamp: new Date(),
      metadata,
      ...context
    });
  }
  
  async critical(message: string, metadata?: Record<string, unknown>, context?: Partial<LogEntry>): Promise<void> {
    await this.log({
      level: LogLevel.CRITICAL,
      category: context?.category || LogCategory.SYSTEM,
      message,
      timestamp: new Date(),
      metadata,
      ...context
    });
  }
  
  // Specialized logging methods for common scenarios
  async logAuthentication(
    event: 'login_attempt' | 'login_success' | 'login_failure' | 'logout' | 'token_refresh',
    userId?: string,
    metadata?: Record<string, unknown>,
    context?: Partial<LogEntry>
  ): Promise<void> {
    const level = event === 'login_failure' ? LogLevel.WARN : LogLevel.INFO;
    await this.log({
      level,
      category: LogCategory.AUTHENTICATION,
      message: `Authentication event: ${event}`,
      timestamp: new Date(),
      userId,
      metadata: { event, ...metadata },
      ...context
    });
  }
  
  async logDatabaseOperation(
    operation: 'create' | 'read' | 'update' | 'delete',
    table: string,
    success: boolean,
    metadata?: Record<string, unknown>,
    context?: Partial<LogEntry>
  ): Promise<void> {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    await this.log({
      level,
      category: LogCategory.DATABASE,
      message: `Database ${operation} on ${table}: ${success ? 'success' : 'failed'}`,
      timestamp: new Date(),
      metadata: { operation, table, success, ...metadata },
      ...context
    });
  }
  
  async logAPIRequest(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    userId?: string,
    context?: Partial<LogEntry>
  ): Promise<void> {
    const level = statusCode >= 500 ? LogLevel.ERROR : 
                 statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    
    await this.log({
      level,
      category: LogCategory.API,
      message: `API Request: ${method} ${url}`,
      timestamp: new Date(),
      method,
      url,
      statusCode,
      responseTime,
      userId,
      metadata: { responseTime, statusCode },
      ...context
    });
  }
  
  async logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    metadata?: Record<string, unknown>,
    context?: Partial<LogEntry>
  ): Promise<void> {
    const level = severity === 'critical' ? LogLevel.CRITICAL :
                 severity === 'high' ? LogLevel.ERROR :
                 severity === 'medium' ? LogLevel.WARN : LogLevel.INFO;
    
    await this.log({
      level,
      category: LogCategory.SECURITY,
      message: `Security event: ${event}`,
      timestamp: new Date(),
      metadata: { event, severity, ...metadata },
      ...context
    });
  }
}

// Export singleton instance
export const secureLogger = new SecureLogger();

// Convenience method for error logging with stack traces
export async function logError(
  error: Error,
  message?: string,
  metadata?: Record<string, unknown>,
  context?: Partial<LogEntry>
): Promise<void> {
  await secureLogger.error(
    message || error.message || 'Unhandled error',
    {
      errorName: error.name,
      errorMessage: error.message,
      ...metadata
    },
    {
      errorStack: error.stack,
      ...context
    }
  );
}

// Request logging middleware helper
export function createRequestLogger(
  startTime: number,
  request: { method: string; url: string },
  response: { status: number },
  userId?: string,
  requestId?: string
): Promise<void> {
  const responseTime = Date.now() - startTime;
  
  return secureLogger.logAPIRequest(
    request.method,
    request.url,
    response.status,
    responseTime,
    userId,
    { requestId }
  );
}