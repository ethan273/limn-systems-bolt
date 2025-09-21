'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  Save,
  Edit,
  Check,
  X
} from 'lucide-react'

interface CustomerProfile {
  id: string
  email: string
  company_name?: string
  contact_name?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  portal_access: boolean
  created_at: string
  updated_at: string
}

export default function PortalProfilePage() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editedProfile, setEditedProfile] = useState<Partial<CustomerProfile>>({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) return

      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('email', session.user.email)
        .single()

      if (data) {
        setProfile(data)
        setEditedProfile(data)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      const mockProfile: CustomerProfile = {
        id: '1',
        email: 'client@example.com',
        company_name: 'Aerospace Manufacturing Corp',
        contact_name: 'John Smith',
        phone: '+1 (555) 123-4567',
        address: '1234 Industrial Blvd',
        city: 'Los Angeles',
        state: 'CA',
        zip_code: '90210',
        country: 'United States',
        portal_access: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:30:00Z'
      }
      setProfile(mockProfile)
      setEditedProfile(mockProfile)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    setEditing(true)
    setEditedProfile({ ...profile })
    setMessage('')
    setError('')
  }

  const handleCancel = () => {
    setEditing(false)
    setEditedProfile({ ...profile })
    setMessage('')
    setError('')
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) return

      const updateData = {
        company_name: editedProfile.company_name,
        contact_name: editedProfile.contact_name,
        phone: editedProfile.phone,
        address: editedProfile.address,
        city: editedProfile.city,
        state: editedProfile.state,
        zip_code: editedProfile.zip_code,
        country: editedProfile.country,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('email', session.user.email)

      if (error) throw error

      setProfile({ ...profile!, ...updateData })
      setEditing(false)
      setMessage('Profile updated successfully!')
    } catch (error: unknown) {
      setError((error as { message?: string }).message || 'Failed to update profile')
      console.error('Error updating profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof CustomerProfile, value: string) => {
    setEditedProfile(prev => ({ ...prev, [field]: value }))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
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

  if (!profile) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-[#4b4949] mb-2">Profile not found</h3>
        <p className="text-gray-700">Unable to load your profile information</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#4b4949]">Profile</h1>
          <p className="text-gray-700 mt-1">Manage your account information</p>
        </div>
        
        {!editing && (
          <button
            onClick={handleEdit}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-[#91bdbd] hover:text-[#7da9a9] hover:bg-gray-100 rounded-md transition-colors"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </button>
        )}
      </div>

      {message && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          {message}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-[#4b4949]">Account Information</h2>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[#4b4949] mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email Address
              </label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
              />
              <p className="text-xs text-gray-700 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#4b4949] mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Contact Name
              </label>
              {editing ? (
                <input
                  type="text"
                  value={editedProfile.contact_name || ''}
                  onChange={(e) => handleInputChange('contact_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent"
                  placeholder="Enter your full name"
                />
              ) : (
                <p className="py-2 text-[#4b4949]">{profile.contact_name || 'Not provided'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#4b4949] mb-2">
                <Building2 className="w-4 h-4 inline mr-2" />
                Company Name
              </label>
              {editing ? (
                <input
                  type="text"
                  value={editedProfile.company_name || ''}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent"
                  placeholder="Enter company name"
                />
              ) : (
                <p className="py-2 text-[#4b4949]">{profile.company_name || 'Not provided'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#4b4949] mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                Phone Number
              </label>
              {editing ? (
                <input
                  type="tel"
                  value={editedProfile.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent"
                  placeholder="Enter phone number"
                />
              ) : (
                <p className="py-2 text-[#4b4949]">{profile.phone || 'Not provided'}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#4b4949] mb-2">
              <MapPin className="w-4 h-4 inline mr-2" />
              Address
            </label>
            {editing ? (
              <input
                type="text"
                value={editedProfile.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent"
                placeholder="Enter street address"
              />
            ) : (
              <p className="py-2 text-[#4b4949]">{profile.address || 'Not provided'}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-[#4b4949] mb-2">City</label>
              {editing ? (
                <input
                  type="text"
                  value={editedProfile.city || ''}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent"
                  placeholder="Enter city"
                />
              ) : (
                <p className="py-2 text-[#4b4949]">{profile.city || 'Not provided'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#4b4949] mb-2">State/Province</label>
              {editing ? (
                <input
                  type="text"
                  value={editedProfile.state || ''}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent"
                  placeholder="Enter state"
                />
              ) : (
                <p className="py-2 text-[#4b4949]">{profile.state || 'Not provided'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#4b4949] mb-2">ZIP/Postal Code</label>
              {editing ? (
                <input
                  type="text"
                  value={editedProfile.zip_code || ''}
                  onChange={(e) => handleInputChange('zip_code', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent"
                  placeholder="Enter ZIP code"
                />
              ) : (
                <p className="py-2 text-[#4b4949]">{profile.zip_code || 'Not provided'}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#4b4949] mb-2">Country</label>
            {editing ? (
              <input
                type="text"
                value={editedProfile.country || ''}
                onChange={(e) => handleInputChange('country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent"
                placeholder="Enter country"
              />
            ) : (
              <p className="py-2 text-[#4b4949]">{profile.country || 'Not provided'}</p>
            )}
          </div>

          {editing && (
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-800 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#91bdbd] hover:bg-[#7da9a9] rounded-md transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-3 w-3 border border-b-0 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-[#4b4949]">Account Details</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-[#4b4949]">Portal Access</p>
              <div className="flex items-center mt-1">
                <Check className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-green-600">Enabled</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-[#4b4949]">Member Since</p>
              <p className="text-gray-700 mt-1">{formatDate(profile.created_at)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}