# Advanced Pilot Training Platform

A comprehensive aviation training platform that leverages advanced technology to streamline educational workflows, document management, and performance tracking across multiple user roles.

![60 Minutes Aviation Logo](/public/images/logo.png)

## Overview

The Advanced Pilot Training Platform is a modern web application designed specifically for Approved Training Organizations (ATOs) and Airlines to manage their pilot training programs with cutting-edge technology. The platform features multi-role authentication, intelligent document processing, knowledge graph visualization, and comprehensive training program management.

## Key Features

### Core Framework
- **Multi-Role Authentication System**: Supports different user roles (Admin, ATO Administrator, Instructor, Examiner, Trainee) with role-specific dashboards and permissions
- **Organization Type Management**: Separate interfaces for ATOs and Airlines with customized workflows
- **Responsive Design**: Mobile-friendly interface built with Tailwind CSS and Shadcn/UI components

### Document Management System
- **OCR Processing**: Extract text from scanned documents and images using Tesseract.js
- **Document Analysis**: Identify entities, references, and create summaries from documents
- **Knowledge Graph Visualization**: Interactive visualization of interconnected aviation concepts
- **Syllabus Generation**: AI-powered creation of training programs from uploaded documents

### Training Program Management
- **Curriculum Builder**: Create and customize training modules and lessons
- **Session Management**: Schedule and track training sessions and assessments
- **Trainee Progress Tracking**: Monitor student performance and compliance
- **Resource Management**: Manage training resources, aircraft, and simulators

## Technology Stack

### Frontend
- React with TypeScript
- Tailwind CSS
- Shadcn/UI component library
- TanStack React Query for data fetching
- Wouter for routing
- D3.js for data visualization

### Backend
- Node.js with Express
- TypeScript
- Drizzle ORM
- PostgreSQL database
- Zod for schema validation
- Passport.js for authentication

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL database (optional, in-memory storage available for development)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Praddyx15/Advanced-Pilot-Training-Platform.git
cd advanced-pilot-training-platform
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Access the application at:
```
http://localhost:5000
```

### Deployment

#### Vercel Deployment

1. Create a Vercel account and install the Vercel CLI:
```bash
npm install -g vercel
```

2. Log in to Vercel:
```bash
vercel login
```

3. Deploy to Vercel:
```bash
vercel
```

4. For production deployment:
```bash
vercel --prod
```

5. Set up environment variables in the Vercel dashboard:
   - `SESSION_SECRET`: A secure random string for session management
   - `NODE_ENV`: Set to "production"

The project includes the following deployment optimizations:
- Custom build script that handles both client and server compilation
- WebSocket configuration for Vercel deployment
- Optimized memory store for session management
- Enhanced API route handling in serverless environment

## User Accounts for Testing

### Admin
- Username: admin
- Password: Admin@123

### ATO Users
- Instructor: ato_airline | Password: ATO@airline123
- Examiner: examiner | Password: Examiner@123
- Student: atostudent | Password: Student@123

### Airline Users
- Instructor: airline | Password: Airline@123
- Student: student | Password: Student@123
- Student (alt): student2 | Password: Student@123

## Project Structure

- `/client`: Frontend React application
  - `/src/components`: Reusable UI components
  - `/src/hooks`: Custom React hooks
  - `/src/pages`: Application pages
  - `/src/contexts`: React context providers
  - `/src/lib`: Utility functions and helpers

- `/server`: Backend Express server
  - `/routes`: API route definitions
  - `/services`: Business logic services
  - `/api`: API version management

- `/shared`: Shared code between frontend and backend
  - `schema.ts`: Database schema definitions with Drizzle and Zod

## Features In Detail

### Document Processor

The Document Processor consists of four main tabs:

1. **OCR Processing**: Upload and process documents to extract text using Tesseract.js with support for multiple languages.

2. **Document Analysis**: Analyze documents to extract entities, identify regulatory references, and generate summaries.

3. **Syllabus Generation**: Create training programs from documents with AI-powered extraction of modules, lessons, and competencies.

4. **Knowledge Graph**: Visualize the relationships between aviation concepts extracted from documents.

### Role-Based Dashboards

- **Admin Dashboard**: System-wide metrics, user management, and configuration
- **ATO Dashboard**: Training program management, compliance tracking, and resource allocation
- **Instructor Dashboard**: Session management, student progress tracking, and grading
- **Examiner Dashboard**: Assessment management and certification tracking
- **Trainee Dashboard**: Personal progress, upcoming sessions, and learning resources

### Implementation Status

#### Completed Features
- ✅ Authentication and User Management
- ✅ UI/Navigation features
- ✅ Dashboard visualizations
- ✅ Syllabus generation system
- ✅ Document management and analysis
- ✅ Training program management
- ✅ Assessment and grading functionality
- ✅ Knowledge graph visualization
- ✅ Calendar/scheduling system
- ✅ Performance metrics and analytics

#### Pending Features
- ❌ Messaging and notification system: This feature is still pending implementation.
- ❌ Resources management and sharing: This feature is still pending implementation.
- ❌ Achievements and gamification features: This feature is still pending implementation.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- 60 Minutes Aviation for project requirements and domain expertise
- The open-source community for the amazing tools and libraries used in this project