import { NextResponse } from 'next/server';
import { webhookHandler } from '@/lib/services/shipping/seko-service';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('X-Webhook-Signature');
    const timestamp = request.headers.get('X-Webhook-Timestamp');

    // Verify webhook signature if configured
    if (process.env.SEKO_WEBHOOK_SECRET && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.SEKO_WEBHOOK_SECRET)
        .update(timestamp + '.' + body)
        .digest('hex');

      const receivedSignature = signature.replace('sha256=', '');
      
      if (expectedSignature !== receivedSignature) {
        console.error('Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' }, 
          { status: 401 }
        );
      }
    }

    // Parse webhook payload
    const payload = JSON.parse(body);
    
    // Log webhook for debugging
    console.log('Received Seko webhook:', {
      type: payload.type,
      timestamp: new Date().toISOString(),
      data: payload.data
    });

    // Process webhook
    await webhookHandler.handleSekoWebhook(payload);

    // Return success response
    return NextResponse.json({ 
      success: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Seko webhook processing error:', error);
    
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

// Handle GET requests for webhook verification
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');
  
  // Some webhook services require challenge verification
  if (challenge) {
    return NextResponse.json({ challenge });
  }
  
  return NextResponse.json({ 
    status: 'Seko webhook endpoint active',
    timestamp: new Date().toISOString()
  });
}