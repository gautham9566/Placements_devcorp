'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IconUser, IconChevronRight, IconSettings, IconUser as IconProfile } from '@tabler/icons-react';
import ThemeToggle from './ThemeToggle';

export default function DropdownMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const dropdownRef = useRef(null);
  const router = useRouter();

  // Get user role from localStorage
  const [userRole, setUserRole] = useState(null);
  
  useEffect(() => {
    const role = localStorage.getItem('role');
    setUserRole(role);
  }, []);

  const menuItems = [
    {
      title: 'Profile',
      icon: IconProfile,
      hasSubmenu: true,
      submenu: [
        { title: 'My Profile', href: userRole === 'ADMIN' ? '/admin/profile' : '/profile' },
        { title: 'Edit Profile', href: '/profile/edit' },
        { title: 'Account Settings', href: '/profile/settings' },
        { title: 'Privacy Settings', href: '/profile/privacy' }
      ]
    },
    {
      title: 'Settings',
      icon: IconSettings,
      hasSubmenu: true,
      submenu: [
        { title: 'Theme', component: 'theme' },
        { title: 'Notification Preferences', href: '/settings/notifications' },
        { title: 'Language', href: '/settings/language' },
        { title: 'Data & Privacy', href: '/settings/privacy' }
      ]
    },
    { title: 'Help Center', href: '/help' },
    { title: 'Terms of Service', href: '/terms' }
  ];

  const handleLogout = () => {
    localStorage.removeItem('userEmail');
    localStorage.removeItem('collegeName');
    localStorage.removeItem('role');
    document.cookie = 'role=; path=/; max-age=0';
    router.push('/login');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setActiveSubmenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmenuToggle = (index) => {
    setActiveSubmenu(activeSubmenu === index ? null : index);
  };

  return (
    <div className="relative flex items-center gap-3" ref={dropdownRef}>
      <span className="text-black font-medium">Student Career Center</span>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-blue-600 hover:text-blue-700 p-2 rounded-full hover:bg-blue-50 transition-colors"
      >
        <IconUser size={24} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {menuItems.map((item, index) => (
            <div key={index} className="relative">
              {item.hasSubmenu ? (
                <div>
                  <button
                    onClick={() => handleSubmenuToggle(index)}
                    className="w-full flex items-center justify-between px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      {item.icon && <item.icon size={18} />}
                      <span>{item.title}</span>
                    </div>
                    <IconChevronRight 
                      size={16} 
                      className={`transform transition-transform duration-200 ${
                        activeSubmenu === index ? 'rotate-90' : ''
                      }`}
                    />
                  </button>
                  
                  {activeSubmenu === index && (
                    <div className="ml-4 border-l border-gray-200 pl-4 py-2">
                      {item.submenu.map((subItem, subIndex) => (
                        <div key={subIndex}>
                          {subItem.component === 'theme' ? (
                            <div className="px-2 py-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Theme</span>
                                <ThemeToggle />
                              </div>
                            </div>
                          ) : (
                            <a
                              href={subItem.href}
                              className="block px-2 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-25 rounded transition-all duration-200"
                            >
                              {subItem.title}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <a
                  href={item.href}
                  className="block px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                >
                  {item.title}
                </a>
              )}
            </div>
          ))}
          
          <hr className="my-2 border-gray-200" />
          
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-all duration-200"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
} 