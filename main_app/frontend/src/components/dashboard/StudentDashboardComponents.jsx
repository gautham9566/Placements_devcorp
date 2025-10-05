/**
 * STUDENT DASHBOARD - COMPONENT SHOWCASE
 * 
 * This file demonstrates all the reusable components used in the student dashboard.
 * Copy and adapt these components for consistent design across your application.
 */

// ============================================
// 1. STATUS BADGE COMPONENT
// ============================================
// Used for displaying application status with color coding
const StatusBadge = ({ status }) => {
  const getStatusConfig = (status) => {
    const configs = {
      'APPLIED': {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        icon: 'Clock',
        label: 'Applied'
      },
      'UNDER_REVIEW': {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        icon: 'AlertCircle',
        label: 'Under Review'
      },
      'SHORTLISTED': {
        bg: 'bg-green-100',
        text: 'text-green-800',
        icon: 'CheckCircle',
        label: 'Shortlisted'
      },
      'REJECTED': {
        bg: 'bg-red-100',
        text: 'text-red-800',
        icon: 'XCircle',
        label: 'Rejected'
      },
      'HIRED': {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        icon: 'Award',
        label: 'Hired'
      }
    };
    return configs[status] || configs.APPLIED;
  };

  const config = getStatusConfig(status);
  
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

// ============================================
// 2. STAT CARD COMPONENT
// ============================================
// Reusable card for displaying statistics
const StatCard = ({ icon: Icon, value, label, color = 'blue', trend, onClick }) => {
  return (
    <div 
      className={`bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 bg-${color}-100 rounded-lg`}>
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 text-${color}-600`} />
        </div>
        {trend && (
          <span className={`text-xs font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-xs sm:text-sm text-gray-600 mt-1">{label}</p>
    </div>
  );
};

// ============================================
// 3. PRIORITY ACTION ITEM
// ============================================
// Action item for the priority actions banner
const PriorityActionItem = ({ icon: Icon, title, description, color = 'blue', onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-3 bg-white rounded-lg hover:shadow-md transition-shadow group"
    >
      <div className="flex items-center">
        <div className={`p-2 rounded-lg bg-${color}-100`}>
          <Icon className={`w-5 h-5 text-${color}-600`} />
        </div>
        <div className="ml-3 text-left">
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className="text-xs text-gray-600">{description}</p>
        </div>
      </div>
      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
    </button>
  );
};

// ============================================
// 4. APPLICATION CARD
// ============================================
// Card for displaying individual application details
const ApplicationCard = ({ application, onClick }) => {
  const StatusIcon = getStatusIcon(application.status);
  
  return (
    <div
      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{application.job_title}</h3>
          <p className="text-sm text-gray-600 mt-1">{application.company_name}</p>
          <p className="text-xs text-gray-500 mt-1">
            Applied: {new Date(application.applied_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-col items-end ml-4">
          <StatusBadge status={application.status} />
        </div>
      </div>
    </div>
  );
};

// ============================================
// 5. JOB RECOMMENDATION CARD
// ============================================
// Card for displaying recommended job opportunities
const JobRecommendationCard = ({ job, matchPercentage, onClick }) => {
  return (
    <div
      className="p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-sm transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start">
        <div className="p-2 bg-green-100 rounded-lg">
          <Briefcase className="w-5 h-5 text-green-600" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-gray-900">{job.title}</h3>
          <p className="text-xs text-gray-600 mt-1">{job.company_name}</p>
          
          {/* Job Details */}
          <div className="flex items-center mt-2 text-xs text-gray-500 flex-wrap gap-2">
            <div className="flex items-center">
              <MapPin className="w-3 h-3 mr-1" />
              <span>{job.location}</span>
            </div>
            {job.salary_min && job.salary_max && (
              <div className="flex items-center">
                <DollarSign className="w-3 h-3 mr-1" />
                <span>₹{job.salary_min}-{job.salary_max} LPA</span>
              </div>
            )}
          </div>
          
          {/* Match Percentage */}
          {matchPercentage && (
            <div className="flex items-center mt-2">
              <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-green-600 h-1.5 rounded-full"
                  style={{ width: `${matchPercentage}%` }}
                />
              </div>
              <span className="ml-2 text-xs text-green-600 font-medium">
                {matchPercentage}% Match
              </span>
            </div>
          )}
          
          <span className="inline-block mt-2 text-xs text-green-600 font-medium">
            View Details →
          </span>
        </div>
      </div>
    </div>
  );
};

// ============================================
// 6. PROGRESS BAR
// ============================================
// Animated progress bar for profile completion
const ProgressBar = ({ percentage, color = 'blue', label, showLabel = true }) => {
  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-700">{label}</span>
          <span className="text-xs font-medium text-gray-700">{percentage}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`bg-${color}-600 h-2 rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// ============================================
// 7. QUICK ACTION BUTTON
// ============================================
// Large icon button for quick actions
const QuickActionButton = ({ icon: Icon, label, color = 'blue', onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`p-4 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md hover:border-${color}-300 transition-all group w-full`}
    >
      <Icon className={`w-8 h-8 text-${color}-600 mb-2 group-hover:scale-110 transition-transform mx-auto`} />
      <p className="text-sm font-medium text-gray-900 text-center">{label}</p>
    </button>
  );
};

// ============================================
// 8. EMPTY STATE
// ============================================
// Display when no data is available
const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction }) => {
  return (
    <div className="text-center py-12">
      <Icon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-600 mb-2">{title}</p>
      {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {actionLabel} →
        </button>
      )}
    </div>
  );
};

// ============================================
// 9. LOADING SKELETON
// ============================================
// Skeleton loader for better UX during data fetching
const SkeletonCard = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
        <div className="h-4 w-16 bg-gray-200 rounded"></div>
      </div>
      <div className="h-8 w-20 bg-gray-200 rounded mb-2"></div>
      <div className="h-4 w-32 bg-gray-200 rounded"></div>
    </div>
  );
};

// ============================================
// 10. NOTIFICATION BADGE
// ============================================
// Badge showing count of unread notifications
const NotificationBadge = ({ count, onClick }) => {
  if (count === 0) return null;
  
  return (
    <button
      onClick={onClick}
      className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
    >
      <Bell className="w-6 h-6" />
      {count > 0 && (
        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
};

// ============================================
// 11. TIMELINE ITEM
// ============================================
// Timeline view for application history
const TimelineItem = ({ application, isLast = false }) => {
  const StatusIcon = getStatusIcon(application.status);
  const statusColor = getStatusColor(application.status);
  
  return (
    <div className="relative pb-8">
      {!isLast && (
        <span
          className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
          aria-hidden="true"
        />
      )}
      <div className="relative flex items-start space-x-3">
        <div>
          <div className={`relative px-1 ${statusColor} rounded-full flex items-center justify-center h-10 w-10`}>
            <StatusIcon className="h-5 w-5" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div>
            <div className="text-sm">
              <span className="font-medium text-gray-900">{application.job_title}</span>
            </div>
            <p className="mt-0.5 text-sm text-gray-500">{application.company_name}</p>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            <time dateTime={application.applied_at}>
              {new Date(application.applied_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </time>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// 12. INFO TOOLTIP
// ============================================
// Helpful tooltips for reducing anxiety
const InfoTooltip = ({ content, children }) => {
  const [show, setShow] = useState(false);
  
  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex items-center"
      >
        {children}
        <svg
          className="w-4 h-4 ml-1 text-gray-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {show && (
        <div className="absolute z-10 w-64 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg -top-2 left-full ml-2">
          {content}
          <svg
            className="absolute text-gray-900 h-2 w-full left-0 top-full"
            x="0px"
            y="0px"
            viewBox="0 0 255 255"
          >
            <polygon className="fill-current" points="0,0 127.5,127.5 255,0" />
          </svg>
        </div>
      )}
    </div>
  );
};

// ============================================
// USAGE EXAMPLES
// ============================================

/*

// Example 1: Status Badge
<StatusBadge status="SHORTLISTED" />

// Example 2: Stat Card
<StatCard
  icon={Briefcase}
  value={12}
  label="Total Applications"
  color="blue"
  trend={+15}
  onClick={() => navigate('/applications')}
/>

// Example 3: Priority Action
<PriorityActionItem
  icon={User}
  title="Complete Your Profile"
  description="Your profile is 60% complete"
  color="orange"
  onClick={() => navigate('/profile')}
/>

// Example 4: Application Card
<ApplicationCard
  application={applicationData}
  onClick={() => navigate(`/applications/${applicationData.id}`)}
/>

// Example 5: Job Recommendation
<JobRecommendationCard
  job={jobData}
  matchPercentage={85}
  onClick={() => navigate(`/jobs/${jobData.id}`)}
/>

// Example 6: Progress Bar
<ProgressBar
  percentage={75}
  color="purple"
  label="Profile Completion"
/>

// Example 7: Quick Action Button
<QuickActionButton
  icon={Briefcase}
  label="Browse Jobs"
  color="blue"
  onClick={() => navigate('/jobs')}
/>

// Example 8: Empty State
<EmptyState
  icon={Briefcase}
  title="No applications yet"
  description="Start by browsing available job opportunities"
  actionLabel="Browse Jobs"
  onAction={() => navigate('/jobs')}
/>

// Example 9: Loading Skeleton
<div className="grid grid-cols-4 gap-4">
  <SkeletonCard />
  <SkeletonCard />
  <SkeletonCard />
  <SkeletonCard />
</div>

// Example 10: Notification Badge
<NotificationBadge
  count={5}
  onClick={() => navigate('/notifications')}
/>

// Example 11: Timeline
<div className="flow-root">
  {applications.map((app, idx) => (
    <TimelineItem
      key={app.id}
      application={app}
      isLast={idx === applications.length - 1}
    />
  ))}
</div>

// Example 12: Info Tooltip
<InfoTooltip content="This shows how many companies have viewed your profile">
  <span>Profile Views</span>
</InfoTooltip>

*/

export {
  StatusBadge,
  StatCard,
  PriorityActionItem,
  ApplicationCard,
  JobRecommendationCard,
  ProgressBar,
  QuickActionButton,
  EmptyState,
  SkeletonCard,
  NotificationBadge,
  TimelineItem,
  InfoTooltip
};
