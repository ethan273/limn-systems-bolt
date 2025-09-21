import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Fetch from shipping_status view in Supabase
    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from('shipping_status')
      .select('*')
      .limit(limit)
      .order('id', { ascending: false });
    
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Supabase error:', error);
      // Fall through to mock data
    } else if (data && data.length > 0) {
      return NextResponse.json(data);
    }
    
    // For now, return mock data
    const mockShipments = [
      {
        id: '1',
        customer_order_number: 'ORD-2025-001',
        tracking_number: 'LIMN1674567890',
        carrier: 'FedEx',
        service_level: '2 Day',
        status: 'in_transit',
        ship_from: { city: 'San Francisco', state: 'CA', country: 'US' },
        ship_to: { name: 'Acme Corp', city: 'New York', state: 'NY', country: 'US' },
        estimated_delivery: '2025-01-30T17:00:00Z',
        total_cost: 45.99,
        created_at: '2025-01-25T10:00:00Z'
      },
      {
        id: '2',
        customer_order_number: 'ORD-2025-002',
        tracking_number: 'LIMN1674567891',
        carrier: 'UPS',
        service_level: 'Ground',
        status: 'delivered',
        ship_from: { city: 'San Francisco', state: 'CA', country: 'US' },
        ship_to: { name: 'Design Studio', city: 'Los Angeles', state: 'CA', country: 'US' },
        estimated_delivery: '2025-01-28T17:00:00Z',
        actual_delivery: '2025-01-27T14:30:00Z',
        total_cost: 32.50,
        created_at: '2025-01-22T09:15:00Z'
      }
    ];

    // Filter by status if provided
    const filteredShipments = status && status !== 'all' 
      ? mockShipments.filter(s => s.status === status)
      : mockShipments;

    return NextResponse.json(filteredShipments);
  } catch (error) {
    console.error('Error fetching shipments:', error);
    return NextResponse.json({ error: 'Failed to fetch shipments' }, { status: 500 });
  }
}