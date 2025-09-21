/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getEnvironment } from '@/lib/config/environment';
import { secureLogger, LogCategory } from '@/lib/logging/secure-logger';

// Security headers configuration
export interface SecurityHeadersConfig {
  contentSecurityPolicy?: string;
  strictTransportSecurity?: string;
  xFrameOptions?: string;
  xContentTypeOptions?: string;
  referrerPolicy?: string;
  permissionsPolicy?: string;
  crossOriginEmbedderPolicy?: string;
  crossOriginOpenerPolicy?: string;
  crossOriginResourcePolicy?: string;
  xXssProtection?: string;
  expectCertificateTransparency?: string;
  customHeaders?: Record<string, string>;
}

// Default security headers for different environments
export class SecurityHeaders {
  private static readonly PRODUCTION_CSP = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.supabase.co wss://*.supabase.co https://*.supabase.co",
    "media-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ');

  private static readonly DEVELOPMENT_CSP = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' ws: wss:",
    "media-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'"
  ].join('; ');

  static getDefaultConfig(): SecurityHeadersConfig {
    const env = getEnvironment();
    const isProduction = env.NODE_ENV === 'production';

    return {
      // Content Security Policy
      contentSecurityPolicy: isProduction ? this.PRODUCTION_CSP : this.DEVELOPMENT_CSP,
      
      // HTTP Strict Transport Security (HSTS)
      strictTransportSecurity: isProduction 
        ? 'max-age=31536000; includeSubDomains; preload'
        : 'max-age=0', // Disabled in development
      
      // X-Frame-Options
      xFrameOptions: 'DENY',
      
      // X-Content-Type-Options
      xContentTypeOptions: 'nosniff',
      
      // Referrer Policy
      referrerPolicy: 'strict-origin-when-cross-origin',
      
      // Permissions Policy (Feature Policy)
      permissionsPolicy: [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'interest-cohort=()',
        'payment=()',
        'usb=()',
        'magnetometer=()',
        'accelerometer=()',
        'gyroscope=()'
      ].join(', '),
      
      // Cross-Origin Embedder Policy
      crossOriginEmbedderPolicy: 'credentialless',
      
      // Cross-Origin Opener Policy
      crossOriginOpenerPolicy: 'same-origin-allow-popups',
      
      // Cross-Origin Resource Policy
      crossOriginResourcePolicy: 'same-origin',
      
      // X-XSS-Protection (legacy but still useful for older browsers)
      xXssProtection: '1; mode=block',
      
      // Custom security headers
      customHeaders: {
        'X-DNS-Prefetch-Control': 'off',
        'X-Download-Options': 'noopen',
        'X-Permitted-Cross-Domain-Policies': 'none',
        'X-Robots-Tag': isProduction ? 'index, follow' : 'noindex, nofollow'
      }
    };
  }

  static applyHeaders(response: NextResponse, config?: Partial<SecurityHeadersConfig>): NextResponse {
    const defaultConfig = this.getDefaultConfig();
    const finalConfig = { ...defaultConfig, ...config };

    // Apply all security headers
    if (finalConfig.contentSecurityPolicy) {
      response.headers.set('Content-Security-Policy', finalConfig.contentSecurityPolicy);
    }

    if (finalConfig.strictTransportSecurity) {
      response.headers.set('Strict-Transport-Security', finalConfig.strictTransportSecurity);
    }

    if (finalConfig.xFrameOptions) {
      response.headers.set('X-Frame-Options', finalConfig.xFrameOptions);
    }

    if (finalConfig.xContentTypeOptions) {
      response.headers.set('X-Content-Type-Options', finalConfig.xContentTypeOptions);
    }

    if (finalConfig.referrerPolicy) {
      response.headers.set('Referrer-Policy', finalConfig.referrerPolicy);
    }

    if (finalConfig.permissionsPolicy) {
      response.headers.set('Permissions-Policy', finalConfig.permissionsPolicy);
    }

    if (finalConfig.crossOriginEmbedderPolicy) {
      response.headers.set('Cross-Origin-Embedder-Policy', finalConfig.crossOriginEmbedderPolicy);
    }

    if (finalConfig.crossOriginOpenerPolicy) {
      response.headers.set('Cross-Origin-Opener-Policy', finalConfig.crossOriginOpenerPolicy);
    }

    if (finalConfig.crossOriginResourcePolicy) {
      response.headers.set('Cross-Origin-Resource-Policy', finalConfig.crossOriginResourcePolicy);
    }

    if (finalConfig.xXssProtection) {
      response.headers.set('X-XSS-Protection', finalConfig.xXssProtection);
    }

    // Apply custom headers
    if (finalConfig.customHeaders) {
      Object.entries(finalConfig.customHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
    }

    // Add security-related cache headers for static assets
    const pathname = response.url ? new URL(response.url).pathname : '';
    if (pathname.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    }

    return response;
  }

  static withSecurityHeaders<T extends unknown[]>(
    handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
    config?: Partial<SecurityHeadersConfig>
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      try {
        const response = await handler(request, ...args);
        return this.applyHeaders(response, config);
      } catch {
        // Even for error responses, apply security headers
        const errorResponse = NextResponse.json(
          { error: 'Internal Server Error' },
          { status: 500 }
        );
        return this.applyHeaders(errorResponse, config);
      }
    };
  }
}

