import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const defaultStages = [
  { id: '1', name: 'Order Confirmed', description: 'Order received and confirmed', order: 1, icon: 'CheckCircle' },
  { id: '2', name: 'Materials Sourcing', description: 'Gathering required materials', order: 2, icon: 'Package' },
  { id: '3', name: 'Production Queue', description: 'Waiting in production queue', order: 3, icon: 'Clock' },
  { id: '4', name: 'In Production', description: 'Currently being manufactured', order: 4, icon: 'Package' },
  { id: '5', name: 'Quality Control', description: 'Quality inspection and testing', order: 5, icon: 'CheckCircle' },
  { id: '6', name: 'Finishing', description: 'Final finishing touches', order: 6, icon: 'Package' },
  { id: '7', name: 'Final Inspection', description: 'Final quality check', order: 7, icon: 'CheckCircle' },
  { id: '8', name: 'Packaging', description: 'Packaging for shipment', order: 8, icon: 'Package' },
  { id: '9', name: 'Ready to Ship', description: 'Ready for pickup/shipment', order: 9, icon: 'Package' },
  { id: '10', name: 'Shipped', description: 'Item has been shipped', order: 10, icon: 'Package' }
];

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try to fetch from database first
    const { data: stages, error } = await supabase
      .from('production_stages')
      .select('*')
      .order('order', { ascending: true });

    if (error && error.code === 'PGRST116') {
      // Table doesn't exist yet - return default stages
      console.log('Production stages table not yet created. Using default stages.');
      return NextResponse.json({ data: defaultStages });
    } else if (error) {
      console.error('Database error:', error);
      // Return default stages on database error
      return NextResponse.json({ data: defaultStages });
    }

    // Return database stages if available, otherwise default stages
    return NextResponse.json({ data: stages && stages.length > 0 ? stages : defaultStages });
  } catch {
    console.log('Database connection error. Using default production stages.');
    return NextResponse.json({ data: defaultStages });
  }
}