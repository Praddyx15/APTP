// src/frontend/components/settings/SettingsPage.tsx
import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { Input } from '../ui/Input';
import { Tabs, Tab } from '../ui/Tabs';
import { useAuth } from '../auth/UserAuth';

// Types
export interface GeneralSettings {
  dateFormat: string;
  timeFormat: string;
  language: string;
  timeZone: string;
  defaultDashboard: 'overview' | 'analytics' | 'compliance' | 'syllabus';
}

export interface NotificationSettings {
  emailNotifications: boolean;
  inAppNotifications: boolean;
  pushNotifications: boolean;
  emailDigestFrequency: 'immediately' | 'daily' | 'weekly' | 'never';
  notifyOnAssessmentCreated: boolean;
  notifyOnAssessmentGraded: boolean;
  notifyOnDocumentUploaded: boolean;
  notifyOnSyllabusChanges: boolean;
  notifyOnComplianceIssues: boolean;
}

export interface PrivacySettings {
  shareProgressWithInstructors: boolean;
  shareProgressWithOtherTrainees: boolean;
  allowAnalyticsCollection: boolean;
  allowAutomaticErrorReporting: boolean;
}

export interface SecuritySettings {
  twoFactorAuthentication: boolean;
  sessionTimeout: number; // minutes
  passwordExpiryDays: number;
  loginAttempts: number;
  ipRestriction: boolean;
  restrictedIpAddresses: string[];
}

export interface DisplaySettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  colorScheme: 'default' | 'high-contrast' | 'custom';
  customColors?: Record<string, string>;
  compactMode: boolean;
  showTips: boolean;
}

export interface IntegrationSettings {
  connectedApps: {
    id: string;
    name: string;
    connected: boolean;
    lastSync?: Date;
    permissions: string[];
  }[];
}

export interface SettingsData {
  general: GeneralSettings;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  security: SecuritySettings;
  display: DisplaySettings;
  integrations: IntegrationSettings;
}

interface SettingsPageProps {
  settings: SettingsData;
  onUpdateSettings: (section: keyof SettingsData, updates: any) => Promise<void>;
  onEnableTwoFactor: () => Promise<void>;
  onDisableTwoFactor: () => Promise<void>;
  onConnectApp: (appId: string) => Promise<void>;
  onDisconnectApp: (appId: string) => Promise<void>;
  availableTimeZones: { id: string; name: string }[];
  availableLanguages: { id: string; name: string }[];
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onUpdateSettings,
  onEnableTwoFactor,
  onDisableTwoFactor,
  onConnectApp,
  onDisconnectApp,
  availableTimeZones,
  availableLanguages
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<keyof SettingsData>('general');
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [generalForm, setGeneralForm] = useState(settings.general);
  const [notificationForm, setNotificationForm] = useState(settings.notifications);
  const [privacyForm, setPrivacyForm] = useState(settings.privacy);
  const [securityForm, setSecurityForm] = useState(settings.security);
  const [displayForm, setDisplayForm] = useState(settings.display);
  const [showCustomColors, setShowCustomColors] = useState(displayForm.colorScheme === 'custom');
  
