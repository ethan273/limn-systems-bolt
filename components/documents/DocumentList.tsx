import { useState } from 'react';
import { 
  Search, Grid, List, Download, Eye, 
  Trash2, FileText, Image, File, Calendar,
  User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useDocuments } from '@/hooks/useDocuments';

const DocumentList = ({ 
  entityType = null, 
  entityId = null,
  showFilters = true,
  showSearch = true,
  compact = false
}) => {
  const [view, setView] = useState('grid'); // 'grid' or 'list'
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    status: '',
    date_from: '',
    date_to: '',
    entity_type: entityType || undefined,
    entity_id: entityId || undefined
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const { documents, loading, error, downloadDocument, deleteDocument } = useDocuments(filters);

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
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleFilterChange = (key: string, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };


  const handleDownload = async (document: { id: string }) => {
    try {
      await downloadDocument(document.id);
    } catch (error: unknown) {
      alert('Failed to download document: ' + (error as { message?: string }).message);
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      await deleteDocument(documentId);
      setShowDeleteConfirm(null);
    } catch (error: unknown) {
      alert('Failed to delete document: ' + (error as { message?: string }).message);
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      general: 'bg-gray-100 text-gray-800',
      contracts: 'bg-blue-100 text-blue-800',
      invoices: 'bg-green-100 text-green-800',
      cad_files: 'bg-purple-100 text-purple-800',
      images: 'bg-pink-100 text-pink-800',
      technical_docs: 'bg-orange-100 text-orange-800',
      compliance: 'bg-red-100 text-red-800'
    };
    return colors[category] || colors.general;
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      archived: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || colors.pending;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <span className="ml-3 text-graphite">Loading documents...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Failed to load documents</div>
        <div className="text-sm text-graphite">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      {!compact && (
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-heading">Documents</h2>
              <p className="text-graphite">{documents.length} documents found</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex rounded-lg border border-stone-200 bg-white p-1">
                <button
                  onClick={() => setView('grid')}
                  className={`p-2 rounded ${view === 'grid' 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-graphite hover:text-heading'
                  }`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`p-2 rounded ${view === 'list' 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-graphite hover:text-heading'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          {(showSearch || showFilters) && (
            <div className="mt-6 space-y-4">
              {showSearch && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-graphite" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={filters.search}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              )}

              {showFilters && (
                <div className="flex flex-wrap gap-3">
                  <select
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">All Categories</option>
                    <option value="general">General</option>
                    <option value="contracts">Contracts</option>
                    <option value="invoices">Invoices</option>
                    <option value="cad_files">CAD Files</option>
                    <option value="images">Images</option>
                    <option value="technical_docs">Technical Docs</option>
                    <option value="compliance">Compliance</option>
                  </select>

                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Document Grid/List */}
      {documents.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-graphite mb-4" />
          <h3 className="text-lg font-medium text-heading mb-2">No documents found</h3>
          <p className="text-graphite">Try adjusting your search or filters</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {documents.map((document) => {
            const FileIcon = getFileIcon(document.mime_type);
            
            return (
              <Card
                key={document.id}
                className="overflow-hidden hover:shadow-md transition-all duration-200"
              >
                {/* File Preview/Icon */}
                <div className="aspect-w-16 aspect-h-10 bg-glacier-50 p-6 flex items-center justify-center">
                  <FileIcon className="h-12 w-12 text-primary" />
                </div>

                {/* Content */}
                <CardContent className="p-4">
                  <h3 className="font-medium text-heading truncate mb-1">
                    {document.display_name || document.name}
                  </h3>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCategoryBadgeColor(document.category)}`}>
                      {document.category}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(document.status)}`}>
                      {document.status}
                    </span>
                  </div>

                  <div className="text-xs text-graphite space-y-1">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(document.created_at)}
                    </div>
                    <div>{formatFileSize(document.file_size)}</div>
                    <div className="flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      {document.created_by_name || 'Unknown'}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDownload(document)}
                        className="p-1.5 text-graphite hover:text-primary hover:bg-glacier-50 rounded transition-colors"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        className="p-1.5 text-graphite hover:text-primary hover:bg-glacier-50 rounded transition-colors"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(document.id)}
                        className="p-1.5 text-graphite hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-glacier-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-graphite uppercase tracking-wider">
                  Document
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-graphite uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-graphite uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-graphite uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-graphite uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-graphite uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-stone-200">
              {documents.map((document) => {
                const FileIcon = getFileIcon(document.mime_type);
                
                return (
                  <tr key={document.id} className="hover:bg-glacier-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <FileIcon className="h-8 w-8 text-graphite mr-3" />
                        <div>
                          <div className="text-sm font-medium text-heading">
                            {document.display_name || document.name}
                          </div>
                          <div className="text-sm text-graphite">
                            {document.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCategoryBadgeColor(document.category)}`}>
                        {document.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(document.status)}`}>
                        {document.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-graphite">
                      {formatFileSize(document.file_size)}
                    </td>
                    <td className="px-6 py-4 text-sm text-graphite">
                      <div>{formatDate(document.created_at)}</div>
                      <div className="text-xs">{document.created_by_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDownload(document)}
                          className="p-1 text-graphite hover:text-primary transition-colors"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          className="p-1 text-graphite hover:text-primary transition-colors"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(document.id)}
                          className="p-1 text-graphite hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-heading">Confirm Delete</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-graphite mb-6">
                Are you sure you want to delete this document? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DocumentList;