// CSRF Protection
export class CSRFProtection {
  private static readonly CSRF_TOKEN_LENGTH = 32;
  private static readonly CSRF_HEADER = 'X-CSRF-Token';
  private static readonly CSRF_COOKIE = '__Host-csrf-token';

  static async generateToken(): Promise<string> {
    const array = new Uint8Array(this.CSRF_TOKEN_LENGTH);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      // Fallback for Node.js environment
      const cryptoModule = await import('crypto');
      const randomBytes = cryptoModule.randomBytes(this.CSRF_TOKEN_LENGTH);
      array.set(randomBytes);
    }
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  static async setCsrfToken(response: NextResponse): Promise<string> {
    const token = await this.generateToken();
    
    // Set secure cookie with CSRF token
    response.cookies.set(this.CSRF_COOKIE, token, {
      httpOnly: true,
      secure: getEnvironment().NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return token;
  }

  static validateCsrfToken(request: NextRequest): boolean {
    // Skip CSRF validation for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true;
    }

    const tokenFromHeader = request.headers.get(this.CSRF_HEADER);
    const tokenFromCookie = request.cookies.get(this.CSRF_COOKIE)?.value;

    if (!tokenFromHeader || !tokenFromCookie) {
      return false;
    }

    // Constant-time comparison to prevent timing attacks
    return this.constantTimeEqual(tokenFromHeader, tokenFromCookie);
  }

  private static constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }

  static withCSRFProtection<T extends any[]>(
    handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      // Validate CSRF token for state-changing requests
      if (!this.validateCsrfToken(request)) {
        await secureLogger.warn('CSRF token validation failed', {
          method: request.method,
          url: request.url,
          userAgent: request.headers.get('user-agent'),
          referer: request.headers.get('referer')
        }, {
          category: LogCategory.SECURITY
        });

        return NextResponse.json(
          { error: 'CSRF token validation failed' },
          { status: 403 }
        );
      }

      const response = await handler(request, ...args);

      // Set new CSRF token for future requests
      this.setCsrfToken(response);

      return response;
    };
  }
}

