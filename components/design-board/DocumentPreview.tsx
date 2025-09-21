'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { X, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import * as mammoth from 'mammoth';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;

interface DocumentPreviewProps {
  document: {
    id: string;
    type: string;
    fileName: string;
    fileUrl?: string;
    fileData?: ArrayBuffer | string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export default function DocumentPreview({ document, isOpen, onClose }: DocumentPreviewProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentContent, setDocumentContent] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !document) return;
    
    const loadDocument = async () => {
      setLoading(true);
      setError(null);
      setDocumentContent(null);
      setHtmlContent('');
      
      try {
        // If we have fileData, use it directly
        if (document.fileData) {
          await processFileData(document.fileData, document.type);
        } else if (document.fileUrl) {
          // Fetch the file from URL
          const response = await fetch(document.fileUrl);
          const arrayBuffer = await response.arrayBuffer();
          await processFileData(arrayBuffer, document.type);
        } else {
          setError('No file data or URL available');
        }
      } catch (err) {
        console.error('Error loading document:', err);
        setError('Failed to load document content');
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [document, isOpen]);

  const processFileData = async (data: ArrayBuffer | string, fileType: string) => {
    try {
      if (fileType === 'application/pdf') {
        // PDF files are handled by react-pdf component
        return;
      } else if (fileType.includes('word') || fileType.includes('docx')) {
        // Handle DOCX files
        if (data instanceof ArrayBuffer) {
          const result = await mammoth.convertToHtml({ arrayBuffer: data });
          setHtmlContent(result.value);
        }
      } else if (fileType === 'text/plain' || fileType.includes('text')) {
        // Handle text files
        let textContent: string;
        if (data instanceof ArrayBuffer) {
          textContent = new TextDecoder().decode(data);
        } else {
          textContent = data;
        }
        setDocumentContent(textContent);
      } else {
        setError(`Unsupported file type: ${fileType}`);
      }
    } catch (err) {
      console.error('Error processing file data:', err);
      setError('Failed to process document');
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    setError('Failed to load PDF document');
    setLoading(false);
  };

  const handleDownload = () => {
    if (document.fileUrl) {
      const a = window.document.createElement('a');
      a.href = document.fileUrl;
      a.download = document.fileName;
      a.click();
    } else if (document.fileData) {
      const blob = new Blob([document.fileData], { type: document.type });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  
  const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages || 1));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] bg-white">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-slate-900 truncate max-w-md">
                {document.fileName}
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={scale <= 0.5}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm text-slate-600 min-w-[60px] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={scale >= 3}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
              {document.type === 'application/pdf' && numPages && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPrevPage}
                    disabled={pageNumber <= 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-slate-600 min-w-[80px] text-center">
                    {pageNumber} of {numPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={pageNumber >= numPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-[calc(90vh-100px)] overflow-auto bg-gray-50 flex justify-center items-center">
            {loading && (
              <div className="flex flex-col items-center justify-center p-8 text-slate-600">
                <div className="w-8 h-8 border-2 border-[#88c0c0] border-t-transparent rounded-full animate-spin mb-4" />
                <p>Loading document...</p>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center p-8 text-slate-600">
                <div className="text-red-600 mb-4">⚠️</div>
                <p className="text-center">{error}</p>
              </div>
            )}

            {!loading && !error && (
              <div className="p-4">
                {/* PDF Display */}
                {document.type === 'application/pdf' && (
                  <div className="bg-white shadow-lg">
                    <Document
                      file={document.fileData || document.fileUrl}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={onDocumentLoadError}
                      loading={
                        <div className="flex items-center justify-center p-8">
                          <div className="w-8 h-8 border-2 border-[#88c0c0] border-t-transparent rounded-full animate-spin" />
                        </div>
                      }
                    >
                      <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                    </Document>
                  </div>
                )}

                {/* DOCX/Word Display */}
                {htmlContent && (
                  <div 
                    className="bg-white p-6 shadow-lg max-w-4xl mx-auto prose prose-slate"
                    style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                )}

                {/* Text Display */}
                {documentContent && (
                  <div 
                    className="bg-white p-6 shadow-lg max-w-4xl mx-auto"
                    style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
                  >
                    <pre className="whitespace-pre-wrap text-slate-900 font-mono text-sm leading-relaxed">
                      {documentContent}
                    </pre>
                  </div>
                )}

                {/* Image Display (fallback) */}
                {document.type.startsWith('image/') && (
                  <div className="bg-white p-4 shadow-lg">
                    <Image
                      src={document.fileUrl || (document.fileData ? URL.createObjectURL(new Blob([document.fileData])) : '')}
                      alt={document.fileName}
                      width={800}
                      height={600}
                      className="max-w-full h-auto"
                      style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}