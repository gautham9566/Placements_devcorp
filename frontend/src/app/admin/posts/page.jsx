'use client';

import { useEffect, useState } from 'react';

export default function Posts() {
  const [college, setCollege] = useState('');

  useEffect(() => {
    const storedCollege = localStorage.getItem('collegeName');
    if (storedCollege) {
      setCollege(storedCollege);
    }
  }, []);

  const cardStyle = 'bg-white rounded-xl shadow-md p-6 text-black h-72 w-80 flex flex-col justify-start hover:shadow-lg transition-shadow duration-200';

  return (
    <div className="p-6 ml-20 overflow-y-auto h-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Posts & Announcements</h1>
        <p className="text-gray-600">Manage campus announcements, events, and important updates</p>
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Box 1: Announcements */}
        <div className={cardStyle}>
          <h2 className="font-semibold text-xl mb-4 text-blue-600">📢 Announcements</h2>
          <ul className="text-sm space-y-3">
            <li className="flex items-start">
              <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span>New companies added this month - applications open</span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span>Resume review session scheduled for May 22</span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span>System maintenance planned for May 20 (2 hours)</span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span>New placement guidelines released</span>
            </li>
          </ul>
        </div>

        {/* Box 2: Upcoming Events */}
        <div className={cardStyle}>
          <h2 className="font-semibold text-xl mb-4 text-green-600">📅 Upcoming Events</h2>
          <ul className="text-sm space-y-3">
            <li className="flex items-start">
              <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <div>
                <div className="font-medium">Amazon Placement Drive</div>
                <div className="text-gray-500">May 25, 2024 • 10:00 AM</div>
              </div>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <div>
                <div className="font-medium">Resume Workshop</div>
                <div className="text-gray-500">May 21, 2024 • 2:00 PM</div>
              </div>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <div>
                <div className="font-medium">Mock Interview Day</div>
                <div className="text-gray-500">May 23, 2024 • 9:00 AM</div>
              </div>
            </li>
          </ul>
        </div>

        {/* Box 3: Placement Highlights */}
        <div className={cardStyle}>
          <h2 className="font-semibold text-xl mb-4 text-purple-600">🎉 Placement Highlights</h2>
          <div className="space-y-4">
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="font-medium text-purple-800">15 students placed at Infosys</div>
              <div className="text-sm text-purple-600">CTC Range: ₹4-7 LPA</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="font-medium text-purple-800">Highest CTC: ₹12 LPA</div>
              <div className="text-sm text-purple-600">Google • Software Engineer</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="font-medium text-purple-800">Average CTC this month</div>
              <div className="text-sm text-purple-600">₹6.5 LPA</div>
            </div>
          </div>
        </div>

        {/* Box 4: Important Deadlines */}
        <div className={cardStyle}>
          <h2 className="font-semibold text-xl mb-4 text-red-600">⏰ Important Deadlines</h2>
          <ul className="text-sm space-y-3">
            <li className="flex items-start">
              <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <div>
                <div className="font-medium">Microsoft Application</div>
                <div className="text-red-500">Closes May 20, 2024</div>
              </div>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <div>
                <div className="font-medium">Resume Upload</div>
                <div className="text-red-500">Due by May 19, 2024</div>
              </div>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <div>
                <div className="font-medium">Final Year Project Submission</div>
                <div className="text-red-500">Due June 1, 2024</div>
              </div>
            </li>
          </ul>
        </div>

        {/* Box 5: Quick Stats */}
        <div className={cardStyle}>
          <h2 className="font-semibold text-xl mb-4 text-indigo-600">📊 Quick Stats</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-indigo-50 rounded-lg">
              <div className="text-2xl font-bold text-indigo-800">156</div>
              <div className="text-sm text-indigo-600">Active Applications</div>
            </div>
            <div className="text-center p-3 bg-indigo-50 rounded-lg">
              <div className="text-2xl font-bold text-indigo-800">23</div>
              <div className="text-sm text-indigo-600">Companies Visiting</div>
            </div>
            <div className="text-center p-3 bg-indigo-50 rounded-lg">
              <div className="text-2xl font-bold text-indigo-800">89%</div>
              <div className="text-sm text-indigo-600">Response Rate</div>
            </div>
            <div className="text-center p-3 bg-indigo-50 rounded-lg">
              <div className="text-2xl font-bold text-indigo-800">42</div>
              <div className="text-sm text-indigo-600">Offers Made</div>
            </div>
          </div>
        </div>

        {/* Box 6: Recent Updates */}
        <div className={cardStyle}>
          <h2 className="font-semibold text-xl mb-4 text-teal-600">🔄 Recent Updates</h2>
          <div className="space-y-3">
            <div className="border-l-4 border-teal-400 pl-3">
              <div className="text-sm font-medium">New job posting template launched</div>
              <div className="text-xs text-gray-500">2 hours ago</div>
            </div>
            <div className="border-l-4 border-teal-400 pl-3">
              <div className="text-sm font-medium">Student database updated</div>
              <div className="text-xs text-gray-500">5 hours ago</div>
            </div>
            <div className="border-l-4 border-teal-400 pl-3">
              <div className="text-sm font-medium">3 new companies registered</div>
              <div className="text-xs text-gray-500">1 day ago</div>
            </div>
            <div className="border-l-4 border-teal-400 pl-3">
              <div className="text-sm font-medium">Placement statistics generated</div>
              <div className="text-xs text-gray-500">2 days ago</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
} 