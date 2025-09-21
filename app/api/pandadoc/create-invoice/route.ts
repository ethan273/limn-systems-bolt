import { NextRequest, NextResponse } from 'next/server';
import { pandaDocService } from '@/lib/pandadoc/service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      invoice_number,
      customer_id,
      customer_name,
      customer_address,
      customer_email,
      line_items,
      subtotal,
      tax_amount,
      total_amount,
      invoice_date,
      payment_terms,
      notes,
      template_id
    } = body;

    // Validate required fields
    if (!invoice_number || !customer_id || !customer_email || !line_items || line_items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use default template if not specified
    const defaultTemplateId = process.env.PANDADOC_INVOICE_TEMPLATE_ID || 'default-invoice-template';

    const invoiceData = {
      invoice_number,
      customer_id,
      customer_name,
      customer_address,
      customer_email,
      line_items,
      subtotal: parseFloat(subtotal),
      tax_amount: parseFloat(tax_amount),
      total_amount: parseFloat(total_amount),
      invoice_date,
      payment_terms: parseInt(payment_terms) || 30,
      notes
    };

    // Create invoice through PandaDoc
    const result = await pandaDocService.createInvoiceFromTemplate(
      invoiceData,
      template_id || defaultTemplateId
    );

    // Log the activity
    await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action: 'create_invoice',
        entity_type: 'invoice',
        entity_id: result.document_id,
        details: {
          invoice_number,
          customer_id,
          total_amount: invoiceData.total_amount
        }
      });

    return NextResponse.json({
      success: true,
      data: {
        document_id: result.document_id,
        invoice_number,
        total_amount: invoiceData.total_amount,
        document_url: result.document_url,
        edit_url: result.edit_url,
        status: 'created'
      }
    });

  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get available templates
    const templates = await pandaDocService.listTemplates();
    
    return NextResponse.json({
      success: true,
      data: {
        templates: templates.filter(t => t.type === 'invoice')
      }
    });

  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}