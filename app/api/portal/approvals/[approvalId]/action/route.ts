import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ approvalId: string }> }
) {
  try {
    const { approvalId } = await params
    const supabase = await createClient()
    const { action, notes } = await request.json()

    // Get current session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate action
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    // Validate notes for rejection
    if (action === 'reject' && !notes?.trim()) {
      return NextResponse.json(
        { error: 'Notes are required when requesting revision' },
        { status: 400 }
      )
    }

    // Get customer ID
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Verify approval exists and belongs to customer
    const { data: approval } = await supabase
      .from('design_approvals')
      .select('*')
      .eq('id', approvalId)
      .eq('customer_id', customer.id)
      .eq('status', 'pending')
      .single()

    if (!approval) {
      return NextResponse.json(
        { error: 'Approval not found or not available for review' },
        { status: 404 }
      )
    }

    // Update the approval
    const { data: updatedApproval, error: updateError } = await supabase
      .from('design_approvals')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewer_notes: notes || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: session.user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', approvalId)
      .select(`
        *,
        design_file:design_files(*)
      `)
      .single()

    if (updateError) {
      console.error('Error updating approval:', updateError)
      return NextResponse.json(
        { error: 'Failed to update approval' },
        { status: 500 }
      )
    }

    // Create history record
    await supabase
      .from('approval_history')
      .insert({
        approval_id: approvalId,
        action: action === 'approve' ? 'approved' : 'rejected',
        notes: notes || null,
        previous_status: 'pending',
        new_status: action === 'approve' ? 'approved' : 'rejected',
        created_by: session.user.id
      })

    // Create notification for internal team (if we have assigned team member)
    if (approval.assigned_to) {
      await supabase
        .from('notifications')
        .insert({
          type: 'design_approval',
          recipient_id: approval.assigned_to,
          title: action === 'approve' ? 'Design Approved!' : 'Revision Requested',
          message: action === 'approve' 
            ? `Customer approved: ${approval.title}`
            : `Customer requested revision for: ${approval.title}${notes ? ` - "${notes}"` : ''}`,
          link: `/dashboard/approvals/${approvalId}`
        })
    }

    return NextResponse.json({
      success: true,
      approval: updatedApproval
    })

  } catch (error) {
    console.error('Error processing approval action:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}