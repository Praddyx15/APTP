// src/frontend/components/reports/ReportGenerator.tsx
import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { Input } from '../ui/Input';
import { DataTable, Column } from '../ui/DataTable';

// Types
export enum ReportType {
  TRAINEE_PERFORMANCE = 'trainee_performance',
  PROGRAM_EFFECTIVENESS = 'program_effectiveness',
  COMPLIANCE_STATUS = 'compliance_status',
  INSTRUCTOR_ACTIVITY = 'instructor_activity',
  SIMULATOR_USAGE = 'simulator_usage',
  CUSTOM = 'custom'
}

export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  HTML = 'html'
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: ReportType;
  createdBy: string;
  createdAt: Date;
  lastModified?: Date;
  isSystem: boolean;
  sections: ReportSection[];
  filters: ReportFilter[];
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'table' | 'chart' | 'text' | 'metrics';
  content: any;
  sortOrder: number;
}

export interface ReportFilter {
  id: string;
  name: string;
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in';
  defaultValue?: any;
  options?: string[];
  required: boolean;
}

export interface ReportHistory {
  id: string;
  name: string;
  type: ReportType;
  generatedBy: string;
  generatedAt: Date;
  format: ReportFormat;
  filters: Record<string, any>;
  size: number;
  downloadUrl: string;
}

// Report Generator Component
interface ReportGeneratorProps {
  templates: ReportTemplate[];
  reportHistory: ReportHistory[];
  availablePrograms: { id: string; name: string }[];
  availableTrainees: { id: string; name: string }[];
  availableInstructors: { id: string; name: string }[];
  onGenerateReport: (templateId: string, filters: Record<string, any>, format: ReportFormat) => Promise<string>;
  onDownloadReport: (reportId: string) => Promise<void>;
  onDeleteReport: (reportId: string) => Promise<void>;
  onSaveTemplate: (template: Partial<ReportTemplate>) => Promise<string>;
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  templates,
  reportHistory,
  availablePrograms,
  availableTrainees,
  availableInstructors,
  onGenerateReport,
  onDownloadReport,
  onDeleteReport,
  onSaveTemplate
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [reportFilters, setReportFilters] = useState<Record<string, any>>({});
  const [reportFormat, setReportFormat] = useState<ReportFormat>(ReportFormat.PDF);
  const [reportName, setReportName] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<{type: 'success' | 'error'; message: string} | null>(null);

  // Handle template selection
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId) || null;
    setSelectedTemplate(template);
    
    // Initialize filters with default values
    if (template) {
      const initialFilters: Record<string, any> = {};
      template.filters.forEach(filter => {
        if (filter.defaultValue !== undefined) {
          initialFilters[filter.field] = filter.defaultValue;
        }
      });
      setReportFilters(initialFilters);
      
      // Set default report name
      setReportName(`${template.name} - ${new Date().toLocaleDateString()}`);
    } else {
      setReportFilters({});
      setReportName('');
    }
  };

  // Handle filter change
  const handleFilterChange = (field: string, value: any) => {
    setReportFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Check if all required filters are set
  const areRequiredFiltersSet = () => {
    if (!selectedTemplate) return false;
    
    return selectedTemplate.filters
      .filter(filter => filter.required)
      .every(filter => {
        const value = reportFilters[filter.field];
        return value !== undefined && value !== null && value !== '';
      });
  };

  // Handle report generation
  const handleGenerateReport = async () => {
    if (!selectedTemplate || !areRequiredFiltersSet()) {
      setAlertMessage({
        type: 'error',
        message: 'Please fill all required filters before generating the report.'
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const reportId = await onGenerateReport(selectedTemplate.id, reportFilters, reportFormat);
      
      setAlertMessage({
        type: 'success',
        message: 'Report generated successfully. You can download it from the history tab.'
      });
      
      // Reset form
      setSelectedTemplateId('');
      setSelectedTemplate(null);
      setReportFilters({});
      setReportName('');
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get template type display name
  const getTemplateTypeName = (type: ReportType): string => {
    switch (type) {
      case ReportType.TRAINEE_PERFORMANCE:
        return 'Trainee Performance';
      case ReportType.PROGRAM_EFFECTIVENESS:
        return 'Program Effectiveness';
      case ReportType.COMPLIANCE_STATUS:
        return 'Compliance Status';
      case ReportType.INSTRUCTOR_ACTIVITY:
        return 'Instructor Activity';
      case ReportType.SIMULATOR_USAGE:
        return 'Simulator Usage';
      case ReportType.CUSTOM:
        return 'Custom Report';
      default:
        return type;
    }
  };

  // Report history table columns
  const historyColumns: Column<ReportHistory>[] = [
    {
      key: 'name',
      header: 'Report Name',
      render: (report) => report.name,
      sortable: true
    },
    {
      key: 'type',
      header: 'Type',
      render: (report) => getTemplateTypeName(report.type),
      sortable: true
    },
    {
      key: 'generatedAt',
      header: 'Generated',
      render: (report) => new Date(report.generatedAt).toLocaleString(),
      sortable: true
    },
    {
      key: 'generatedBy',
      header: 'Generated By',
      render: (report) => report.generatedBy,
      sortable: true
    },
    {
      key: 'format',
      header: 'Format',
      render: (report) => report.format.toUpperCase(),
      sortable: true
    },
    {
      key: 'size',
      header: 'Size',
      render: (report) => formatFileSize(report.size),
      sortable: true
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (report) => (
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownloadReport(report.id);
            }}
            className="text-blue-600 hover:text-blue-900"
            title="Download"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteReport(report.id);
            }}
            className="text-red-600 hover:text-red-900"
            title="Delete"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      )
    }
  ];

  // Render filter input based on filter type
  const renderFilterInput = (filter: ReportFilter) => {
    const value = reportFilters[filter.field] || '';
    
    switch (filter.field) {
      case 'programId':
        return (
          <select
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={value}
            onChange={(e) => handleFilterChange(filter.field, e.target.value)}
          >
            <option value="">Select Program</option>
            {availablePrograms.map(program => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>
        );
      case 'traineeId':
        return (
          <select
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={value}
            onChange={(e) => handleFilterChange(filter.field, e.target.value)}
          >
            <option value="">Select Trainee</option>
            {availableTrainees.map(trainee => (
              <option key={trainee.id} value={trainee.id}>
                {trainee.name}
              </option>
            ))}
          </select>
        );
      case 'instructorId':
        return (
          <select
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={value}
            onChange={(e) => handleFilterChange(filter.field, e.target.value)}
          >
            <option value="">Select Instructor</option>
            {availableInstructors.map(instructor => (
              <option key={instructor.id} value={instructor.id}>
                {instructor.name}
              </option>
            ))}
          </select>
        );
      case 'dateRange':
        return (
          <div className="flex space-x-2">
            <input
              type="date"
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={value.start || ''}
              onChange={(e) => handleFilterChange(filter.field, { ...value, start: e.target.value })}
            />
            <input
              type="date"
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={value.end || ''}
              onChange={(e) => handleFilterChange(filter.field, { ...value, end: e.target.value })}
            />
          </div>
        );
      case 'status':
        return (
          <select
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={value}
            onChange={(e) => handleFilterChange(filter.field, e.target.value)}
          >
            <option value="">Select Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="on_hold">On Hold</option>
          </select>
        );
      default:
        if (filter.options && filter.options.length > 0) {
          return (
            <select
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={value}
              onChange={(e) => handleFilterChange(filter.field, e.target.value)}
            >
              <option value="">Select {filter.name}</option>
              {filter.options.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          );
        }
        
        return (
          <input
            type="text"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={value}
            onChange={(e) => handleFilterChange(filter.field, e.target.value)}
            placeholder={`Enter ${filter.name}`}
          />
        );
    }
  };

  return (
    <div className="report-generator">
      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
        />
      )}
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Report Generator</h1>
        <p className="text-gray-500">Generate custom reports from training data</p>
      </div>
      
      <div className="mb-6">
        <Card>
          <div className="mb-4">
            <h2 className="text-lg font-medium">Generate New Report</h2>
          </div>
          
          <div className="mb-4">
            <label htmlFor="report-template" className="block text-sm font-medium text-gray-700 mb-1">
              Report Template
            </label>
            <select
              id="report-template"
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
            >
              <option value="">Select a template</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name} ({getTemplateTypeName(template.type)})
                </option>
              ))}
            </select>
          </div>
          
          {selectedTemplate && (
            <>
              <div className="mb-4">
                <Input
                  label="Report Name"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Format
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.values(ReportFormat).map(format => (
                    <button
                      key={format}
                      type="button"
                      className={`px-3 py-2 text-sm font-medium rounded ${
                        reportFormat === format
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      onClick={() => setReportFormat(format)}
                    >
                      {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              
              {selectedTemplate.filters.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-base font-medium mb-2">Filters</h3>
                  <div className="space-y-4">
                    {selectedTemplate.filters.map(filter => (
                      <div key={filter.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {filter.name}{filter.required ? ' *' : ''}
                        </label>
                        {renderFilterInput(filter)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mb-4">
                <h3 className="text-base font-medium mb-2">Report Sections</h3>
                <div className="space-y-2">
                  {selectedTemplate.sections
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map(section => (
                      <div key={section.id} className="p-3 border rounded-md">
                        <h4 className="font-medium">{section.title}</h4>
                        <p className="text-sm text-gray-500 capitalize">{section.type}</p>
                      </div>
                    ))}
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  onClick={handleGenerateReport}
                  isLoading={isGenerating}
                  disabled={isGenerating || !areRequiredFiltersSet() || !reportName}
                >
                  Generate Report
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
      
      <div>
        <Card>
          <div className="mb-4">
            <h2 className="text-lg font-medium">Report History</h2>
          </div>
          
          {reportHistory.length > 0 ? (
            <DataTable
              columns={historyColumns}
              data={reportHistory}
              keyExtractor={(report) => report.id}
              onRowClick={(report) => onDownloadReport(report.id)}
              pagination={{
                pageSize: 10,
                totalItems: reportHistory.length,
                currentPage: 1,
                onPageChange: () => {}
              }}
            />
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p>No reports have been generated yet.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
