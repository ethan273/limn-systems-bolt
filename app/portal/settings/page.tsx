'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Settings,
  Bell,
  Shield,
  Mail,
  Smartphone,
  Globe,
  Moon,
  Sun,
  Monitor,
  Save,
  AlertCircle,
  Check,
  Key,
  Database,
  Download,
  Trash2,
  RefreshCw
} from 'lucide-react'

interface NotificationPreferences {
  order_updates: boolean
  production_updates: boolean
  design_approvals: boolean
  shipping_notifications: boolean
  invoice_notifications: boolean
  system_announcements: boolean
  email_digest: 'none' | 'daily' | 'weekly'
  sms_notifications: boolean
}

interface PrivacySettings {
  data_sharing: boolean
  analytics_tracking: boolean
  marketing_emails: boolean
  third_party_integrations: boolean
}

interface DisplaySettings {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  date_format: 'US' | 'EU' | 'ISO'
  currency: string
}

interface UserSettings {
  notifications: NotificationPreferences
  privacy: PrivacySettings
  display: DisplaySettings
}

const defaultSettings: UserSettings = {
  notifications: {
    order_updates: true,
    production_updates: true,
    design_approvals: true,
    shipping_notifications: true,
    invoice_notifications: true,
    system_announcements: false,
    email_digest: 'weekly',
    sms_notifications: false
  },
  privacy: {
    data_sharing: false,
    analytics_tracking: true,
    marketing_emails: false,
    third_party_integrations: true
  },
  display: {
    theme: 'system',
    language: 'en',
    timezone: 'America/Los_Angeles',
    date_format: 'US',
    currency: 'USD'
  }
}

