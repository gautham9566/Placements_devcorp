import { 
  IconHome, 
  IconBriefcase, 
  IconCompass, 
  IconBuilding, 
  IconUsers, 
  IconCalendarEvent, 
  IconMail,
  IconSettings,
  IconUser
} from '@tabler/icons-react';

import {
BookOpen 
} from "lucide-react";

// Shared navigation configuration for all student pages
export const navigationLinks = [
  {
    items: [
      { title: 'My Campus', href: '/students/', icon: <IconHome /> },
      { title: 'My Jobs', href: '/students/myjobs', icon: <IconBriefcase /> },
      { title: 'Job Postings', href: '/students/jobpostings', icon: <IconBuilding /> },
      { title: 'Companies', href: '/students/companies', icon: <IconUsers /> },
      { title: 'Calendar', href: '/students/calendar', icon: <IconCalendarEvent /> },
      { title: 'LMS', href: '/students/lms', icon: <BookOpen className="w-5 h-5" /> },
      { title: 'My Profile', href: '/students/profile', icon: <IconUser /> },
      { title: 'Settings', href: '/students/settings', icon: <IconSettings /> }
    ]
  }
];

// Function to get the correct settings URL based on user role
export const getSettingsUrl = (userType) => {
  return userType === 'ADMIN' ? '/admin/settings' : '/students/settings';
};

// Function to get the correct calendar URL based on user role
export const getCalendarUrl = (userType) => {
  return userType === 'ADMIN' ? '/admin/calendar' : '/students/calendar';
};

// Function to get navigation links with dynamic settings URL
export const getNavigationLinks = (userType) => {
  return navigationLinks.map(group => ({
    ...group,
    items: group.items.map(item => {
      if (item.title === 'Settings') {
        return {
          ...item,
          href: getSettingsUrl(userType)
        };
      }
      if (item.title === 'Calendar') {
        return {
          ...item,
          href: getCalendarUrl(userType)
        };
      }
      return item;
    })
  }));
};