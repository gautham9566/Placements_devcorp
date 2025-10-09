import React from 'react';
import Link from 'next/link';

const Sidebar = () => {
  const menuItems = [
    { 
      name: 'Home', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ), 
      href: '/admin', 
      active: false 
    },
  ];

return (
<div className="w-64 bg-gray-900 bg-opacity-60 backdrop-blur-sm min-h-screen border-r border-gray-800/60 shadow-inner">
        <div className="p-6">
            {/* Navigation menu */}
            <nav className="space-y-1">
                {menuItems.map((item) => (
                    <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center px-4 py-3 rounded-lg transition-colors duration-200 ${
                            item.active
                                ? 'bg-transparent text-gray-400'
                                : 'text-gray-500 hover:bg-blue-800 hover:text-gray-300'
                        }`}
                    >
                        <span className="mr-3 scale-125">{item.icon}</span>
                        <span className="text-xl">{item.name}</span>
                    </Link>
                ))}
            </nav>
        </div>
    </div>
);
};

export default Sidebar;