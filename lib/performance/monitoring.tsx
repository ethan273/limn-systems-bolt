/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react'
import { config } from '@/lib/config/environment'

// Performance metrics interface
interface PerformanceMetric {
  name: string
  value: number
  unit: 'ms' | 'bytes' | 'count' | 'percentage'
  timestamp: number
  metadata?: Record<string, unknown>
}

// Performance monitoring class
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private observers: PerformanceObserver[] = []
  private isClient: boolean = typeof window !== 'undefined'

  constructor() {
    this.initializeMonitoring()
  }

  private initializeMonitoring() {
    if (!this.isClient || !config.features().analytics) {
      return
    }

    // Core Web Vitals monitoring
    this.observeCoreWebVitals()
    
    // Resource loading monitoring
    this.observeResourceTiming()
    
    // Navigation timing
    this.observeNavigationTiming()
    
    // Long tasks monitoring
    this.observeLongTasks()
  }

  private observeCoreWebVitals() {
    if (!('PerformanceObserver' in window)) return

    // First Contentful Paint (FCP)
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const fcp = entries.find(entry => entry.name === 'first-contentful-paint')
      if (fcp) {
        this.recordMetric({
          name: 'first_contentful_paint',
          value: fcp.startTime,
          unit: 'ms',
          timestamp: Date.now()
        })
      }
    })

    try {
      fcpObserver.observe({ entryTypes: ['paint'] })
      this.observers.push(fcpObserver)
    } catch (error) {
      console.warn('Failed to observe paint entries:', error)
    }

    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      if (lastEntry) {
        this.recordMetric({
          name: 'largest_contentful_paint',
          value: lastEntry.startTime,
          unit: 'ms',
          timestamp: Date.now(),
          metadata: {
            element: (lastEntry as any).element?.tagName || 'unknown',
            size: (lastEntry as any).size || 0
          }
        })
      }
    })

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      this.observers.push(lcpObserver)
    } catch (error) {
      console.warn('Failed to observe LCP:', error)
    }

    // First Input Delay (FID) and Interaction to Next Paint (INP)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach(entry => {
        this.recordMetric({
          name: 'first_input_delay',
          value: (entry as any).processingStart - entry.startTime,
          unit: 'ms',
          timestamp: Date.now(),
          metadata: {
            eventType: entry.name,
            target: (entry as any).target?.tagName || 'unknown'
          }
        })
      })
    })

    try {
      fidObserver.observe({ entryTypes: ['first-input'] })
      this.observers.push(fidObserver)
    } catch (error) {
      console.warn('Failed to observe first-input:', error)
    }

    // Cumulative Layout Shift (CLS)
    let clsValue = 0
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach(entry => {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value
        }
      })

      this.recordMetric({
        name: 'cumulative_layout_shift',
        value: clsValue,
        unit: 'count',
        timestamp: Date.now()
      })
    })

    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] })
      this.observers.push(clsObserver)
    } catch (error) {
      console.warn('Failed to observe layout-shift:', error)
    }
  }

  private observeResourceTiming() {
    if (!('PerformanceObserver' in window)) return

    const resourceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach(entry => {
        const resource = entry as PerformanceResourceTiming
        
        // Track slow resources
        if (resource.duration > 1000) { // Resources taking more than 1s
          this.recordMetric({
            name: 'slow_resource',
            value: resource.duration,
            unit: 'ms',
            timestamp: Date.now(),
            metadata: {
              name: resource.name,
              type: resource.initiatorType,
              size: resource.transferSize || 0,
              cached: resource.transferSize === 0
            }
          })
        }

        // Track resource types
        this.recordMetric({
          name: `resource_${resource.initiatorType}`,
          value: resource.duration,
          unit: 'ms',
          timestamp: Date.now(),
          metadata: {
            name: resource.name,
            size: resource.transferSize || 0
          }
        })
      })
    })

    try {
      resourceObserver.observe({ entryTypes: ['resource'] })
      this.observers.push(resourceObserver)
    } catch (error) {
      console.warn('Failed to observe resource timing:', error)
    }
  }

  private observeNavigationTiming() {
    if (!('PerformanceObserver' in window)) return

    const navigationObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach(entry => {
        const nav = entry as PerformanceNavigationTiming
        
        this.recordMetric({
          name: 'page_load_time',
          value: nav.loadEventEnd - (nav as any).navigationStart,
          unit: 'ms',
          timestamp: Date.now(),
          metadata: {
            domContentLoaded: nav.domContentLoadedEventEnd - (nav as any).navigationStart,
            firstByte: nav.responseStart - (nav as any).navigationStart,
            domInteractive: nav.domInteractive - (nav as any).navigationStart
          }
        })
      })
    })

    try {
      navigationObserver.observe({ entryTypes: ['navigation'] })
      this.observers.push(navigationObserver)
    } catch (error) {
      console.warn('Failed to observe navigation timing:', error)
    }
  }

  private observeLongTasks() {
    if (!('PerformanceObserver' in window)) return

    const longTaskObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach(entry => {
        this.recordMetric({
          name: 'long_task',
          value: entry.duration,
          unit: 'ms',
          timestamp: Date.now(),
          metadata: {
            startTime: entry.startTime,
            attribution: (entry as any).attribution || []
          }
        })
      })
    })

    try {
      longTaskObserver.observe({ entryTypes: ['longtask'] })
      this.observers.push(longTaskObserver)
    } catch (error) {
      console.warn('Failed to observe long tasks:', error)
    }
  }

  private recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric)
    
    // Keep only recent metrics to prevent memory leaks
    if ((this.metrics || []).length > 1000) {
      this.metrics = (this.metrics || []).slice(-500)
    }

    // Send to analytics service
    this.sendMetricToService(metric)
    
    // Log in development
    if (config.isDevelopment() && config.features().debug) {
      console.log('Performance Metric:', metric)
    }
  }

  private async sendMetricToService(metric: PerformanceMetric) {
    try {
      // In production, send to analytics service
      if (config.isProduction() && this.isClient) {
        // Example: Send to Google Analytics, Mixpanel, or internal API
        await fetch('/api/analytics/performance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metric),
        }).catch(error => {
          console.warn('Failed to send performance metric:', error)
        })
      }
    } catch (error) {
      console.warn('Error sending performance metric:', error)
    }
  }

  // Manual performance tracking
  public startTiming(name: string): () => void {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      this.recordMetric({
        name: `custom_${name}`,
        value: endTime - startTime,
        unit: 'ms',
        timestamp: Date.now()
      })
    }
  }

  // Memory usage monitoring
  public trackMemoryUsage(): void {
    if (!this.isClient || !('memory' in performance)) return

    const memory = (performance as unknown as { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory
    
    this.recordMetric({
      name: 'memory_used',
      value: memory.usedJSHeapSize,
      unit: 'bytes',
      timestamp: Date.now(),
      metadata: {
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      }
    })
  }

  // Bundle size tracking
  public trackBundleSize(bundleName: string, size: number): void {
    this.recordMetric({
      name: 'bundle_size',
      value: size,
      unit: 'bytes',
      timestamp: Date.now(),
      metadata: {
        bundle: bundleName
      }
    })
  }

  // API response time tracking
  public trackAPICall(endpoint: string, duration: number, success: boolean): void {
    this.recordMetric({
      name: 'api_call',
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      metadata: {
        endpoint,
        success,
        status: success ? 'success' : 'error'
      }
    })
  }

  // Get performance summary
  public getSummary(): Record<string, unknown> {
    const recentMetrics = (this.metrics || []).filter(
      m => Date.now() - m.timestamp < 5 * 60 * 1000 // Last 5 minutes
    )

    const summary: Record<string, unknown> = {}
    
    // Group metrics by name
    const groupedMetrics = recentMetrics.reduce((groups, metric) => {
      if (!groups[metric.name]) {
        groups[metric.name] = []
      }
      groups[metric.name].push(metric.value)
      return groups
    }, {} as Record<string, number[]>)

    // Calculate statistics for each metric
    Object.entries(groupedMetrics).forEach(([name, values]) => {
      summary[name] = {
        count: values.length,
        avg: values.reduce((sum, val) => sum + val, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        latest: values[values.length - 1]
      }
    })

    return summary
  }

  // Cleanup observers
  public cleanup(): void {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    this.metrics = []
  }
}

// Global performance monitor instance
let globalPerformanceMonitor: PerformanceMonitor | null = null

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!globalPerformanceMonitor) {
    globalPerformanceMonitor = new PerformanceMonitor()
  }
  return globalPerformanceMonitor
}

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const monitor = getPerformanceMonitor()
  
  return {
    startTiming: monitor.startTiming.bind(monitor),
    trackMemoryUsage: monitor.trackMemoryUsage.bind(monitor),
    trackBundleSize: monitor.trackBundleSize.bind(monitor),
    trackAPICall: monitor.trackAPICall.bind(monitor),
    getSummary: monitor.getSummary.bind(monitor)
  }
}

// Higher-order component for component performance tracking
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = (props: P) => {
    const monitor = getPerformanceMonitor()
    const name = componentName || Component.displayName || Component.name || 'Component'
    
    React.useEffect(() => {
      const endTiming = monitor.startTiming(`render_${name}`)
      
      return () => {
        endTiming()
      }
    }, [monitor, name])

    return <Component {...props} />
  }

  WrappedComponent.displayName = `withPerformanceTracking(${Component.displayName || Component.name})`

  return WrappedComponent
}

// Utility functions for manual performance tracking
export const perf = {
  startTiming: (name: string) => getPerformanceMonitor().startTiming(name),
  trackMemory: () => getPerformanceMonitor().trackMemoryUsage(),
  trackBundle: (name: string, size: number) => getPerformanceMonitor().trackBundleSize(name, size),
  trackAPI: (endpoint: string, duration: number, success: boolean) => 
    getPerformanceMonitor().trackAPICall(endpoint, duration, success),
  getSummary: () => getPerformanceMonitor().getSummary()
}

// Initialize performance monitoring on client-side
if (typeof window !== 'undefined') {
  // Start monitoring after page load
  window.addEventListener('load', () => {
    getPerformanceMonitor()
    
    // Track initial memory usage
    setTimeout(() => {
      getPerformanceMonitor().trackMemoryUsage()
    }, 1000)
  })

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    globalPerformanceMonitor?.cleanup()
  })
}