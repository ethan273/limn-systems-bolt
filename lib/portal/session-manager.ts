import { createClient } from '@/lib/supabase/client'

export interface PortalSessionActivity {
  action: string
  timestamp: string
  details?: Record<string, unknown>
  page?: string
  ip_address?: string
  user_agent?: string
}

export interface PortalSession {
  id: string
  customer_id: string
  user_id: string
  ip_address?: string
  user_agent?: string
  started_at: string
  ended_at?: string
  last_activity_at: string
  activity_log: PortalSessionActivity[]
  is_active: boolean
}

export class PortalSessionManager {
  private supabase = createClient()
  private currentSessionId: string | null = null

  constructor() {
    // Initialize session tracking
    this.initializeTracking()
  }

  private initializeTracking() {
    // Track page visibility changes
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.logActivity('page_hidden', { 
            page: window.location.pathname 
          })
        } else {
          this.logActivity('page_visible', { 
            page: window.location.pathname 
          })
        }
      })

      // Track page unload
      window.addEventListener('beforeunload', () => {
        this.endSession()
      })
    }
  }

  /**
   * Start a new portal session
   */
  async startSession(customerId: string, userId: string): Promise<string | null> {
    try {
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
      const ipAddress = 'unknown' // Would need IP service in production

      const { data, error } = await this.supabase
        .from('portal_sessions')
        .insert({
          customer_id: customerId,
          user_id: userId,
          ip_address: ipAddress,
          user_agent: userAgent,
          started_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
          activity_log: [{
            action: 'session_start',
            timestamp: new Date().toISOString(),
            details: { method: 'login' }
          }],
          is_active: true
        })
        .select('id')
        .single()

      if (error) {
        console.error('Error starting portal session:', error)
        return null
      }

      this.currentSessionId = data.id
      return data.id
    } catch (error) {
      console.error('Error starting session:', error)
      return null
    }
  }

  /**
   * End the current portal session
   */
  async endSession(sessionId?: string): Promise<void> {
    const targetSessionId = sessionId || this.currentSessionId
    if (!targetSessionId) return

    try {
      await this.logActivity('session_end', {})
      
      await this.supabase
        .from('portal_sessions')
        .update({
          ended_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
          is_active: false
        })
        .eq('id', targetSessionId)

      if (targetSessionId === this.currentSessionId) {
        this.currentSessionId = null
      }
    } catch (error) {
      console.error('Error ending session:', error)
    }
  }

  /**
   * Log an activity in the current session
   */
  async logActivity(
    action: string, 
    details: Record<string, unknown> = {},
    page?: string
  ): Promise<void> {
    if (!this.currentSessionId) return

    try {
      const activity: PortalSessionActivity = {
        action,
        timestamp: new Date().toISOString(),
        details,
        page: page || (typeof window !== 'undefined' ? window.location.pathname : undefined)
      }

      // Get current activity log
      const { data: session, error: fetchError } = await this.supabase
        .from('portal_sessions')
        .select('activity_log')
        .eq('id', this.currentSessionId)
        .single()

      if (fetchError) {
        console.error('Error fetching session for activity log:', fetchError)
        return
      }

      const currentLog = session?.activity_log || []
      const updatedLog = [...currentLog, activity]

      // Update session with new activity
      const { error: updateError } = await this.supabase
        .from('portal_sessions')
        .update({
          activity_log: updatedLog,
          last_activity_at: new Date().toISOString()
        })
        .eq('id', this.currentSessionId)

      if (updateError) {
        console.error('Error logging activity:', updateError)
      }
    } catch (error) {
      console.error('Error logging activity:', error)
    }
  }

  /**
   * Log page visit
   */
  async logPageVisit(page: string, details: Record<string, unknown> = {}): Promise<void> {
    await this.logActivity('page_visit', { ...details, page })
  }

  /**
   * Log file download
   */
  async logFileDownload(fileName: string, fileType: string, fileSize?: number): Promise<void> {
    await this.logActivity('file_download', {
      file_name: fileName,
      file_type: fileType,
      file_size: fileSize
    })
  }

  /**
   * Log setting change
   */
  async logSettingChange(setting: string, oldValue: unknown, newValue: unknown): Promise<void> {
    await this.logActivity('setting_change', {
      setting,
      old_value: oldValue,
      new_value: newValue
    })
  }

  /**
   * Log failed login attempt
   */
  static async logFailedLogin(email: string, reason: string, ipAddress?: string): Promise<void> {
    const supabase = createClient()
    
    try {
      await supabase
        .from('portal_sessions')
        .insert({
          customer_id: null, // No customer ID for failed attempts
          user_id: null,
          ip_address: ipAddress || 'unknown',
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
          activity_log: [{
            action: 'login_failed',
            timestamp: new Date().toISOString(),
            details: { 
              email, 
              reason,
              ip_address: ipAddress
            }
          }],
          is_active: false
        })
    } catch (error) {
      console.error('Error logging failed login:', error)
    }
  }

  /**
   * Get session history for a customer
   */
  async getSessionHistory(customerId: string, limit: number = 10): Promise<PortalSession[]> {
    try {
      const { data, error } = await this.supabase
        .from('portal_sessions')
        .select('*')
        .eq('customer_id', customerId)
        .order('started_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching session history:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error getting session history:', error)
      return []
    }
  }

  /**
   * Get current active sessions for a customer
   */
  async getActiveSessions(customerId: string): Promise<PortalSession[]> {
    try {
      const { data, error } = await this.supabase
        .from('portal_sessions')
        .select('*')
        .eq('customer_id', customerId)
        .eq('is_active', true)
        .order('last_activity_at', { ascending: false })

      if (error) {
        console.error('Error fetching active sessions:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error getting active sessions:', error)
      return []
    }
  }

  /**
   * Clean up old inactive sessions (for maintenance)
   */
  static async cleanupOldSessions(daysOld: number = 30): Promise<void> {
    const supabase = createClient()
    
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      await supabase
        .from('portal_sessions')
        .delete()
        .eq('is_active', false)
        .lt('ended_at', cutoffDate.toISOString())
    } catch (error) {
      console.error('Error cleaning up old sessions:', error)
    }
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId
  }

  /**
   * Set current session ID (for existing sessions)
   */
  setCurrentSessionId(sessionId: string): void {
    this.currentSessionId = sessionId
  }
}

// Export singleton instance
export const sessionManager = new PortalSessionManager()
export default sessionManager