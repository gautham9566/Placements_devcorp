import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconForms, IconClipboardList } from '@tabler/icons-react';

export default function FormsSidebar() {
  const pathname = usePathname();
  const activeTab = pathname === '/admin/form' ? 'dashboard' : 
                   pathname === '/admin/form/review' ? 'review' : '';

  return (
    <div className="w-64 bg-white h-full fixed left-30 top-28 pt-16 z-10 border-r border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-blue-600">Forms Management</h2>
      </div>
      <nav className="p-4">
        <ul className="space-y-2">
          <li>
            <Link 
              href="/admin/form"
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                activeTab === 'dashboard' 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <IconForms size={20} />
              <span className="font-medium">Forms Dashboard</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/admin/form/review"
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                activeTab === 'review' 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <IconClipboardList size={20} />
              <span className="font-medium">Review to Post</span>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}

