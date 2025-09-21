import { useState } from 'react';
import { 
  FileText, Plus, Download, Eye, Upload, 
  Image, File, Calendar
} from 'lucide-react';
import { useDocuments } from '@/hooks/useDocuments';
import DocumentUpload from './DocumentUpload';

interface DocumentPanelProps {
  entityType?: string
  entityId?: string
  title?: string
  showUpload?: boolean
  maxHeight?: string
}

const DocumentPanel = ({ 
  entityType, 
  entityId, 
  title = 'Documents',
  showUpload = true,
  maxHeight = '400px'
}: DocumentPanelProps) => {
  const [showUploader, setShowUploader] = useState(false);
  const filters = entityType && entityId ? { entity_type: entityType, entity_id: entityId } : {};
  const { documents, loading, error, downloadDocument, refreshDocuments } = useDocuments(filters);

  const getFileIcon = (mimeType: string | null) => {
    if (mimeType?.startsWith('image/')) return Image;
    if (mimeType?.includes('pdf') || mimeType?.includes('document')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleUploadComplete = () => {
    refreshDocuments();
    setShowUploader(false);
  };

  const handleDownload = async (document: { id: string }) => {
    try {
      await downloadDocument(document.id);
    } catch (error: unknown) {
      alert('Failed to download document: ' + (error as { message?: string }).message);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      general: 'text-gray-600',
      contracts: 'text-blue-600',
      invoices: 'text-green-600',
      cad_files: 'text-purple-600',
      images: 'text-pink-600',
      technical_docs: 'text-orange-600',
      compliance: 'text-red-600'
    };
    return colors[category] || colors.general;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              {title} ({documents.length})
            </h3>
          </div>
          
          {showUpload && (
            <button
              onClick={() => setShowUploader(!showUploader)}
              className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </button>
          )}
        </div>
      </div>

      {/* Upload Section */}
      {showUploader && (
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <DocumentUpload
            onUpload={handleUploadComplete}
            entityType={entityType}
            entityId={entityId}
            maxFiles={3}
          />
        </div>
      )}

      {/* Content */}
      <div style={{ maxHeight, overflowY: 'auto' }}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-purple-600 border-t-transparent rounded-full mr-3"></div>
            <span className="text-gray-600">Loading documents...</span>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <div className="text-red-600 mb-2">Failed to load documents</div>
            <div className="text-sm text-gray-500">{error}</div>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-6 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">No documents uploaded yet</p>
            {showUpload && !showUploader && (
              <button
                onClick={() => setShowUploader(true)}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Documents
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {documents.map((document) => {
              const FileIcon = getFileIcon(document.mime_type);
              
              return (
                <div 
                  key={document.id} 
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start">
                    <FileIcon className={`h-8 w-8 mr-3 mt-1 ${getCategoryColor(document.category)}`} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {document.display_name || document.name}
                          </h4>
                          {document.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {document.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className={`font-medium ${getCategoryColor(document.category)}`}>
                              {document.category}
                            </span>
                            <span>{formatFileSize(document.file_size)}</span>
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {formatDate(document.created_at)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 ml-3">
                          <button
                            onClick={() => handleDownload(document)}
                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                            title="Download"
                          >
                            <Download className="h-3 w-3" />
                          </button>
                          <button
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View"
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {documents.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              Total: {documents.length} documents
            </span>
            <a
              href={`/documents?entity_type=${entityType}&entity_id=${entityId}`}
              className="text-purple-600 hover:text-purple-800 font-medium transition-colors"
            >
              View all →
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentPanel;