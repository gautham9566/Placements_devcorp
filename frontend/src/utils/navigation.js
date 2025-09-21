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

// Shared navigation configuration for all student pages
export const navigationLinks = [
  {
    items: [
      { title: 'My Campus', href: '/', icon: <IconHome /> },
      { title: 'My Jobs', href: '/myjobs', icon: <IconBriefcase /> },
      { title: 'Explore', href: '/explore', icon: <IconCompass /> },
      { title: 'Inbox', href: '/inbox', icon: <IconMail /> }
    ]
  },
  {
    items: [
      { title: 'Job Postings', href: '/jobpostings', icon: <IconBuilding /> },
      { title: 'Companies', href: '/companies', icon: <IconUsers /> },
      { title: 'Events', href: '/events', icon: <IconCalendarEvent /> },
      { title: 'Calendar', href: '/calendar', icon: <IconCalendarEvent /> },
      { title: 'My Profile', href: '/profile', icon: <IconUser /> },
      { title: 'Settings', href: '/settings', icon: <IconSettings /> }
    ]
  }
];

// Function to get the correct settings URL based on user role
export const getSettingsUrl = (userType) => {
  return userType === 'ADMIN' ? '/admin/settings' : '/settings';
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
      return item;
    })
  }));
};