  // Handle save settings
  const handleSaveSettings = async (section: keyof SettingsData) => {
    setIsLoading(true);
    try {
      let formData;
      switch (section) {
        case 'general':
          formData = generalForm;
          break;
        case 'notifications':
          formData = notificationForm;
          break;
        case 'privacy':
          formData = privacyForm;
          break;
        case 'security':
          formData = securityForm;
          break;
        case 'display':
          formData = displayForm;
          break;
        default:
          formData = {};
      }
      
      await onUpdateSettings(section, formData);
      setAlertMessage({
        type: 'success',
        message: 'Settings updated successfully.'
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to update settings: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle enable/disable two-factor authentication
  const handleTwoFactorToggle = async () => {
    setIsLoading(true);
    try {
      if (securityForm.twoFactorAuthentication) {
        await onDisableTwoFactor();
        setSecurityForm({ ...securityForm, twoFactorAuthentication: false });
      } else {
        await onEnableTwoFactor();
        setSecurityForm({ ...securityForm, twoFactorAuthentication: true });
      }
      setAlertMessage({
        type: 'success',
        message: `Two-factor authentication ${securityForm.twoFactorAuthentication ? 'disabled' : 'enabled'} successfully.`
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to ${securityForm.twoFactorAuthentication ? 'disable' : 'enable'} two-factor authentication: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle connect/disconnect app
  const handleAppConnectionToggle = async (appId: string, connected: boolean) => {
    setIsLoading(true);
    try {
      if (connected) {
        await onDisconnectApp(appId);
      } else {
        await onConnectApp(appId);
      }
      
      // Update local state
      const updatedApps = settings.integrations.connectedApps.map(app => 
        app.id === appId ? { ...app, connected: !connected } : app
      );
      
      setAlertMessage({
        type: 'success',
        message: `Application ${connected ? 'disconnected' : 'connected'} successfully.`
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to ${connected ? 'disconnect' : 'connect'} application: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle theme change
  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    setDisplayForm(prev => ({ ...prev, theme }));
    // In a real implementation, this would also apply the theme immediately
  };
  
  // Handle color scheme change
  const handleColorSchemeChange = (colorScheme: 'default' | 'high-contrast' | 'custom') => {
    setDisplayForm(prev => ({ ...prev, colorScheme }));
    setShowCustomColors(colorScheme === 'custom');
  };
  
  const tabs: Tab[] = [
    {
      id: 'general',
      label: 'General',
      content: (
        <div>
          <h3 className="text-lg font-medium mb-4">General Settings</h3>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <select
                id="language"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={generalForm.language}
                onChange={(e) => setGeneralForm({ ...generalForm, language: e.target.value })}
              >
                {availableLanguages.map(language => (
                  <option key={language.id} value={language.id}>
                    {language.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700 mb-1">
                Time Zone
              </label>
              <select
                id="timeZone"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={generalForm.timeZone}
                onChange={(e) => setGeneralForm({ ...generalForm, timeZone: e.target.value })}
              >
                {availableTimeZones.map(timeZone => (
                  <option key={timeZone.id} value={timeZone.id}>
                    {timeZone.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="dateFormat" className="block text-sm font-medium text-gray-700 mb-1">
                Date Format
              </label>
              <select
                id="dateFormat"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={generalForm.dateFormat}
                onChange={(e) => setGeneralForm({ ...generalForm, dateFormat: e.target.value })}
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="timeFormat" className="block text-sm font-medium text-gray-700 mb-1">
                Time Format
              </label>
              <select
                id="timeFormat"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={generalForm.timeFormat}
                onChange={(e) => setGeneralForm({ ...generalForm, timeFormat: e.target.value })}
              >
                <option value="12h">12-hour (1:30 PM)</option>
                <option value="24h">24-hour (13:30)</option>
              </select>
            </div>
            
            <div className="sm:col-span-2">
              <label htmlFor="defaultDashboard" className="block text-sm font-medium text-gray-700 mb-1">
                Default Dashboard
              </label>
              <select
                id="defaultDashboard"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={generalForm.defaultDashboard}
                onChange={(e) => setGeneralForm({ ...generalForm, defaultDashboard: e.target.value as any })}
              >
                <option value="overview">Overview</option>
                <option value="analytics">Analytics</option>
                <option value="compliance">Compliance</option>
                <option value="syllabus">Syllabus</option>
              </select>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button
              variant="primary"
              onClick={() => handleSaveSettings('general')}
              isLoading={isLoading}
              disabled={isLoading}
            >
              Save Changes
            </Button>
          </div>
        </div>
      )
    },
    {
      id: 'notifications',
      label: 'Notifications',
      content: (
        <div>
          <h3 className="text-lg font-medium mb-4">Notification Settings</h3>
          
          <div className="mb-6">
            <h4 className="text-base font-medium mb-2">Notification Channels</h4>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  id="emailNotifications"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={notificationForm.emailNotifications}
                  onChange={(e) => setNotificationForm({ ...notificationForm, emailNotifications: e.target.checked })}
                />
                <label htmlFor="emailNotifications" className="ml-2 block text-sm text-gray-900">
                  Email Notifications
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  id="inAppNotifications"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={notificationForm.inAppNotifications}
                  onChange={(e) => setNotificationForm({ ...notificationForm, inAppNotifications: e.target.checked })}
                />
                <label htmlFor="inAppNotifications" className="ml-2 block text-sm text-gray-900">
                  In-App Notifications
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  id="pushNotifications"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={notificationForm.pushNotifications}
                  onChange={(e) => setNotificationForm({ ...notificationForm, pushNotifications: e.target.checked })}
                />
                <label htmlFor="pushNotifications" className="ml-2 block text-sm text-gray-900">
                  Push Notifications
                </label>
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <h4 className="text-base font-medium mb-2">Email Digest Frequency</h4>
            <select
              id="emailDigestFrequency"
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={notificationForm.emailDigestFrequency}
              onChange={(e) => setNotificationForm({ ...notificationForm, emailDigestFrequency: e.target.value as any })}
              disabled={!notificationForm.emailNotifications}
            >
              <option value="immediately">Immediately</option>
              <option value="daily">Daily Digest</option>
              <option value="weekly">Weekly Digest</option>
              <option value="never">Never</option>
            </select>
          </div>
          
          <div className="mb-6">
            <h4 className="text-base font-medium mb-2">Notification Events</h4>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  id="notifyOnAssessmentCreated"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={notificationForm.notifyOnAssessmentCreated}
                  onChange={(e) => setNotificationForm({ ...notificationForm, notifyOnAssessmentCreated: e.target.checked })}
                />
                <label htmlFor="notifyOnAssessmentCreated" className="ml-2 block text-sm text-gray-900">
                  New Assessment Created
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  id="notifyOnAssessmentGraded"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={notificationForm.notifyOnAssessmentGraded}
                  onChange={(e) => setNotificationForm({ ...notificationForm, notifyOnAssessmentGraded: e.target.checked })}
                />
                <label htmlFor="notifyOnAssessmentGraded" className="ml-2 block text-sm text-gray-900">
                  Assessment Graded
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  id="notifyOnDocumentUploaded"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={notificationForm.notifyOnDocumentUploaded}
                  onChange={(e) => setNotificationForm({ ...notificationForm, notifyOnDocumentUploaded: e.target.checked })}
                />
                <label htmlFor="notifyOnDocumentUploaded" className="ml-2 block text-sm text-gray-900">
                  New Document Uploaded
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  id="notifyOnSyllabusChanges"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={notificationForm.notifyOnSyllabusChanges}
                  onChange={(e) => setNotificationForm({ ...notificationForm, notifyOnSyllabusChanges: e.target.checked })}
                />
                <label htmlFor="notifyOnSyllabusChanges" className="ml-2 block text-sm text-gray-900">
                  Syllabus Changes
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  id="notifyOnComplianceIssues"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={notificationForm.notifyOnComplianceIssues}
                  onChange={(e) => setNotificationForm({ ...notificationForm, notifyOnComplianceIssues: e.target.checked })}
                />
                <label htmlFor="notifyOnComplianceIssues" className="ml-2 block text-sm text-gray-900">
                  Compliance Issues
                </label>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button
              variant="primary"
              onClick={() => handleSaveSettings('notifications')}
              isLoading={isLoading}
              disabled={isLoading}
            >
              Save Changes
            </Button>
          </div>
        </div>
      )
    },
    {
      id: 'privacy',
      label: 'Privacy',
      content: (
        <div>
          <h3 className="text-lg font-medium mb-4">Privacy Settings</h3>
          
          <div className="space-y-6">
            <div>
              <h4 className="text-base font-medium mb-2">Data Sharing</h4>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    id="shareProgressWithInstructors"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={privacyForm.shareProgressWithInstructors}
                    onChange={(e) => setPrivacyForm({ ...privacyForm, shareProgressWithInstructors: e.target.checked })}
                  />
                  <label htmlFor="shareProgressWithInstructors" className="ml-2 block text-sm text-gray-900">
                    Share my progress with instructors
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="shareProgressWithOtherTrainees"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={privacyForm.shareProgressWithOtherTrainees}
                    onChange={(e) => setPrivacyForm({ ...privacyForm, shareProgressWithOtherTrainees: e.target.checked })}
                  />
                  <label htmlFor="shareProgressWithOtherTrainees" className="ml-2 block text-sm text-gray-900">
                    Share my progress with other trainees
                  </label>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-base font-medium mb-2">Analytics & Reporting</h4>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    id="allowAnalyticsCollection"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={privacyForm.allowAnalyticsCollection}
                    onChange={(e) => setPrivacyForm({ ...privacyForm, allowAnalyticsCollection: e.target.checked })}
                  />
                  <label htmlFor="allowAnalyticsCollection" className="ml-2 block text-sm text-gray-900">
                    Allow anonymous usage data collection
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="allowAutomaticErrorReporting"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={privacyForm.allowAutomaticErrorReporting}
                    onChange={(e) => setPrivacyForm({ ...privacyForm, allowAutomaticErrorReporting: e.target.checked })}
                  />
                  <label htmlFor="allowAutomaticErrorReporting" className="ml-2 block text-sm text-gray-900">
                    Allow automatic error reporting
                  </label>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Privacy Notice</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Your privacy settings affect how your data is used within the platform. 
                      For more information on our data handling practices, please refer to our 
                      <a href="/privacy-policy" className="font-medium underline hover:text-yellow-600"> Privacy Policy</a>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button
              variant="primary"
              onClick={() => handleSaveSettings('privacy')}
              isLoading={isLoading}
              disabled={isLoading}
            >
              Save Changes
            </Button>
          </div>
        </div>
      )
    },
    {
      id: 'security',
      label: 'Security',
      content: (
        <div>
          <h3 className="text-lg font-medium mb-4">Security Settings</h3>
          
          <div className="space-y-6">
            <div>
              <h4 className="text-base font-medium mb-2">Authentication</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Two-Factor Authentication</p>
                    <p className="text-xs text-gray-500">Add an extra layer of security to your account</p>
                  </div>
                  <div className="flex items-center">
                    <Button
                      variant={securityForm.twoFactorAuthentication ? 'danger' : 'primary'}
                      size="small"
                      onClick={handleTwoFactorToggle}
                      isLoading={isLoading}
                      disabled={isLoading}
                    >
                      {securityForm.twoFactorAuthentication ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="sessionTimeout" className="block text-sm font-medium text-gray-700 mb-1">
                    Session Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    id="sessionTimeout"
                    min="5"
                    max="1440"
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    value={securityForm.sessionTimeout}
                    onChange={(e) => setSecurityForm({ ...securityForm, sessionTimeout: parseInt(e.target.value) })}
                  />
                </div>
                
                <div>
                  <label htmlFor="passwordExpiryDays" className="block text-sm font-medium text-gray-700 mb-1">
                    Password Expiry (days)
                  </label>
                  <input
                    type="number"
                    id="passwordExpiryDays"
                    min="0"
                    max="365"
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    value={securityForm.passwordExpiryDays}
                    onChange={(e) => setSecurityForm({ ...securityForm, passwordExpiryDays: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Set to 0 for no expiry</p>
                </div>
                
                <div>
                  <label htmlFor="loginAttempts" className="block text-sm font-medium text-gray-700 mb-1">
                    Max Failed Login Attempts
                  </label>
                  <input
                    type="number"
                    id="loginAttempts"
                    min="1"
                    max="10"
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    value={securityForm.loginAttempts}
                    onChange={(e) => setSecurityForm({ ...securityForm, loginAttempts: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-base font-medium">IP Restriction</h4>
                <div className="flex h-5 items-center">
                  <input
                    id="ipRestriction"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={securityForm.ipRestriction}
                    onChange={(e) => setSecurityForm({ ...securityForm, ipRestriction: e.target.checked })}
                  />
                </div>
              </div>
              
              {securityForm.ipRestriction && (
                <div>
                  <label htmlFor="restrictedIps" className="block text-sm font-medium text-gray-700 mb-1">
                    Allowed IP Addresses (one per line)
                  </label>
                  <textarea
                    id="restrictedIps"
                    rows={3}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    value={securityForm.restrictedIpAddresses.join('\n')}
                    onChange={(e) => setSecurityForm({ 
                      ...securityForm, 
                      restrictedIpAddresses: e.target.value.split('\n').filter(ip => ip.trim() !== '') 
                    })}
                    placeholder="192.168.1.1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter IP addresses or CIDR notation (e.g., 192.168.1.0/24)</p>
                </div>
              )}
            </div>
            
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Security Tip</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Enabling two-factor authentication significantly increases the security of your account.
                      We recommend enabling this feature for all administrator accounts.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button
              variant="primary"
              onClick={() => handleSaveSettings('security')}
              isLoading={isLoading}
              disabled={isLoading}
            >
              Save Changes
            </Button>
          </div>
        </div>
      )
    },
    {
      id: 'display',
      label: 'Display',
      content: (
        <div>
          <h3 className="text-lg font-medium mb-4">Display Settings</h3>
          
          <div className="space-y-6">
            <div>
              <h4 className="text-base font-medium mb-2">Theme</h4>
              <div className="grid grid-cols-3 gap-3">
                <div
                  className={`border rounded-lg p-4 flex flex-col items-center cursor-pointer ${
                    displayForm.theme === 'light' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleThemeChange('light')}
                >
                  <div className="w-16 h-16 bg-white border border-gray-200 rounded-lg mb-2"></div>
                  <span className="text-sm font-medium">Light</span>
                </div>
                
                <div
                  className={`border rounded-lg p-4 flex flex-col items-center cursor-pointer ${
                    displayForm.theme === 'dark' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleThemeChange('dark')}
                >
                  <div className="w-16 h-16 bg-gray-800 border border-gray-700 rounded-lg mb-2"></div>
                  <span className="text-sm font-medium">Dark</span>
                </div>
                
                <div
                  className={`border rounded-lg p-4 flex flex-col items-center cursor-pointer ${
                    displayForm.theme === 'system' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleThemeChange('system')}
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-white to-gray-800 border border-gray-200 rounded-lg mb-2"></div>
                  <span className="text-sm font-medium">System</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-base font-medium mb-2">Font Size</h4>
              <div className="grid grid-cols-3 gap-3">
                <div
                  className={`border rounded-lg p-4 flex flex-col items-center cursor-pointer ${
                    displayForm.fontSize === 'small' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setDisplayForm({ ...displayForm, fontSize: 'small' })}
                >
                  <span className="text-sm mb-2">Aa</span>
                  <span className="text-xs font-medium">Small</span>
                </div>
                
                <div
                  className={`border rounded-lg p-4 flex flex-col items-center cursor-pointer ${
                    displayForm.fontSize === 'medium' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setDisplayForm({ ...displayForm, fontSize: 'medium' })}
                >
                  <span className="text-base mb-2">Aa</span>
                  <span className="text-xs font-medium">Medium</span>
                </div>
                
                <div
                  className={`border rounded-lg p-4 flex flex-col items-center cursor-pointer ${
                    displayForm.fontSize === 'large' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setDisplayForm({ ...displayForm, fontSize: 'large' })}
                >
                  <span className="text-lg mb-2">Aa</span>
                  <span className="text-xs font-medium">Large</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-base font-medium mb-2">Color Scheme</h4>
              <div className="grid grid-cols-3 gap-3">
                <div
                  className={`border rounded-lg p-4 flex flex-col items-center cursor-pointer ${
                    displayForm.colorScheme === 'default' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleColorSchemeChange('default')}
                >
                  <div className="w-16 h-8 rounded-lg overflow-hidden mb-2 flex">
                    <div className="w-1/3 h-full bg-blue-500"></div>
                    <div className="w-1/3 h-full bg-green-500"></div>
                    <div className="w-1/3 h-full bg-purple-500"></div>
                  </div>
                  <span className="text-xs font-medium">Default</span>
                </div>
                
                <div
                  className={`border rounded-lg p-4 flex flex-col items-center cursor-pointer ${
                    displayForm.colorScheme === 'high-contrast' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleColorSchemeChange('high-contrast')}
                >
                  <div className="w-16 h-8 rounded-lg overflow-hidden mb-2 flex">
                    <div className="w-1/2 h-full bg-black"></div>
                    <div className="w-1/2 h-full bg-white border"></div>
                  </div>
                  <span className="text-xs font-medium">High Contrast</span>
                </div>
                
                <div
                  className={`border rounded-lg p-4 flex flex-col items-center cursor-pointer ${
                    displayForm.colorScheme === 'custom' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleColorSchemeChange('custom')}
                >
                  <div className="w-16 h-8 rounded-lg overflow-hidden mb-2 border border-gray-200 bg-white flex items-center justify-center">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path>
                    </svg>
                  </div>
                  <span className="text-xs font-medium">Custom</span>
                </div>
              </div>
            </div>
            
            {showCustomColors && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-3">Custom Colors</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="primaryColor" className="block text-xs font-medium text-gray-700 mb-1">
                      Primary Color
                    </label>
                    <input
                      type="color"
                      id="primaryColor"
                      className="block w-full h-8 border border-gray-300 rounded-md"
                      value={displayForm.customColors?.primary || '#3b82f6'}
                      onChange={(e) => setDisplayForm({
                        ...displayForm,
                        customColors: {
                          ...displayForm.customColors,
                          primary: e.target.value
                        }
                      })}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="secondaryColor" className="block text-xs font-medium text-gray-700 mb-1">
                      Secondary Color
                    </label>
                    <input
                      type="color"
                      id="secondaryColor"
                      className="block w-full h-8 border border-gray-300 rounded-md"
                      value={displayForm.customColors?.secondary || '#10b981'}
                      onChange={(e) => setDisplayForm({
                        ...displayForm,
                        customColors: {
                          ...displayForm.customColors,
                          secondary: e.target.value
                        }
                      })}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="accentColor" className="block text-xs font-medium text-gray-700 mb-1">
                      Accent Color
                    </label>
                    <input
                      type="color"
                      id="accentColor"
                      className="block w-full h-8 border border-gray-300 rounded-md"
                      value={displayForm.customColors?.accent || '#8b5cf6'}
                      onChange={(e) => setDisplayForm({
                        ...displayForm,
                        customColors: {
                          ...displayForm.customColors,
                          accent: e.target.value
                        }
                      })}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="backgroundColor" className="block text-xs font-medium text-gray-700 mb-1">
                      Background Color
                    </label>
                    <input
                      type="color"
                      id="backgroundColor"
                      className="block w-full h-8 border border-gray-300 rounded-md"
                      value={displayForm.customColors?.background || '#ffffff'}
                      onChange={(e) => setDisplayForm({
                        ...displayForm,
                        customColors: {
                          ...displayForm.customColors,
                          background: e.target.value
                        }
                      })}
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Compact Mode</p>
                  <p className="text-xs text-gray-500">Reduce padding and spacing for denser layouts</p>
                </div>
                <div className="flex h-5 items-center">
                  <input
                    id="compactMode"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={displayForm.compactMode}
                    onChange={(e) => setDisplayForm({ ...displayForm, compactMode: e.target.checked })}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Show Tips</p>
                  <p className="text-xs text-gray-500">Display helpful tips and hints throughout the interface</p>
                </div>
                <div className="flex h-5 items-center">
                  <input
                    id="showTips"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={displayForm.showTips}
                    onChange={(e) => setDisplayForm({ ...displayForm, showTips: e.target.checked })}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button
              variant="primary"
              onClick={() => handleSaveSettings('display')}
              isLoading={isLoading}
              disabled={isLoading}
            >
              Save Changes
            </Button>
          </div>
        </div>
      )
    },
    {
      id: 'integrations',
      label: 'Integrations',
      content: (
        <div>
          <h3 className="text-lg font-medium mb-4">Integrations & Connected Apps</h3>
          
          <div className="space-y-6">
            {settings.integrations.connectedApps.map(app => (
              <div key={app.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-lg font-medium">{app.name}</h4>
                    {app.connected && app.lastSync && (
                      <p className="text-sm text-gray-500">
                        Last synced: {new Date(app.lastSync).toLocaleString()}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    variant={app.connected ? 'danger' : 'primary'}
                    size="small"
                    onClick={() => handleAppConnectionToggle(app.id, app.connected)}
                    isLoading={isLoading}
                    disabled={isLoading}
                  >
                    {app.connected ? 'Disconnect' : 'Connect'}
                  </Button>
                </div>
                
                {app.connected && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-1">Permissions:</p>
                    <div className="flex flex-wrap gap-2">
                      {app.permissions.map((permission, index) => (
                        <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {permission}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {settings.integrations.connectedApps.length === 0 && (
              <div className="text-center py-8 border rounded-lg">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No connected apps</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No applications are currently connected to your account.
                </p>
              </div>
            )}
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">About Connected Apps</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Connected apps can access certain information from your account based on the permissions you grant.
                      You can disconnect an app at any time to revoke its access to your data.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="settings-page">
      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
        />
      )}
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Customize your experience and manage your account</p>
      </div>
      
      <Card>
        <Tabs
          tabs={tabs}
          defaultTabId="general"
          onChange={(tabId) => setActiveTab(tabId as keyof SettingsData)}
        />
      </Card>
    </div>
  );
};
