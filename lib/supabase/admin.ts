import { createClient } from '@supabase/supabase-js'

// Admin client with service role key for server-side operations
// Note: In production, this should only be used on the server side
// and the service role key should be stored securely
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables for admin client')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Admin user management functions
export const adminUserOperations = {
  // Get all users (requires service role)
  async getAllUsers() {
    const supabase = createAdminClient()
    
    try {
      const { data, error } = await supabase.auth.admin.listUsers()
      if (error) throw error
      return data.users
    } catch (error) {
      console.error('Failed to get all users:', error)
      throw error
    }
  },

  // Get user by ID
  async getUserById(userId: string) {
    const supabase = createAdminClient()
    
    try {
      const { data, error } = await supabase.auth.admin.getUserById(userId)
      if (error) throw error
      return data.user
    } catch (error) {
      console.error('Failed to get user by ID:', error)
      throw error
    }
  },

  // Create a new user
  async createUser(email: string, password: string, userData?: Record<string, unknown>) {
    const supabase = createAdminClient()
    
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: userData || {},
      })
      if (error) throw error
      return data.user
    } catch (error) {
      console.error('Failed to create user:', error)
      throw error
    }
  },

  // Update user
  async updateUser(userId: string, updates: Record<string, unknown>) {
    const supabase = createAdminClient()
    
    try {
      const { data, error } = await supabase.auth.admin.updateUserById(userId, updates)
      if (error) throw error
      return data.user
    } catch (error) {
      console.error('Failed to update user:', error)
      throw error
    }
  },

  // Delete user
  async deleteUser(userId: string) {
    const supabase = createAdminClient()
    
    try {
      const { data, error } = await supabase.auth.admin.deleteUser(userId)
      if (error) throw error
      return data
    } catch (error) {
      console.error('Failed to delete user:', error)
      throw error
    }
  },

  // Reset user password
  async resetUserPassword(userId: string, newPassword: string) {
    const supabase = createAdminClient()
    
    try {
      const { data, error } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
      })
      if (error) throw error
      return data.user
    } catch (error) {
      console.error('Failed to reset user password:', error)
      throw error
    }
  },

  // Enable/disable user
  async toggleUserStatus(userId: string, enable: boolean) {
    const supabase = createAdminClient()
    
    try {
      const { data, error } = await supabase.auth.admin.updateUserById(userId, {
        ban_duration: enable ? 'none' : '876000h', // ~100 years if disabling
      })
      if (error) throw error
      return data.user
    } catch (error) {
      console.error('Failed to toggle user status:', error)
      throw error
    }
  },
}

// Admin database operations
export const adminDatabaseOperations = {
  // Execute raw SQL (use with caution)
  async executeRawQuery(query: string, params?: unknown[]) {
    const supabase = createAdminClient()
    
    try {
      const { data, error } = await supabase.rpc('execute_sql', {
        query_text: query,
        query_params: params,
      })
      if (error) throw error
      return data
    } catch (error) {
      console.error('Failed to execute raw query:', error)
      throw error
    }
  },

  // Get database statistics
  async getDatabaseStats() {
    const supabase = createAdminClient()
    
    try {
      // Example queries for database statistics
      // You would need to create these RPC functions in your database
      const { data: tableStats, error: tableError } = await supabase.rpc('get_table_stats')
      if (tableError) throw tableError

      const { data: userStats, error: userError } = await supabase.rpc('get_user_stats')
      if (userError) throw userError

      return {
        tables: tableStats,
        users: userStats,
      }
    } catch (error) {
      console.error('Failed to get database stats:', error)
      throw error
    }
  },

  // Backup database (would need to implement based on your backup strategy)
  async createBackup() {
    // This would typically involve calling a database backup service
    // or triggering a backup process
    console.log('Database backup initiated')
    return { success: true, message: 'Backup initiated' }
  },
}

// Admin audit logging
export const adminAuditOperations = {
  // Log admin action
  async logAdminAction(action: {
    user_id: string
    user_email: string
    action: string
    resource_type: string
    resource_id?: string
    details: string
    ip_address: string
    user_agent: string
    status: 'success' | 'warning' | 'error'
  }) {
    const supabase = createAdminClient()
    
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          ...action,
          created_at: new Date().toISOString(),
        })
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Failed to log admin action:', error)
      throw error
    }
  },

  // Get audit logs
  async getAuditLogs(filters?: {
    user_id?: string
    action?: string
    resource_type?: string
    status?: string
    start_date?: string
    end_date?: string
    limit?: number
    offset?: number
  }) {
    const supabase = createAdminClient()
    
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters?.user_id) {
        query = query.eq('user_id', filters.user_id)
      }
      if (filters?.action) {
        query = query.eq('action', filters.action)
      }
      if (filters?.resource_type) {
        query = query.eq('resource_type', filters.resource_type)
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.start_date) {
        query = query.gte('created_at', filters.start_date)
      }
      if (filters?.end_date) {
        query = query.lte('created_at', filters.end_date)
      }
      if (filters?.limit) {
        query = query.limit(filters.limit)
      }
      if (filters?.offset) {
        query = query.range(filters.offset, (filters.offset + (filters.limit || 50)) - 1)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    } catch (error) {
      console.error('Failed to get audit logs:', error)
      throw error
    }
  },

  // Export audit logs
  async exportAuditLogs(format: 'csv' | 'json' = 'csv', filters?: Record<string, unknown>) {
    try {
      const logs = await this.getAuditLogs(filters)
      
      if (format === 'json') {
        return JSON.stringify(logs, null, 2)
      } else {
        // Convert to CSV
        if (!logs || logs.length === 0) return ''
        
        const headers = Object.keys(logs[0]).join(',')
        const rows = logs.map(log => 
          Object.values(log).map(value => 
            typeof value === 'string' && value.includes(',') 
              ? `"${value}"` 
              : value
          ).join(',')
        )
        
        return [headers, ...rows].join('\n')
      }
    } catch (error) {
      console.error('Failed to export audit logs:', error)
      throw error
    }
  },
}

// System health checks
export const adminSystemOperations = {
  // Check database connectivity
  async checkDatabaseHealth() {
    const supabase = createAdminClient()
    
    try {
      const { error } = await supabase.from('audit_logs').select('count').limit(1)
      if (error) throw error
      return { status: 'healthy', message: 'Database connection successful' }
    } catch (error) {
      return { status: 'error', message: 'Database connection failed', error }
    }
  },

  // Check authentication service
  async checkAuthHealth() {
    try {
      const supabase = createAdminClient()
      await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
      return { status: 'healthy', message: 'Authentication service operational' }
    } catch (error) {
      return { status: 'error', message: 'Authentication service error', error }
    }
  },

  // Get system metrics
  async getSystemMetrics() {
    try {
      const dbHealth = await this.checkDatabaseHealth()
      const authHealth = await this.checkAuthHealth()
      
      return {
        database: dbHealth,
        authentication: authHealth,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error('Failed to get system metrics:', error)
      throw error
    }
  },
}