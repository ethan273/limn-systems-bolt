import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class PandaDocService {
  constructor() {
    this.apiKey = process.env.PANDADOC_API_KEY;
    this.baseURL = 'https://api.pandadoc.com/public/v1';
    this.workspaceId = process.env.PANDADOC_WORKSPACE_ID;
    
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `API-Key ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Template types for legal documents
  templateTypes = {
    NDA: {
      templateId: process.env.PANDADOC_NDA_TEMPLATE_ID,
      name: 'Non-Disclosure Agreement',
      requiredFields: ['company_name', 'contact_name', 'email', 'effective_date'],
      trackingEnabled: true,
      expiryDays: 30
    },
    MSA: {
      templateId: process.env.PANDADOC_MSA_TEMPLATE_ID,
      name: 'Master Service Agreement',
      requiredFields: ['company_name', 'contact_name', 'email', 'address', 'payment_terms'],
      trackingEnabled: true,
      expiryDays: 60
    },
    SOW: {
      templateId: process.env.PANDADOC_SOW_TEMPLATE_ID,
      name: 'Statement of Work',
      requiredFields: ['project_name', 'scope', 'timeline', 'budget'],
      trackingEnabled: true,
      expiryDays: 30
    },
    PURCHASE_ORDER: {
      templateId: process.env.PANDADOC_PO_TEMPLATE_ID,
      name: 'Purchase Order Agreement',
      requiredFields: ['order_number', 'items', 'total_amount', 'delivery_date'],
      trackingEnabled: true,
      expiryDays: 14
    }
  };

  // Create NDA document
  async createNDA(recipientData) {
    const template = this.templateTypes.NDA;
    
    const documentData = {
      name: `NDA - ${recipientData.company_name} - ${new Date().toISOString().split('T')[0]}`,
      template_uuid: template.templateId,
      recipients: [
        {
          email: recipientData.email,
          first_name: recipientData.first_name,
          last_name: recipientData.last_name,
          role: 'Recipient',
          signing_order: 1
        }
      ],
      tokens: [
        {
          name: 'company_name',
          value: recipientData.company_name
        },
        {
          name: 'effective_date',
          value: recipientData.effective_date || new Date().toISOString().split('T')[0]
        },
        {
          name: 'confidentiality_period',
          value: recipientData.confidentiality_period || '3 years'
        },
        {
          name: 'jurisdiction',
          value: recipientData.jurisdiction || 'California'
        }
      ],
      fields: {
        signature: {
          Recipient: {
            date_signed: {
              value: new Date().toISOString()
            }
          }
        }
      },
      metadata: {
        type: 'NDA',
        entity_type: recipientData.entity_type || 'vendor',
        entity_id: recipientData.entity_id,
        created_by: recipientData.created_by,
        tracking_enabled: true
      },
      pricing_tables: [],
      expiration_date: this.calculateExpiryDate(template.expiryDays)
    };

    return await this.createDocument(documentData);
  }

  // Create MSA document
  async createMSA(agreementData) {
    const template = this.templateTypes.MSA;
    
    const documentData = {
      name: `MSA - ${agreementData.company_name} - ${new Date().toISOString().split('T')[0]}`,
      template_uuid: template.templateId,
      recipients: [
        {
          email: agreementData.signer_email,
          first_name: agreementData.signer_first_name,
          last_name: agreementData.signer_last_name,
          role: 'Client',
          signing_order: 1
        },
        {
          email: process.env.LIMN_SIGNER_EMAIL,
          first_name: 'Limn',
          last_name: 'Systems',
          role: 'Company',
          signing_order: 2
        }
      ],
      tokens: [
        {
          name: 'company_name',
          value: agreementData.company_name
        },
        {
          name: 'company_address',
          value: agreementData.company_address
        },
        {
          name: 'payment_terms',
          value: agreementData.payment_terms || 'Net 30'
        },
        {
          name: 'termination_notice',
          value: agreementData.termination_notice || '30 days'
        },
        {
          name: 'liability_limit',
          value: agreementData.liability_limit || 'Total fees paid in 12 months'
        }
      ],
      metadata: {
        type: 'MSA',
        customer_id: agreementData.customer_id,
        contract_value: agreementData.contract_value,
        auto_renew: agreementData.auto_renew || false
      },
      expiration_date: this.calculateExpiryDate(template.expiryDays)
    };

    return await this.createDocument(documentData);
  }

  // Generic document creation
  async createDocument(documentData) {
    try {
      // Create document in PandaDoc
      const response = await this.api.post('/documents', documentData);
      const pandaDocId = response.data.id;

      // Save to our database
      const { data: dbDocument, error } = await supabase
        .from('documents')
        .insert({
          name: documentData.name,
          category: 'legal',
          status: 'pending_signature',
          entity_type: documentData.metadata.entity_type,
          entity_id: documentData.metadata.entity_id,
          pandadoc_id: pandaDocId,
          pandadoc_status: 'document.draft',
          metadata: {
            ...documentData.metadata,
            recipients: documentData.recipients,
            expiration_date: documentData.expiration_date
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Wait for document to be processed
      await this.waitForDocumentProcessing(pandaDocId);

      // Send document for signature
      await this.sendDocument(pandaDocId);

      return {
        success: true,
        document: dbDocument,
        pandadoc_id: pandaDocId,
        view_url: `https://app.pandadoc.com/a/#/documents/${pandaDocId}`
      };
    } catch (error) {
      console.error('PandaDoc creation error:', error);
      throw error;
    }
  }

  // Wait for document processing
  async waitForDocumentProcessing(documentId, maxAttempts = 20) {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getDocumentStatus(documentId);
      
      if (status === 'document.draft') {
        return true;
      }
      
      if (status === 'document.error') {
        throw new Error('Document processing failed');
      }
      
      // Wait 2 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('Document processing timeout');
  }

  // Send document for signature
  async sendDocument(documentId) {
    try {
      const response = await this.api.post(`/documents/${documentId}/send`, {
        message: 'Please review and sign the attached document.',
        silent: false
      });

      // Update status in database
      await supabase
        .from('documents')
        .update({
          pandadoc_status: 'document.sent',
          sent_at: new Date().toISOString()
        })
        .eq('pandadoc_id', documentId);

      return response.data;
    } catch (error) {
      console.error('Send document error:', error);
      throw error;
    }
  }

  // Get document status
  async getDocumentStatus(documentId) {
    try {
      const response = await this.api.get(`/documents/${documentId}`);
      return response.data.status;
    } catch (error) {
      console.error('Get status error:', error);
      return null;
    }
  }

  // Get signature status with detailed tracking
  async getSignatureStatus(documentId) {
    try {
      const response = await this.api.get(`/documents/${documentId}/details`);
      const document = response.data;

      const signatureStatus = {
        document_id: documentId,
        status: document.status,
        created_at: document.date_created,
        sent_at: document.date_sent,
        viewed_at: document.date_viewed,
        completed_at: document.date_completed,
        expiration_date: document.expiration_date,
        recipients: document.recipients.map(r => ({
          email: r.email,
          name: `${r.first_name} ${r.last_name}`,
          status: r.status,
          signed_at: r.date_signed,
          viewed_at: r.date_viewed,
          ip_address: r.ip_address
        })),
        tracking: {
          opens: document.opens_count || 0,
          unique_opens: document.unique_opens_count || 0,
          total_views: document.views_count || 0,
          average_time_spent: document.average_time_spent || 0,
          last_viewed: document.last_viewed_at
        }
      };

      // Update database
      await supabase
        .from('documents')
        .update({
          pandadoc_status: document.status,
          metadata: {
            signature_status: signatureStatus
          }
        })
        .eq('pandadoc_id', documentId);

      return signatureStatus;
    } catch (error) {
      console.error('Get signature status error:', error);
      throw error;
    }
  }

  // Download signed document
  async downloadSignedDocument(documentId) {
    try {
      const response = await this.api.get(`/documents/${documentId}/download`, {
        responseType: 'arraybuffer'
      });

      return {
        data: response.data,
        contentType: response.headers['content-type']
      };
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  }

  // Cancel document
  async cancelDocument(documentId, reason = 'Cancelled by sender') {
    try {
      await this.api.delete(`/documents/${documentId}`);

      // Update database
      await supabase
        .from('documents')
        .update({
          pandadoc_status: 'document.cancelled',
          status: 'cancelled',
          metadata: {
            cancelled_at: new Date().toISOString(),
            cancel_reason: reason
          }
        })
        .eq('pandadoc_id', documentId);

      return { success: true };
    } catch (error) {
      console.error('Cancel document error:', error);
      throw error;
    }
  }

  // Get all pending signatures
  async getPendingSignatures() {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('category', 'legal')
        .in('pandadoc_status', ['document.sent', 'document.viewed'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get latest status for each
      const updatedDocuments = await Promise.all(
        data.map(async (doc) => {
          if (doc.pandadoc_id) {
            const status = await this.getSignatureStatus(doc.pandadoc_id);
            return { ...doc, signature_status: status };
          }
          return doc;
        })
      );

      return updatedDocuments;
    } catch (error) {
      console.error('Get pending signatures error:', error);
      throw error;
    }
  }

  // Webhook handler for status updates
  async handleWebhook(event, payload) {
    const documentId = payload.data.id;
    
    const eventHandlers = {
      'document_state_changed': async () => {
        const status = await this.getSignatureStatus(documentId);
        
        // Update database
        await supabase
          .from('documents')
          .update({
            pandadoc_status: payload.data.status,
            metadata: { 
              last_event: event,
              last_update: new Date().toISOString(),
              signature_status: status
            }
          })
          .eq('pandadoc_id', documentId);

        // Notify if completed
        if (payload.data.status === 'document.completed') {
          await this.notifyDocumentSigned(documentId);
        }
      },
      'recipient_viewed': async () => {
        await this.logDocumentView(documentId, payload.data.recipient);
      },
      'recipient_signed': async () => {
        await this.logDocumentSignature(documentId, payload.data.recipient);
      }
    };

    if (eventHandlers[event]) {
      await eventHandlers[event]();
    }
  }

  // Notification helpers
  async notifyDocumentSigned(documentId) {
    // Implement email/slack notification
    console.log(`Document ${documentId} has been signed!`);
  }

  async logDocumentView(documentId, recipient) {
    await supabase
      .from('document_access_log')
      .insert({
        document_id: documentId,
        action: 'viewed',
        user_id: recipient.email,
        metadata: { recipient }
      });
  }

  async logDocumentSignature(documentId, recipient) {
    await supabase
      .from('document_access_log')
      .insert({
        document_id: documentId,
        action: 'signed',
        user_id: recipient.email,
        metadata: { recipient }
      });
  }

  // Helper to calculate expiry date
  calculateExpiryDate(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  }
}

export default PandaDocService;