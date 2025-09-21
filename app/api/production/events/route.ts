import { NextResponse } from 'next/server';
import { productionService } from '@/lib/services/shipping/seko-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderItemId, eventType, title, description, severity } = body;

    // In a real implementation, get the tracking ID from the order item
    const trackingId = `tracking_${orderItemId}`;

    await productionService.addProductionEvent(
      trackingId,
      eventType,
      title,
      description,
      severity
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding production event:', error);
    return NextResponse.json({ error: 'Failed to add production event' }, { status: 500 });
  }
}