'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '../../components/ui/Sidebar';
import DropdownMenu from '../../components/ui/DropdownMenu';
import ThemeToggle from '../../components/ui/ThemeToggle';
import {
  IconHome,
  IconBriefcase,
  IconCompass,
  IconMail,
  IconSettings,
  IconHelp,
  IconForms,
  IconUser,
  IconClipboardList
} from '@tabler/icons-react';
import {
  User,
  Megaphone,
  BarChart3,
  Calendar,
  Trophy,
 BookOpen 
} from "lucide-react";

export default function AdminLayout({ children }) {
  const [college, setCollege] = useState('');

  // Admin sidebar configuration
  const adminLinks = [
    {
      items: [
        { title: 'Dashboard', href: '/admin/dashboard', icon: <IconHome /> },
        { title: 'Calendar', href: '/admin/calendar', icon: <Calendar className="w-5 h-5" /> },
        { title: 'ATS', href: '/admin/recruitment', icon: <IconBriefcase /> },
        { title: 'Applications', href: '/admin/applications', icon: <IconClipboardList /> },
        { title: 'Placed Students', href: '/admin/placed-students', icon: <Trophy className="w-5 h-5" /> },
        { title: 'Student Management', href: '/admin/student-management', icon: <User className="w-5 h-5" /> },
        { title: 'LMS', href: '/admin/lms', icon: <BookOpen className="w-5 h-5" /> },
        { title: 'Company Management', href: '/admin/companymanagement', icon: <IconMail /> },
        { title: 'Forms', href: '/admin/form', icon: <IconForms /> }
      ]
    }
  ];

  const bottomItems = [
    { title: 'My Profile', href: '/admin/profile', icon: <IconUser /> },
    { title: 'Settings', href: '../settings', icon: <IconSettings /> },
    { title: 'Contact Support', href: '/admin/helpandsupport', icon: <IconHelp /> }
  ];

  useEffect(() => {
    const storedCollege = localStorage.getItem('collegeName');
    if (storedCollege) {
      setCollege(storedCollege);
    }
  }, []);

  return (
    <div className="h-screen bg-gray-50">
      {/* Fixed Header */}
      <div className="fixed w-full flex justify-between items-center py-4 bg-white shadow-sm z-10">
        <Link href="/admin/dashboard" className="text-gray-700 font-medium text-xl ml-28">
          DevCorp
        </Link>
        <div className="flex items-center gap-4 mr-6">
          <ThemeToggle />
          <DropdownMenu />
        </div>
      </div>

      {/* Sidebar + Main Content */}
      <div className="flex h-full pt-16">
        <Sidebar
          sections={adminLinks}
          bottomItems={bottomItems}
          defaultExpanded={false}
          navbarHeight="0"
          className="z-20"
        />
        
        {/* Main Content Area with left margin for sidebar */}
        <div className="flex-1 p-6 ml-20 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-md p-6 min-h-full text-black">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}