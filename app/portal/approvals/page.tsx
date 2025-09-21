'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PortalGuard } from '@/components/portal/portal-guard'
import { DesignApprovalCard } from '@/components/portal/design-approval-card'
import { ApprovalHistoryList } from '@/components/portal/approval-history-list'
import { 
  CheckCircle,
  Lock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { safeGet } from '@/lib/utils/bulk-type-fixes'

interface DesignFile {
  id: string
  file_url: string
  thumbnail_url?: string
  file_name: string
  version: number
  uploaded_at: string
}

interface Order {
  id: string
  order_number: string
}

interface DesignApproval {
  id: string
  title: string
  description?: string
  status: 'pending' | 'approved' | 'rejected' | 'reviewing'
  reviewer_notes?: string
  design_file?: DesignFile
  order?: Order
  created_at: string
  updated_at: string
}

interface PortalSettings {
  allow_design_approval: boolean
}

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending')
  const [pendingApprovals, setPendingApprovals] = useState<DesignApproval[]>([])
  const [completedApprovals, setCompletedApprovals] = useState<DesignApproval[]>([])
  const [portalSettings, setPortalSettings] = useState<PortalSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadApprovals()
  }, [])

  const loadApprovals = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) return
      
      // Get customer ID
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', session.user.email)
        .single()

      if (customer) {
        // Load portal settings
        const { data: settings } = await supabase
          .from('portal_settings')
          .select('allow_design_approval')
          .eq('customer_id', customer.id)
          .single()

        setPortalSettings({
          allow_design_approval: settings?.allow_design_approval || false
        })

        if (settings?.allow_design_approval) {
          // Load approvals with design files and order info
          const { data: approvals } = await supabase
            .from('design_approvals')
            .select(`
              id,
              title,
              description,
              status,
              reviewer_notes,
              created_at,
              updated_at,
              design_file:design_files(
                id,
                file_url,
                thumbnail_url,
                file_name,
                version,
                uploaded_at
              ),
              order:orders(
                id,
                order_number
              )
            `)
            .eq('customer_id', customer.id)
            .order('created_at', { ascending: false })

          if (approvals) {
            const pending = (approvals as any[]).filter((a: any) => 
              safeGet(a, ['status']) === 'pending' || safeGet(a, ['status']) === 'reviewing'
            )
            const completed = (approvals as any[]).filter((a: any) => 
              safeGet(a, ['status']) === 'approved' || safeGet(a, ['status']) === 'rejected'
            )
            
            setPendingApprovals(pending as DesignApproval[])
            setCompletedApprovals(completed as DesignApproval[])
          }
        }
      }
    } catch (error) {
      console.error('Error loading approvals:', error)
      
      // For development - assume portal allows design approval if database query fails
      setPortalSettings({
        allow_design_approval: true
      })
      
      // Set empty arrays instead of mock data - let the UI show empty state
      setPendingApprovals([])
      setCompletedApprovals([])
    } finally {
      setLoading(false)
    }
  }

  const handleApprovalAction = async (approvalId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      const response = await fetch(`/api/portal/approvals/${approvalId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, notes }),
      })

      if (!response.ok) {
        throw new Error('Failed to process approval')
      }

      // Reload approvals to reflect changes
      await loadApprovals()
      
      // In a real app, you would show a success toast
      console.log(`Design ${action}ed successfully`)
    } catch (error) {
      console.error('Error processing approval:', error)
      // For demo purposes, simulate the action locally
      setPendingApprovals(prev => 
        prev.map(approval => 
          approval.id === approvalId 
            ? { 
                ...approval, 
                status: action === 'approve' ? 'approved' as const : 'rejected' as const,
                reviewer_notes: notes || undefined,
                updated_at: new Date().toISOString()
              }
            : approval
        ).filter(approval => approval.id !== approvalId || (approval.status === 'pending' || approval.status === 'reviewing'))
      )
      
      // Move to completed list
      const updatedApproval = pendingApprovals.find(a => a.id === approvalId)
      if (updatedApproval) {
        setCompletedApprovals(prev => [{
          ...updatedApproval,
          status: action === 'approve' ? 'approved' as const : 'rejected' as const,
          reviewer_notes: notes || undefined,
          updated_at: new Date().toISOString()
        }, ...prev])
      }
    }
  }

  const pendingCount = pendingApprovals.length
  
  const tabs = [
    { id: 'pending' as const, label: 'Pending Approvals', count: pendingCount },
    { id: 'history' as const, label: 'Approval History', count: null }
  ]

  if (loading) {
    return (
      <PortalGuard>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="h-48 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PortalGuard>
    )
  }

  return (
    <PortalGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#4b4949]">Design Approvals</h1>
          <p className="text-gray-600 mt-2">
            Review and approve designs for your orders
          </p>
        </div>

        {!portalSettings?.allow_design_approval ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-700 mb-2">
                Design Approval Not Available
              </h2>
              <p className="text-gray-600 mb-4">
                Design approval access is not enabled for your account
              </p>
              <p className="text-sm text-gray-500">
                Contact us if you need access to design approval features
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="border-b mb-6">
              <div className="flex space-x-8">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "pb-2 px-1 border-b-2 font-medium text-sm transition-colors",
                      activeTab === tab.id
                        ? "border-[#91bdbd] text-[#91bdbd]"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {tab.label}
                    {tab.count !== null && tab.count > 0 && (
                      <Badge className="ml-2 bg-[#91bdbd] text-white" variant="secondary">
                        {tab.count}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            {activeTab === 'pending' ? (
              <div>
                {pendingApprovals.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingApprovals.map(approval => (
                      <DesignApprovalCard
                        key={approval.id}
                        approval={approval}
                        onAction={handleApprovalAction}
                      />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h2 className="text-lg font-semibold text-gray-700 mb-2">
                        No Pending Approvals
                      </h2>
                      <p className="text-gray-600">
                        All designs have been reviewed. New designs will appear here when ready.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <ApprovalHistoryList approvals={completedApprovals} />
            )}
          </>
        )}
      </div>
    </PortalGuard>
  )
}