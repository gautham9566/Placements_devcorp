'use client';

import { useState, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ZoomIn, ZoomOut, Maximize, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { getApiBaseUrl } from '../../../../utils/apiConfig';

// Configure PDF.js worker to use the file from public directory
// Configure PDF.js worker to use the file from public directory
// Use workerSrc to avoid bundler static-analysis issues (e.g., Turbopack TP1001)
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export default function PDFViewer({ resumeUrl }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Convert relative URLs to absolute URLs with backend domain
  const absoluteResumeUrl = useMemo(() => {
    if (!resumeUrl) return null;
    
    // If already an absolute URL, return as is
    if (resumeUrl.startsWith('http://') || resumeUrl.startsWith('https://')) {
      return resumeUrl;
    }
    
    // If relative URL, prepend backend base URL
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}${resumeUrl.startsWith('/') ? resumeUrl : '/' + resumeUrl}`;
  }, [resumeUrl]);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }

  function onDocumentLoadError(error) {
    console.error('Error loading PDF:', error);
    setError('Failed to load resume');
    setLoading(false);
  }

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3.0));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  };

  const handlePrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages || 1));
  };

  const handleFullscreen = () => {
    if (absoluteResumeUrl) {
      window.open(absoluteResumeUrl, '_blank');
    }
  };

  if (!resumeUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <FileText className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-gray-600 font-medium">No Resume Available</p>
        <p className="text-sm text-gray-500 mt-2">
          This candidate hasn't uploaded a resume yet
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Resume</h3>
          <button
            onClick={handleFullscreen}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
            title="Open in new tab"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600 w-16 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={scale >= 3.0}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Page Navigation */}
          {numPages && numPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={pageNumber <= 1}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                {pageNumber} / {numPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={pageNumber >= numPages}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto p-4 flex items-start justify-center bg-gray-100">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading resume...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileText className="w-16 h-16 text-red-300 mb-4 mx-auto" />
              <p className="text-red-600 font-medium">{error}</p>
              <p className="text-sm text-gray-500 mt-2">
                Please check if the resume file exists
              </p>
            </div>
          </div>
        )}

        {!error && (
          <Document
            file={absoluteResumeUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading=""
            className="shadow-lg"
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="bg-white"
            />
          </Document>
        )}
      </div>
    </div>
  );
}
