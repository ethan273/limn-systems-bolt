import { NextResponse } from 'next/server';
import { webhookHandler } from '@/lib/services/shipping/seko-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Verify webhook signature here if needed
    // const signature = request.headers.get('X-Webhook-Signature');
    
    await webhookHandler.handleSekoWebhook(body);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}