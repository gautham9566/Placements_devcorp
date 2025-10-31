import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  IconLayoutDashboard, 
  IconForms, 
  IconClipboardCheck, 
  IconClipboardX,
  IconBriefcase,
  IconUsers
} from '@tabler/icons-react';

export default function FormsSidebar({ className = "" }) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('forms');

  const menuItems = [
    { icon: <IconForms size={20} />, label: 'All Forms', path: '/admin/form', id: 'forms' },
    { icon: <IconClipboardCheck size={20} />, label: 'Approved Forms', path: '/admin/form/approved', id: 'approved' },
    { icon: <IconClipboardX size={20} />, label: 'Pending Review', path: '/admin/form/pending', id: 'pending' },
    { icon: <IconBriefcase size={20} />, label: 'Job Postings', path: '/admin/companymanagement/jobs/listings', id: 'jobs' },
  ];

  return (
    <div className={`bg-white border-r border-gray-200 overflow-y-auto ${className}`}>
      <div className="p-6">
        <h2 className="text-lg font-bold text-gray-900">Forms Manager</h2>
        <p className="text-sm text-gray-500">Forms & Jobs Management</p>
      </div>
      
      <nav className="px-4 py-2">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.id}>
              <Link href={item.path} passHref>
                <span 
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer ${
                    activeSection === item.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  onClick={() => setActiveSection(item.id)}
                >
                  {item.icon}
                  <span className="text-sm font-medium">{item.label}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

