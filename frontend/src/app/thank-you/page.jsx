'use client';

import Link from 'next/link';
import { IconCheck } from '@tabler/icons-react';

export default function ThankYouPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="bg-white shadow-lg rounded-2xl p-10 max-w-md text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto mb-4">
          <IconCheck size={32} className="text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h1>
        <p className="text-gray-600 mb-6">
          Your form has been submitted successfully. We appreciate your time.
        </p>
      </div>
    </div>
  );
}
