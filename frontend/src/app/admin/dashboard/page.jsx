'use client';

import {
  Briefcase,
  Building2,
  ClipboardList,
  TrendingDown,
  TrendingUp,
  Users
} from "lucide-react";
import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis, YAxis
} from 'recharts';

function Dashboard() {
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalApplications: 0,
    totalStudents: 0,
    placementRate: 0
  });
  
  // Application status data for the chart
  const [applicationData, setApplicationData] = useState([]);
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedView, setSelectedView] = useState('monthly');

  useEffect(() => {
    // Use proper timeout with cleanup
    const timer = setTimeout(() => {
      setStats({
        totalJobs: 45,
        totalApplications: 1234,
        totalStudents: 2567,
        placementRate: 73.5
      });

      // More comprehensive mock data for the application status chart
      setApplicationData([
        { name: 'Jan', sent: 85, interviews: 15, approved: 8, rejected: 62, pending: 15 },
        { name: 'Feb', sent: 110, interviews: 22, approved: 12, rejected: 76, pending: 22 },
        { name: 'Mar', sent: 150, interviews: 30, approved: 18, rejected: 102, pending: 30 },
        { name: 'Apr', sent: 175, interviews: 40, approved: 22, rejected: 113, pending: 40 },
        { name: 'May', sent: 195, interviews: 45, approved: 28, rejected: 122, pending: 45 },
        { name: 'Jun', sent: 160, interviews: 35, approved: 20, rejected: 105, pending: 35 },
        { name: 'Jul', sent: 120, interviews: 25, approved: 15, rejected: 80, pending: 25 },
        { name: 'Aug', sent: 210, interviews: 48, approved: 32, rejected: 130, pending: 48 },
        { name: 'Sep', sent: 300, interviews: 70, approved: 45, rejected: 185, pending: 70 },
        { name: 'Oct', sent: 240, interviews: 55, approved: 38, rejected: 147, pending: 55 },
        { name: 'Nov', sent: 280, interviews: 65, approved: 52, rejected: 163, pending: 65 },
        { name: 'Dec', sent: 220, interviews: 50, approved: 35, rejected: 135, pending: 50 }
      ]);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const dashboardCards = [
    {
      title: 'Total Active Jobs',
      value: stats.totalJobs,
      icon: <Briefcase className="w-8 h-8" />,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      change: '+12%',
      changeType: 'increase'
    },
    {
      title: 'Total Applications',
      value: stats.totalApplications.toLocaleString(),
      icon: <ClipboardList className="w-8 h-8" />,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      change: '+8%',
      changeType: 'increase'
    },
    {
      title: 'Registered Students',
      value: stats.totalStudents.toLocaleString(),
      icon: <Users className="w-8 h-8" />,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      change: '+5%',
      changeType: 'increase'
    },
    {
      title: 'Placement Rate',
      value: `${stats.placementRate}%`,
      icon: <TrendingUp className="w-8 h-8" />,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      change: '-3.2%',
      changeType: 'decrease'
    }
  ];

  return (
    <div className="p-6 ml-20 overflow-y-auto h-full">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, Admin!</h1>
        <p className="text-gray-600">Here's what's happening at your college today.</p>
      </div>
  
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {dashboardCards.map((card, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <div className={card.iconColor}>
                    {card.icon}
                  </div>
                </div>
                <div className={`flex items-center text-sm font-medium ${card.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                  {card.changeType === 'increase' ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  {card.change}
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{card.value}</h3>
              <p className="text-gray-600 text-sm">{card.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Application Status Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2 md:mb-0">Application Status Timeline</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-2 border rounded-md p-1">
              <button 
                className={`px-3 py-1 text-sm rounded-md ${selectedView === 'monthly' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
                onClick={() => setSelectedView('monthly')}
              >
                Monthly
              </button>
            </div>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm bg-white"
            >
              <option value="2024">2024</option>
            </select>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-600 mr-2"></div>
            <span className="text-sm text-gray-700">Applications</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
            <span className="text-sm text-gray-700">Interviews</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
            <span className="text-sm text-gray-700">Approved</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
            <span className="text-sm text-gray-700">Rejected</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-gray-400 mr-2"></div>
            <span className="text-sm text-gray-700">Pending</span>
          </div>
        </div>
        
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={applicationData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                axisLine={{ stroke: '#e0e0e0' }}
                tick={{ fill: '#666666', fontSize: 12 }}
              />
              <YAxis 
                axisLine={{ stroke: '#e0e0e0' }}
                tick={{ fill: '#666666', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                }}
                itemStyle={{ padding: 0 }}
                labelStyle={{ fontWeight: 'bold', marginBottom: '5px' }}
              />
              <Line 
                type="monotone" 
                dataKey="sent" 
                name="Applications" 
                stroke="#4F46E5" 
                strokeWidth={2} 
                dot={{ stroke: '#4F46E5', strokeWidth: 2, r: 4, fill: 'white' }} 
                activeDot={{ r: 6, stroke: '#4F46E5', strokeWidth: 2, fill: '#4F46E5' }} 
              />
              <Line 
                type="monotone" 
                dataKey="interviews" 
                name="Interviews" 
                stroke="#10B981" 
                strokeWidth={2} 
                dot={{ stroke: '#10B981', strokeWidth: 2, r: 4, fill: 'white' }}
                activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2, fill: '#10B981' }}
              />
              <Line 
                type="monotone" 
                dataKey="approved" 
                name="Approved" 
                stroke="#F59E0B" 
                strokeWidth={2} 
                dot={{ stroke: '#F59E0B', strokeWidth: 2, r: 4, fill: 'white' }}
                activeDot={{ r: 6, stroke: '#F59E0B', strokeWidth: 2, fill: '#F59E0B' }}
              />
              <Line 
                type="monotone" 
                dataKey="rejected" 
                name="Rejected" 
                stroke="#8B5CF6" 
                strokeWidth={2} 
                dot={{ stroke: '#8B5CF6', strokeWidth: 2, r: 4, fill: 'white' }}
                activeDot={{ r: 6, stroke: '#8B5CF6', strokeWidth: 2, fill: '#8B5CF6' }}
              />
              <Line 
                type="monotone" 
                dataKey="pending" 
                name="Pending" 
                stroke="#9CA3AF" 
                strokeWidth={2} 
                dot={{ stroke: '#9CA3AF', strokeWidth: 2, r: 4, fill: 'white' }}
                activeDot={{ r: 6, stroke: '#9CA3AF', strokeWidth: 2, fill: '#9CA3AF' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    
      {/* Recent Applications Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Recent Applications</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-medium">JS</div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">John Smith</div>
                      <div className="text-sm text-gray-500">Computer Science</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">Software Engineer</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">TechCorp Inc.</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">May 16, 2024</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Interview
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-medium">AJ</div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">Amy Johnson</div>
                      <div className="text-sm text-gray-500">Business Admin</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">Marketing Analyst</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">Global Marketing Ltd.</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">May 15, 2024</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    Approved
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-medium">RL</div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">Robert Lee</div>
                      <div className="text-sm text-gray-500">Electrical Engineering</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">Hardware Engineer</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">Tech Innovations</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">May 14, 2024</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                    Pending
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
