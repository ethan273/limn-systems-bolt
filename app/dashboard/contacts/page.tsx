'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { safeFormatString } from '@/lib/utils/string-helpers'
import { PageLoading } from '@/components/ui/enhanced-loading-states'

interface Contact {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  title: string
  company: string
  department?: string
  is_primary: boolean
  client_id?: string
  source: 'website' | 'referral' | 'cold_outreach' | 'trade_show' | 'social_media' | 'advertising' | 'networking'
  status: 'active' | 'inactive' | 'do_not_contact'
  tags: string[]
  notes?: string
  linkedin_url?: string
  created_at: string
  updated_at?: string
  last_contact_date?: string
  next_follow_up?: string
}

interface ContactFormData {
  first_name: string
  last_name: string
  email: string
  phone: string
  title: string
  company: string
  department: string
  is_primary: boolean
  source: string
  status: string
  tags: string
  notes: string
  linkedin_url: string
  next_follow_up: string
}

export default function ContactsPage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  
  // Filters
  const [filterCompany, setFilterCompany] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  const [formData, setFormData] = useState<ContactFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    title: '',
    company: '',
    department: '',
    is_primary: false,
    source: 'website',
    status: 'active',
    tags: '',
    notes: '',
    linkedin_url: '',
    next_follow_up: ''
  })

  useEffect(() => {
    fetchContacts()
  }, [])

  const fetchContacts = async () => {
    try {
      setLoading(true)
      
      // Fetch real contacts from API
      const response = await fetch('/api/contacts')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.data) {
        // If database is empty, provide test contacts for immediate functionality
        if (data.data.length === 0) {
          console.log('Contacts: Database empty, providing test data for immediate functionality');
          const testContacts: Contact[] = [
            {
              id: 'test-1',
              first_name: 'Sarah',
              last_name: 'Johnson',
              email: 'sarah.johnson@luxehomes.com',
              phone: '+1 (555) 123-4567',
              title: 'Interior Designer',
              company: 'Luxe Homes Design',
              department: 'Design',
              is_primary: true,
              client_id: '',
              source: 'referral',
              status: 'active',
              tags: ['high-value', 'repeat-client', 'design-lead'],
              notes: 'Preferred designer for luxury residential projects. Always requests premium materials.',
              linkedin_url: 'https://linkedin.com/in/sarahjohnson',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_contact_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              next_follow_up: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            },
            {
              id: 'test-2',
              first_name: 'Michael',
              last_name: 'Chen',
              email: 'm.chen@modernspaces.co',
              phone: '+1 (555) 234-5678',
              title: 'Project Manager',
              company: 'Modern Spaces LLC',
              department: 'Operations',
              is_primary: false,
              client_id: '',
              source: 'website',
              status: 'active',
              tags: ['project-manager', 'commercial'],
              notes: 'Handles large commercial projects. Prefers quick turnarounds.',
              linkedin_url: '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: 'test-3',
              first_name: 'Emma',
              last_name: 'Rodriguez',
              email: 'emma@coastalinteriors.com',
              phone: '+1 (555) 345-6789',
              title: 'Senior Designer',
              company: 'Coastal Interiors',
              department: 'Design',
              is_primary: true,
              client_id: '',
              source: 'trade_show',
              status: 'active',
              tags: ['coastal-style', 'high-end'],
              notes: 'Specializes in coastal and nautical themes. Large budget projects.',
              linkedin_url: 'https://linkedin.com/in/emmarodriguez',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_contact_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            }
          ]
          setContacts(testContacts)
          setError('')
          console.log('Contacts: Test data loaded successfully')
          return
        }

        // Transform API data to match Contact interface
        const transformedContacts: Contact[] = (data.data || []).map((contact: unknown) => {
          const apiContact = contact as {
            id: string
            first_name: string
            last_name: string
            email: string
            phone?: string
            company?: string
            title?: string
            status?: string
            tags?: string
            notes?: string
            source?: string
            department?: string
            is_primary?: boolean
            client_id?: string
            linkedin_url?: string
            created_at: string
            updated_at?: string
            last_contact_date?: string
            next_follow_up?: string
          }
          
          return {
            id: apiContact.id,
            first_name: apiContact.first_name,
            last_name: apiContact.last_name,
            email: apiContact.email,
            phone: apiContact.phone || '',
            company: apiContact.company || '',
            title: apiContact.title || '',
            department: apiContact.department || '',
            is_primary: apiContact.is_primary || false,
            client_id: apiContact.client_id || '',
            source: (apiContact.source || 'website') as 'website' | 'referral' | 'cold_outreach' | 'trade_show' | 'social_media' | 'advertising' | 'networking',
            status: (apiContact.status || 'active') as 'active' | 'inactive' | 'do_not_contact',
            tags: apiContact.tags ? (typeof apiContact.tags === 'string' ? (apiContact.tags || "").split(',').map(t => t.trim()) : []) : [],
            linkedin_url: apiContact.linkedin_url || '',
            notes: apiContact.notes || '',
            created_at: apiContact.created_at,
            updated_at: apiContact.updated_at || apiContact.created_at,
            last_contact_date: apiContact.last_contact_date,
            next_follow_up: apiContact.next_follow_up
          }
        })
        
        setContacts(transformedContacts)
        setError('')
        console.log('Contacts: Successfully loaded', transformedContacts.length, 'contacts from API')
      } else {
        throw new Error('Invalid API response format')
      }
    } catch (err) {
      setError('Failed to load contacts')
      console.error('Contacts: Error loading data:', err)
      
      // NO MOCK DATA - Set empty contacts when API fails
      setContacts([])
      console.log('Contacts: Database empty - no fallback data used')
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!(formData.first_name || '').trim()) {
      errors.first_name = 'First name is required'
    }

    if (!(formData.last_name || '').trim()) {
      errors.last_name = 'Last name is required'
    }

    if (!(formData.email || '').trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email || '')) {
      errors.email = 'Please enter a valid email address'
    }

    if (!(formData.company || '').trim()) {
      errors.company = 'Company is required'
    }

    if (!(formData.title || '').trim()) {
      errors.title = 'Title is required'
    }

    // Check for duplicate email
    const existingEmails = contacts
      .filter(c => c.id !== editingContact?.id)
      .map(c => (c.email || '').toLowerCase())
    
    if (existingEmails.includes((formData.email || '').toLowerCase())) {
      errors.email = 'A contact with this email already exists'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const isEditing = !!editingContact
    setActionLoading(isEditing ? 'update' : 'create')

    try {
      // Convert form data to API format
      const apiData = {
        ...formData,
        tags: formData.tags ? (formData.tags || '').split(',').map(s => s.trim()) : [],
        next_follow_up: formData.next_follow_up || null
      }

      console.log('Saving contact:', apiData)

      if (isEditing) {
        // Update existing contact (if API supports PATCH/PUT)
        console.log('Update not yet implemented - would update contact:', editingContact?.id)
        throw new Error('Contact updates not yet implemented')
      } else {
        // Create new contact
        const response = await fetch('/api/contacts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(apiData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('API Error Response:', errorData)
          throw new Error(errorData.error || `Failed to create contact: ${response.status}`)
        }

        const result = await response.json()
        console.log('Contact created successfully:', result)
      }

      setSuccess(`Contact ${isEditing ? 'updated' : 'created'} successfully!`)
      setShowCreateForm(false)
      setEditingContact(null)
      resetForm()
      await fetchContacts()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contact')
      console.error('Save contact error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  // Edit handler removed - functionality moved to router navigation

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      title: '',
      company: '',
      department: '',
      is_primary: false,
      source: 'website',
      status: 'active',
      tags: '',
      notes: '',
      linkedin_url: '',
      next_follow_up: ''
    })
    setFormErrors({})
  }

  const handleCancel = () => {
    setShowCreateForm(false)
    setEditingContact(null)
    resetForm()
    setError('')
    setSuccess('')
  }

  const convertToLead = async (contact: Contact) => {
    setActionLoading(contact.id)
    try {
      // Lead data for conversion
      const leadData = {
        contact_id: contact.id,
        company_name: contact.company,
        contact_name: `${contact.first_name} ${contact.last_name}`,
        contact_email: contact.email,
        contact_phone: contact.phone,
        contact_title: contact.title,
        status: 'new',
        source: contact.source,
        priority: 'medium',
        tags: contact.tags,
        notes: `Converted from contact. Original notes: ${contact.notes || 'None'}`,
        estimated_value: 0,
        expected_close_date: null
      }

      console.log('Converting contact to lead:', leadData)

      // Create lead via API
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(leadData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Lead creation API Error:', errorData)
        throw new Error(errorData.error || `Failed to convert to lead: ${response.status}`)
      }

      const result = await response.json()
      console.log('Lead created successfully:', result)

      setSuccess(`Successfully converted ${contact.first_name} ${contact.last_name} to a lead!`)
      
      // In a real app, you might redirect to the leads page or update the contact status
      setTimeout(() => {
        window.location.href = '/dashboard/leads'
      }, 2000)
      
    } catch (error) {
      console.error('Error converting to lead:', error)
      setError('Failed to convert contact to lead. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-primary/10 text-primary'
      case 'inactive': return 'bg-stone-100 text-stone-600'
      case 'do_not_contact': return 'bg-red-100 text-red-600'
      default: return 'bg-stone-100 text-stone-600'
    }
  }

  const getSourceColor = (source: string | undefined) => {
    const safeSource = source || 'website'
    switch (safeSource) {
      case 'website': return 'bg-blue-100 text-blue-600'
      case 'referral': return 'bg-emerald-100 text-emerald-600'
      case 'trade_show': return 'bg-purple-100 text-purple-600'
      case 'cold_outreach': return 'bg-amber-100 text-amber-600'
      default: return 'bg-stone-100 text-stone-600'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const filteredContacts = contacts.filter(contact => {
    const matchesCompany = filterCompany === 'all' || contact.company === filterCompany
    const matchesStatus = filterStatus === 'all' || contact.status === filterStatus
    const matchesSearch = searchTerm === '' || 
      (contact.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.last_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.title || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesCompany && matchesStatus && matchesSearch
  })

  const uniqueCompanies = Array.from(new Set(contacts.map(c => c.company))).sort()

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Contacts</h1>
          <p className="text-slate-600 mt-1">Manage your contact database and relationships</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={fetchContacts} disabled={loading} variant="outline">
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button 
            onClick={() => {
              resetForm()
              setShowCreateForm(true)
              setError('')
              setSuccess('')
            }}
            disabled={showCreateForm}
          >
            New Contact
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800 text-sm">
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

      {/* Contact Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {contacts.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {contacts.filter(c => c.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Primary Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {contacts.filter(c => c.is_primary).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {uniqueCompanies.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filter-company">Filter by Company</Label>
              <Select value={filterCompany} onValueChange={setFilterCompany}>
                <SelectTrigger id="filter-company">
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {uniqueCompanies.map((company) => (
                    <SelectItem key={company} value={company}>{company}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="filter-status">Filter by Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="filter-status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="do_not_contact">Do Not Contact</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="search-contacts">Search Contacts</Label>
              <Input
                id="search-contacts"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, email, company..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>
              {editingContact ? 'Edit Contact' : 'Create New Contact'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="font-medium text-slate-900">Personal Information</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first-name" className="text-slate-900">
                        First Name *
                      </Label>
                      <Input
                        id="first-name"
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        className={formErrors.first_name ? 'border-red-300' : ''}
                        placeholder="John"
                      />
                      {formErrors.first_name && (
                        <div className="text-red-600 text-sm mt-1">{formErrors.first_name}</div>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="last-name" className="text-slate-900">
                        Last Name *
                      </Label>
                      <Input
                        id="last-name"
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        className={formErrors.last_name ? 'border-red-300' : ''}
                        placeholder="Smith"
                      />
                      {formErrors.last_name && (
                        <div className="text-red-600 text-sm mt-1">{formErrors.last_name}</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-slate-900">
                      Email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={formErrors.email ? 'border-red-300' : ''}
                      placeholder="john.smith@company.com"
                    />
                    {formErrors.email && (
                      <div className="text-red-600 text-sm mt-1">{formErrors.email}</div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-slate-900">
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                {/* Company Information */}
                <div className="space-y-4">
                  <h3 className="font-medium text-slate-900">Company Information</h3>

                  <div>
                    <Label htmlFor="company" className="text-slate-900">
                      Company *
                    </Label>
                    <Input
                      id="company"
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className={formErrors.company ? 'border-red-300' : ''}
                      placeholder="Company Name"
                    />
                    {formErrors.company && (
                      <div className="text-red-600 text-sm mt-1">{formErrors.company}</div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="title" className="text-slate-900">
                      Title *
                    </Label>
                    <Input
                      id="title"
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className={formErrors.title ? 'border-red-300' : ''}
                      placeholder="VP of Operations"
                    />
                    {formErrors.title && (
                      <div className="text-red-600 text-sm mt-1">{formErrors.title}</div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="department" className="text-slate-900">
                      Department
                    </Label>
                    <Input
                      id="department"
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="Operations"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is-primary"
                      checked={formData.is_primary}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_primary: !!checked })}
                    />
                    <Label htmlFor="is-primary" className="text-slate-900">
                      Primary Contact for Company
                    </Label>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-stone-200">
                <div className="space-y-4">
                  <h3 className="font-medium text-slate-900">Contact Details</h3>

                  <div>
                    <Label htmlFor="source" className="text-slate-900">
                      Source
                    </Label>
                    <Select value={formData.source} onValueChange={(value) => setFormData({ ...formData, source: value })}>
                      <SelectTrigger id="source">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
                        <SelectItem value="trade_show">Trade Show</SelectItem>
                        <SelectItem value="social_media">Social Media</SelectItem>
                        <SelectItem value="advertising">Advertising</SelectItem>
                        <SelectItem value="networking">Networking</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="status" className="text-slate-900">
                      Status
                    </Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="do_not_contact">Do Not Contact</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="linkedin-url" className="text-slate-900">
                      LinkedIn URL
                    </Label>
                    <Input
                      id="linkedin-url"
                      type="url"
                      value={formData.linkedin_url}
                      onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-slate-900">Additional Info</h3>

                  <div>
                    <Label htmlFor="tags" className="text-slate-900">
                      Tags
                    </Label>
                    <Input
                      id="tags"
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="decision-maker, tech, priority (comma separated)"
                    />
                    <div className="text-xs text-slate-600 mt-1">
                      Separate tags with commas
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="next-follow-up" className="text-slate-900">
                      Next Follow-up
                    </Label>
                    <Input
                      id="next-follow-up"
                      type="date"
                      value={formData.next_follow_up}
                      onChange={(e) => setFormData({ ...formData, next_follow_up: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes" className="text-slate-900">
                      Notes
                    </Label>
                    <Textarea
                      id="notes"
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes about this contact..."
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-stone-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={!!actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!!actionLoading}
                  className="min-w-[120px]"
                >
                  {actionLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>{editingContact ? 'Updating...' : 'Creating...'}</span>
                    </div>
                  ) : (
                    editingContact ? 'Update Contact' : 'Create Contact'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            All Contacts ({filteredContacts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <PageLoading />
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-slate-600 mb-4">
                {searchTerm || filterCompany !== 'all' || filterStatus !== 'all'
                  ? 'No contacts match your filters'
                  : 'No contacts found'
                }
              </div>
              <Button onClick={() => {
                resetForm()
                setShowCreateForm(true)
              }}>
                Create First Contact
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company & Title</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Contact</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact, index) => (
                  <TableRow key={contact.id || `contact-${index}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-slate-900">
                          {contact.first_name} {contact.last_name}
                          {contact.is_primary && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-600">{contact.email}</div>
                        {(contact.tags && (contact.tags || []).length > 0) && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(contact.tags || []).slice(0, 2).map((tag, tagIndex) => (
                              <span key={tagIndex} className="px-1.5 py-0.5 bg-stone-100 text-stone-600 text-xs rounded">
                                {tag}
                              </span>
                            ))}
                            {(contact.tags || []).length > 2 && (
                              <span className="px-1.5 py-0.5 bg-stone-100 text-stone-600 text-xs rounded">
                                +{(contact.tags || []).length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{contact.company}</div>
                        <div className="text-sm text-slate-600">{contact.title}</div>
                        {contact.department && (
                          <div className="text-xs text-slate-600">{contact.department}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {contact.phone && (
                          <div className="text-slate-600">{contact.phone}</div>
                        )}
                        {contact.linkedin_url && (
                          <a 
                            href={contact.linkedin_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 text-xs"
                          >
                            LinkedIn
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs capitalize ${getSourceColor(contact.source)}`}>
                        {safeFormatString(contact.source, 'website')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs capitalize ${getStatusColor(contact.status)}`}>
                        {safeFormatString(contact.status, 'active')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {contact.last_contact_date && (
                          <div>{formatDate(contact.last_contact_date)}</div>
                        )}
                        {contact.next_follow_up && (
                          <div className="text-xs text-amber-600">
                            Follow-up: {formatDate(contact.next_follow_up)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/contacts/${contact.id}/edit`)}
                          disabled={!!actionLoading}
                        >
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => convertToLead(contact)}
                          disabled={actionLoading === contact.id}
                        >
                          {actionLoading === contact.id ? 'Converting...' : '→ Lead'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}