import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class PandaDocInvoiceService {
  constructor() {
    this.apiKey = process.env.PANDADOC_API_KEY;
    this.baseURL = 'https://api.pandadoc.com/public/v1';
    
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `API-Key ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Create invoice with line items, taxes, and payment tracking
  async createInvoice(invoiceData) {
    try {
      // Calculate totals
      const subtotal = invoiceData.line_items.reduce((sum, item) => 
        sum + (item.quantity * item.price), 0
      );
      
      const taxAmount = subtotal * (invoiceData.tax_rate || 0);
      const total = subtotal + taxAmount;

      const documentData = {
        name: `Invoice ${invoiceData.invoice_number} - ${invoiceData.customer_name}`,
        template_uuid: process.env.PANDADOC_INVOICE_TEMPLATE_ID,
        recipients: [
          {
            email: invoiceData.billing_email,
            first_name: invoiceData.billing_contact_first,
            last_name: invoiceData.billing_contact_last,
            role: 'Customer',
            signing_order: 1
          }
        ],
        tokens: [
          // Header Information
          {
            name: 'invoice_number',
            value: invoiceData.invoice_number
          },
          {
            name: 'invoice_date',
            value: invoiceData.invoice_date || new Date().toISOString().split('T')[0]
          },
          {
            name: 'due_date',
            value: invoiceData.due_date || this.calculateDueDate(invoiceData.payment_terms || 30)
          },
          {
            name: 'po_number',
            value: invoiceData.po_number || ''
          },
          // Customer Information
          {
            name: 'customer_name',
            value: invoiceData.customer_name
          },
          {
            name: 'customer_address',
            value: invoiceData.customer_address
          },
          {
            name: 'customer_city_state_zip',
            value: `${invoiceData.customer_city}, ${invoiceData.customer_state} ${invoiceData.customer_zip}`
          },
          // Billing Information
          {
            name: 'billing_contact',
            value: `${invoiceData.billing_contact_first} ${invoiceData.billing_contact_last}`
          },
          {
            name: 'billing_email',
            value: invoiceData.billing_email
          },
          {
            name: 'billing_phone',
            value: invoiceData.billing_phone || ''
          },
          // Payment Terms
          {
            name: 'payment_terms',
            value: `Net ${invoiceData.payment_terms || 30}`
          },
          {
            name: 'late_fee_percentage',
            value: invoiceData.late_fee_percentage || '1.5%'
          },
          // Totals
          {
            name: 'subtotal',
            value: this.formatCurrency(subtotal)
          },
          {
            name: 'tax_rate',
            value: `${(invoiceData.tax_rate || 0) * 100}%`
          },
          {
            name: 'tax_amount',
            value: this.formatCurrency(taxAmount)
          },
          {
            name: 'total_amount',
            value: this.formatCurrency(total)
          },
          // Bank Details
          {
            name: 'bank_name',
            value: process.env.COMPANY_BANK_NAME || 'Bank of America'
          },
          {
            name: 'bank_account',
            value: process.env.COMPANY_BANK_ACCOUNT || '****1234'
          },
          {
            name: 'bank_routing',
            value: process.env.COMPANY_BANK_ROUTING || '****5678'
          },
          // Notes
          {
            name: 'invoice_notes',
            value: invoiceData.notes || ''
          }
        ],
        pricing_tables: [
          {
            name: 'invoice_items',
            data_merge: true,
            options: {
              discount: {
                type: 'absolute',
                value: invoiceData.discount || 0
              }
            },
            rows: invoiceData.line_items.map(item => ({
              options: {
                optional: false,
                optional_selected: true,
                qty_editable: false
              },
              data: {
                name: item.description,
                description: item.details || '',
                price: item.price,
                qty: item.quantity,
                tax: {
                  type: 'percent',
                  value: invoiceData.tax_rate || 0
                }
              },
              custom_fields: {
                item_code: item.item_code || '',
                unit: item.unit || 'each'
              }
            }))
          }
        ],
        metadata: {
          type: 'INVOICE',
          order_id: invoiceData.order_id,
          customer_id: invoiceData.customer_id,
          project_id: invoiceData.project_id,
          invoice_number: invoiceData.invoice_number,
          subtotal: subtotal,
          tax_amount: taxAmount,
          total: total,
          payment_status: 'pending',
          created_by: invoiceData.created_by
        },
        expiration_date: this.calculateExpiryDate(90) // 90 days for invoices
      };

      // Create in PandaDoc
      const response = await this.api.post('/documents', documentData);
      const pandaDocId = response.data.id;

      // Save to database
      const { data: dbInvoice, error } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceData.invoice_number,
          customer_id: invoiceData.customer_id,
          order_id: invoiceData.order_id,
          project_id: invoiceData.project_id,
          pandadoc_id: pandaDocId,
          status: 'draft',
          subtotal: subtotal,
          tax_amount: taxAmount,
          total: total,
          due_date: invoiceData.due_date || this.calculateDueDate(invoiceData.payment_terms || 30),
          payment_terms: invoiceData.payment_terms || 30,
          line_items: invoiceData.line_items,
          metadata: {
            customer_name: invoiceData.customer_name,
            billing_email: invoiceData.billing_email,
            pandadoc_status: 'document.draft'
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Wait for processing
      await this.waitForDocumentProcessing(pandaDocId);

      // Auto-send if requested
      if (invoiceData.auto_send) {
        await this.sendInvoice(pandaDocId);
      }

      return {
        success: true,
        invoice: dbInvoice,
        pandadoc_id: pandaDocId,
        view_url: `https://app.pandadoc.com/a/#/documents/${pandaDocId}`
      };
    } catch (error) {
      console.error('Invoice creation error:', error);
      throw error;
    }
  }

  // Send invoice for payment
  async sendInvoice(documentId) {
    try {
      const response = await this.api.post(`/documents/${documentId}/send`, {
        message: 'Please review and approve the attached invoice for payment.',
        subject: 'Invoice for Your Review',
        silent: false
      });

      // Update database
      await supabase
        .from('invoices')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          metadata: {
            pandadoc_status: 'document.sent'
          }
        })
        .eq('pandadoc_id', documentId);

      return response.data;
    } catch (error) {
      console.error('Send invoice error:', error);
      throw error;
    }
  }

  // Create recurring invoice
  async createRecurringInvoice(recurringData) {
    const invoices = [];
    const startDate = new Date(recurringData.start_date);
    const endDate = new Date(recurringData.end_date);
    
    let currentDate = new Date(startDate);
    let invoiceCount = 1;

    while (currentDate <= endDate) {
      const invoiceData = {
        ...recurringData,
        invoice_number: `${recurringData.invoice_prefix}-${String(invoiceCount).padStart(4, '0')}`,
        invoice_date: currentDate.toISOString().split('T')[0],
        due_date: this.calculateDueDate(recurringData.payment_terms || 30, currentDate)
      };

      const result = await this.createInvoice(invoiceData);
      invoices.push(result);

      // Increment based on frequency
      switch (recurringData.frequency) {
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'quarterly':
          currentDate.setMonth(currentDate.getMonth() + 3);
          break;
        case 'annually':
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
      }
      
      invoiceCount++;
    }

    return invoices;
  }

  // Mark invoice as paid
  async markInvoiceAsPaid(invoiceId, paymentData) {
    try {
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (error) throw error;

      // Update invoice status
      await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: paymentData.payment_date || new Date().toISOString(),
          payment_method: paymentData.payment_method,
          payment_reference: paymentData.reference_number,
          metadata: {
            ...invoice.metadata,
            payment_data: paymentData
          }
        })
        .eq('id', invoiceId);

      // Create payment record
      await supabase
        .from('payments')
        .insert({
          invoice_id: invoiceId,
          amount: paymentData.amount || invoice.total,
          payment_method: paymentData.payment_method,
          reference_number: paymentData.reference_number,
          payment_date: paymentData.payment_date || new Date().toISOString(),
          notes: paymentData.notes
        });

      return { success: true };
    } catch (error) {
      console.error('Mark as paid error:', error);
      throw error;
    }
  }

  // Get overdue invoices
  async getOverdueInvoices() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .in('status', ['sent', 'viewed'])
        .lt('due_date', today)
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Calculate days overdue
      const overdueInvoices = data.map(invoice => {
        const daysOverdue = Math.floor(
          (new Date() - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24)
        );
        
        return {
          ...invoice,
          days_overdue: daysOverdue,
          late_fee: invoice.total * 0.015 * Math.floor(daysOverdue / 30) // 1.5% per month
        };
      });

      return overdueInvoices;
    } catch (error) {
      console.error('Get overdue invoices error:', error);
      throw error;
    }
  }

  // Generate invoice summary report
  async getInvoiceSummary(dateRange) {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end);

      if (error) throw error;

      const summary = {
        total_invoices: data.length,
        total_amount: data.reduce((sum, inv) => sum + inv.total, 0),
        paid_amount: data.filter(inv => inv.status === 'paid')
          .reduce((sum, inv) => sum + inv.total, 0),
        pending_amount: data.filter(inv => inv.status !== 'paid')
          .reduce((sum, inv) => sum + inv.total, 0),
        overdue_amount: data.filter(inv => 
          inv.status !== 'paid' && new Date(inv.due_date) < new Date()
        ).reduce((sum, inv) => sum + inv.total, 0),
        by_status: {
          draft: data.filter(inv => inv.status === 'draft').length,
          sent: data.filter(inv => inv.status === 'sent').length,
          viewed: data.filter(inv => inv.status === 'viewed').length,
          paid: data.filter(inv => inv.status === 'paid').length,
          cancelled: data.filter(inv => inv.status === 'cancelled').length
        },
        average_payment_time: this.calculateAveragePaymentTime(data.filter(inv => inv.status === 'paid'))
      };

      return summary;
    } catch (error) {
      console.error('Get invoice summary error:', error);
      throw error;
    }
  }

  // Helper functions
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  calculateDueDate(terms, fromDate = new Date()) {
    const dueDate = new Date(fromDate);
    dueDate.setDate(dueDate.getDate() + terms);
    return dueDate.toISOString().split('T')[0];
  }

  calculateExpiryDate(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  }

  calculateAveragePaymentTime(paidInvoices) {
    if (paidInvoices.length === 0) return 0;
    
    const totalDays = paidInvoices.reduce((sum, inv) => {
      const sent = new Date(inv.sent_at);
      const paid = new Date(inv.paid_at);
      return sum + Math.floor((paid - sent) / (1000 * 60 * 60 * 24));
    }, 0);
    
    return Math.round(totalDays / paidInvoices.length);
  }

  async waitForDocumentProcessing(documentId, maxAttempts = 20) {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await this.api.get(`/documents/${documentId}`);
      
      if (response.data.status === 'document.draft') {
        return true;
      }
      
      if (response.data.status === 'document.error') {
        throw new Error('Document processing failed');
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('Document processing timeout');
  }
}

export default PandaDocInvoiceService;