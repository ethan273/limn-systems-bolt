import { NextResponse, NextRequest } from 'next/server';
import { sekoService } from '@/lib/services/shipping/seko-service';

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  try {
    const booking = await sekoService.bookShipment(body);
    return NextResponse.json(booking);
  } catch (error) {
    console.error('Booking error:', error);
    return NextResponse.json({ error: 'Failed to book shipment' }, { status: 500 });
  }
}