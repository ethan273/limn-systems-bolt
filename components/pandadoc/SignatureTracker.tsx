'use client'

import { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Send,
  Download,
  Eye,
  RefreshCw,
  Calendar,
  User,
  DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { safeFormatString } from '@/lib/utils/string-helpers';

interface PandaDocDocument {
  id: string;
  document_id: string;
  customer_id: string;
  customer_name?: string;
  document_type: 'invoice' | 'nda' | 'msa' | 'contract';
  status: 'draft' | 'sent' | 'viewed' | 'waiting_approval' | 'approved' | 'completed' | 'cancelled';
  invoice_number?: string;
  total_amount?: number;
  created_at: string;
  sent_at?: string;
  completed_at?: string;
  document_url?: string;
}

interface SignatureTrackerProps {
  customerId?: string;
  documentType?: 'invoice' | 'nda' | 'msa' | 'contract';
}

export function SignatureTracker({ customerId, documentType }: SignatureTrackerProps) {
  const [documents, setDocuments] = useState<PandaDocDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (customerId) params.append('customer_id', customerId);
      if (documentType) params.append('document_type', documentType);
      
      const response = await fetch(`/api/pandadoc/documents?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setDocuments(data.data);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  }, [customerId, documentType]);

  useEffect(() => {
    loadDocuments();
  }, [customerId, documentType, loadDocuments]);

  const refreshStatus = async (documentId: string) => {
    try {
      setRefreshing(true);
      const response = await fetch(`/api/pandadoc/status/${documentId}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        await loadDocuments(); // Reload all documents
      }
    } catch (error) {
      console.error('Error refreshing status:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const sendDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/pandadoc/send/${documentId}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        await loadDocuments();
      }
    } catch (error) {
      console.error('Error sending document:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <FileText className="w-4 h-4 text-graphite" />;
      case 'sent': return <Send className="w-4 h-4 text-blue-600" />;
      case 'viewed': return <Eye className="w-4 h-4 text-yellow-600" />;
      case 'waiting_approval': return <Clock className="w-4 h-4 text-orange-600" />;
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-primary" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <FileText className="w-4 h-4 text-graphite" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-stone-100 text-stone-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'viewed': return 'bg-yellow-100 text-yellow-800';
      case 'waiting_approval': return 'bg-orange-100 text-orange-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-primary/10 text-primary';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-stone-100 text-stone-800';
    }
  };

  const formatDocumentType = (type: string) => {
    switch (type) {
      case 'nda': return 'NDA';
      case 'msa': return 'MSA';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const calculateStats = () => {
    const total = documents.length;
    const completed = documents.filter(d => d.status === 'completed').length;
    const pending = documents.filter(d => ['sent', 'viewed', 'waiting_approval'].includes(d.status)).length;
    const drafts = documents.filter(d => d.status === 'draft').length;
    
    return { total, completed, pending, drafts };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          <span className="ml-3 text-graphite">Loading documents...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-heading">{stats.total}</div>
            <div className="text-sm text-graphite">Total Documents</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{stats.completed}</div>
            <div className="text-sm text-graphite">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <div className="text-sm text-graphite">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-stone-600">{stats.drafts}</div>
            <div className="text-sm text-graphite">Drafts</div>
          </CardContent>
        </Card>
      </div>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              PandaDoc Documents
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={loadDocuments}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-graphite mb-4" />
              <h3 className="text-lg font-medium text-heading mb-2">No documents found</h3>
              <p className="text-graphite">Create your first PandaDoc document to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <Card key={doc.id} className="border border-stone-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="flex items-center">
                          {getStatusIcon(doc.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-medium text-heading truncate">
                              {doc.document_type === 'invoice' && doc.invoice_number 
                                ? `Invoice ${doc.invoice_number}` 
                                : `${formatDocumentType(doc.document_type)} - ${doc.customer_name || 'Unknown'}`
                              }
                            </h3>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(doc.status)}`}>
                              {safeFormatString(doc.status, 'draft')}
                            </span>
                          </div>
                          
                          <div className="mt-1 flex items-center space-x-4 text-xs text-graphite">
                            <div className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {new Date(doc.created_at).toLocaleDateString()}
                            </div>
                            {doc.customer_name && (
                              <div className="flex items-center">
                                <User className="w-3 h-3 mr-1" />
                                {doc.customer_name}
                              </div>
                            )}
                            {doc.total_amount && (
                              <div className="flex items-center">
                                <DollarSign className="w-3 h-3 mr-1" />
                                ${doc.total_amount.toFixed(2)}
                              </div>
                            )}
                          </div>

                          {doc.sent_at && (
                            <div className="mt-1 text-xs text-graphite">
                              Sent: {new Date(doc.sent_at).toLocaleDateString()}
                            </div>
                          )}
                          
                          {doc.completed_at && (
                            <div className="mt-1 text-xs text-primary">
                              Completed: {new Date(doc.completed_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {doc.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendDocument(doc.document_id)}
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Send
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => refreshStatus(doc.document_id)}
                          disabled={refreshing}
                        >
                          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        </Button>

                        {doc.document_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(doc.document_url, '_blank')}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}