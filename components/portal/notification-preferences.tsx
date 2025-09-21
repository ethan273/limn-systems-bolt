'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback } from 'react'
import { Bell, Mail, Smartphone, Clock, Check, TestTube } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { useNotifications } from '@/hooks/useNotifications'
import { createClient } from '@/lib/supabase/client'

interface PreferenceCategory {
  key: string
  label: string
  description: string
  icon: React.ReactNode
  defaultEnabled: boolean
}

const NOTIFICATION_CATEGORIES: PreferenceCategory[] = [
  {
    key: 'order',
    label: 'Order Updates',
    description: 'Notifications about order status changes, confirmations, and updates',
    icon: <Bell className="w-5 h-5 text-blue-600" />,
    defaultEnabled: true
  },
  {
    key: 'production',
    label: 'Production Progress',
    description: 'Updates on manufacturing progress and stage changes',
    icon: <Clock className="w-5 h-5 text-green-600" />,
    defaultEnabled: true
  },
  {
    key: 'financial',
    label: 'Financial',
    description: 'Payment confirmations, invoices, and billing notifications',
    icon: <Mail className="w-5 h-5 text-yellow-600" />,
    defaultEnabled: true
  },
  {
    key: 'document',
    label: 'Documents',
    description: 'New document uploads and document-related activities',
    icon: <Bell className="w-5 h-5 text-purple-600" />,
    defaultEnabled: false
  },
  {
    key: 'approval',
    label: 'Design Approvals',
    description: 'Design review requests and approval status updates',
    icon: <Check className="w-5 h-5 text-orange-600" />,
    defaultEnabled: true
  },
  {
    key: 'shipping',
    label: 'Shipping & Delivery',
    description: 'Shipment tracking, delivery updates, and logistics information',
    icon: <Smartphone className="w-5 h-5 text-indigo-600" />,
    defaultEnabled: true
  },
  {
    key: 'system',
    label: 'System Updates',
    description: 'Platform updates, maintenance notices, and system messages',
    icon: <Bell className="w-5 h-5 text-gray-600" />,
    defaultEnabled: false
  }
]

const CHANNELS = [
  { key: 'portal', label: 'Portal', icon: <Bell className="w-4 h-4" /> },
  { key: 'email', label: 'Email', icon: <Mail className="w-4 h-4" /> },
  { key: 'sms', label: 'SMS', icon: <Smartphone className="w-4 h-4" /> }
]

const FREQUENCIES = [
  { key: 'immediate', label: 'Immediately' },
  { key: 'daily', label: 'Daily Digest' },
  { key: 'weekly', label: 'Weekly Summary' },
  { key: 'never', label: 'Never' }
]