// Security scan detection
export class SecurityScanner {
  private static readonly SUSPICIOUS_PATTERNS = [
    // SQL Injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b.*?\b(FROM|INTO|SET|WHERE)\b)/i,
    /(UNION\s+SELECT)/i,
    /(OR\s+1\s*=\s*1)/i,
    /(';\s*(DROP|DELETE|INSERT))/i,
    
    // XSS patterns
    /<script[^>]*>.*?<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe[^>]*>/i,
    
    // Path traversal
    /\.\.\//,
    /\.\.\\/,
    /%2e%2e%2f/i,
    /%2e%2e%5c/i,
    
    // Command injection
    /[;&|`$(){}]/,
    /(sh|bash|cmd|powershell)/i,
    
    // NoSQL injection
    /\$where/i,
    /\$ne/i,
    /\$regex/i,
    
    // LDAP injection
    /\(\|\(/,
    /\)\(\|/,
    
    // Header injection
    /\r\n/,
    /%0d%0a/i
  ];

  static scanRequest(request: NextRequest): {
    isSuspicious: boolean;
    suspiciousPatterns: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  } {
    const suspiciousPatterns: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Scan URL
    const url = request.url;
    this.SUSPICIOUS_PATTERNS.forEach((pattern, index) => {
      if (pattern.test(url)) {
        suspiciousPatterns.push(`URL_PATTERN_${index}`);
      }
    });

    // Scan headers
    request.headers.forEach((value, name) => {
      this.SUSPICIOUS_PATTERNS.forEach((pattern, index) => {
        if (pattern.test(value)) {
          suspiciousPatterns.push(`HEADER_${name.toUpperCase()}_PATTERN_${index}`);
        }
      });
    });

    // Determine risk level
    if (suspiciousPatterns.length === 0) {
      riskLevel = 'low';
    } else if (suspiciousPatterns.length <= 2) {
      riskLevel = 'medium';
    } else if (suspiciousPatterns.length <= 5) {
      riskLevel = 'high';
    } else {
      riskLevel = 'critical';
    }

    return {
      isSuspicious: suspiciousPatterns.length > 0,
      suspiciousPatterns,
      riskLevel
    };
  }

  static async logSuspiciousActivity(
    request: NextRequest,
    scanResult: ReturnType<typeof SecurityScanner.scanRequest>
  ): Promise<void> {
    if (!scanResult.isSuspicious) return;

    await secureLogger.logSecurityEvent(
      'Suspicious request detected',
      scanResult.riskLevel === 'critical' ? 'critical' : 
      scanResult.riskLevel === 'high' ? 'high' : 'medium',
      {
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('user-agent'),
        referer: request.headers.get('referer'),
        ip: (request as any).ip || request.headers.get('x-forwarded-for'),
        suspiciousPatterns: scanResult.suspiciousPatterns,
        riskLevel: scanResult.riskLevel,
        timestamp: new Date().toISOString()
      },
      {
        category: LogCategory.SECURITY
      }
    );
  }

  static withSecurityScanning<T extends any[]>(
    handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      const scanResult = this.scanRequest(request);
      
      // Log suspicious activity
      if (scanResult.isSuspicious) {
        await this.logSuspiciousActivity(request, scanResult);
        
        // Block critical threats
        if (scanResult.riskLevel === 'critical') {
          return NextResponse.json(
            { error: 'Request blocked due to security policy' },
            { status: 403 }
          );
        }
      }

      return await handler(request, ...args);
    };
  }
}

// Combined security middleware
export function withComprehensiveSecurity<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  options: {
    enableCSRF?: boolean;
    enableSecurityScanning?: boolean;
    customSecurityHeaders?: Partial<SecurityHeadersConfig>;
  } = {}
) {
  const {
    enableCSRF = true,
    enableSecurityScanning = true,
    customSecurityHeaders = {}
  } = options;

  let wrappedHandler = handler;

  // Apply security scanning if enabled
  if (enableSecurityScanning) {
    wrappedHandler = SecurityScanner.withSecurityScanning(wrappedHandler);
  }

  // Apply CSRF protection if enabled
  if (enableCSRF) {
    wrappedHandler = CSRFProtection.withCSRFProtection(wrappedHandler);
  }

  // Apply security headers
  wrappedHandler = SecurityHeaders.withSecurityHeaders(wrappedHandler, customSecurityHeaders);

  return wrappedHandler;
}