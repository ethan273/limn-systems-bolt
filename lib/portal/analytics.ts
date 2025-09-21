// Analytics and performance monitoring for Limn Systems Portal
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp?: number;
  userId?: string;
  sessionId?: string;
}

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
  
  // Custom metrics
  pageLoadTime?: number;
  apiResponseTime?: number;
  renderTime?: number;
  interactionDelay?: number;
  
  // User context
  userAgent?: string;
  connection?: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

export interface UserSession {
  sessionId: string;
  userId?: string;
  startTime: number;
  lastActivity: number;
  pageViews: number;
  events: AnalyticsEvent[];
  device: {
    type: 'desktop' | 'tablet' | 'mobile';
    os: string;
    browser: string;
  };
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
}

class PortalAnalytics {
  private queue: AnalyticsEvent[] = [];
  private session: UserSession;
  private flushTimer?: NodeJS.Timeout;
  private performanceObserver?: PerformanceObserver;
  private isInitialized = false;

  constructor() {
    this.session = this.initializeSession();
  }

  private initializeSession(): UserSession {
    const sessionId = this.generateSessionId();
    const now = Date.now();
    
    return {
      sessionId,
      startTime: now,
      lastActivity: now,
      pageViews: 0,
      events: [],
      device: this.getDeviceInfo(),
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDeviceInfo() {
    // SSR safety check - default to desktop for server-side rendering
    if (typeof navigator === 'undefined') {
      return {
        type: 'desktop' as const,
        os: 'Unknown',
        browser: 'Unknown',
      };
    }

    const userAgent = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(userAgent);
    const isTablet = /iPad|Android.*Tablet/i.test(userAgent);
    
    return {
      type: (isMobile && !isTablet) ? 'mobile' as const : isTablet ? 'tablet' as const : 'desktop' as const,
      os: this.getOS(),
      browser: this.getBrowser(),
    };
  }

  private getOS(): string {
    if (typeof navigator === 'undefined') return 'Unknown';
    
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
    return 'Unknown';
  }

  private getBrowser(): string {
    if (typeof navigator === 'undefined') return 'Unknown';
    
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  // Initialize analytics system
  initialize(userId?: string) {
    if (this.isInitialized) return;
    
    this.session.userId = userId;
    this.isInitialized = true;
    
    // Set up performance monitoring
    this.setupPerformanceMonitoring();
    
    // Set up automatic session tracking
    this.setupSessionTracking();
    
    // Track page load
    this.trackEvent('page_load', {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
    });

    console.log('🔍 Portal Analytics initialized');
  }

  // Track custom events
  trackEvent(name: string, properties?: Record<string, unknown>) {
    const event: AnalyticsEvent = {
      name,
      properties,
      timestamp: Date.now(),
      userId: this.session.userId,
      sessionId: this.session.sessionId,
    };

    this.queue.push(event);
    this.session.events.push(event);
    this.session.lastActivity = Date.now();

    // Auto-flush queue when it gets large
    if (this.queue.length >= 10) {
      this.flush();
    } else {
      this.scheduleFlush();
    }

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Analytics Event:', event);
    }
  }

  // Track page views
  trackPageView(path: string, title?: string) {
    this.session.pageViews++;
    this.trackEvent('page_view', {
      path,
      title: title || document.title,
      timestamp: Date.now(),
    });
  }

  // Track user interactions
  trackInteraction(element: string, action: string, value?: unknown) {
    this.trackEvent('user_interaction', {
      element,
      action,
      value,
      timestamp: Date.now(),
    });
  }

  // Track API calls
  trackApiCall(endpoint: string, method: string, duration: number, success: boolean) {
    this.trackEvent('api_call', {
      endpoint,
      method,
      duration,
      success,
      timestamp: Date.now(),
    });
  }

  // Track errors
  trackError(error: Error, context?: string) {
    this.trackEvent('error', {
      message: error.message,
      stack: error.stack,
      context,
      url: window.location.href,
      timestamp: Date.now(),
    });
  }

  // Track performance metrics
  trackPerformance(metrics: PerformanceMetrics) {
    this.trackEvent('performance', {
      ...metrics,
      timestamp: Date.now(),
    });
  }

  // Track feature usage
  trackFeatureUsage(feature: string, action: string, metadata?: Record<string, unknown>) {
    this.trackEvent('feature_usage', {
      feature,
      action,
      ...metadata,
      timestamp: Date.now(),
    });
  }

  // Track conversion events
  trackConversion(type: string, value?: number, metadata?: Record<string, unknown>) {
    this.trackEvent('conversion', {
      type,
      value,
      ...metadata,
      timestamp: Date.now(),
    });
  }

  private setupPerformanceMonitoring() {
    // Core Web Vitals monitoring
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as unknown;
        this.trackPerformance({ lcp: (lastEntry as any).startTime });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const firstInput = list.getEntries()[0] as unknown;
        this.trackPerformance({ fid: (firstInput as any).processingStart - (firstInput as any).startTime });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        this.trackPerformance({ cls: clsValue });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      this.performanceObserver = lcpObserver; // Keep reference for cleanup
    }

    // Navigation timing
    if ('performance' in window && 'timing' in performance) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const timing = performance.timing;
          const navigationStart = timing.navigationStart;
          
          this.trackPerformance({
            pageLoadTime: timing.loadEventEnd - navigationStart,
            fcp: timing.domContentLoadedEventEnd - navigationStart,
            ttfb: timing.responseStart - navigationStart,
          });
        }, 0);
      });
    }

    // Long task monitoring
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            this.trackEvent('long_task', {
              duration: entry.duration,
              startTime: entry.startTime,
            });
          }
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
    }
  }

  private setupSessionTracking() {
    // Track session duration
    const updateSessionDuration = () => {
      const duration = Date.now() - this.session.startTime;
      this.trackEvent('session_heartbeat', {
        duration,
        pageViews: this.session.pageViews,
        eventCount: this.session.events.length,
      });
    };

    // Send heartbeat every 30 seconds
    setInterval(updateSessionDuration, 30000);

    // Track when user becomes active/inactive
    let isActive = true;
    const handleVisibilityChange = () => {
      if (document.hidden && isActive) {
        isActive = false;
        this.trackEvent('session_inactive');
      } else if (!document.hidden && !isActive) {
        isActive = true;
        this.trackEvent('session_active');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Track session end
    const handleBeforeUnload = () => {
      const sessionDuration = Date.now() - this.session.startTime;
      this.trackEvent('session_end', {
        duration: sessionDuration,
        pageViews: this.session.pageViews,
        eventCount: this.session.events.length,
      });
      this.flush();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
  }

  private scheduleFlush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
    
    this.flushTimer = setTimeout(() => {
      this.flush();
    }, 5000); // Flush every 5 seconds
  }

  // Send queued events to analytics service
  private async flush() {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }

    try {
      await this.sendEvents(events);
    } catch (error) {
      console.error('Failed to send analytics events:', error);
      // Re-queue events on failure
      this.queue.unshift(...events);
    }
  }

  private async sendEvents(events: AnalyticsEvent[]) {
    const payload = {
      session: this.session,
      events,
      metadata: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        // Include performance context
        connection: (navigator as any).connection?.effectiveType,
        memory: (navigator as any).deviceMemory,
        cores: navigator.hardwareConcurrency,
      },
    };

    // Send to internal analytics API
    await fetch('/api/portal/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // Also send to external analytics services in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalServices(events);
    }
  }

  private sendToExternalServices(events: AnalyticsEvent[]) {
    // Google Analytics 4
    if (typeof (globalThis as any).gtag === 'function') {
      events.forEach(event => {
        (globalThis as any).gtag('event', event.name, {
          ...event.properties,
          user_id: event.userId,
          session_id: event.sessionId,
        });
      });
    }

    // Custom analytics endpoints can be added here
  }

  // Get current session info
  getSession(): UserSession {
    return { ...this.session };
  }

  // Force flush all queued events
  forceFlush() {
    return this.flush();
  }

  // Cleanup
  destroy() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    this.flush();
  }
}

