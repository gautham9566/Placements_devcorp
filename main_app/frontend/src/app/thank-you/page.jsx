'use client';

import Link from 'next/link';
import { IconCircleCheck, IconArrowLeft } from '@tabler/icons-react';

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <IconCircleCheck className="w-10 h-10 text-green-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
        
        <p className="text-gray-600 mb-6">
          Your job details have been successfully submitted. Our team will review and process your information.
        </p>
        
        <div className="border-t border-gray-200 pt-6 mt-6">
          <p className="text-gray-500 text-sm mb-4">
            What happens next?
          </p>
          
          <ol className="text-left text-gray-600 space-y-2 mb-6">
            <li className="flex items-start">
              <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 w-6 h-6 rounded-full mr-2 flex-shrink-0 text-sm">1</span>
              <span>Our team will review your job submission</span>
            </li>
            <li className="flex items-start">
              <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 w-6 h-6 rounded-full mr-2 flex-shrink-0 text-sm">2</span>
              <span>Once approved, the job will be published on our platform</span>
            </li>
            <li className="flex items-start">
              <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 w-6 h-6 rounded-full mr-2 flex-shrink-0 text-sm">3</span>
              <span>You'll be notified when your job posting is live</span>
            </li>
          </ol>
          
          <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium">
            <IconArrowLeft className="w-4 h-4" />
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
