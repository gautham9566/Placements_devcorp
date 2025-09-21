'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Building2,
  Clock,
  DollarSign,
  Calendar,
  Target,
  Users,
  Globe,
  CheckCircle,
  Heart,
  ExternalLink,
  Briefcase,
  GraduationCap,
  Award,
  TrendingUp,
  Star,
  Eye,
  Building,
  ChevronRight,
  Mail,
  Phone,
  Share2,
  Bookmark,
  BookmarkCheck,
  Loader, // Add Loader icon
  AlertCircle // Add AlertCircle icon for error states
} from "lucide-react";

// Import the new API functions
import { 
  getCompany, 
  transformCompanyData, 
  followCompany,
  unfollowCompany,
  getFollowersCount,
  checkFollowingStatus 
} from '../../../api/companies';
import { getJobsByCompany } from '../../../data/jobsData'; // Keep the placeholder for now
import { getUserId } from '../../../utils/auth'; // You'll need to create this utility
import { FormattedJobDescription } from '../../../lib/utils';

export default function CompanyDetail() {
  const router = useRouter();
  const params = useParams();
  const companyId = parseInt(params.id);
  
  const [company, setCompany] = useState(null);
  const [companyJobs, setCompanyJobs] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followedCompanies, setFollowedCompanies] = useState(new Set());
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Define activeJobs as a computed value from companyJobs
  const activeJobs = companyJobs.filter(job => job.is_active);

  useEffect(() => {
    // Define an async function to load company data
    const loadCompanyData = async () => {
      setLoading(true);
      try {
        // Fetch company data from API
        const response = await getCompany(companyId);
        
        // Transform the data to match frontend structure
        const companyData = transformCompanyData(response.data);
        
        if (companyData) {
          setCompany(companyData);
          
          // For jobs, we'll use the placeholder until we implement a real API
          const jobs = getJobsByCompany(companyId);
          setCompanyJobs(jobs);
          
          // Load follower count from API
          loadFollowerCount(companyId);
          
          // Check if current user is following this company
          checkUserFollowingStatus(companyId);
          
          setError(null);
        } else {
          setError("Company not found");
          // Redirect to companies page if company not found
          router.push('/companies');
        }
      } catch (err) {
        console.error("Error fetching company:", err);
        setError("Failed to load company data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadCompanyData();

    // No longer need to load from localStorage
    // Instead, check with the API if user is following this company
  }, [companyId, router]);

  // Function to load follower count from API
  const loadFollowerCount = async (companyId) => {
    try {
      const response = await getFollowersCount(companyId);
      setFollowerCount(response.data.count || 0);
    } catch (error) {
      console.error("Error fetching follower count:", error);
      setFollowerCount(0);
    }
  };

  // Function to check if user is following this company
  const checkUserFollowingStatus = async (companyId) => {
    try {
      const userId = getUserId(); // Implement this to get the current user ID
      if (!userId) return;
      
      const response = await checkFollowingStatus(companyId, userId);
      setIsFollowing(response.data.is_following || false);
    } catch (error) {
      console.error("Error checking following status:", error);
      setIsFollowing(false);
    }
  };

  const toggleFollow = async () => {
    try {
      const userId = getUserId(); // Implement this to get the current user ID
      if (!userId) {
        // Redirect to login or show login prompt
        alert("Please log in to follow companies");
        return;
      }
      
      if (isFollowing) {
        await unfollowCompany(companyId, userId);
        setFollowerCount(prev => Math.max(0, prev - 1));
      } else {
        await followCompany(companyId, userId);
        setFollowerCount(prev => prev + 1);
      }
      
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error("Error toggling follow status:", error);
      alert("Failed to update follow status. Please try again.");
    }
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'Tier 1':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Tier 2':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Tier 3':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading company details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <AlertCircle className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Company</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/companies')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Companies
          </button>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-gray-600">No company data available</p>
          <button
            onClick={() => router.push('/companies')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mt-4"
          >
            Return to Companies
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Back Navigation */}
      <div className="mb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Companies</span>
        </button>
      </div>

      {/* Company Header Banner */}
      <div className="relative mb-6">
        {/* Banner Background */}
        <div className="h-48 bg-gradient-to-r from-blue-600 to-blue-800 relative overflow-hidden rounded-xl">
          <div className="absolute inset-0 bg-black opacity-20"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
          
          {/* Company Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-end gap-6">
              {/* Company Logo */}
              <div className="w-24 h-24 bg-white rounded-xl shadow-lg flex items-center justify-center overflow-hidden border-4 border-white">
                <img 
                  src={company.logo} 
                  alt={company.name}
                  className="w-16 h-16 rounded-lg object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <Building2 className="w-12 h-12 text-gray-600 hidden" />
              </div>

              {/* Company Title */}
              <div className="flex-1 text-white pb-2">
                <h1 className="text-3xl font-bold mb-2">{company.name}</h1>
                <div className="flex items-center gap-4 text-white/90">
                  <span>{company.industry}</span>
                  <span>•</span>
                  <span>{followerCount.toLocaleString()} followers</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pb-2">
                <button
                  onClick={toggleFollow}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    isFollowing
                      ? 'bg-white/20 text-white border border-white/30 hover:bg-white/30'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
                <button className="p-2 rounded-lg bg-white/20 text-white border border-white/30 hover:bg-white/30 transition-colors">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Company Quick Info */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg mt-4">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{company.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{company.size}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Founded {company.founded}</span>
                </div>
                <a 
                  href={company.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                >
                  <Globe className="w-4 h-4" />
                  <span>Website</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center gap-2">
                <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getTierColor(company.tier)}`}>
                  <Star className="w-4 h-4" />
                  <span>{company.tier}</span>
                </div>
                {company.campus_recruiting && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    Campus Recruiting
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white border border-gray-200 rounded-lg mb-6">
        <div className="px-6">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'jobs', label: 'Jobs' },
              { id: 'posts', label: 'Posts' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === 'overview' && (
          <div className="max-w-4xl">
            <div className="space-y-8">
              {/* Company Description */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">About {company.name}</h2>
                <p className="text-gray-700 leading-relaxed text-lg">
                  {company.description}
                </p>
              </div>

              {/* Key Metrics */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="bg-blue-50 rounded-lg p-6 text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Briefcase className="w-6 h-6 text-blue-600" />
                      <h4 className="font-semibold text-blue-900">Active Jobs</h4>
                    </div>
                    <p className="text-3xl font-bold text-blue-900">{company.totalActiveJobs}</p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-6 text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Users className="w-6 h-6 text-green-600" />
                      <h4 className="font-semibold text-green-900">Total Applicants</h4>
                    </div>
                    <p className="text-3xl font-bold text-green-900">{company.totalApplicants}</p>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-6 text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                      <h4 className="font-semibold text-purple-900">Hired</h4>
                    </div>
                    <p className="text-3xl font-bold text-purple-900">{company.totalHired}</p>
                  </div>

                  <div className="bg-amber-50 rounded-lg p-6 text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Clock className="w-6 h-6 text-amber-600" />
                      <h4 className="font-semibold text-amber-900">Pending</h4>
                    </div>
                    <p className="text-3xl font-bold text-amber-900">{company.awaitedApproval}</p>
                  </div>
                </div>
              </div>

              {/* Work Life */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Work Life</h3>
                <div className="bg-gray-50 rounded-lg p-6">
                  <p className="text-gray-700 leading-relaxed mb-4">
                    {company.tier === 'Tier 1' 
                      ? `${company.name} offers a dynamic work environment with cutting-edge technology, comprehensive benefits, and opportunities for professional growth. Our culture emphasizes innovation, collaboration, and work-life balance.`
                      : company.tier === 'Tier 2'
                      ? `At ${company.name}, we foster a collaborative environment where innovation thrives. We offer competitive benefits, flexible work arrangements, and continuous learning opportunities for our employees.`
                      : `${company.name} provides a supportive workplace focused on growth and development. We believe in empowering our employees with the tools and opportunities they need to succeed.`
                    }
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { label: 'Remote Work', available: true },
                      { label: 'Health Insurance', available: true },
                      { label: 'Stock Options', available: company.tier === 'Tier 1' || company.tier === 'Tier 2' },
                      { label: 'Learning Budget', available: true },
                      { label: 'Flexible Hours', available: true },
                      { label: 'Gym Membership', available: company.tier === 'Tier 1' }
                    ].map((benefit, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className={`w-4 h-4 ${benefit.available ? 'text-green-600' : 'text-gray-400'}`} />
                        <span className={benefit.available ? 'text-gray-900' : 'text-gray-500'}>
                          {benefit.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Company Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Details</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Industry</h4>
                      <p className="text-gray-700">{company.industry}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Company Size</h4>
                      <p className="text-gray-700">{company.size}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Founded</h4>
                      <p className="text-gray-700">{company.founded}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Headquarters</h4>
                      <p className="text-gray-700">{company.location}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="max-w-4xl">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Job Openings</h2>
              <p className="text-gray-600">{activeJobs.length} active position{activeJobs.length !== 1 ? 's' : ''} available</p>
            </div>

            {activeJobs.length > 0 ? (
              <div className="space-y-6">
                {activeJobs.map((job) => (
                  <div key={job.id} className="bg-gray-50 border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            job.type === 'INTERNSHIP' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {job.type === 'INTERNSHIP' ? 'Internship' : 'Full-time'}
                          </span>
                          {job.is_featured && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                              Featured
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{job.location}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            <span>${job.salary_min}k - ${job.salary_max}k / {job.per}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{job.duration}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Apply by {new Date(job.deadline).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <FormattedJobDescription 
                          description={job.description} 
                          className="mb-4"
                        />
                        
                        {/* Skills */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {job.skills.slice(0, 5).map((skill, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                            >
                              {skill}
                            </span>
                          ))}
                          {job.skills.length > 5 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                              +{job.skills.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-6">
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                          Apply Now
                        </button>
                        <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                          Save Job
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Job Openings</h3>
                <p className="text-gray-600 mb-4">This company doesn't have any active job postings right now.</p>
                <button
                  onClick={toggleFollow}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Follow Company for Updates
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="max-w-4xl">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Company Posts</h2>
              <p className="text-gray-600">Latest updates and news from {company.name}</p>
            </div>

            {/* Mock Posts */}
            <div className="space-y-6">
              {[
                {
                  id: 1,
                  title: "We're excited to announce our new internship program!",
                  content: "Applications are now open for our Summer 2024 internship program. Join our team and work on cutting-edge projects while learning from industry experts.",
                  date: "2024-01-15",
                  likes: 42,
                  comments: 8
                },
                {
                  id: 2,
                  title: "Company Culture Spotlight",
                  content: "Take a behind-the-scenes look at our innovative workspace and learn about our commitment to employee well-being and professional development.",
                  date: "2024-01-10",
                  likes: 28,
                  comments: 5
                }
              ].map((post) => (
                <div key={post.id} className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <img 
                        src={company.logo} 
                        alt={company.name}
                        className="w-8 h-8 rounded object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <Building2 className="w-6 h-6 text-gray-600 hidden" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{company.name}</h3>
                        <span className="text-gray-500">•</span>
                        <span className="text-sm text-gray-500">{new Date(post.date).toLocaleDateString()}</span>
                      </div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">{post.title}</h4>
                      <p className="text-gray-700 mb-4">{post.content}</p>
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <button className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                          <Heart className="w-4 h-4" />
                          <span>{post.likes} likes</span>
                        </button>
                        <button className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                          <Mail className="w-4 h-4" />
                          <span>{post.comments} comments</span>
                        </button>
                        <button className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                          <Share2 className="w-4 h-4" />
                          <span>Share</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State for Posts */}
            <div className="text-center py-12 mt-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">That's all for now</h3>
              <p className="text-gray-600">Follow {company.name} to get notified about new posts and updates.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}