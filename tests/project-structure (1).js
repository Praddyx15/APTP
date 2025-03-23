# Frontend Project Structure for Advanced Pilot Training Platform

/advanced-pilot-training-platform
  /frontend
    /components
      /ui                    # Base UI components
        Button.tsx
        Input.tsx
        Select.tsx
        Modal.tsx
        Notification.tsx
      /forms                 # Form components
        FormBuilder.tsx
        ValidationSchema.ts
      /data-visualization    # Charts and data display
        Chart.tsx
        DataTable.tsx
        PerformanceGraph.tsx
        SimulatorTelemetry.tsx
      /syllabus              # Syllabus builder components
        SyllabusBuilder.tsx
        ModuleCard.tsx
        LessonEditor.tsx
        ComplianceIndicator.tsx
      /documents             # Document management
        DocumentUploader.tsx
        DocumentViewer.tsx
        ProcessingStatus.tsx
      /assessment            # Assessment interface
        GradingForm.tsx
        CompetencyMatrix.tsx
        PerformanceTrend.tsx
        BiometricDisplay.tsx
      /analytics             # Analytics dashboard
        DashboardLayout.tsx
        KPIWidget.tsx
        TraineePerformance.tsx
        FleetOverview.tsx
      /collaboration         # Collaboration tools
        Workspace.tsx
        ChatInterface.tsx
        VideoConference.tsx
        TaskManager.tsx
      /visualizations        # 3D/AR visualizations
        ThreeDViewer.tsx
        AROverlay.tsx
        KnowledgeMap.tsx
    /pages                   # Next.js pages
      index.tsx
      login.tsx
      dashboard.tsx
      syllabus/index.tsx
      syllabus/[id].tsx
      documents/index.tsx
      documents/[id].tsx
      assessment/index.tsx
      assessment/[id].tsx
      analytics/index.tsx
      profile/[id].tsx
      settings.tsx
      collaboration/workspace/[id].tsx
    /hooks                   # Custom React hooks
      useAuth.ts
      useDocuments.ts
      useSyllabus.ts
      useAssessment.ts
      useAnalytics.ts
      useRealtime.ts
      useOffline.ts
    /services                # API integrations
      api.ts                 # Base API configuration
      authService.ts
      documentService.ts
      syllabusService.ts
      assessmentService.ts
      schedulerService.ts
      analyticsService.ts
      collaborationService.ts
    /store                   # State management
      index.ts
      authSlice.ts
      documentSlice.ts
      syllabusSlice.ts
      assessmentSlice.ts
      uiSlice.ts
    /styles                  # Styling
      globals.css
      theme.ts
      tailwind.config.js
    /utils                   # Utility functions
      formatters.ts
      validators.ts
      errorHandlers.ts
      dataTransformers.ts
    /assets                  # Static assets
      /images
      /icons
      /3d-models
    /public                  # Public assets
    next.config.js           # Next.js configuration
    package.json             # Dependencies and scripts
    tsconfig.json            # TypeScript configuration
    .eslintrc.js             # ESLint configuration
    jest.config.js           # Jest configuration
    cypress.config.js        # Cypress configuration
