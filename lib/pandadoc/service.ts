import { createClient } from '@/lib/supabase/client';

interface PandaDocConfig {
  apiKey: string;
  baseUrl: string;
}

interface InvoiceData {
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  customer_address: string;
  customer_email: string;
  line_items: Array<{
    description: string;
    quantity: number;
    price: number;
    unit: string;
  }>;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  invoice_date: string;
  payment_terms: number;
  notes?: string;
}

interface DocumentTemplate {
  id: string;
  name: string;
  type: 'invoice' | 'nda' | 'msa' | 'contract';
  template_uuid: string;
}

class PandaDocService {
  private config: PandaDocConfig;
  private supabase;

  constructor() {
    this.config = {
      apiKey: process.env.PANDADOC_API_KEY || '',
      baseUrl: 'https://api.pandadoc.com/public/v1'
    };
    this.supabase = createClient();
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `API-Key ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`PandaDoc API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async createInvoiceFromTemplate(invoiceData: InvoiceData, templateId: string) {
    try {
      // Create document from template
      const documentData = {
        name: `Invoice ${invoiceData.invoice_number}`,
        template_uuid: templateId,
        recipients: [
          {
            email: invoiceData.customer_email,
            first_name: invoiceData.customer_name.split(' ')[0] || '',
            last_name: invoiceData.customer_name.split(' ').slice(1).join(' ') || '',
            role: 'client'
          }
        ],
        tokens: [
          {
            name: 'invoice.number',
            value: invoiceData.invoice_number
          },
          {
            name: 'customer.name',
            value: invoiceData.customer_name
          },
          {
            name: 'customer.address',
            value: invoiceData.customer_address
          },
          {
            name: 'invoice.date',
            value: new Date(invoiceData.invoice_date).toLocaleDateString()
          },
          {
            name: 'invoice.subtotal',
            value: `$${invoiceData.subtotal.toFixed(2)}`
          },
          {
            name: 'invoice.tax',
            value: `$${invoiceData.tax_amount.toFixed(2)}`
          },
          {
            name: 'invoice.total',
            value: `$${invoiceData.total_amount.toFixed(2)}`
          },
          {
            name: 'payment.terms',
            value: `Net ${invoiceData.payment_terms} days`
          }
        ],
        fields: {
          // Line items as pricing table
          line_items: invoiceData.line_items.map((item, index) => ({
            name: `line_item_${index + 1}`,
            title: item.description,
            value: item.price,
            qty: item.quantity,
            cost: item.price * item.quantity
          }))
        }
      };

      const document = await this.makeRequest('/documents', {
        method: 'POST',
        body: JSON.stringify(documentData)
      });

      // Store in database
      const { error: dbError } = await this.supabase
        .from('pandadoc_documents')
        .insert({
          document_id: document.id,
          customer_id: invoiceData.customer_id,
          document_type: 'invoice',
          status: 'draft',
          invoice_number: invoiceData.invoice_number,
          total_amount: invoiceData.total_amount,
          created_at: new Date().toISOString()
        });

      if (dbError) {
        console.error('Error storing document in database:', dbError);
      }

      return {
        success: true,
        document_id: document.id,
        document_url: document.links?.download,
        edit_url: document.links?.edit
      };

    } catch (error) {
      console.error('Error creating PandaDoc invoice:', error);
      throw error;
    }
  }

  async createNDA(clientData: {
    company_name: string;
    contact_name: string;
    contact_email: string;
    effective_date: string;
  }) {
    // Implementation for NDA creation
    const documentData = {
      name: `NDA - ${clientData.company_name}`,
      template_uuid: process.env.PANDADOC_NDA_TEMPLATE_ID,
      recipients: [
        {
          email: clientData.contact_email,
          first_name: clientData.contact_name.split(' ')[0] || '',
          last_name: clientData.contact_name.split(' ').slice(1).join(' ') || '',
          role: 'signer'
        }
      ],
      tokens: [
        {
          name: 'company.name',
          value: clientData.company_name
        },
        {
          name: 'effective.date',
          value: new Date(clientData.effective_date).toLocaleDateString()
        }
      ]
    };

    const document = await this.makeRequest('/documents', {
      method: 'POST',
      body: JSON.stringify(documentData)
    });

    return {
      success: true,
      document_id: document.id,
      document_url: document.links?.download
    };
  }

  async sendDocument(documentId: string, message?: string) {
    try {
      await this.makeRequest(`/documents/${documentId}/send`, {
        method: 'POST',
        body: JSON.stringify({
          message: message || 'Please review and sign this document.',
          silent: false
        })
      });

      // Update status in database
      await this.supabase
        .from('pandadoc_documents')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('document_id', documentId);

      return { success: true };
    } catch (error) {
      console.error('Error sending document:', error);
      throw error;
    }
  }

  async getDocumentStatus(documentId: string) {
    try {
      const document = await this.makeRequest(`/documents/${documentId}`);
      
      // Update status in database
      await this.supabase
        .from('pandadoc_documents')
        .update({ 
          status: document.status,
          completed_at: document.status === 'completed' ? new Date().toISOString() : null
        })
        .eq('document_id', documentId);

      return {
        status: document.status,
        signed_at: document.date_completed,
        download_url: document.links?.download
      };
    } catch (error) {
      console.error('Error getting document status:', error);
      throw error;
    }
  }

  async listTemplates(): Promise<DocumentTemplate[]> {
    try {
      const response = await this.makeRequest('/templates');
      
      return response.results.map((template: unknown) => {
        const tmpl = template as Record<string, unknown>
        return {
          id: String(tmpl.id),
          name: String(tmpl.name),
          type: this.getTemplateType(String(tmpl.name)),
          template_uuid: String(tmpl.id)
        }
      });
    } catch (error) {
      console.error('Error listing templates:', error);
      return [];
    }
  }

  private getTemplateType(templateName: string): 'invoice' | 'nda' | 'msa' | 'contract' {
    const name = templateName.toLowerCase();
    if (name.includes('invoice')) return 'invoice';
    if (name.includes('nda') || name.includes('non-disclosure')) return 'nda';
    if (name.includes('msa') || name.includes('master service')) return 'msa';
    return 'contract';
  }
}

export const pandaDocService = new PandaDocService();