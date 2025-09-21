// SMS Webhook Handler
// Phase 2 Implementation

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    // Handle Twilio status callbacks
    if (data.MessageStatus && data.MessageSid) {
      const { error } = await supabase
        .from('sms_delivery_logs')
        .update({
          delivery_status: data.MessageStatus,
          delivered_at: new Date(),
          provider_status_message: data.ErrorMessage || null
        })
        .eq('provider_message_id', data.MessageSid)

      if (error) {
        console.error('Failed to update SMS delivery status:', error)
      }

      // Update SMS log status
      await supabase
        .from('sms_logs')
        .update({
          status: data.MessageStatus === 'delivered' ? 'delivered' : 'failed',
          delivered_at: new Date()
        })
        .eq('provider_message_id', data.MessageSid)
    }

    // Handle opt-out keywords (STOP, UNSUBSCRIBE, etc.)
    if (data.Body && data.From) {
      const message = data.Body.toUpperCase().trim()
      const optOutKeywords = ['STOP', 'UNSUBSCRIBE', 'QUIT', 'END', 'CANCEL']
      
      if (optOutKeywords.includes(message)) {
        await supabase
          .from('sms_opt_outs')
          .upsert({
            phone_number: data.From,
            opt_out_date: new Date(),
            opt_out_method: 'sms_reply',
            opt_out_message: data.Body
          })

        // Send confirmation (this would be handled by the SMS service)
        // await smsService.sendOptOutConfirmation(data.From)
      }
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('SMS webhook error:', error)
    return Response.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}