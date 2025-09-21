'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconEdit, IconTrash, IconCheck, IconX, IconEye } from '@tabler/icons-react';
import { getForms, updateForm, deleteForm } from '../../../../api/forms';
import FormsSidebar from '../../../../components/ui/FormsSidebar';

export default function ReviewFormsPage() {
  const router = useRouter();
  const [forms, setForms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewDetailsForm, setViewDetailsForm] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    const loadForms = async () => {
      setIsLoading(true);
      try {
        const response = await getForms();
        // Ensure response.data is an array, fallback to empty array
        const formsData = Array.isArray(response?.data) ? response.data : [];
        setForms(formsData);
      } catch (error) {
        console.error('Error loading forms:', error);
        // On error, ensure forms remains an empty array
        setForms([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadForms();
  }, []);

  const getStatusBadge = (status) => {
    if (status === 'posted') {
      return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Posted</span>;
    } else if (status === 'approved') {
      return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Approved</span>;
    } else if (status === 'interview') {
      return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Interview</span>;
    } else {
      return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">Pending</span>;
    }
  };

  const handleEdit = (form) => {
    router.push(`/admin/form/edit/${form.id}`);
  };

  const handleDelete = async (formId) => {
    try {
      await deleteForm(formId);
      setForms((Array.isArray(forms) ? forms : []).filter(form => form.id !== formId));
      setConfirmDelete(null);
    } catch (error) {
      console.error('Error deleting form:', error);
      console.log('Error details:', error.response);
      
      // More detailed error message
      let errorMessage = 'Failed to delete form. Please try again.';
      if (error.response) {
        if (error.response.status === 405) {
          errorMessage = 'The server does not support this operation. Please contact the administrator.';
          console.log('Available methods:', error.response.headers.get('Allow'));
        } else if (error.response.data && error.response.data.detail) {
          errorMessage = `Error: ${error.response.data.detail}`;
        }
      }
      
      alert(errorMessage);
    }
  };

  const handlePost = async (form) => {
    try {
      const updatedForm = { ...form, status: 'posted' };
      await updateForm(form.id, updatedForm);
      
      // Update local state
      setForms((Array.isArray(forms) ? forms : []).map(f => f.id === form.id ? updatedForm : f));
      setViewDetailsForm(null);
      alert('Form has been posted successfully!');
    } catch (error) {
      console.error('Error posting form:', error);
      alert('Failed to post form. Please try again.');
    }
  };

  return (
    <div className="flex">
      <FormsSidebar />
      <div className="p-6 ml-64 w-full">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-black">Review Forms</h1>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold text-black mb-6">Submitted Forms</h2>
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : !Array.isArray(forms) || forms.length === 0 ? (
              <p className="text-gray-500 text-center py-10">No forms available for review.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.isArray(forms) && forms.map((form) => (
                  <div
                    key={form.id}
                    className="bg-white border rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-black">{form.company}</h3>
                          {form.details && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {form.details.description?.substring(0, 100)}
                              {form.details.description?.length > 100 ? '...' : ''}
                            </p>
                          )}
                        </div>
                        <div>
                          {getStatusBadge(form.status || (form.submitted ? 'approved' : 'pending'))}
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 mb-4 space-y-1">
                        <p><span className="font-medium">Key:</span> {form.key}</p>
                        <p><span className="font-medium">Status:</span> {form.submitted ? 'Completed' : 'Not Submitted'}</p>
                        {form.details && form.details.deadline && (
                          <p><span className="font-medium">Deadline:</span> {form.details.deadline}</p>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center mt-4 pt-3 border-t">
                        <button
                          onClick={() => setViewDetailsForm(form)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          <IconEye size={16} />
                          View Details
                        </button>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(form)}
                            className="p-1.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100"
                            title="Edit form"
                          >
                            <IconEdit size={16} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(form.id)}
                            className="p-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100"
                            title="Delete form"
                          >
                            <IconTrash size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Details Modal */}
      {viewDetailsForm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-blue-600">Form Details</h3>
              <div>
                {getStatusBadge(viewDetailsForm.status || (viewDetailsForm.submitted ? 'approved' : 'pending'))}
              </div>
            </div>
            
            <div className="space-y-3 text-black">
              <p><strong>Company:</strong> {viewDetailsForm.company}</p>
              <p><strong>Key:</strong> {viewDetailsForm.key}</p>
              {viewDetailsForm.details && (
                <>
                  <p><strong>Description:</strong> {viewDetailsForm.details.description}</p>
                  <p><strong>Skills:</strong> {viewDetailsForm.details.skills}</p>
                  {viewDetailsForm.details.salaryMin && (
                    <p><strong>Salary Range:</strong> ₹{viewDetailsForm.details.salaryMin} - ₹{viewDetailsForm.details.salaryMax}</p>
                  )}
                  {viewDetailsForm.details.deadline && (
                    <p><strong>Deadline:</strong> {viewDetailsForm.details.deadline}</p>
                  )}
                </>
              )}
            </div>
            
            <div className="flex justify-between mt-6 pt-4 border-t">
              <button
                onClick={() => setViewDetailsForm(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
              
              {viewDetailsForm.submitted && viewDetailsForm.status !== 'posted' && (
                <button
                  onClick={() => handlePost(viewDetailsForm)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <IconCheck size={18} /> Post Form
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md">
            <h3 className="text-xl font-bold text-red-600 mb-4">Confirm Delete</h3>
            <p className="text-gray-700 mb-6">Are you sure you want to delete this form? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <IconTrash size={18} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




