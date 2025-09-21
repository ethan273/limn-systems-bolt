'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
// Temporarily disabled imports for PDF and Word processing
// import { Document, Page, pdfjs } from 'react-pdf';
// import mammoth from 'mammoth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, FileText, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Configure PDF.js worker (temporarily disabled)
// pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface DocumentHandlerProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentAdded: (imageUrl: string, type: 'pdf' | 'image' | 'document') => void;
  className?: string;
}

interface ProcessedDocument {
  type: 'pdf' | 'image' | 'document';
  name: string;
  url: string;
  pages?: string[];
  currentPage?: number;
  totalPages?: number;
}

const DocumentHandler: React.FC<DocumentHandlerProps> = ({
  isOpen,
  onClose,
  onDocumentAdded,
  className = '',
}) => {
  const [processedDocument, setProcessedDocument] = useState<ProcessedDocument | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processPDF = useCallback(async (): Promise<ProcessedDocument> => {
    // PDF processing temporarily disabled
    throw new Error('PDF processing temporarily disabled');
  }, []);

  const processImage = useCallback(async (file: File): Promise<ProcessedDocument> => {
    const url = URL.createObjectURL(file);
    
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Optimize image size for canvas
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png');
          
          resolve({
            type: 'image',
            name: file.name,
            url: dataUrl,
          });
        } else {
          reject(new Error('Failed to process image'));
        }
        
        URL.revokeObjectURL(url);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  }, []);

  const processDocument = useCallback(async (file: File): Promise<ProcessedDocument> => {
    // Document processing temporarily disabled
    console.log('Document processing for:', file.name);
    throw new Error('Document processing temporarily disabled');
  }, []);

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      let processed: ProcessedDocument;
      
      if (file.type.startsWith('image/')) {
        processed = await processImage(file);
      } else if (file.type === 'application/pdf') {
        processed = await processPDF();
      } else if (file.name.toLowerCase().endsWith('.docx')) {
        processed = await processDocument(file);
      } else {
        throw new Error('Unsupported file format. Please upload PDF, images, or Word documents.');
      }
      
      setProcessedDocument(processed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setIsProcessing(false);
    }
  }, [processImage, processPDF, processDocument]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        processFile(acceptedFiles[0]);
      }
    },
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.svg'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
  });

  const handleAddToBoard = useCallback(() => {
    if (!processedDocument) return;
    
    const currentUrl = processedDocument.pages 
      ? processedDocument.pages[processedDocument.currentPage! - 1]
      : processedDocument.url;
      
    onDocumentAdded(currentUrl, processedDocument.type);
    setProcessedDocument(null);
    onClose();
  }, [processedDocument, onDocumentAdded, onClose]);

  const changePage = useCallback((direction: 'prev' | 'next') => {
    if (!processedDocument || !processedDocument.pages) return;
    
    const currentPage = processedDocument.currentPage || 1;
    const totalPages = processedDocument.totalPages || 1;
    
    let newPage = currentPage;
    if (direction === 'prev' && currentPage > 1) {
      newPage = currentPage - 1;
    } else if (direction === 'next' && currentPage < totalPages) {
      newPage = currentPage + 1;
    }
    
    setProcessedDocument({
      ...processedDocument,
      currentPage: newPage,
    });
  }, [processedDocument]);

  const handleClose = useCallback(() => {
    setProcessedDocument(null);
    setError(null);
    setIsProcessing(false);
    onClose();
  }, [onClose]);

  const currentImageUrl = processedDocument?.pages 
    ? processedDocument.pages[processedDocument.currentPage! - 1]
    : processedDocument?.url;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-glacier" />
            Add Document to Board
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4">
          {!processedDocument && !isProcessing && (
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer transition-colors',
                isDragActive ? 'border-glacier bg-glacier-50' : 'hover:border-glacier-400 hover:bg-slate-50',
                className
              )}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-glacier-100 flex items-center justify-center">
                  {isDragActive ? (
                    <Upload className="w-8 h-8 text-glacier" />
                  ) : (
                    <FileText className="w-8 h-8 text-glacier" />
                  )}
                </div>
                <div>
                  <p className="text-lg font-medium text-slate-900 mb-1">
                    {isDragActive ? 'Drop your document here' : 'Upload a document'}
                  </p>
                  <p className="text-sm text-slate-600">
                    Drag and drop or click to select PDF, images, or Word documents
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    PDF
                  </span>
                  <span className="flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    Images
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    Word
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {isProcessing && (
            <div className="flex items-center justify-center p-8">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-glacier border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-600">Processing document...</p>
              </div>
            </div>
          )}
          
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4">
                <p className="text-red-600">{error}</p>
              </CardContent>
            </Card>
          )}
          
          {processedDocument && (
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{processedDocument.name}</span>
                    {processedDocument.pages && (
                      <span className="text-sm text-slate-600 font-normal">
                        Page {processedDocument.currentPage} of {processedDocument.totalPages}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <div className="max-h-96 overflow-auto bg-slate-50 rounded-lg p-4 flex items-center justify-center">
                      {currentImageUrl && (
                        <Image
                          src={currentImageUrl}
                          alt="Document preview"
                          width={400}
                          height={320}
                          className="max-w-full max-h-80 object-contain rounded shadow-sm"
                        />
                      )}
                    </div>
                    
                    {processedDocument.pages && processedDocument.totalPages! > 1 && (
                      <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => changePage('prev')}
                          disabled={processedDocument.currentPage === 1}
                          className="bg-white/90 backdrop-blur-sm"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => changePage('next')}
                          disabled={processedDocument.currentPage === processedDocument.totalPages}
                          className="bg-white/90 backdrop-blur-sm"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t">
                    <Button variant="outline" onClick={() => setProcessedDocument(null)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddToBoard} className="bg-glacier hover:bg-glacier-600">
                      Add to Board
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentHandler;