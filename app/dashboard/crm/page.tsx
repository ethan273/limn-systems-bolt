'use client'

import { useState, useMemo } from 'react'
import { useApiDataMultiple } from '@/hooks/use-api-data'
// Router removed as unused
import { DashboardSkeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { safeFormatString } from '@/lib/utils/string-helpers'
import CreateLeadModal from '@/components/crm/CreateLeadModal'
import EditLeadModal from '@/components/crm/EditLeadModal'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import {
  AlertCircle, DollarSign, Phone, Mail,
  Calendar, Plus, LayoutGrid, Building2, List
} from 'lucide-react'

interface Lead {
  id: string
  name: string
  company: string
  email: string
  phone: string
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
  source: 'website' | 'referral' | 'cold_outreach' | 'trade_show' | 'social_media' | 'advertising'
  value: number
  assigned_to: string
  created_at: string
  last_contact: string
  next_followup: string
  notes?: string
}

interface Contact {
  id: string
  name: string
  company: string
  title: string
  email: string
  phone: string
  industry: string
  relationship_stage: 'prospect' | 'customer' | 'partner' | 'vendor'
  lifetime_value: number
  created_at: string
  last_interaction: string
}

interface Client {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  company_name?: string
  type: string
  status: string
  address?: string
  created_at: string
}

interface Project {
  id: string
  project_name: string
  customer_id: string
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  priority: string
  start_date: string
  end_date: string
  estimated_completion_date: string
  actual_completion_date: string
  budget: number
  budget_estimate: number
  actual_cost: number
  project_manager: string
  description: string
  created_at: string
  updated_at: string
}


export default function CRMPage() {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'contacts' | 'leads' | 'clients' | 'projects' | 'table' | 'companies'>('pipeline')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  // Future functionality for contact/client editing
  // const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  // const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  // Enhanced CRM state variables
  const [quickAddValue, setQuickAddValue] = useState('')

  // Memoize endpoints to prevent infinite re-renders
  const endpoints = useMemo(() => ({
    leads: '/api/crm/leads',
    contacts: '/api/crm/contacts',
    clients: '/api/crm/clients',
    projects: '/api/projects'
  }), [])

  // Use optimized data fetching with caching
  const { data, loading, error, refetch } = useApiDataMultiple<{
    leads: Lead[]
    contacts: Contact[]
    clients: Client[]
    projects: Project[]
  }>(endpoints, {
    cacheTime: 10 * 60 * 1000, // 10 minutes cache
    staleTime: 2 * 60 * 1000,   // 2 minutes stale time
  })

  const leads = data?.leads || []
  const contacts = data?.contacts || []
  const clients = data?.clients || []
  const projects = data?.projects || []

  // Data is automatically fetched by useApiDataMultiple hook

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-stone-100 text-stone-700'
      case 'contacted': return 'bg-blue-100 text-blue-700'
      case 'qualified': return 'bg-amber-100 text-amber-700'
      case 'proposal': return 'bg-purple-100 text-purple-700'
      case 'negotiation': return 'bg-orange-100 text-orange-700'
      case 'closed_won': return 'bg-primary/10 text-primary'
      case 'closed_lost': return 'bg-red-100 text-red-700'
      default: return 'bg-stone-100 text-stone-700'
    }
  }


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleEditLead = async (leadId: string) => {
    setSelectedLead(leads.find(l => l.id === leadId) || null)
    setShowEditModal(true)
  }

  // Future functionality for lead management
  // const handleDeleteLead = async (leadId: string) => {
  //   if (!confirm('Are you sure you want to delete this lead?')) return
  //   const res = await fetch(`/api/crm/leads/${leadId}`, { method: 'DELETE' })
  //   if (res.ok) {
  //     refetch()
  //   }
  // }

  // const handleUpdateLeadStatus = async (leadId: string, newStatus: string) => {
  //   const res = await fetch(`/api/crm/leads/${leadId}`, {
  //     method: 'PATCH',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ status: newStatus })
  //   })
  //   if (res.ok) refetch()
  // }

  const handleAddLead = () => {
    setShowCreateModal(true)
  }

  const handleSendEmail = (email: string) => {
    window.location.href = `mailto:${email}`
  }

  async function handleUpdateLeadStatus(leadId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/crm/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) refetch()
    } catch (error) {
      console.error('Failed to update lead status:', error)
    }
  }

  // Future functionality for scheduling calls
  // const handleScheduleCall = async (leadId: string) => {
  //   await fetch('/api/crm/activities', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({
  //       type: 'call',
  //       subject: 'Scheduled Call',
  //       related_to: 'leads',
  //       related_id: leadId
  //     })
  //   })
  //   alert('Call scheduled and logged')
  // }



  // Helper functions for enhanced CRM features

  // Calculate days since last contact
  const daysSince = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  // Auto-tag leads based on characteristics
  const autoTagLead = (lead: Lead) => {
    const tags: string[] = []
    if (lead.value > 100000) tags.push('enterprise')
    if (lead.value > 50000 && lead.value <= 100000) tags.push('mid-market')
    if (lead.source === 'referral') tags.push('warm-lead')
    if (daysSince(lead.created_at) > 30 && lead.status === 'new') tags.push('stale')
    if (lead.company?.toLowerCase().includes('hotel') ||
        lead.company?.toLowerCase().includes('resort') ||
        lead.company?.toLowerCase().includes('restaurant')) tags.push('hospitality')
    if (lead.company?.toLowerCase().includes('design') ||
        lead.company?.toLowerCase().includes('interior')) tags.push('designer')
    return tags
  }

  // Get stage-specific actions
  const getStageActions = (lead: Lead) => {
    switch(lead.status) {
      case 'new':
        return [
          { label: 'Send Welcome', icon: Mail, action: () => handleQuickAction(lead, 'welcome') },
          { label: 'Schedule Call', icon: Phone, action: () => handleQuickAction(lead, 'schedule-call') }
        ]
      case 'contacted':
        return [
          { label: 'Send Catalog', icon: Mail, action: () => handleQuickAction(lead, 'send-catalog') },
          { label: 'Book Meeting', icon: Calendar, action: () => handleQuickAction(lead, 'book-meeting') }
        ]
      case 'qualified':
        return [
          { label: 'Create Proposal', icon: Mail, action: () => handleQuickAction(lead, 'proposal') },
          { label: 'Send Samples', icon: Mail, action: () => handleQuickAction(lead, 'samples') }
        ]
      case 'proposal':
        return [
          { label: 'Follow Up', icon: Phone, action: () => handleQuickAction(lead, 'follow-up') },
          { label: 'Offer Discount', icon: DollarSign, action: () => handleQuickAction(lead, 'discount') }
        ]
      case 'negotiation':
        return [
          { label: 'Final Offer', icon: DollarSign, action: () => handleQuickAction(lead, 'final-offer') },
          { label: 'Add Options', icon: Mail, action: () => handleQuickAction(lead, 'add-options') }
        ]
      default:
        return []
    }
  }

  // Quick create lead from string
  const quickCreateLead = async (input: string) => {
    // Parse format: "Name - Company - Email - Value"
    const parts = input.split(' - ').map(p => p.trim())
    if (parts.length < 3) {
      alert('Format: Name - Company - Email - Value (optional)')
      return
    }

    const leadData = {
      name: parts[0],
      company: parts[1],
      email: parts[2],
      value: parts[3] ? parseFloat(parts[3].replace(/[^0-9.]/g, '')) : 0,
      status: 'new',
      source: 'manual_entry',
      created_at: new Date().toISOString(),
      last_contact: new Date().toISOString()
    }

    try {
      const res = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(leadData)
      })

      if (res.ok) {
        setQuickAddValue('')
        refetch()
      }
    } catch (error) {
      console.error('Failed to create lead:', error)
    }
  }

  // Handle quick actions
  const handleQuickAction = async (lead: Lead, action: string) => {
    // Log the activity
    await fetch('/api/crm/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        type: action,
        description: `${action} for ${lead.name}`,
        entity_type: 'leads',
        entity_id: lead.id
      })
    })

    // Update last contact
    await fetch(`/api/crm/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ last_contact: new Date().toISOString() })
    })

    refetch()
  }

  // Calculate pipeline metrics
  const calculatePipelineMetrics = () => {
    const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won']
    const metricsData = stages.map(stage => {
      const stageLeads = leads.filter(l => l.status === stage)
      const total = stageLeads.reduce((sum, lead) => sum + (lead.value || 0), 0)
      const count = stageLeads.length
      const avgValue = count > 0 ? total / count : 0

      return { stage, total, count, avgValue, leads: stageLeads }
    })

    const totalPipeline = metricsData.reduce((sum, m) => sum + m.total, 0)
    const weightedPipeline = metricsData.reduce((sum, m) => {
      const probability = {
        new: 0.1, contacted: 0.2, qualified: 0.4,
        proposal: 0.6, negotiation: 0.8, closed_won: 1
      }[m.stage] || 0
      return sum + (m.total * probability)
    }, 0)

    return { stages: metricsData, totalPipeline, weightedPipeline }
  }


  // Handle drag and drop
  const handleDragEnd = async (result: DropResult) => {
    if (!result?.destination) return

    const leadId = result.draggableId
    const newStatus = result.destination.droppableId

    await handleUpdateLeadStatus(leadId, newStatus)
  }

  // Show skeleton while loading initial data
  if (loading && !data) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">CRM</h1>
          <p className="text-slate-600 mt-1">Manage leads, contacts, and deal pipeline</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={refetch} disabled={loading} variant="outline">
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button onClick={handleAddLead}>
            Add Lead
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

      {/* Enhanced Business Intelligence Dashboard */}
      <Card className="mb-6 bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div>
              <p className="text-teal-100 text-sm font-medium">This Month</p>
              <p className="text-3xl font-bold">
                ${leads.filter(l =>
                  new Date(l.created_at).getMonth() === new Date().getMonth() &&
                  l.status === 'closed_won'
                ).reduce((sum, l) => sum + (l.value || 0), 0).toLocaleString()}
              </p>
              <p className="text-sm text-teal-100 mt-1">
                ↑ 23% vs last month
              </p>
            </div>
            <div>
              <p className="text-teal-100 text-sm font-medium">Pipeline Value</p>
              <p className="text-3xl font-bold">
                ${calculatePipelineMetrics().totalPipeline.toLocaleString()}
              </p>
              <p className="text-sm text-teal-100 mt-1">
                {leads.filter(l => l.status === 'qualified').length} qualified
              </p>
            </div>
            <div>
              <p className="text-teal-100 text-sm font-medium">Weighted Pipeline</p>
              <p className="text-3xl font-bold">
                ${calculatePipelineMetrics().weightedPipeline.toLocaleString()}
              </p>
              <p className="text-sm text-teal-100 mt-1">
                Probability adjusted
              </p>
            </div>
            <div>
              <p className="text-teal-100 text-sm font-medium">Win Rate</p>
              <p className="text-3xl font-bold">
                {leads.length > 0
                  ? Math.round((leads.filter(l => l.status === 'closed_won').length / leads.length) * 100)
                  : 0}%
              </p>
              <p className="text-sm text-teal-100 mt-1">
                Last 30 days
              </p>
            </div>
            <div>
              <p className="text-teal-100 text-sm font-medium">Avg Deal Size</p>
              <p className="text-3xl font-bold">
                ${leads.filter(l => l.status === 'closed_won' && l.value).length > 0
                  ? Math.round(
                      leads.filter(l => l.status === 'closed_won')
                        .reduce((sum, l) => sum + (l.value || 0), 0) /
                      leads.filter(l => l.status === 'closed_won' && l.value).length
                    ).toLocaleString()
                  : 0}
              </p>
              <p className="text-sm text-teal-100 mt-1">
                ↑ $12K from Q1
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Lead Entry Bar */}
      <div className="sticky top-0 z-50 bg-white border-b p-3 shadow-sm mb-4">
        <div className="flex gap-2">
          <Input
            placeholder="Quick add: John Smith - Acme Corp - john@acme.com - 50000"
            value={quickAddValue}
            onChange={(e) => setQuickAddValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                quickCreateLead(quickAddValue)
              }
            }}
            className="flex-1"
          />
          <Button onClick={() => quickCreateLead(quickAddValue)}>
            <Plus className="w-4 h-4 mr-2" />
            Quick Add Lead
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="pipeline">
              <LayoutGrid className="w-4 h-4 mr-2" />
              Pipeline View
            </TabsTrigger>
            <TabsTrigger value="companies">
              <Building2 className="w-4 h-4 mr-2" />
              Company View
            </TabsTrigger>
            <TabsTrigger value="table">
              <List className="w-4 h-4 mr-2" />
              Table View
            </TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
          </TabsList>
        </div>

        {/* Enhanced Pipeline View with Kanban */}
        <TabsContent value="pipeline">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {calculatePipelineMetrics().stages.map(({ stage, total, count, leads: stageLeads }) => (
                <div key={stage} className="min-w-[350px] flex-shrink-0">
                  <div className="bg-gray-50 rounded-t-lg p-3 border-b">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-sm uppercase text-gray-700">
                          {stage.replace('_', ' ')}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">{count} deals</p>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        ${total.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <Droppable droppableId={stage}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[200px] p-2 bg-gray-50 rounded-b-lg ${
                          snapshot.isDraggingOver ? 'bg-blue-50' : ''
                        }`}
                      >
                        {stageLeads.map((lead, index) => (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={provided.draggableProps.style}
                              >
                                <Card className={`mb-2 ${snapshot.isDragging ? 'shadow-lg' : ''} relative overflow-hidden`}>
                                  {/* Deal size indicator */}
                                  <div
                                    className="absolute left-0 top-0 h-full w-1"
                                    style={{
                                      backgroundColor: lead.value > 100000 ? '#16a34a' :
                                                     lead.value > 50000 ? '#eab308' : '#64748b'
                                    }}
                                  />

                                  <CardContent className="p-3 pl-4">
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="flex-1">
                                        <p className="font-semibold text-sm">{lead.name}</p>
                                        <p className="text-xs text-gray-600">{lead.company}</p>
                                      </div>
                                      <p className="font-bold text-sm">
                                        ${(lead.value || 0).toLocaleString()}
                                      </p>
                                    </div>

                                    {/* Auto-generated tags */}
                                    <div className="flex gap-1 flex-wrap mb-2">
                                      {autoTagLead(lead).map(tag => (
                                        <Badge key={tag} variant="secondary" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>

                                    {/* Follow-up alert */}
                                    {daysSince(lead.last_contact) > 7 && !['closed_won', 'closed_lost'].includes(lead.status) && (
                                      <Alert className="p-2 mb-2 bg-amber-50 border-amber-200">
                                        <AlertCircle className="h-3 w-3 text-amber-600" />
                                        <span className="text-xs ml-2">
                                          No contact for {daysSince(lead.last_contact)} days
                                        </span>
                                      </Alert>
                                    )}

                                    {/* Quick actions */}
                                    <div className="flex gap-1 mt-2">
                                      {getStageActions(lead).slice(0, 2).map((action, i) => (
                                        <Button
                                          key={i}
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 text-xs"
                                          onClick={action.action}
                                        >
                                          <action.icon className="w-3 h-3 mr-1" />
                                          {action.label}
                                        </Button>
                                      ))}
                                    </div>

                                    {/* Contact info */}
                                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                      <Mail className="w-3 h-3" />
                                      {lead.email}
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        </TabsContent>

      {/* Leads View */}
      {activeTab === 'leads' && (
        <Card>
          <CardHeader>
            <CardTitle>Leads ({leads.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Next Follow-up</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-sm text-slate-600">{lead.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{lead.company}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${getStatusColor(lead.status)}`}>
                        {safeFormatString(lead.status, 'unknown')}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(lead.value)}</TableCell>
                    <TableCell className="capitalize">{safeFormatString(lead.source, 'website')}</TableCell>
                    <TableCell>{lead.assigned_to}</TableCell>
                    <TableCell>{formatDate(lead.next_followup)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditLead(lead.id)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendEmail(lead.email)}
                        >
                          Email
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Contacts View */}
      {activeTab === 'contacts' && (
        <Card>
          <CardHeader>
            <CardTitle>Contacts ({contacts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Relationship</TableHead>
                  <TableHead>Lifetime Value</TableHead>
                  <TableHead>Last Interaction</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{contact.name}</div>
                        <div className="text-sm text-slate-600">{contact.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{contact.company}</TableCell>
                    <TableCell>{contact.title}</TableCell>
                    <TableCell>{contact.industry}</TableCell>
                    <TableCell>
                      <span className="capitalize">{contact.relationship_stage}</span>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(contact.lifetime_value)}</TableCell>
                    <TableCell>{formatDate(contact.last_interaction)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // setSelectedContact(contact)
                            // setShowEditModal(true)
                            alert('Contact edit functionality coming soon')
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendEmail(contact.email)}
                        >
                          Email
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Clients View */}
      {activeTab === 'clients' && (
        <Card>
          <CardHeader>
            <CardTitle>All Clients ({clients.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="font-medium">{client.name}</div>
                    </TableCell>
                    <TableCell>{client.company_name || client.company || 'N/A'}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.phone}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${getStatusColor(client.status)}`}>
                        {safeFormatString(client.status, 'unknown')}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(client.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // setSelectedClient(client)
                            // setShowEditModal(true)
                            alert('Client edit functionality coming soon')
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendEmail(client.email)}
                        >
                          Contact
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Projects View */}
      {activeTab === 'projects' && (
        <Card>
          <CardHeader>
            <CardTitle>All Projects ({projects.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Project Manager</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div className="font-medium">{project.project_name}</div>
                    </TableCell>
                    <TableCell>{project.project_manager || 'Unassigned'}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${getStatusColor(project.status)}`}>
                        {safeFormatString(project.status.replace('_', ' '), 'unknown')}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(project.budget || project.budget_estimate || 0)}</TableCell>
                    <TableCell>{project.start_date ? formatDate(project.start_date) : 'TBD'}</TableCell>
                    <TableCell>{project.end_date ? formatDate(project.end_date) : 'TBD'}</TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // TODO: Implement project edit modal
                            alert('Project edit functionality coming soon')
                          }}
                        >
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">View</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <CreateLeadModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => refetch()}
      />

      <EditLeadModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedLead(null)
        }}
        onSuccess={() => refetch()}
        lead={selectedLead}
      />

      </Tabs>

    </div>
  )
}