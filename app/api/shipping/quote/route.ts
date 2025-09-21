import { NextResponse, NextRequest } from 'next/server';
import { sekoService } from '@/lib/services/shipping/seko-service';

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  try {
    const quotes = await sekoService.getQuotes(body);
    return NextResponse.json(quotes);
  } catch (error) {
    console.error('Quote error:', error);
    return NextResponse.json({ error: 'Failed to get quotes' }, { status: 500 });
  }
}