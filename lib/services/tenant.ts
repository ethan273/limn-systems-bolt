import { createClient } from '@/lib/supabase/client'
import { createClient as createServiceClient } from '@/lib/supabase/service'

export interface Tenant {
  id: string
  name: string
  subdomain: string
  domain?: string
  plan: 'starter' | 'professional' | 'enterprise'
  status: 'active' | 'suspended' | 'cancelled'
  settings: Record<string, unknown>
  branding: Record<string, unknown>
  max_users: number
  max_storage_gb: number
  features: Record<string, boolean>
  created_at: string
  updated_at: string
  expires_at?: string
}

export interface TenantUser {
  id: string
  tenant_id: string
  user_id: string
  role: 'admin' | 'manager' | 'user' | 'viewer'
  permissions: string[]
  is_active: boolean
  invited_at?: string
  joined_at?: string
  last_active?: string
  created_at: string
}

class TenantService {
  private supabase = createClient()
  private serviceClient = createServiceClient()

  // Get current user's tenants
  async getUserTenants(userId: string): Promise<Tenant[]> {
    const { data, error } = await this.supabase
      .from('tenants')
      .select(`
        *,
        tenant_users!inner (
          role,
          is_active,
          permissions
        )
      `)
      .eq('tenant_users.user_id', userId)
      .eq('tenant_users.is_active', true)
      .eq('status', 'active')
      .order('name')

    if (error) {
      console.error('Error fetching user tenants:', error)
      throw new Error('Failed to fetch tenants')
    }

    return data || []
  }

  // Get tenant by subdomain
  async getTenantBySubdomain(subdomain: string): Promise<Tenant | null> {
    const { data, error } = await this.supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', subdomain)
      .eq('status', 'active')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // No tenant found
      }
      console.error('Error fetching tenant by subdomain:', error)
      throw new Error('Failed to fetch tenant')
    }

    return data
  }

  // Get tenant by custom domain
  async getTenantByDomain(domain: string): Promise<Tenant | null> {
    const { data, error } = await this.supabase
      .from('tenants')
      .select('*')
      .eq('domain', domain)
      .eq('status', 'active')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // No tenant found
      }
      console.error('Error fetching tenant by domain:', error)
      throw new Error('Failed to fetch tenant')
    }

    return data
  }

  // Check user access to tenant
  async checkUserAccess(userId: string, tenantId: string): Promise<TenantUser | null> {
    const { data, error } = await this.supabase
      .from('tenant_users')
      .select('*')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // No access found
      }
      console.error('Error checking user access:', error)
      throw new Error('Failed to check user access')
    }

    return data
  }

  // Create new tenant (admin only)
  async createTenant(tenantData: Omit<Tenant, 'id' | 'created_at' | 'updated_at'>, ownerId: string): Promise<Tenant> {
    const { data: tenant, error: tenantError } = await this.serviceClient
      .from('tenants')
      .insert([tenantData])
      .select()
      .single()

    if (tenantError) {
      console.error('Error creating tenant:', tenantError)
      throw new Error('Failed to create tenant')
    }

    // Add owner as admin
    const { error: userError } = await this.serviceClient
      .from('tenant_users')
      .insert([{
        tenant_id: tenant.id,
        user_id: ownerId,
        role: 'admin',
        is_active: true,
        joined_at: new Date().toISOString()
      }])

    if (userError) {
      console.error('Error adding tenant owner:', userError)
      // Rollback tenant creation
      await this.serviceClient
        .from('tenants')
        .delete()
        .eq('id', tenant.id)
      throw new Error('Failed to create tenant user')
    }

    return tenant
  }

  // Invite user to tenant
  async inviteUser(tenantId: string, email: string, role: TenantUser['role']): Promise<void> {
    // Check if user exists
    const { data: user, error: userError } = await this.serviceClient
      .from('auth.users')
      .select('id')
      .eq('email', email)
      .single()

    if (userError && userError.code !== 'PGRST116') {
      console.error('Error checking user:', userError)
      throw new Error('Failed to check user')
    }

    if (!user) {
      // Send invitation email (implement email service)
      // For now, throw error
      throw new Error('User not found. Invitation emails not yet implemented.')
    }

    // Add user to tenant
    const { error } = await this.serviceClient
      .from('tenant_users')
      .insert([{
        tenant_id: tenantId,
        user_id: user.id,
        role,
        is_active: true,
        invited_at: new Date().toISOString(),
        joined_at: new Date().toISOString()
      }])

    if (error) {
      console.error('Error inviting user:', error)
      throw new Error('Failed to invite user')
    }
  }

  // Update tenant settings
  async updateTenantSettings(tenantId: string, settings: Partial<Tenant>): Promise<Tenant> {
    const { data, error } = await this.serviceClient
      .from('tenants')
      .update({
        ...settings,
        updated_at: new Date().toISOString()
      })
      .eq('id', tenantId)
      .select()
      .single()

    if (error) {
      console.error('Error updating tenant:', error)
      throw new Error('Failed to update tenant')
    }

    return data
  }

  // Get tenant usage statistics
  async getTenantUsage(): Promise<{
    user_count: number
    storage_used_gb: number
    api_calls_today: number
    active_sessions: number
  }> {
    // This would typically involve multiple queries
    // For now, return mock data
    return {
      user_count: 5,
      storage_used_gb: 2.5,
      api_calls_today: 150,
      active_sessions: 3
    }
  }

  // Check if tenant has feature enabled
  hasFeature(tenant: Tenant, feature: string): boolean {
    return tenant.features[feature] === true
  }

  // Check if tenant is within limits
  async checkTenantLimits(tenantId: string): Promise<{
    within_user_limit: boolean
    within_storage_limit: boolean
    within_api_limit: boolean
  }> {
    const tenant = await this.getTenantById(tenantId)
    if (!tenant) {
      throw new Error('Tenant not found')
    }

    const usage = await this.getTenantUsage()

    return {
      within_user_limit: usage.user_count <= tenant.max_users,
      within_storage_limit: usage.storage_used_gb <= tenant.max_storage_gb,
      within_api_limit: true // Implement API rate limiting logic
    }
  }

  // Get tenant by ID (private method)
  private async getTenantById(tenantId: string): Promise<Tenant | null> {
    const { data, error } = await this.supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Error fetching tenant by ID:', error)
      throw new Error('Failed to fetch tenant')
    }

    return data
  }
}

// Singleton instance
export const tenantService = new TenantService()

// Helper functions for tenant context
export function getTenantFromRequest(request: Request): string | null {
  const url = new URL(request.url)
  const host = url.host
  
  // Check for subdomain
  const subdomain = host.split('.')[0]
  if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
    return subdomain
  }
  
  // Check for custom domain
  // This would require a database lookup in production
  return null
}

export function getTenantFromHost(host: string): string | null {
  // Extract subdomain
  const parts = host.split('.')
  if (parts.length > 2) {
    const subdomain = parts[0]
    if (subdomain !== 'www' && subdomain !== 'app') {
      return subdomain
    }
  }
  
  return null
}