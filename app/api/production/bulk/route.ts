import { NextResponse } from 'next/server';
import { productionService } from '@/lib/services/shipping/seko-service';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { itemIds, stageId, notes } = body;

    // Update each item in the bulk selection
    const promises = itemIds.map((itemId: string) =>
      productionService.updateProductionStage(itemId, stageId, notes)
    );

    await Promise.all(promises);

    return NextResponse.json({ 
      success: true, 
      updated: itemIds.length,
      message: `Successfully updated ${itemIds.length} items`
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    return NextResponse.json({ error: 'Failed to bulk update production stages' }, { status: 500 });
  }
}