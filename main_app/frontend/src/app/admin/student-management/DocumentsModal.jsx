'use client';
import { useState, useRef, useEffect } from 'react';
import { FaTrash, FaFileAlt, FaTimesCircle, FaUpload, FaExternalLinkAlt, FaSpinner } from 'react-icons/fa';

export default function DocumentsModal({
  isOpen,
  onClose,
  documents = {},
  onUploadCertificate,
  onUploadMarksheet,
  onUploadSuccess,
  onDeleteCertificate,
  onDeleteMarksheet
}) {
  const [activeTab, setActiveTab] = useState('tenth');
  const [uploading, setUploading] = useState(false);
  const [documentState, setDocumentState] = useState({
    tenth: [],
    twelfth: [],
    semesterwise: []
  });
  
  const fileInputRef = useRef(null);
  const semesterRef = useRef(null);
  const cgpaRef = useRef(null);

  // Function to format URLs properly
  const getFormattedUrl = (url) => {
    if (!url) return null;
    
    // Check if URL is relative (doesn't start with http)
    if (url && !url.startsWith('http')) {
      // Prepend the base URL for local development
      return `http://localhost:8000${url}`;
    }
    return url;
  };

  // Helper function to check if a document actually exists
  const isValidDocument = (document) => {
    return document &&
           typeof document === 'string' &&
           document.trim() !== '' &&
           document !== 'null' &&
           document !== 'undefined';
  };

  // Initialize with documents from backend if available
  useEffect(() => {
    const newState = { tenth: [], twelfth: [], semesterwise: [] };

    // Format 10th certificate - only if it actually exists and is not empty
    if (isValidDocument(documents.tenth)) {
      const fileNameParts = typeof documents.tenth === 'string' ? documents.tenth.split('/') : ['10th Certificate'];
      const fileName = fileNameParts[fileNameParts.length - 1];

      // Only add if we have a valid filename
      if (fileName && fileName !== '' && fileName !== 'null') {
        newState.tenth = [{
          id: 1,
          name: fileName,
          date: new Date().toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          }),
          url: documents.tenth
        }];
      }
    }

    // Format 12th certificate - only if it actually exists and is not empty
    if (isValidDocument(documents.twelfth)) {
      const fileNameParts = typeof documents.twelfth === 'string' ? documents.twelfth.split('/') : ['12th Certificate'];
      const fileName = fileNameParts[fileNameParts.length - 1];

      // Only add if we have a valid filename
      if (fileName && fileName !== '' && fileName !== 'null') {
        newState.twelfth = [{
          id: 1,
          name: fileName,
          date: new Date().toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          }),
          url: documents.twelfth
        }];
      }
    }

    // Format semester marksheets - only if they actually exist
    if (documents.semesterMarksheets && Array.isArray(documents.semesterMarksheets) && documents.semesterMarksheets.length > 0) {
      newState.semesterwise = documents.semesterMarksheets
        .filter(sheet => sheet && isValidDocument(sheet.marksheet_url))
        .map(sheet => ({
          id: sheet.id,
          name: `Semester ${sheet.semester} Marksheet (CGPA: ${sheet.cgpa})`,
          date: sheet.upload_date ? new Date(sheet.upload_date).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          }) : 'Unknown date',
          url: sheet.marksheet_url || sheet.marksheet_file,
          semester: sheet.semester,
          cgpa: sheet.cgpa
        }));
    }

    setDocumentState(newState);
  }, [documents]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      setUploading(true);
      
      if (activeTab === 'tenth') {
        await onUploadCertificate(file, '10th');
        const newDoc = {
          id: Date.now(),
          name: file.name,
          date: new Date().toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          }),
          url: URL.createObjectURL(file) // Temporary URL for preview
        };
        setDocumentState(prev => ({ ...prev, tenth: [newDoc] }));

        // Call success callback to refresh parent data
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      }
      else if (activeTab === 'twelfth') {
        await onUploadCertificate(file, '12th');
        const newDoc = {
          id: Date.now(),
          name: file.name,
          date: new Date().toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          }),
          url: URL.createObjectURL(file) // Temporary URL for preview
        };
        setDocumentState(prev => ({ ...prev, twelfth: [newDoc] }));

        // Call success callback to refresh parent data
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      }
      else if (activeTab === 'semesterwise') {
        // Safety check for refs
        if (!semesterRef.current || !cgpaRef.current) {
          alert('Semester input fields are not available');
          setUploading(false);
          return;
        }

        const semester = semesterRef.current.value;
        const cgpa = cgpaRef.current.value;

        if (!semester || !cgpa) {
          alert('Please enter semester number and CGPA');
          setUploading(false);
          return;
        }
        
        await onUploadMarksheet(file, semester, cgpa);
        const newDoc = {
          id: Date.now(),
          name: `Semester ${semester} Marksheet (CGPA: ${cgpa})`,
          date: new Date().toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          }),
          url: URL.createObjectURL(file), // Temporary URL for preview
          semester,
          cgpa
        };
        setDocumentState(prev => ({
          ...prev,
          semesterwise: [...prev.semesterwise, newDoc]
        }));

        // Call success callback to refresh parent data
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      }
      
      setUploading(false);
    } catch (error) {
      console.error('Error uploading document:', error);
      setUploading(false);
      alert('Failed to upload document. Please try again.');
    }
  };

  const handleViewDocument = (url) => {
    if (!url) {
      alert('Document URL is not available');
      return;
    }
    
    const formattedUrl = getFormattedUrl(url);
    window.open(formattedUrl, '_blank');
  };

  const handleDelete = async (id, documentType = null) => {
    try {
      if (activeTab === 'tenth' || activeTab === 'twelfth') {
        // Delete certificate
        const certType = activeTab === 'tenth' ? '10th' : '12th';
        await onDeleteCertificate(certType);

        // Update local state
        setDocumentState(prev => ({
          ...prev,
          [activeTab]: []
        }));

        // Call success callback to refresh parent data
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      } else if (activeTab === 'semesterwise' && documentType) {
        // Delete marksheet
        await onDeleteMarksheet(documentType.semester);

        // Update local state
        setDocumentState(prev => ({
          ...prev,
          semesterwise: prev.semesterwise.filter(doc => doc.semester !== documentType.semester)
        }));

        // Call success callback to refresh parent data
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      } else {
        // Fallback to local state update only
        setDocumentState(prev => ({
          ...prev,
          [activeTab]: prev[activeTab].filter(doc => doc.id !== id)
        }));
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl shadow-xl">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">My Documents</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimesCircle size={24} />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b">
          <button 
            className={`px-6 py-3 text-sm font-medium ${activeTab === 'tenth' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('tenth')}
          >
            10th Certificate
          </button>
          <button 
            className={`px-6 py-3 text-sm font-medium ${activeTab === 'twelfth' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('twelfth')}
          >
            12th Certificate
          </button>
          <button 
            className={`px-6 py-3 text-sm font-medium ${activeTab === 'semesterwise' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('semesterwise')}
          >
            Semester Grades
          </button>
        </div>
        
        <div className="p-6 max-h-96 overflow-y-auto">
          {documentState[activeTab].length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No documents uploaded for this category yet
            </div>
          ) : (
            <div className="space-y-4">
              {documentState[activeTab].map((document, index) => (
                <div
                  key={document.id || `${activeTab}-${index}`}
                  className="flex items-center justify-between bg-gray-50 p-4 rounded-lg"
                >
                  <div 
                    className="flex items-center flex-grow cursor-pointer hover:bg-gray-100 p-2 rounded"
                    onClick={() => handleViewDocument(document.url)}
                  >
                    <div className="bg-blue-100 p-3 rounded-full mr-4">
                      <FaFileAlt className="text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center">
                        <h3 className="font-medium text-gray-800 mr-2">{document.name}</h3>
                        <FaExternalLinkAlt className="text-gray-500 text-xs" />
                      </div>
                      <p className="text-sm text-gray-500">Uploaded on {document.date}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(document.id, document)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full ml-2"
                    aria-label="Delete document"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="border-t p-6">
          {/* Semester inputs for semesterwise tab */}
          {activeTab === 'semesterwise' && (
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Semester Number
                </label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  ref={semesterRef}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CGPA
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  ref={cgpaRef}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 8.5"
                />
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              Supported formats: PDF, JPG, PNG (max 5MB)
            </p>
            <div>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                ref={fileInputRef}
                onChange={handleUpload}
                disabled={uploading}
              />
              <button 
                onClick={() => fileInputRef.current.click()}
                className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center ${uploading ? 'opacity-70 cursor-not-allowed' : ''}`}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <FaSpinner className="mr-2 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <FaUpload className="mr-2" /> Upload Document
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
