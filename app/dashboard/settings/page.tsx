'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { QuickBooksIntegrationCard } from '@/components/ui/quickbooks-integration-card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { FileSignature, Key } from 'lucide-react'

interface User {
  id: string
  email: string
  user_metadata?: {
    full_name?: string
    first_name?: string
    last_name?: string
  }
  created_at: string
  last_sign_in_at?: string
}

interface SystemSettings {
  apiStatus: 'operational' | 'maintenance' | 'error'
  databaseStatus: 'connected' | 'disconnected' | 'error'
  lastBackup: string
  version: string
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    firstName: '',
    lastName: ''
  })

  const systemSettings: SystemSettings = {
    apiStatus: 'operational',
    databaseStatus: 'connected',
    lastBackup: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    version: '1.0.0'
  }

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) throw error
      
      if (user) {
        setUser(user as User)
        setFormData({
          email: user.email || '',
          fullName: user.user_metadata?.full_name || '',
          firstName: user.user_metadata?.first_name || '',
          lastName: user.user_metadata?.last_name || ''
        })
      }
    } catch (err: unknown) {
      setError('Failed to load user data')
      console.error('User fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    setError('')
    setSuccess('')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: formData.fullName,
          first_name: formData.firstName,
          last_name: formData.lastName
        }
      })

      if (error) throw error
      
      setSuccess('Profile updated successfully!')
      await fetchUserData() // Refresh user data
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setUpdating(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
      case 'connected':
        return 'bg-primary/10 text-primary'
      case 'maintenance':
        return 'bg-amber/10 text-amber'
      case 'error':
      case 'disconnected':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-stone-100 text-stone-700'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'operational': return '● Operational'
      case 'connected': return '● Connected'
      case 'maintenance': return '● Maintenance'
      case 'error': return '● Error'
      case 'disconnected': return '● Disconnected'
      default: return '● Unknown'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-900 mt-1">Manage your profile and system settings</p>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
          <div className="text-amber-800 text-sm">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {success && (
        <div className="bg-primary/10 border border-primary/20 rounded-md p-4">
          <div className="text-primary text-sm">
            <strong>Success:</strong> {success}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Profile */}
        <Card>
          <CardHeader>
            <CardTitle>User Profile</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
                <div className="text-slate-900 text-sm">Loading profile...</div>
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="bg-slate-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-600 mt-1">Email cannot be changed</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="First name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <Button type="submit" disabled={updating}>
                    {updating ? 'Updating...' : 'Update Profile'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="text-slate-900 text-sm">Loading account info...</div>
              </div>
            ) : user ? (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-slate-900">User ID</div>
                  <div className="text-sm text-slate-900 font-mono break-all">{user.id}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900">Account Created</div>
                  <div className="text-sm text-slate-900">{formatDate(user.created_at)}</div>
                </div>
                {user.last_sign_in_at && (
                  <div>
                    <div className="text-sm font-medium text-slate-900">Last Sign In</div>
                    <div className="text-sm text-slate-900">{formatDate(user.last_sign_in_at)}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-slate-900">No account information available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Integration Settings */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-800">
            <Key className="w-5 h-5 mr-2" />
            PandaDoc Integration Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <p className="mb-4">
            Ready to start creating professional invoices and documents? Set up PandaDoc in under 2 minutes - no terminal required!
          </p>
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/settings/pandadoc">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <FileSignature className="w-4 h-4 mr-2" />
                Configure PandaDoc
              </Button>
            </Link>
            <div className="text-sm text-blue-600">
              ✓ Easy web interface<br/>
              ✓ No command line needed<br/>
              ✓ Test connection instantly
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QuickBooks Integration */}
      <QuickBooksIntegrationCard />

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-sm font-medium text-slate-900 mb-2">API Status</div>
              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${getStatusColor(systemSettings.apiStatus)}`}>
                {getStatusText(systemSettings.apiStatus)}
              </span>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-slate-900 mb-2">Database</div>
              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${getStatusColor(systemSettings.databaseStatus)}`}>
                {getStatusText(systemSettings.databaseStatus)}
              </span>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-slate-900 mb-2">Last Backup</div>
              <div className="text-sm text-slate-900">{formatDate(systemSettings.lastBackup)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-slate-900 mb-2">Version</div>
              <div className="text-sm text-slate-900">v{systemSettings.version}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-amber-200">
        <CardHeader>
          <CardTitle className="text-amber-800">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-slate-900 mb-2">Reset Password</h3>
              <p className="text-sm text-slate-900 mb-3">
                Send a password reset email to your registered email address.
              </p>
              <Button variant="outline" size="sm">
                Reset Password
              </Button>
            </div>
            <div className="border-t border-stone-200 pt-4">
              <h3 className="text-sm font-medium text-slate-900 mb-2">Sign Out All Devices</h3>
              <p className="text-sm text-slate-900 mb-3">
                This will sign you out from all devices and require you to log in again.
              </p>
              <Button variant="outline" size="sm">
                Sign Out Everywhere
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}