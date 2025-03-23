// pages/dashboard.tsx
import { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import DashboardLayout from '../components/analytics/DashboardLayout';
import SyllabusBuilder from '../components/syllabus/SyllabusBuilder';
import DocumentUploader from '../components/documents/DocumentUploader';
import GradingForm from '../components/assessment/GradingForm';
import Button from '../components/ui/Button';
import analyticsService, { KpiMetric } from '../services/analyticsService';
import syllabusService, { Syllabus } from '../services/syllabusService';
import assessmentService, { AssessmentItem } from '../services/assessmentService';

const Dashboard: NextPage = () => {
  // State for active section
  const [activeSection, setActiveSection] = useState<'analytics' | 'syllabus' | 'documents' | 'assessment'>('analytics');
  
  // Analytics state
  const [kpis, setKpis] = useState<KpiMetric[]>([]);
  
  // Syllabus state
  const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
  const [selectedSyllabusId, setSelectedSyllabusId] = useState<string | null>(null);
  
  // Assessment state
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  
  // Loading states
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(true);
  const [syllabusLoading, setSyllabusLoading] = useState<boolean>(true);
  const [assessmentLoading, setAssessmentLoading] = useState<boolean>(true);
  
  // Error states
  const [error, setError] = useState<string | null>(null);
  
  // Load initial data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Load KPIs for analytics
        setAnalyticsLoading(true);
        const kpiData = await analyticsService.getKpiMetrics();
        setKpis(kpiData);
        setAnalyticsLoading(false);
        
        // Load syllabi
        setSyllabusLoading(true);
        const syllabiData = await syllabusService.getAllSyllabi();
        setSyllabi(syllabiData);
        setSyllabusLoading(false);
        
        // Load assessments
        setAssessmentLoading(true);
        const { assessments: assessmentsData } = await assessmentService.getAllAssessments(
          undefined, // status
          undefined, // traineeId
          undefined, // instructorId
          undefined, // from
          undefined, // to
          5,        // limit
          0         // offset
        );
        setAssessments(assessmentsData);
        setAssessmentLoading(false);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
        setAnalyticsLoading(false);
        setSyllabusLoading(false);
        setAssessmentLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  // Handle syllabus save
  const handleSyllabusSave = (syllabus: Syllabus) => {
    // Update syllabi list with the new/updated syllabus
    setSyllabi(prevSyllabi => {
      const index = prevSyllabi.findIndex(s => s.id === syllabus.id);
      if (index >= 0) {
        // Update existing syllabus
        const updated = [...prevSyllabi];
        updated[index] = syllabus;
        return updated;
      } else {
        // Add new syllabus
        return [...prevSyllabi, syllabus];
      }
    });
    
    // Reset selection
    setSelectedSyllabusId(null);
  };
  
  // Handle assessment completion
  const handleAssessmentComplete = (assessment: AssessmentItem) => {
    // Update assessments list with the completed assessment
    setAssessments(prevAssessments => {
      const index = prevAssessments.findIndex(a => a.id === assessment.id);
      if (index >= 0) {
        // Update existing assessment
        const updated = [...prevAssessments];
        updated[index] = assessment;
        return updated;
      } else {
        // Add new assessment
        return [...prevAssessments, assessment];
      }
    });
    
    // Reset selection
    setSelectedAssessmentId(null);
  };
  
  return (
    <>
      <Head>
        <title>Dashboard | Advanced Pilot Training Platform</title>
        <meta name="description" content="Dashboard for the Advanced Pilot Training Platform" />
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <h1 className="text-xl font-bold text-blue-600">Advanced Pilot Training Platform</h1>
                </div>
                <nav className="ml-6 flex space-x-8">
                  <button
                    onClick={() => setActiveSection('analytics')}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      activeSection === 'analytics'
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    Analytics
                  </button>
                  <button
                    onClick={() => setActiveSection('syllabus')}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      activeSection === 'syllabus'
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    Syllabus
                  </button>
                  <button
                    onClick={() => setActiveSection('documents')}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      activeSection === 'documents'
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    Documents
                  </button>
                  <button
                    onClick={() => setActiveSection('assessment')}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      activeSection === 'assessment'
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    Assessment
                  </button>
                </nav>
              </div>
              <div className="flex items-center">
                <div className="ml-4 flex items-center md:ml-6">
                  <button
                    type="button"
                    className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <span className="sr-only">View notifications</span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-6 w-6" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={1.5} 
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
                      />
                    </svg>
                  </button>
                  
                  {/* Profile dropdown */}
                  <div className="ml-3 relative">
                    <div>
                      <button
                        type="button"
                        className="max-w-xs bg-white flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        id="user-menu-button"
                      >
                        <span className="sr-only">Open user menu</span>
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-semibold">
                          JD
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>
        
        {/* Main content */}
        <main className="py-6">
          {/* Error message */}
          {error && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
              <div className="bg-red-50 p-4 rounded-md text-red-700">
                {error}
                <button
                  onClick={() => setError(null)}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
          
          {/* Analytics section */}
          {activeSection === 'analytics' && (
            <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
              <DashboardLayout />
            </div>
          )}
          
          {/* Syllabus section */}
          {activeSection === 'syllabus' && (
            <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
              {selectedSyllabusId ? (
                <SyllabusBuilder
                  syllabusId={selectedSyllabusId}
                  onSave={handleSyllabusSave}
                  onCancel={() => setSelectedSyllabusId(null)}
                />
              ) : (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                    <h2 className="text-lg font-medium text-gray-900">Training Syllabi</h2>
                    <Button 
                      variant="primary"
                      onClick={() => setSelectedSyllabusId('')} // Empty string for new syllabus
                    >
                      Create New Syllabus
                    </Button>
                  </div>
                  <div className="border-t border-gray-200">
                    {syllabusLoading ? (
                      <div className="p-6 flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                      </div>
                    ) : syllabi.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        <p>No syllabi found. Create your first syllabus to get started.</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-200">
                        {syllabi.map((syllabus) => (
                          <li key={syllabus.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => setSelectedSyllabusId(syllabus.id)}
                                className="text-left"
                              >
                                <p className="text-sm font-medium text-blue-600 truncate">{syllabus.title}</p>
                                <p className="text-sm text-gray-500 truncate">{syllabus.description}</p>
                              </button>
                              <div className="ml-2 flex-shrink-0 flex">
                                <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  v{syllabus.version}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 sm:flex sm:justify-between">
                              <div className="sm:flex">
                                <p className="flex items-center text-sm text-gray-500">
                                  {syllabus.modules.length} modules
                                </p>
                              </div>
                              <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                <p>
                                  Updated {new Date(syllabus.updatedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Documents section */}
          {activeSection === 'documents' && (
            <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6">Document Management</h2>
                <DocumentUploader 
                  onUploadComplete={(documents) => {
                    console.log('Documents uploaded:', documents);
                    // Here you could update some state or show a success message
                  }}
                  onUploadError={(error) => {
                    console.error('Upload error:', error);
                    setError('Failed to upload documents. Please try again.');
                  }}
                />
              </div>
            </div>
          )}
          
          {/* Assessment section */}
          {activeSection === 'assessment' && (
            <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
              {selectedAssessmentId ? (
                <GradingForm
                  assessmentId={selectedAssessmentId}
                  onComplete={handleAssessmentComplete}
                  onCancel={() => setSelectedAssessmentId(null)}
                />
              ) : (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                    <h2 className="text-lg font-medium text-gray-900">Recent Assessments</h2>
                    <Button 
                      variant="primary"
                      onClick={() => {
                        // In a real app, you would open a form to create a new assessment
                        alert('In a complete implementation, this would open a form to create a new assessment');
                      }}
                    >
                      Create New Assessment
                    </Button>
                  </div>
                  <div className="border-t border-gray-200">
                    {assessmentLoading ? (
                      <div className="p-6 flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                      </div>
                    ) : assessments.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        <p>No assessments found. Create your first assessment to get started.</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-200">
                        {assessments.map((assessment) => (
                          <li key={assessment.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => setSelectedAssessmentId(assessment.id)}
                                className="text-left"
                              >
                                <p className="text-sm font-medium text-blue-600 truncate">
                                  {assessment.exerciseName} Assessment
                                </p>
                                <p className="text-sm text-gray-500 truncate">
                                  {assessment.moduleName} &gt; {assessment.lessonName}
                                </p>
                              </button>
                              <div className="ml-2 flex-shrink-0 flex">
                                <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  assessment.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                  assessment.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                  assessment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  assessment.status === 'submitted' ? 'bg-purple-100 text-purple-800' :
                                  assessment.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {assessment.status.replace('_', ' ')}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 sm:flex sm:justify-between">
                              <div className="sm:flex">
                                <p className="flex items-center text-sm text-gray-500">
                                  Trainee: {assessment.traineeName}
                                </p>
                                <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                  Instructor: {assessment.instructorName}
                                </p>
                              </div>
                              <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                <p>
                                  {assessment.completedAt 
                                    ? `Completed ${new Date(assessment.completedAt).toLocaleDateString()}`
                                    : `Created ${new Date(assessment.createdAt).toLocaleDateString()}`
                                  }
                                </p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default Dashboard;
