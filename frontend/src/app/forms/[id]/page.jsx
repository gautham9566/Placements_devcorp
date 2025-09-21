'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { getFormById, updateForm } from '../../../api/forms';

export default function CompanyFormPage() {
  const { id } = useParams();
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);
  const [accessKey, setAccessKey] = useState('');
  const [form, setForm] = useState(null);
  const [formFields, setFormFields] = useState({
    description: '',
    skills: '',
    salaryMin: '',
    salaryMax: '',
    deadline: '',
  });

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const response = await getFormById(id);
        setForm(response.data);
        
        // If form is already submitted, populate the form fields
        if (response.data.submitted && response.data.details) {
          setFormFields(response.data.details);
        }
        
        // Check if user has access
        const token = localStorage.getItem(`form-access-${id}`);
        if (token === response.data.key) {
          setHasAccess(true);
        }
      } catch (error) {
        console.error('Error fetching form:', error);
      }
    };
    
    fetchForm();
  }, [id]);

  const handleAccess = () => {
    if (accessKey === form?.key) {
      setHasAccess(true);
      localStorage.setItem(`form-access-${id}`, accessKey);
    } else {
      alert('Invalid access key');
    }
  };

  const handleSubmit = async () => {
    try {
      await updateForm(id, {
        submitted: true,
        details: formFields
      });
      
      // Clear access token from localStorage
      localStorage.removeItem(`form-access-${id}`);
      router.push('/thank-you');
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to submit form. Please try again.');
    }
  };

  if (!form) return <div className="p-6">Form not found.</div>;

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-6 rounded-lg shadow w-full max-w-md">
          <h2 className="text-lg font-bold mb-4 text-black">Enter Access Key</h2>
          <input
            type="text"
            value={accessKey}
            onChange={(e) => setAccessKey(e.target.value)}
            className="w-full p-2 border rounded mb-4 focus:ring-2 text-black focus:ring-blue-500"
            placeholder="Enter the key provided"
          />
          <button
            onClick={handleAccess}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Submit Key
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold text-black mb-6">Fill Job Details for {form.title}</h2>

        <div className="space-y-4">
          <textarea
            rows={4}
            placeholder="Job Description"
            value={formFields.description}
            onChange={(e) => setFormFields({ ...formFields, description: e.target.value })}
            className="w-full border p-3 rounded focus:ring-2 text-black focus:ring-blue-500"
          ></textarea>

          <input
            type="text"
            placeholder="Required Skills (comma-separated)"
            value={formFields.skills}
            onChange={(e) => setFormFields({ ...formFields, skills: e.target.value })}
            className="w-full border p-2 rounded focus:ring-2 text-black focus:ring-blue-500"
          />

          <div className="flex gap-4">
            <input
              type="number"
              placeholder="Min Salary"
              value={formFields.salaryMin}
              onChange={(e) => setFormFields({ ...formFields, salaryMin: e.target.value })}
              className="w-1/2 border p-2 rounded focus:ring-2 text-black focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Max Salary"
              value={formFields.salaryMax}
              onChange={(e) => setFormFields({ ...formFields, salaryMax: e.target.value })}
              className="w-1/2 border p-2 rounded focus:ring-2 text-black focus:ring-blue-500"
            />
          </div>

          <input
            type="date"
            value={formFields.deadline}
            onChange={(e) => setFormFields({ ...formFields, deadline: e.target.value })}
            className="w-full border p-2 rounded focus:ring-2 text-black focus:ring-blue-500"
          />

          <div className="pt-4">
            <button
              onClick={handleSubmit}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              Submit Form
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
