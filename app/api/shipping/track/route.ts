import { NextResponse } from 'next/server';
import { sekoService } from '@/lib/services/shipping/seko-service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderNumber = searchParams.get('orderNumber');
  
  if (!orderNumber) {
    return NextResponse.json({ error: 'Order number required' }, { status: 400 });
  }

  try {
    const tracking = await sekoService.trackShipment(orderNumber);
    return NextResponse.json(tracking);
  } catch (error) {
    console.error('Tracking error:', error);
    return NextResponse.json({ error: 'Failed to get tracking' }, { status: 500 });
  }
}