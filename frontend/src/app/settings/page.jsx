'use client';

import { useState, useEffect } from 'react';
import { 
  User, 
  Bell, 
  Settings as SettingsIcon, 
  Lock, 
  Sun, 
  Moon,
  Upload,
  ShieldAlert,
  Users
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

// Updated import to use the auth utilities directly
import * as auth from '../../api/auth';
import { studentsAPI, adminAPI } from '../../api/optimized';
import { useTheme } from '../../contexts/ThemeContext';

const Settings = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, changeTheme } = useTheme();
  
  // Use auth utilities directly instead of a hook
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Profile settings - added missing state variables
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [role, setRole] = useState('');
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [browserNotifications, setBrowserNotifications] = useState(true);
  
  // Appearance settings - removed theme state as it's now handled by context
  const [fontSize, setFontSize] = useState('medium');
  
  // Password settings
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // System settings
  const [systemSettings, setSystemSettings] = useState({
    maintenanceMode: false,
    allowNewRegistrations: true,
    defaultUserRole: 'student'
  });
  
  // UI state
  const [activeTab, setActiveTab] = useState('profile');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Load user data on component mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = auth.getAuthToken();
      if (token) {
        setIsAuthenticated(true);
        try {
          // Get user profile from API using the correct method name
          const userData = await studentsAPI.getUserData();
          setUser(userData);
          
          // Check if user is admin - FIXED: Check user_type instead of role
          const isUserAdmin = userData.user_type === 'ADMIN' || userData.role === 'admin' || userData.user?.role === 'admin';
          setIsAdmin(isUserAdmin);
          
          // Set user role cookie for middleware
          if (typeof document !== 'undefined') {
            document.cookie = `role=${userData.user_type || 'STUDENT'}; path=/; max-age=86400`;
          }
          
          // Remove client-side redirect logic since middleware handles it now
          // The middleware will redirect admin users from /settings to /admin/settings
          
        } catch (error) {
          console.error('Error fetching user data:', error);
          // If there's an error fetching user data, redirect to login
          router.push('/login');
        }
      } else {
        // Not authenticated - redirect to login
        router.push('/login');
      }
    };
    
    checkAuth();
  }, [router, pathname]);
  
  // Load user data on component mount
  useEffect(() => {
    if (isAuthenticated && user) {
      setName(user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.name || '');
      setEmail(user.contact_email || user.email || user.user?.email || '');
      setAvatar(user.profile_image_url || user.avatar || '');
      // FIXED: Set role from user_type
      setRole(user.user_type || user.role || user.user?.role || 'student');
      
      // Load notification preferences if available
      if (user.notification_preferences) {
        setEmailNotifications(user.notification_preferences.email !== false);
        setBrowserNotifications(user.notification_preferences.browser !== false);
      }
    }
  }, [isAuthenticated, user]);

  // Load appearance settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFontSize = localStorage.getItem('userFontSize');
      
      if (savedFontSize) {
        setFontSize(savedFontSize);
        // Apply font size to document
        document.documentElement.setAttribute('data-font-size', savedFontSize);
      }
    }
  }, []);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });
    
    try {
      // Split name into first and last name
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      await studentsAPI.updateUserProfile({
        first_name: firstName,
        last_name: lastName,
        contact_email: email,
        profile_image_url: avatar
      });
      
      setMessage({ 
        type: 'success', 
        text: 'Your profile information has been updated successfully.' 
      });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || error.message || 'Failed to update profile. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleNotificationsUpdate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });
    
    try {
      await studentsAPI.updateUserProfile({
        notification_preferences: {
          email: emailNotifications,
          browser: browserNotifications
        }
      });
      
      setMessage({ 
        type: 'success', 
        text: 'Your notification settings have been saved.' 
      });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || error.message || 'Failed to update notification preferences.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleAppearanceUpdate = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Save font size to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('userFontSize', fontSize);
        
        // Apply font size immediately
        document.documentElement.setAttribute('data-font-size', fontSize);
        
        // Apply font size class
        document.body.className = document.body.className.replace(/font-\w+/g, '');
        document.body.classList.add(`font-${fontSize}`);
      }
      
      setMessage({ 
        type: 'success', 
        text: 'Your appearance preferences have been saved and applied.' 
      });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to save appearance preferences.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });
    
    if (newPassword !== confirmPassword) {
      setMessage({ 
        type: 'error', 
        text: 'New passwords do not match.' 
      });
      setIsSubmitting(false);
      return;
    }
    
    if (newPassword.length < 6) {
      setMessage({ 
        type: 'error', 
        text: 'New password must be at least 6 characters long.' 
      });
      setIsSubmitting(false);
      return;
    }
    
    try {
      const response = await studentsAPI.updateUserPassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      });
      
      setMessage({ 
        type: 'success', 
        text: response.message || 'Your password has been changed successfully.' 
      });
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Password update error:', error);
      
      // Handle validation errors from backend
      if (error.response?.data) {
        const errorData = error.response.data;
        let errorMessage = '';
        
        if (errorData.current_password) {
          errorMessage = errorData.current_password[0];
        } else if (errorData.new_password) {
          errorMessage = errorData.new_password[0];
        } else if (errorData.confirm_password) {
          errorMessage = errorData.confirm_password[0];
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else {
          errorMessage = 'Failed to update password. Please try again.';
        }
        
        setMessage({ 
          type: 'error', 
          text: errorMessage 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: 'Failed to update password. Please try again.' 
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSystemSettingsUpdate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });
    
    try {
      // Only available for admin users
      if (isAdmin) {
        await adminAPI.updateSystemSettings(systemSettings);
        
        setMessage({ 
          type: 'success', 
          text: 'System settings have been updated successfully.' 
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to update system settings. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Account Settings</h1>
        
        {/* Alert Message */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 
            message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : ''
          }`}>
            {message.text}
          </div>
        )}
        
        {/* Tabs Navigation */}
        <div className="bg-white shadow-sm rounded-lg mb-6">
          <div className="flex border-b overflow-x-auto">
            <button
              className={`px-6 py-4 font-medium text-sm flex items-center gap-2 settings-tab ${
                activeTab === 'profile' 
                  ? 'text-blue-600 border-b-2 border-blue-600 active' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('profile')}
            >
              <User className="w-4 h-4" />
              Profile
            </button>
            <button
              className={`px-6 py-4 font-medium text-sm flex items-center gap-2 settings-tab ${
                activeTab === 'notifications' 
                  ? 'text-blue-600 border-b-2 border-blue-600 active' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('notifications')}
            >
              <Bell className="w-4 h-4" />
              Notifications
            </button>
            <button
              className={`px-6 py-4 font-medium text-sm flex items-center gap-2 settings-tab ${
                activeTab === 'appearance' 
                  ? 'text-blue-600 border-b-2 border-blue-600 active' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('appearance')}
            >
              <SettingsIcon className="w-4 h-4" />
              Appearance
            </button>
            <button
              className={`px-6 py-4 font-medium text-sm flex items-center gap-2 settings-tab ${
                activeTab === 'security' 
                  ? 'text-blue-600 border-b-2 border-blue-600 active' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('security')}
            >
              <Lock className="w-4 h-4" />
              Security
            </button>
            
            {/* Admin-only tabs */}
            {isAdmin && (
              <>
                <button
                  className={`px-6 py-4 font-medium text-sm flex items-center gap-2 settings-tab ${
                    activeTab === 'system' 
                      ? 'text-blue-600 border-b-2 border-blue-600 active' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  onClick={() => setActiveTab('system')}
                >
                  <ShieldAlert className="w-4 h-4" />
                  System
                </button>
                <button
                  className={`px-6 py-4 font-medium text-sm flex items-center gap-2 settings-tab ${
                    activeTab === 'users' 
                      ? 'text-blue-600 border-b-2 border-blue-600 active' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  onClick={() => setActiveTab('users')}
                >
                  <Users className="w-4 h-4" />
                  User Management
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileUpdate}>
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">Profile Settings</h2>
                  <p className="text-gray-600 text-sm mb-4">Update your personal information</p>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-6">
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {avatar ? (
                      <img src={avatar} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-gray-400">{name.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{name || 'Your Name'}</h3>
                    <p className="text-sm text-gray-600 mb-2">{role}</p>
                    <button 
                      type="button"
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Change avatar
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <input
                    type="text"
                    value={role}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                  />
                </div>
              </div>
            </form>
          )}
          
          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <form onSubmit={handleNotificationsUpdate}>
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">Notification Preferences</h2>
                  <p className="text-gray-600 text-sm mb-4">Configure how you want to receive notifications</p>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <div>
                      <h3 className="font-medium text-gray-900">Email Notifications</h3>
                      <p className="text-sm text-gray-600">Receive email notifications for important updates</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailNotifications}
                        onChange={() => setEmailNotifications(!emailNotifications)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <h3 className="font-medium text-gray-900">Browser Notifications</h3>
                      <p className="text-sm text-gray-600">Receive push notifications in your browser</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={browserNotifications}
                        onChange={() => setBrowserNotifications(!browserNotifications)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
                
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            </form>
          )}
          
          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <form onSubmit={handleAppearanceUpdate}>
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">Appearance Settings</h2>
                  <p className="text-gray-600 text-sm mb-4">Customize your visual experience</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Theme</label>
                    <div className="grid grid-cols-3 gap-4">
                      <div
                        className={`p-4 border ${theme === 'light' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} rounded-lg cursor-pointer hover:bg-gray-50`}
                        onClick={() => changeTheme('light')}
                      >
                        <div className="flex flex-col items-center">
                          <Sun className="w-6 h-6 text-gray-700 mb-2" />
                          <span className="text-sm font-medium">Light</span>
                        </div>
                      </div>
                      <div
                        className={`p-4 border ${theme === 'dark' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} rounded-lg cursor-pointer hover:bg-gray-50`}
                        onClick={() => changeTheme('dark')}
                      >
                        <div className="flex flex-col items-center">
                          <Moon className="w-6 h-6 text-gray-700 mb-2" />
                          <span className="text-sm font-medium">Dark</span>
                        </div>
                      </div>
                      <div
                        className={`p-4 border ${theme === 'system' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} rounded-lg cursor-pointer hover:bg-gray-50`}
                        onClick={() => changeTheme('system')}
                      >
                        <div className="flex flex-col items-center">
                          <SettingsIcon className="w-6 h-6 text-gray-700 mb-2" />
                          <span className="text-sm font-medium">System</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Font Size</label>
                    <select
                      value={fontSize}
                      onChange={(e) => setFontSize(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                </div>
                
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            </form>
          )}
          
          {/* Security Tab */}
          {activeTab === 'security' && (
            <form onSubmit={handlePasswordUpdate}>
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">Security Settings</h2>
                  <p className="text-gray-600 text-sm mb-4">Update your password and security preferences</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </div>
            </form>
          )}
          
          {/* Admin-only tabs */}
          {isAdmin && activeTab === 'system' && (
            <form onSubmit={handleSystemSettingsUpdate}>
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">System Settings</h2>
                  <p className="text-gray-600 text-sm mb-4">Configure global system settings</p>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <div>
                      <h3 className="font-medium text-gray-900">Maintenance Mode</h3>
                      <p className="text-sm text-gray-600">Enable to put the site in maintenance mode</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={systemSettings.maintenanceMode}
                        onChange={() => setSystemSettings({
                          ...systemSettings,
                          maintenanceMode: !systemSettings.maintenanceMode
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <div>
                      <h3 className="font-medium text-gray-900">Allow New Registrations</h3>
                      <p className="text-sm text-gray-600">Enable to allow new users to register</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={systemSettings.allowNewRegistrations}
                        onChange={() => setSystemSettings({
                          ...systemSettings,
                          allowNewRegistrations: !systemSettings.allowNewRegistrations
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Default User Role</label>
                    <select
                      value={systemSettings.defaultUserRole}
                      onChange={(e) => setSystemSettings({
                        ...systemSettings,
                        defaultUserRole: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Save System Settings'}
                  </button>
                </div>
              </div>
            </form>
          )}
          
          {isAdmin && activeTab === 'users' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">User Management</h2>
                <p className="text-gray-600 text-sm mb-4">Manage users and permissions</p>
              </div>
              
              <p className="text-gray-700">
                This panel allows you to manage users. For full user management functionality, 
                please visit the admin dashboard.
              </p>
              
              <div className="pt-4">
                <a 
                  href="/admin/users" 
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block"
                >
                  Go to User Management
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};



export default Settings;