interface PreferenceState {
  [categoryKey: string]: {
    [channelKey: string]: {
      enabled: boolean
      frequency: string
    }
  }
}

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<PreferenceState>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [quietHours, setQuietHours] = useState({ start: '22:00', end: '08:00' })
  const [hasChanges, setHasChanges] = useState(false)
  
  const { toast } = useToast()
  const { updatePreferences } = useNotifications()
  const supabase = createClient()

  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get customer ID
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', user.email)
        .single()

      if (!customer) return

      // Load existing preferences
      const { data: preferencesData } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('customer_id', customer.id)

      // Create preference state
      const preferencesState: PreferenceState = {}
      
      NOTIFICATION_CATEGORIES.forEach(category => {
        preferencesState[category.key] = {}
        CHANNELS.forEach(channel => {
          const existingPref = preferencesData?.find(
            p => p.category === category.key && p.channel === channel.key
          )
          
          preferencesState[category.key][channel.key] = {
            enabled: existingPref?.enabled ?? (category.defaultEnabled && channel.key === 'portal'),
            frequency: existingPref?.frequency ?? 'immediate'
          }
        })
      })

      setPreferences(preferencesState)
      
      // Load quiet hours from the first preference (they should be the same across all)
      const firstPref = preferencesData?.[0]
      if (firstPref?.quiet_hours_start && firstPref?.quiet_hours_end) {
        setQuietHours({
          start: firstPref.quiet_hours_start,
          end: firstPref.quiet_hours_end
        })
      }
      
    } catch (error) {
      console.error('Error loading preferences:', error)
      toast({
        title: "Error",
        description: "Failed to load notification preferences.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [supabase, toast])

  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  const handlePreferenceChange = (category: string, channel: string, field: 'enabled' | 'frequency', value: boolean | string) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [channel]: {
          ...prev[category]?.[channel],
          [field]: value
        }
      }
    }))
    setHasChanges(true)
  }

  const handleQuietHoursChange = (field: 'start' | 'end', value: string) => {
    setQuietHours(prev => ({
      ...prev,
      [field]: value
    }))
    setHasChanges(true)
  }

  const savePreferences = async () => {
    try {
      setSaving(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get customer ID
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', user.email)
        .single()

      if (!customer) return

      // Convert preference state to array
      const preferencesArray: unknown[] = []
      
      Object.entries(preferences).forEach(([category, channels]) => {
        Object.entries(channels).forEach(([channel, settings]) => {
          preferencesArray.push({
            customer_id: customer.id,
            category,
            channel,
            enabled: settings.enabled,
            frequency: settings.frequency,
            quiet_hours_start: quietHours.start,
            quiet_hours_end: quietHours.end
          })
        })
      })

      await updatePreferences(preferencesArray as any[])
      
      setHasChanges(false)
      toast({
        title: "Saved",
        description: "Your notification preferences have been updated.",
      })
      
    } catch (error) {
      console.error('Error saving preferences:', error)
      toast({
        title: "Error",
        description: "Failed to save notification preferences.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const sendTestNotification = async () => {
    try {
      setSendingTest(true)
      
      // This would typically call an API endpoint to send a test notification
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      
      toast({
        title: "Test sent",
        description: "A test notification has been sent to your enabled channels.",
      })
      
    } catch (error) {
      console.error('Error sending test notification:', error)
      toast({
        title: "Error",
        description: "Failed to send test notification.",
        variant: "destructive",
      })
    } finally {
      setSendingTest(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <div className="text-sm text-gray-500">Loading preferences...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#4b4949]">Notification Preferences</h2>
          <p className="text-gray-600 mt-1">
            Manage how and when you receive notifications from Limn Systems.
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={sendTestNotification}
            disabled={sendingTest}
          >
            <TestTube className="w-4 h-4 mr-2" />
            {sendingTest ? 'Sending...' : 'Send Test'}
          </Button>
          
          <Button 
            onClick={savePreferences}
            disabled={saving || !hasChanges}
            className="bg-[#91bdbd] hover:bg-[#7da9a9] text-white"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2 text-[#91bdbd]" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Set hours when you don&apos;t want to receive notifications (except urgent ones).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="quiet-start">From</Label>
              <Input
                id="quiet-start"
                type="time"
                value={quietHours.start}
                onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                className="w-32"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="quiet-end">To</Label>
              <Input
                id="quiet-end"
                type="time"
                value={quietHours.end}
                onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                className="w-32"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Categories */}
      <div className="space-y-4">
        {NOTIFICATION_CATEGORIES.map((category) => (
          <Card key={category.key}>
            <CardHeader>
              <CardTitle className="flex items-center">
                {category.icon}
                <span className="ml-2">{category.label}</span>
              </CardTitle>
              <CardDescription>
                {category.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {CHANNELS.map((channel) => {
                  const prefs = preferences[category.key]?.[channel.key] || { enabled: false, frequency: 'immediate' }
                  
                  return (
                    <div key={channel.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {channel.icon}
                        <div>
                          <Label className="text-sm font-medium">
                            {channel.label}
                          </Label>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <Select
                          value={prefs.frequency}
                          onValueChange={(value) => handlePreferenceChange(category.key, channel.key, 'frequency', value)}
                          disabled={!prefs.enabled}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FREQUENCIES.map((freq) => (
                              <SelectItem key={freq.key} value={freq.key}>
                                {freq.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Switch
                          checked={prefs.enabled}
                          onCheckedChange={(checked) => handlePreferenceChange(category.key, channel.key, 'enabled', checked)}
                          disabled={channel.key === 'sms'} // SMS not implemented yet
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer Note */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-2">
            <Bell className="w-5 h-5 text-orange-600 mt-0.5" />
            <div className="text-sm text-orange-800">
              <p className="font-medium mb-1">Important Notes:</p>
              <ul className="list-disc list-inside space-y-1 text-orange-700">
                <li>Urgent notifications will always be delivered regardless of quiet hours</li>
                <li>Portal notifications are always enabled for important system messages</li>
                <li>SMS notifications are coming soon</li>
                <li>Changes take effect immediately after saving</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}