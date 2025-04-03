// src/frontend/components/DocumentUpload/DocumentUpload.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentUpload from './DocumentUpload';

// Mock the dropzone hook
jest.mock('react-dropzone', () => ({
  useDropzone: () => ({
    getRootProps: () => ({
      onClick: jest.fn(),
    }),
    getInputProps: () => ({
      accept: 'pdf',
      multiple: true,
    }),
    isDragActive: false,
  }),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Upload: () => <div data-testid="upload-icon">Upload Icon</div>,
  File: () => <div data-testid="file-icon">File Icon</div>,
  AlertCircle: () => <div data-testid="alert-circle-icon">Alert Circle Icon</div>,
  Check: () => <div data-testid="check-icon">Check Icon</div>,
  X: () => <div data-testid="x-icon">X Icon</div>,
  Loader: () => <div data-testid="loader-icon">Loader Icon</div>,
  FileText: () => <div data-testid="file-text-icon">File Text Icon</div>,
}));

// Mock document upload service
jest.mock('./documentUploadService', () => ({
  uploadDocument: jest.fn().mockImplementation((file, organizationId, onProgress) => {
    // Simulate progress updates
    setTimeout(() => onProgress(50, 'uploading'), 100);
    setTimeout(() => onProgress(100, 'uploading'), 200);
    setTimeout(() => onProgress(30, 'Extracting content'), 300);
    setTimeout(() => onProgress(100, 'Processing completed'), 400);
    
    // Return mock result
    return Promise.resolve({
      documentId: 'test-doc-id',
      status: 'completed',
      summary: 'Test summary',
      autoTags: ['tag1', 'tag2'],
      qualityAssessment: {
        completenessScore: 0.87,
        consistencyScore: 0.92,
        regulatoryComplianceScore: 0.95,
        overallConfidence: 0.91,
      },
    });
  }),
}));

describe('DocumentUpload Component', () => {
  const defaultProps = {
    organizationId: 'org-123',
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders the upload component initially', () => {
    render(<DocumentUpload {...defaultProps} />);
    
    expect(screen.getByText('Document Upload')).toBeInTheDocument();
    expect(screen.getByText(/Drag and drop files here/i)).toBeInTheDocument();
    expect(screen.getByText(/or browse to select files/i)).toBeInTheDocument();
  });
  
  it('displays supportedFileTypes in the description', () => {
    const supportedTypes = ['.pdf', '.docx'];
    render(<DocumentUpload {...defaultProps} supportedFileTypes={supportedTypes} />);
    
    expect(screen.getByText(/Supported formats:/i)).toBeInTheDocument();
    expect(screen.getByText(/\.pdf, \.docx/i)).toBeInTheDocument();
  });
  
  it('displays maximum file size information', () => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    render(<DocumentUpload {...defaultProps} maxFileSize={maxSize} />);
    
    expect(screen.getByText(/Maximum file size: 5 MB/i)).toBeInTheDocument();
  });
  
  it('displays maximum number of files information', () => {
    const maxFiles = 3;
    render(<DocumentUpload {...defaultProps} maxFiles={maxFiles} />);
    
    expect(screen.getByText(/Up to 3 files can be uploaded at once/i)).toBeInTheDocument();
  });
  
  it('handles file selection through the browse button', async () => {
    render(<DocumentUpload {...defaultProps} />);
    
    // Create a test file
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    
    // Get the hidden file input
    const input = screen.getByRole('button', { name: /browse/i });
    
    // Simulate clicking the browse text
    userEvent.click(input);
    
    // This would normally trigger the file dialog, but we can't test that directly
    // Instead, we can verify that the click handler was called
    expect(input).toHaveBeenCalledTimes(1);
  });
  
  it('shows the results tab after uploading files', async () => {
    render(<DocumentUpload {...defaultProps} />);
    
    // Switch to results tab
    const resultsTab = screen.getByRole('tab', { name: /results/i });
    userEvent.click(resultsTab);
    
    // Verify empty state
    expect(screen.getByText(/No documents have been uploaded yet/i)).toBeInTheDocument();
    
    // Switch back to upload tab
    const uploadTab = screen.getByRole('tab', { name: /upload/i });
    userEvent.click(uploadTab);
    
    // Simulate file upload (this is a simplification; in real testing we'd need to mock more)
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    await act(async () => {
      // Directly call the onDrop function that useDropzone would normally provide
      // We'd need access to the component's internal state for this in a real test
      // This is just an illustration
    });
    
    // Wait for processing to complete and UI to update
    await waitFor(() => {
      expect(screen.getByText(/View Results/i)).not.toBeDisabled();
    });
    
    // Click view results
    userEvent.click(screen.getByText(/View Results/i));
    
    // Verify results are shown
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  // Additional tests would include:
  // - Testing error handling when files are too large
  // - Testing batch uploads
  // - Testing removal of files
  // - Testing retry functionality
  // - Testing the reset button
  // - Testing the advanced features display
});
