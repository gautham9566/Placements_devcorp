// Calendar data source for deadlines, interviews, and company events
// This file will serve as the single source of truth for all calendar-related data

import { studentApplications, jobPostings, companies } from './jobsData';

// Calendar event types
export const EVENT_TYPES = {
  APPLICATION_DEADLINE: 'APPLICATION_DEADLINE',
  INTERVIEW: 'INTERVIEW',
  COMPANY_EVENT: 'COMPANY_EVENT',
  CAREER_FAIR: 'CAREER_FAIR',
  DEADLINE_REMINDER: 'DEADLINE_REMINDER',
  OFFER_RESPONSE: 'OFFER_RESPONSE'
};

// Additional upcoming events for the next few months
export const upcomingEvents = [
  {
    id: 14,
    title: 'Summer Internship Orientation',
    type: EVENT_TYPES.COMPANY_EVENT,
    date: '2024-05-15',
    time: '09:00',
    company: 'Multiple Companies',
    description: 'Orientation session for all summer 2024 interns',
    status: 'upcoming',
    priority: 'medium',
    color: '#2563eb',
    location: 'Career Services Center',
    duration: '4 hours'
  },
  {
    id: 15,
    title: 'Fall Recruitment Season Kickoff',
    type: EVENT_TYPES.COMPANY_EVENT,
    date: '2024-08-15',
    time: '10:00',
    company: 'Multiple Companies',
    description: 'Beginning of fall recruitment for full-time positions',
    status: 'upcoming',
    priority: 'medium',
    color: '#2563eb',
    location: 'Main Campus',
    duration: '1 day'
  }
];

// Base calendar events
export const calendarEvents = [
  {
    id: 1,
    title: 'Microsoft Application Deadline',
    type: EVENT_TYPES.APPLICATION_DEADLINE,
    date: '2024-05-20',
    time: '23:59',
    company: 'Microsoft',
    description: 'Final deadline for Microsoft Summer Internship applications',
    status: 'upcoming',
    priority: 'high',
    color: '#dc2626',
    location: 'Online'
  },
  {
    id: 2,
    title: 'Google Technical Interview',
    type: EVENT_TYPES.INTERVIEW,
    date: '2024-05-22',
    time: '14:00',
    company: 'Google',
    description: 'Technical interview for Software Engineer position',
    status: 'scheduled',
    priority: 'high',
    color: '#059669',
    location: 'Virtual - Google Meet',
    duration: '90 minutes'
  },
  {
    id: 3,
    title: 'Career Fair 2024',
    type: EVENT_TYPES.CAREER_FAIR,
    date: '2024-05-25',
    time: '10:00',
    company: 'Multiple Companies',
    description: 'Annual career fair with 50+ companies',
    status: 'upcoming',
    priority: 'medium',
    color: '#2563eb',
    location: 'Student Center',
    duration: '6 hours'
  }
];

// Helper functions
export const getEventsByDate = (date) => {
  return calendarEvents.filter(event => event.date === date);
};

export const getEventsByMonth = (year, month) => {
  const monthString = month.toString().padStart(2, '0');
  const yearMonth = `${year}-${monthString}`;
  return calendarEvents.filter(event => event.date.startsWith(yearMonth));
};

export const getEventsByType = (type) => {
  return calendarEvents.filter(event => event.type === type);
};

export const getEventsByCompany = (companyName) => {
  return calendarEvents.filter(event => 
    event.company.toLowerCase() === companyName.toLowerCase()
  );
};

export const getUpcomingEvents = (days = 7) => {
  const today = new Date();
  const futureDate = new Date(today.getTime() + (days * 24 * 60 * 60 * 1000));
  
  return calendarEvents.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate >= today && eventDate <= futureDate;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));
};

export const getEventsByPriority = (priority) => {
  return calendarEvents.filter(event => event.priority === priority);
};

export const getInterviewEvents = () => {
  return calendarEvents.filter(event => event.type === EVENT_TYPES.INTERVIEW);
};

export const getApplicationDeadlines = () => {
  return calendarEvents.filter(event => 
    event.type === EVENT_TYPES.APPLICATION_DEADLINE || 
    event.type === EVENT_TYPES.DEADLINE_REMINDER
  );
};

export const getEventStats = () => {
  const total = calendarEvents.length;
  const interviews = getEventsByType(EVENT_TYPES.INTERVIEW).length;
  const deadlines = getEventsByType(EVENT_TYPES.APPLICATION_DEADLINE).length;
  const companyEvents = getEventsByType(EVENT_TYPES.COMPANY_EVENT).length;
  const upcoming = getUpcomingEvents().length;

  return { total, interviews, deadlines, companyEvents, upcoming };
};

// Generate events from existing job applications
export const generateEventsFromApplications = () => {
  const generatedEvents = [];
  
  studentApplications.forEach(application => {
    // Add application deadline reminder
    const deadlineDate = new Date(application.application_deadline);
    const reminderDate = new Date(deadlineDate.getTime() - (3 * 24 * 60 * 60 * 1000)); // 3 days before
    
    if (reminderDate > new Date()) {
      generatedEvents.push({
        id: `reminder-${application.id}`,
        title: `Reminder: ${application.title} - Application Due Soon`,
        type: EVENT_TYPES.DEADLINE_REMINDER,
        date: reminderDate.toISOString().split('T')[0],
        time: '09:00',
        company: application.company,
        jobId: application.job_id,
        description: `Application deadline reminder for ${application.title} at ${application.company}`,
        status: 'upcoming',
        priority: 'medium',
        color: '#f59e0b'
      });
    }
    
    // Add interview events for applications with scheduled interviews
    if (application.status === 'INTERVIEW SCHEDULED') {
      const interviewDate = new Date();
      interviewDate.setDate(interviewDate.getDate() + Math.floor(Math.random() * 14) + 1); // Random future date
      
      generatedEvents.push({
        id: `interview-${application.id}`,
        title: `${application.company} ${application.title} - Interview`,
        type: EVENT_TYPES.INTERVIEW,
        date: interviewDate.toISOString().split('T')[0],
        time: '14:00',
        company: application.company,
        jobId: application.job_id,
        applicationId: application.id,
        description: `Interview for ${application.title} position at ${application.company}`,
        status: 'scheduled',
        priority: 'high',
        color: '#059669',
        location: 'Virtual - Teams Meeting',
        interviewer: 'HR Team',
        duration: '60 minutes'
      });
    }
  });
  
  return generatedEvents;
};

// All events including generated ones
export const getAllEvents = () => {
  return [...calendarEvents, ...generateEventsFromApplications()];
}; 