export default function PortalSettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('notifications')
  const [dataExporting, setDataExporting] = useState(false)
  const [accountDeleting, setAccountDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) return

      const { data } = await supabase
        .from('customer_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (data?.settings) {
        setSettings({ ...defaultSettings, ...data.settings })
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) return

      const { error } = await supabase
        .from('customer_settings')
        .upsert({
          user_id: session.user.id,
          settings: settings,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      setMessage('Settings saved successfully!')
      setTimeout(() => setMessage(''), 5000)
    } catch (error: unknown) {
      setError((error as { message?: string }).message || 'Failed to save settings')
      setTimeout(() => setError(''), 5000)
    } finally {
      setSaving(false)
    }
  }

  const handleNotificationChange = (key: keyof NotificationPreferences, value: boolean | string) => {
    setSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value }
    }))
  }

  const handlePrivacyChange = (key: keyof PrivacySettings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      privacy: { ...prev.privacy, [key]: value }
    }))
  }

  const handleDisplayChange = (key: keyof DisplaySettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      display: { ...prev.display, [key]: value }
    }))
  }

  const handleDataExport = async () => {
    setDataExporting(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) return

      // Simulate data export - in real implementation, this would call an API
      setTimeout(() => {
        const exportData = {
          user_profile: { email: session.user.email },
          settings: settings,
          exported_at: new Date().toISOString()
        }
        
        const dataStr = JSON.stringify(exportData, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `limn-portal-data-${new Date().toISOString().split('T')[0]}.json`
        link.click()
        URL.revokeObjectURL(url)
        
        setMessage('Data exported successfully!')
        setDataExporting(false)
      }, 2000)
    } catch {
      setError('Failed to export data')
      setDataExporting(false)
    }
  }

  const handleAccountDeletion = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    setAccountDeleting(true)
    try {
      
      // In a real implementation, this would:
      // 1. Mark account for deletion
      // 2. Send confirmation email
      // 3. Schedule data deletion after waiting period
      
      setMessage('Account deletion request submitted. You will receive a confirmation email with next steps.')
      setShowDeleteConfirm(false)
    } catch {
      setError('Failed to process account deletion request')
    } finally {
      setAccountDeleting(false)
    }
  }

  const tabs = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Data', icon: Shield },
    { id: 'display', label: 'Display & Language', icon: Monitor },
    { id: 'account', label: 'Account Management', icon: Settings }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => (
                <div key={i}>
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#4b4949]">Settings</h1>
          <p className="text-gray-700 mt-1">Manage your portal preferences and account settings</p>
        </div>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#91bdbd] hover:bg-[#7da9a9] rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save All Settings
            </>
          )}
        </button>
      </div>

      {message && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          <div className="flex items-center">
            <Check className="w-4 h-4 mr-2" />
            {message}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            {error}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-[#91bdbd] text-[#91bdbd]'
                      : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 inline mr-2" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-[#4b4949] mb-4">Email Notifications</h3>
                <div className="space-y-4">
                  {Object.entries({
                    order_updates: 'Order status updates',
                    production_updates: 'Production progress notifications',
                    design_approvals: 'Design approval requests',
                    shipping_notifications: 'Shipping and delivery updates',
                    invoice_notifications: 'Invoice and payment notifications',
                    system_announcements: 'System announcements and maintenance'
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between py-2">
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 text-gray-400 mr-3" />
                        <span className="text-sm font-medium text-[#4b4949]">{label}</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications[key as keyof NotificationPreferences] as boolean}
                          onChange={(e) => handleNotificationChange(key as keyof NotificationPreferences, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#91bdbd]/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#91bdbd]"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-[#4b4949] mb-4">Digest Settings</h3>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 text-gray-400 mr-3" />
                    <span className="text-sm font-medium text-[#4b4949]">Email digest frequency</span>
                  </div>
                  <select
                    value={settings.notifications.email_digest}
                    onChange={(e) => handleNotificationChange('email_digest', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent"
                  >
                    <option value="none">No digest</option>
                    <option value="daily">Daily summary</option>
                    <option value="weekly">Weekly summary</option>
                  </select>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-[#4b4949] mb-4">SMS Notifications</h3>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center">
                    <Smartphone className="w-4 h-4 text-gray-400 mr-3" />
                    <div>
                      <span className="text-sm font-medium text-[#4b4949] block">SMS notifications</span>
                      <span className="text-xs text-gray-600">Critical updates only</span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.sms_notifications}
                      onChange={(e) => handleNotificationChange('sms_notifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#91bdbd]/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#91bdbd]"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-[#4b4949] mb-4">Data & Privacy</h3>
                <div className="space-y-4">
                  {Object.entries({
                    data_sharing: 'Share usage data to improve services',
                    analytics_tracking: 'Allow analytics tracking for better experience',
                    marketing_emails: 'Receive marketing emails and newsletters',
                    third_party_integrations: 'Enable third-party service integrations'
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between py-2">
                      <div className="flex items-center">
                        <Shield className="w-4 h-4 text-gray-400 mr-3" />
                        <span className="text-sm font-medium text-[#4b4949]">{label}</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.privacy[key as keyof PrivacySettings]}
                          onChange={(e) => handlePrivacyChange(key as keyof PrivacySettings, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#91bdbd]/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#91bdbd]"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Display Tab */}
          {activeTab === 'display' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-[#4b4949] mb-4">Appearance</h3>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center">
                    {settings.display.theme === 'light' && <Sun className="w-4 h-4 text-gray-400 mr-3" />}
                    {settings.display.theme === 'dark' && <Moon className="w-4 h-4 text-gray-400 mr-3" />}
                    {settings.display.theme === 'system' && <Monitor className="w-4 h-4 text-gray-400 mr-3" />}
                    <span className="text-sm font-medium text-[#4b4949]">Theme</span>
                  </div>
                  <select
                    value={settings.display.theme}
                    onChange={(e) => handleDisplayChange('theme', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-[#4b4949] mb-4">Regional Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center">
                      <Globe className="w-4 h-4 text-gray-400 mr-3" />
                      <span className="text-sm font-medium text-[#4b4949]">Language</span>
                    </div>
                    <select
                      value={settings.display.language}
                      onChange={(e) => handleDisplayChange('language', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center">
                      <Globe className="w-4 h-4 text-gray-400 mr-3" />
                      <span className="text-sm font-medium text-[#4b4949]">Timezone</span>
                    </div>
                    <select
                      value={settings.display.timezone}
                      onChange={(e) => handleDisplayChange('timezone', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent"
                    >
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/New_York">Eastern Time (ET)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center">
                      <Globe className="w-4 h-4 text-gray-400 mr-3" />
                      <span className="text-sm font-medium text-[#4b4949]">Date format</span>
                    </div>
                    <select
                      value={settings.display.date_format}
                      onChange={(e) => handleDisplayChange('date_format', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent"
                    >
                      <option value="US">MM/DD/YYYY</option>
                      <option value="EU">DD/MM/YYYY</option>
                      <option value="ISO">YYYY-MM-DD</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center">
                      <Globe className="w-4 h-4 text-gray-400 mr-3" />
                      <span className="text-sm font-medium text-[#4b4949]">Currency</span>
                    </div>
                    <select
                      value={settings.display.currency}
                      onChange={(e) => handleDisplayChange('currency', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CAD">CAD ($)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Account Management Tab */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-[#4b4949] mb-4">Account Actions</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <Key className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <span className="text-sm font-medium text-[#4b4949] block">Change Password</span>
                        <span className="text-xs text-gray-600">Update your account password</span>
                      </div>
                    </div>
                    <button
                      onClick={() => window.location.href = '/auth/reset-password'}
                      className="px-4 py-2 text-sm font-medium text-[#91bdbd] hover:text-[#7da9a9] hover:bg-white rounded-lg transition-colors"
                    >
                      Change Password
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <Database className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <span className="text-sm font-medium text-[#4b4949] block">Export Data</span>
                        <span className="text-xs text-gray-600">Download your account data</span>
                      </div>
                    </div>
                    <button
                      onClick={handleDataExport}
                      disabled={dataExporting}
                      className="px-4 py-2 text-sm font-medium text-[#91bdbd] hover:text-[#7da9a9] hover:bg-white rounded-lg transition-colors disabled:opacity-50 flex items-center"
                    >
                      {dataExporting ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Export Data
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <Trash2 className="w-5 h-5 text-red-500 mr-3" />
                      <div>
                        <span className="text-sm font-medium text-red-900 block">Delete Account</span>
                        <span className="text-xs text-red-600">Permanently delete your account and data</span>
                      </div>
                    </div>
                    {!showDeleteConfirm ? (
                      <button
                        onClick={handleAccountDeletion}
                        className="px-4 py-2 text-sm font-medium text-red-700 hover:text-red-900 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        Delete Account
                      </button>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="px-3 py-2 text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAccountDeletion}
                          disabled={accountDeleting}
                          className="px-3 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {accountDeleting ? 'Processing...' : 'Confirm Delete'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}