// Create singleton instance
export const analytics = new PortalAnalytics();

// Convenience functions for common tracking scenarios
export const trackEvent = analytics.trackEvent.bind(analytics);
export const trackPageView = analytics.trackPageView.bind(analytics);
export const trackInteraction = analytics.trackInteraction.bind(analytics);
export const trackApiCall = analytics.trackApiCall.bind(analytics);
export const trackError = analytics.trackError.bind(analytics);
export const trackFeatureUsage = analytics.trackFeatureUsage.bind(analytics);
export const trackConversion = analytics.trackConversion.bind(analytics);

// Portal-specific tracking events
export const portalEvents = {
  // Authentication
  LOGIN: 'portal_login',
  LOGOUT: 'portal_logout',
  LOGIN_FAILED: 'portal_login_failed',
  
  // Navigation
  PAGE_VIEW: 'portal_page_view',
  SECTION_VIEW: 'portal_section_view',
  
  // Orders
  ORDER_VIEWED: 'order_viewed',
  ORDER_CREATED: 'order_created',
  ORDER_UPDATED: 'order_updated',
  
  // Production
  PRODUCTION_VIEWED: 'production_viewed',
  PRODUCTION_STAGE_EXPANDED: 'production_stage_expanded',
  
  // Documents
  DOCUMENT_VIEWED: 'document_viewed',
  DOCUMENT_DOWNLOADED: 'document_downloaded',
  DOCUMENT_UPLOADED: 'document_uploaded',
  
  // Approvals
  DESIGN_APPROVED: 'design_approved',
  DESIGN_REJECTED: 'design_rejected',
  APPROVAL_COMMENT: 'approval_comment',
  
  // Communications
  MESSAGE_SENT: 'message_sent',
  MESSAGE_VIEWED: 'message_viewed',
  NOTIFICATION_CLICKED: 'notification_clicked',
  
  // Financial
  INVOICE_VIEWED: 'invoice_viewed',
  PAYMENT_INITIATED: 'payment_initiated',
  
  // Shipping
  SHIPMENT_TRACKED: 'shipment_tracked',
  DELIVERY_SCHEDULED: 'delivery_scheduled',
  
  // Search & Filters
  SEARCH_PERFORMED: 'search_performed',
  FILTER_APPLIED: 'filter_applied',
  
  // Errors & Performance
  ERROR_OCCURRED: 'error_occurred',
  PERFORMANCE_ISSUE: 'performance_issue',
  
  // Feature Usage
  FEATURE_DISCOVERED: 'feature_discovered',
  FEATURE_USED: 'feature_used',
  HELP_VIEWED: 'help_viewed',
} as const;

export default analytics;