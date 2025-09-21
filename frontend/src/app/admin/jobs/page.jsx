'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IconBriefcase, IconBuilding, IconPlus, IconArrowRight } from '@tabler/icons-react';

export default function JobsOverviewPage() {
  const router = useRouter();

  // Auto-redirect to companies page as default, or show overview
  useEffect(() => {
    // You can uncomment this to auto-redirect to companies
    // router.push('/admin/jobs/companies');
  }, [router]);

  const navigationCards = [
    {
      title: 'Companies',
      description: 'Manage company partnerships and view their job opportunities',
      icon: <IconBuilding className="w-8 h-8" />,
      href: '/admin/jobs/companies',
      color: 'blue',
      stats: 'View all registered companies'
    },
    {
      title: 'Job Listings',
      description: 'View and manage all job postings and their publication status',
      icon: <IconBriefcase className="w-8 h-8" />,
      href: '/admin/jobs/listings',
      color: 'green',
      stats: 'Manage active job postings'
    },
    {
      title: 'Post New Job',
      description: 'Create a new job posting for companies',
      icon: <IconPlus className="w-8 h-8" />,
      href: '/admin/jobs/create',
      color: 'purple',
      stats: 'Create new opportunities'
    }
  ];

  const getColorClasses = (color) => {
    const colorMap = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'text-blue-600',
        title: 'text-blue-900',
        button: 'bg-blue-600 hover:bg-blue-700'
      },
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: 'text-green-600',
        title: 'text-green-900',
        button: 'bg-green-600 hover:bg-green-700'
      },
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        icon: 'text-purple-600',
        title: 'text-purple-900',
        button: 'bg-purple-600 hover:bg-purple-700'
      }
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Job Management Center</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Comprehensive platform for managing companies, job listings, and recruitment processes. 
            Choose an option below to get started.
          </p>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {navigationCards.map((card) => {
            const colors = getColorClasses(card.color);
            return (
              <div
                key={card.href}
                className={`${colors.bg} ${colors.border} border-2 rounded-xl p-8 hover:shadow-lg transition-all duration-200 cursor-pointer group`}
                onClick={() => router.push(card.href)}
              >
                <div className="text-center">
                  <div className={`${colors.icon} mb-4 flex justify-center`}>
                    {card.icon}
                  </div>
                  <h3 className={`text-2xl font-bold ${colors.title} mb-3`}>
                    {card.title}
                  </h3>
                  <p className="text-gray-700 mb-4 min-h-[3rem]">
                    {card.description}
                  </p>
                  <p className="text-sm text-gray-600 mb-6">
                    {card.stats}
                  </p>
                  <button
                    className={`${colors.button} text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center mx-auto group-hover:scale-105 transition-transform`}
                  >
                    Go to {card.title}
                    <IconArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Stats Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Quick Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">--</div>
              <div className="text-sm text-gray-600">Total Companies</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">--</div>
              <div className="text-sm text-gray-600">Active Jobs</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600 mb-2">--</div>
              <div className="text-sm text-gray-600">Pending Publication</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">--</div>
              <div className="text-sm text-gray-600">Total Applications</div>
            </div>
          </div>
          <div className="text-center mt-6">
            <p className="text-gray-500 text-sm">
              Visit individual sections to view detailed statistics
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => router.push('/admin/jobs/create')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <IconPlus className="w-5 h-5" />
              <span>Post New Job</span>
            </button>
            <button
              onClick={() => router.push('/admin/jobs/listings')}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-2"
            >
              <IconBriefcase className="w-5 h-5" />
              <span>View All Jobs</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}




