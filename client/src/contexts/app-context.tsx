import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { 
  TrainingProgram, 
  Session, 
  Assessment,
  Resource,
  Notification,
  User 
} from '@shared/schema';

interface AppContextType {
  // Active section and selection management
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedProgramId: number | null;
  setSelectedProgramId: (id: number | null) => void;
  selectedSessionId: number | null;
  setSelectedSessionId: (id: number | null) => void;
  isCreatingSession: boolean;
  setIsCreatingSession: (isCreating: boolean) => void;
  isEditingAssessment: boolean;
  setIsEditingAssessment: (isEditing: boolean) => void;
  editedAssessment: Assessment | null;
  setEditedAssessment: (assessment: Assessment | null) => void;
  
  // Search query state
  searchQuery: string;
  handleSearchChange: (query: string) => void;

  // Data state
  programs: TrainingProgram[];
  sessions: (Session & { trainees: number[] })[];
  assessments: Assessment[];
  resources: Resource[];
  notifications: Notification[];
  isLoadingPrograms: boolean;
  isLoadingSessions: boolean;
  isLoadingAssessments: boolean;
  isLoadingTrainees: boolean;
  isLoadingResources: boolean;
  isLoadingDocuments: boolean;
  refreshSessions: () => void;
  
  // Action handlers
  handleProgramSelect: (programId: number) => void;
  handleSessionSelect: (sessionId: number) => void;
  handleCreateSession: () => void;
  handleCreateProgram: () => void;
  handleCreateAssessment: () => void;
  handleEditAssessment: (assessmentId: number) => void;
  clearSelectedProgram: () => void;
  closeSessionDetail: () => void;
  cancelSessionCreation: () => void;
  cancelAssessmentEdit: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();

  // State for active tab and selections
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isEditingAssessment, setIsEditingAssessment] = useState(false);
  const [editedAssessment, setEditedAssessment] = useState<Assessment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch programs
  const { 
    data: programs = [], 
    isLoading: isLoadingPrograms,
    refetch: refreshPrograms
  } = useQuery<TrainingProgram[]>({
    queryKey: ['/api/programs'],
    enabled: !!user,
  });

  // Fetch sessions
  const { 
    data: sessions = [], 
    isLoading: isLoadingSessions,
    refetch: refreshSessions
  } = useQuery<(Session & { trainees: number[] })[]>({
    queryKey: ['/api/sessions'],
    enabled: !!user,
  });

  // Fetch assessments
  const { 
    data: assessments = [], 
    isLoading: isLoadingAssessments,
    refetch: refreshAssessments
  } = useQuery<Assessment[]>({
    queryKey: ['/api/protected/assessments'],
    enabled: !!user,
  });

  // Fetch trainees
  const { 
    isLoading: isLoadingTrainees 
  } = useQuery<User[]>({
    queryKey: ['/api/protected/users/trainees'],
    enabled: !!user,
  });

  // Fetch resources
  const { 
    data: resources = [], 
    isLoading: isLoadingResources 
  } = useQuery<Resource[]>({
    queryKey: ['/api/resources'],
    enabled: !!user,
  });

  // Fetch documents
  const { 
    isLoading: isLoadingDocuments 
  } = useQuery({
    queryKey: ['/api/documents'],
    enabled: !!user,
  });

  // Fetch notifications
  const { 
    data: notifications = [] 
  } = useQuery<Notification[]>({
    queryKey: ['/api/protected/notifications'],
    enabled: !!user,
  });

  // Handle search query change
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  // Handler functions
  const handleProgramSelect = (programId: number) => {
    setSelectedProgramId(programId);
    setActiveTab('programs');
  };

  const clearSelectedProgram = () => {
    setSelectedProgramId(null);
  };

  const handleSessionSelect = (sessionId: number) => {
    setSelectedSessionId(sessionId);
    setActiveTab('sessions');
  };

  const closeSessionDetail = () => {
    setSelectedSessionId(null);
  };

  const handleCreateSession = () => {
    setIsCreatingSession(true);
    setActiveTab('sessions');
  };

  const cancelSessionCreation = () => {
    setIsCreatingSession(false);
  };

  const handleCreateProgram = () => {
    toast({
      title: "Create Program",
      description: "Program creation functionality will be implemented soon.",
    });
  };

  const handleCreateAssessment = () => {
    setIsEditingAssessment(true);
    setEditedAssessment(null);
  };

  const handleEditAssessment = (assessmentId: number) => {
    const assessment = assessments.find(a => a.id === assessmentId);
    if (assessment) {
      setEditedAssessment(assessment);
      setIsEditingAssessment(true);
    }
  };

  const cancelAssessmentEdit = () => {
    setIsEditingAssessment(false);
    setEditedAssessment(null);
  };

  return (
    <AppContext.Provider value={{
      activeTab,
      setActiveTab,
      selectedProgramId,
      setSelectedProgramId,
      selectedSessionId,
      setSelectedSessionId,
      isCreatingSession,
      setIsCreatingSession,
      isEditingAssessment,
      setIsEditingAssessment,
      editedAssessment,
      setEditedAssessment,
      searchQuery,
      handleSearchChange,
      programs,
      sessions,
      assessments,
      resources,
      notifications,
      isLoadingPrograms,
      isLoadingSessions,
      isLoadingAssessments,
      isLoadingTrainees,
      isLoadingResources,
      isLoadingDocuments,
      refreshSessions,
      handleProgramSelect,
      handleSessionSelect,
      handleCreateSession,
      handleCreateProgram,
      handleCreateAssessment,
      handleEditAssessment,
      clearSelectedProgram,
      closeSessionDetail,
      cancelSessionCreation,
      cancelAssessmentEdit
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
