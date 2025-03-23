// components/document-intelligence/DocumentUploader.tsx
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Box, 
  Typography, 
  Paper, 
  LinearProgress, 
  Chip, 
  Button, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  TextField 
} from '@mui/material';
import { CloudUpload, CheckCircle, Error } from '@mui/icons-material';
import { documentApi } from '@/lib/api/apiClient';

type DocumentType = 'training' | 'regulatory' | 'manual' | 'syllabus' | 'other';

export interface DocumentUploaderProps {
  onUploadComplete: (documentId: string) => void;
  allowedTypes?: string[];
  maxFileSize?: number; // in bytes
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  onUploadComplete,
  allowedTypes = ['.pdf', '.docx', '.xlsx', '.pptx', '.html'],
  maxFileSize = 20 * 1024 * 1024, // 20MB
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('training');
  const [description, setDescription] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    
    if (acceptedFiles.length === 0) {
      return;
    }
    
    const selectedFile = acceptedFiles[0];
    
    // Check file size
    if (selectedFile.size > maxFileSize) {
      setError(`File size exceeds the maximum limit of ${maxFileSize / (1024 * 1024)}MB`);
      return;
    }
    
    setFile(selectedFile);
  }, [maxFileSize]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: allowedTypes.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setProgress(0);
    
    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.random() * 10;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 500);
      
      const result = await documentApi.uploadDocument(file, {
        documentType,
        description: description || undefined,
      });
      
      clearInterval(progressInterval);
      setProgress(100);
      
      // Wait a moment to show 100% before completing
      setTimeout(() => {
        onUploadComplete(result.documentId);
        setUploading(false);
        setFile(null);
        setDescription('');
      }, 500);
      
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload');
      setUploading(false);
    }
  };

  const cancelUpload = () => {
    setFile(null);
    setError(null);
  };

  return (
    <Paper elevation={3} className="p-6">
      <Typography variant="h6" className="mb-4">Upload Document</Typography>
      
      {!file ? (
        <div {...getRootProps()} className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}
        `}>
          <input {...getInputProps()} />
          <CloudUpload className="text-gray-400 text-5xl mb-2" />
          <Typography variant="body1" className="mb-1">
            Drag & drop a document here, or click to select
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Supported formats: {allowedTypes.join(', ')}
          </Typography>
        </div>
      ) : (
        <Box>
          <Box className="flex items-center mb-4">
            <CheckCircle className="text-green-500 mr-2" />
            <Typography variant="body1">{file.name}</Typography>
            <Chip 
              label={`${(file.size / (1024 * 1024)).toFixed(2)} MB`}
              size="small"
              className="ml-2"
            />
          </Box>
          
          <div className="mb-4">
            <FormControl fullWidth className="mb-3">
              <InputLabel id="document-type-label">Document Type</InputLabel>
              <Select
                labelId="document-type-label"
                value={documentType}
                label="Document Type"
                onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                disabled={uploading}
              >
                <MenuItem value="training">Training Document</MenuItem>
                <MenuItem value="regulatory">Regulatory Document</MenuItem>
                <MenuItem value="manual">Aircraft Manual</MenuItem>
                <MenuItem value="syllabus">Syllabus</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="Description (optional)"
              fullWidth
              multiline
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={uploading}
            />
          </div>
          
          {uploading ? (
            <Box>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                className="mb-2"
              />
              <Typography variant="body2" className="text-right">
                {Math.round(progress)}%
              </Typography>
            </Box>
          ) : (
            <Box className="flex gap-3">
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleUpload}
                className="flex-1"
              >
                Upload
              </Button>
              <Button 
                variant="outlined"
                onClick={cancelUpload}
              >
                Cancel
              </Button>
            </Box>
          )}
        </Box>
      )}
      
      {error && (
        <Box className="mt-4 p-3 bg-red-50 text-red-700 rounded-md flex items-center">
          <Error className="mr-2" />
          <Typography variant="body2">{error}</Typography>
        </Box>
      )}
    </Paper>
  );
};

// components/document-intelligence/DocumentAnalysisViewer.tsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Tabs, 
  Tab, 
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid
} from '@mui/material';
import { ExpandMore, InsertDriveFile, WarningAmber, CheckCircle } from '@mui/icons-material';
import { documentApi } from '@/lib/api/apiClient';
import { DocumentViewer } from './DocumentViewer';

interface DocumentAnalysisViewerProps {
  documentId: string;
}

interface AnalysisData {
  documentId: string;
  status: 'processing' | 'completed' | 'error';
  documentType: string;
  fileName: string;
  fileUrl: string;
  extractedContent: {
    title?: string;
    sections: {
      title: string;
      content: string;
      pageNumber: number;
    }[];
    keyPhrases: string[];
    regulations: {
      code: string;
      description: string;
      relevance: number;
    }[];
    trainingObjectives: {
      id: string;
      description: string;
      competency: string;
      level: 'knowledge' | 'skill' | 'attitude';
    }[];
    entities: {
      text: string;
      type: string;
      pageNumber: number;
      count: number;
    }[];
  };
  processingProgress?: number;
  error?: string;
}

export const DocumentAnalysisViewer: React.FC<DocumentAnalysisViewerProps> = ({ documentId }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout;
    
    const fetchAnalysis = async () => {
      try {
        const data = await documentApi.getDocumentAnalysis(documentId);
        setAnalysisData(data);
        
        if (data.status === 'processing') {
          // If still processing, poll every 3 seconds
          pollingInterval = setInterval(fetchAnalysis, 3000);
        } else {
          setLoading(false);
          clearInterval(pollingInterval);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch document analysis');
        setLoading(false);
        clearInterval(pollingInterval);
      }
    };
    
    fetchAnalysis();
    
    return () => {
      clearInterval(pollingInterval);
    };
  }, [documentId]);
  
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  if (loading && (!analysisData || analysisData.status === 'processing')) {
    return (
      <Paper elevation={3} className="p-6">
        <Box className="flex flex-col items-center py-8">
          <CircularProgress size={48} className="mb-4" />
          <Typography variant="h6">
            Analyzing Document...
          </Typography>
          {analysisData?.processingProgress && (
            <Typography variant="body2" color="textSecondary" className="mt-2">
              {Math.round(analysisData.processingProgress)}% complete
            </Typography>
          )}
        </Box>
      </Paper>
    );
  }
  
  if (error || analysisData?.status === 'error') {
    return (
      <Paper elevation={3} className="p-6">
        <Box className="flex items-center text-red-600 mb-4">
          <WarningAmber className="mr-2" />
          <Typography variant="h6">Analysis Failed</Typography>
        </Box>
        <Typography variant="body1">
          {error || analysisData?.error || 'Failed to analyze the document. Please try again.'}
        </Typography>
      </Paper>
    );
  }
  
  if (!analysisData) {
    return null;
  }
  
  return (
    <Paper elevation={3} className="overflow-hidden">
      <Box className="p-4 bg-gray-50 border-b">
        <Box className="flex items-center mb-2">
          <InsertDriveFile className="mr-2 text-blue-500" />
          <Typography variant="h6">
            {analysisData.extractedContent.title || analysisData.fileName}
          </Typography>
          <Chip 
            label={analysisData.documentType}
            size="small"
            color="primary"
            className="ml-2"
          />
        </Box>
      </Box>
      
      <Box>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          className="border-b"
        >
          <Tab label="Document" />
          <Tab label="Content Structure" />
          <Tab label="Training Objectives" />
          <Tab label="Regulatory Mapping" />
          <Tab label="Key Terms" />
        </Tabs>
        
        <Box className="p-4">
          {activeTab === 0 && (
            <DocumentViewer fileUrl={analysisData.fileUrl} fileName={analysisData.fileName} />
          )}
          
          {activeTab === 1 && (
            <Box>
              <Typography variant="subtitle1" className="mb-2">Document Structure</Typography>
              <List>
                {analysisData.extractedContent.sections.map((section, index) => (
                  <Accordion key={index}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography>
                        {section.title || `Section ${index + 1}`}
                        <Chip 
                          label={`Page ${section.pageNumber}`}
                          size="small"
                          className="ml-2"
                          variant="outlined"
                        />
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" style={{ whiteSpace: 'pre-line' }}>
                        {section.content}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </List>
            </Box>
          )}
          
          {activeTab === 2 && (
            <Box>
              <Typography variant="subtitle1" className="mb-3">Identified Training Objectives</Typography>
              <Grid container spacing={2}>
                {analysisData.extractedContent.trainingObjectives.map((objective, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Paper className="p-3" variant="outlined">
                      <Box className="flex items-center mb-1">
                        <Chip 
                          label={objective.competency}
                          size="small"
                          color="primary"
                          className="mr-2"
                        />
                        <Chip 
                          label={objective.level}
                          size="small"
                          color={
                            objective.level === 'knowledge' ? 'info' :
                            objective.level === 'skill' ? 'success' : 'warning'
                          }
                        />
                      </Box>
                      <Typography variant="body2">{objective.description}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
          
          {activeTab === 3 && (
            <Box>
              <Typography variant="subtitle1" className="mb-3">Regulatory Compliance Mapping</Typography>
              <List>
                {analysisData.extractedContent.regulations.map((regulation, index) => (
                  <ListItem key={index} className="mb-2 rounded" sx={{ bgcolor: 'background.paper' }}>
                    <ListItemText
                      primary={
                        <Box className="flex items-center">
                          <Chip 
                            label={regulation.code}
                            color="secondary"
                            size="small"
                            className="mr-2"
                          />
                          <Typography variant="body1">{regulation.description}</Typography>
                        </Box>
                      }
                      secondary={
                        <Box className="flex items-center mt-1">
                          <Typography variant="body2" color="textSecondary">
                            Relevance: 
                          </Typography>
                          <Box 
                            className="ml-2 h-2 rounded-full bg-gray-200"
                            sx={{ width: 100 }}
                          >
                            <Box 
                              className="h-2 rounded-full bg-blue-500"
                              sx={{ width: `${regulation.relevance * 100}%` }}
                            />
                          </Box>
                          <Typography variant="body2" color="textSecondary" className="ml-2">
                            {Math.round(regulation.relevance * 100)}%
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
          
          {activeTab === 4 && (
            <Box>
              <Typography variant="subtitle1" className="mb-3">Key Terms and Entities</Typography>
              <Box className="mb-4">
                <Typography variant="subtitle2" className="mb-2">Key Phrases</Typography>
                <Box className="flex flex-wrap gap-2">
                  {analysisData.extractedContent.keyPhrases.map((phrase, index) => (
                    <Chip 
                      key={index}
                      label={phrase}
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
              
              <Typography variant="subtitle2" className="mb-2">Entities</Typography>
              <Grid container spacing={2}>
                {analysisData.extractedContent.entities.map((entity, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Paper className="p-3" variant="outlined">
                      <Typography variant="body2" className="font-medium">{entity.text}</Typography>
                      <Box className="flex justify-between mt-1">
                        <Chip 
                          label={entity.type}
                          size="small"
                          variant="outlined"
                        />
                        <Typography variant="caption" color="textSecondary">
                          Found {entity.count} times
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

// components/document-intelligence/DocumentViewer.tsx
import React, { useState } from 'react';
import { Box, Paper, Typography, CircularProgress, IconButton } from '@mui/material';
import { ZoomIn, ZoomOut, SkipPrevious, SkipNext, Fullscreen } from '@mui/icons-material';

interface DocumentViewerProps {
  fileUrl: string;
  fileName: string;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ fileUrl, fileName }) => {
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };
  
  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };
  
  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };
  
  // Determine file type from extension
  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  
  return (
    <Box className={`flex flex-col ${fullscreen ? 'fixed inset-0 z-50 bg-white' : 'h-full'}`}>
      <Box className="flex justify-between items-center p-2 bg-gray-100">
        <Box className="flex items-center">
          <IconButton onClick={handlePrevPage} disabled={currentPage <= 1}>
            <SkipPrevious />
          </IconButton>
          <Typography variant="body2" className="mx-2">
            Page {currentPage} of {totalPages}
          </Typography>
          <IconButton onClick={handleNextPage} disabled={currentPage >= totalPages}>
            <SkipNext />
          </IconButton>
        </Box>
        
        <Box className="flex items-center">
          <IconButton onClick={handleZoomOut} disabled={zoom <= 0.5}>
            <ZoomOut />
          </IconButton>
          <Typography variant="body2" className="mx-2">
            {Math.round(zoom * 100)}%
          </Typography>
          <IconButton onClick={handleZoomIn} disabled={zoom >= 3}>
            <ZoomIn />
          </IconButton>
          <IconButton onClick={toggleFullscreen} className="ml-2">
            <Fullscreen />
          </IconButton>
        </Box>
      </Box>
      
      <Box 
        className="flex-1 overflow-auto p-4 bg-gray-200 flex justify-center"
        style={{ height: fullscreen ? 'calc(100vh - 56px)' : '600px' }}
      >
        <Box
          style={{ 
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s'
          }}
          className="bg-white shadow-lg"
        >
          {loading && (
            <Box className="absolute inset-0 flex items-center justify-center">
              <CircularProgress />
            </Box>
          )}
          
          {fileExtension === 'pdf' && (
            <iframe
              src={`${fileUrl}#page=${currentPage}`}
              title="PDF Document"
              width="800"
              height={fullscreen ? 'calc(100vh - 120px)' : '800'}
              onLoad={() => setLoading(false)}
              style={{ border: 'none' }}
            />
          )}
          
          {(fileExtension === 'docx' || fileExtension === 'xlsx' || fileExtension === 'pptx') && (
            <iframe
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`}
              title="Office Document"
              width="800"
              height={fullscreen ? 'calc(100vh - 120px)' : '800'}
              onLoad={() => setLoading(false)}
              style={{ border: 'none' }}
            />
          )}
          
          {fileExtension === 'html' && (
            <iframe
              src={fileUrl}
              title="HTML Document"
              width="800"
              height={fullscreen ? 'calc(100vh - 120px)' : '800'}
              onLoad={() => setLoading(false)}
              style={{ border: 'none' }}
            />
          )}
          
          {fileExtension === 'txt' && (
            <Box 
              width="800"
              height={fullscreen ? 'calc(100vh - 120px)' : '800'}
              sx={{ overflowY: 'auto', p: 4 }}
              className="bg-white"
            >
              <Typography component="pre" variant="body2">
                {/* Text content would be loaded here */}
                Loading text content...
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

// components/document-intelligence/DocumentLibrary.tsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Card, 
  CardContent, 
  CardActions, 
  Button, 
  IconButton,
  TextField,
  InputAdornment,
  Chip,
  Menu,
  MenuItem,
  CircularProgress,
  Divider,
  Select,
  FormControl,
  InputLabel,
  Pagination
} from '@mui/material';
import { 
  Search, 
  FilterList, 
  InsertDriveFile, 
  PictureAsPdf, 
  Description, 
  Slideshow, 
  Code,
  MoreVert,
  DeleteOutline
} from '@mui/icons-material';
import { documentApi } from '@/lib/api/apiClient';
import { DocumentUploader } from './DocumentUploader';

interface Document {
  id: string;
  fileName: string;
  fileType: string;
  uploadDate: string;
  documentType: string;
  status: 'processing' | 'completed' | 'error';
  size: number;
  description?: string;
  thumbnail?: string;
}

export const DocumentLibrary: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('uploadDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [actionDocument, setActionDocument] = useState<Document | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  
  useEffect(() => {
    fetchDocuments();
  }, [page, typeFilter, sortBy, sortOrder, searchQuery]);
  
  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const filters: Record<string, any> = {};
      
      if (typeFilter !== 'all') {
        filters.documentType = typeFilter;
      }
      
      if (searchQuery) {
        filters.search = searchQuery;
      }
      
      const result = await documentApi.getUserDocuments({
        page,
        limit: 12,
        filters,
      });
      
      setDocuments(result.documents);
      setTotalPages(result.totalPages);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };
  
  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };
  
  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };
  
  const handleActionMenuOpen = (event: React.MouseEvent<HTMLElement>, document: Document) => {
    setActionMenuAnchorEl(event.currentTarget);
    setActionDocument(document);
  };
  
  const handleActionMenuClose = () => {
    setActionMenuAnchorEl(null);
    setActionDocument(null);
  };
  
  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };
  
  const handleUploadComplete = (documentId: string) => {
    setShowUploader(false);
    fetchDocuments();
    setSelectedDocumentId(documentId);
  };
  
  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return <PictureAsPdf className="text-red-500" />;
      case 'docx':
      case 'doc':
        return <Description className="text-blue-500" />;
      case 'pptx':
      case 'ppt':
        return <Slideshow className="text-orange-500" />;
      case 'html':
        return <Code className="text-green-500" />;
      default:
        return <InsertDriveFile className="text-gray-500" />;
    }
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  return (
    <Box>
      <Box className="flex justify-between items-center mb-6">
        <Typography variant="h5">Document Library</Typography>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => setShowUploader(!showUploader)}
        >
          {showUploader ? 'Hide Uploader' : 'Upload Document'}
        </Button>
      </Box>
      
      {showUploader && (
        <Box className="mb-6">
          <DocumentUploader onUploadComplete={handleUploadComplete} />
        </Box>
      )}
      
      <Paper elevation={1} className="p-4 mb-6">
        <Box className="flex flex-wrap gap-4 items-center">
          <TextField
            placeholder="Search documents..."
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            className="flex-grow"
          />
          
          <Box className="flex items-center gap-4">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="sort-by-label">Sort By</InputLabel>
              <Select
                labelId="sort-by-label"
                label="Sort By"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="uploadDate">Upload Date</MenuItem>
                <MenuItem value="fileName">File Name</MenuItem>
                <MenuItem value="size">File Size</MenuItem>
                <MenuItem value="documentType">Document Type</MenuItem>
              </Select>
            </FormControl>
            
            <IconButton
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </IconButton>
            
            <Button 
              startIcon={<FilterList />} 
              onClick={handleFilterClick}
              variant="outlined"
              size="small"
            >
              Filter
            </Button>
            
            <Menu
              anchorEl={filterAnchorEl}
              open={Boolean(filterAnchorEl)}
              onClose={handleFilterClose}
            >
              <MenuItem 
                onClick={() => { setTypeFilter('all'); handleFilterClose(); }}
                selected={typeFilter === 'all'}
              >
                All Types
              </MenuItem>
              <Divider />
              <MenuItem 
                onClick={() => { setTypeFilter('training'); handleFilterClose(); }}
                selected={typeFilter === 'training'}
              >
                Training Documents
              </MenuItem>
              <MenuItem 
                onClick={() => { setTypeFilter('regulatory'); handleFilterClose(); }}
                selected={typeFilter === 'regulatory'}
              >
                Regulatory Documents
              </MenuItem>
              <MenuItem 
                onClick={() => { setTypeFilter('manual'); handleFilterClose(); }}
                selected={typeFilter === 'manual'}
              >
                Aircraft Manuals
              </MenuItem>
              <MenuItem 
                onClick={() => { setTypeFilter('syllabus'); handleFilterClose(); }}
                selected={typeFilter === 'syllabus'}
              >
                Syllabi
              </MenuItem>
              <MenuItem 
                onClick={() => { setTypeFilter('other'); handleFilterClose(); }}
                selected={typeFilter === 'other'}
              >
                Other
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Paper>
      
      {loading ? (
        <Box className="flex justify-center p-12">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Paper className="p-6 text-center text-red-600">
          <Typography variant="body1">{error}</Typography>
        </Paper>
      ) : documents.length === 0 ? (
        <Paper className="p-12 text-center">
          <Typography variant="h6" className="mb-2">No documents found</Typography>
          <Typography variant="body2" color="textSecondary">
            Upload some documents or adjust your filters
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {documents.map((doc) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={doc.id}>
              <Card 
                className={`h-full ${selectedDocumentId === doc.id ? 'ring-2 ring-blue-500' : ''}`}
                elevation={selectedDocumentId === doc.id ? 3 : 1}
              >
                <Box className="p-4 flex items-center">
                  {getFileIcon(doc.fileType)}
                  <Typography variant="body1" className="ml-2 truncate flex-1" title={doc.fileName}>
                    {doc.fileName}
                  </Typography>
                  <IconButton size="small" onClick={(e) => handleActionMenuOpen(e, doc)}>
                    <MoreVert />
                  </IconButton>
                </Box>
                
                <CardContent className="pt-0">
                  <Box className="flex items-center mb-2">
                    <Chip
                      label={doc.documentType}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      label={doc.status === 'completed' ? 'Analyzed' : 
                             doc.status === 'processing' ? 'Processing' : 'Failed'}
                      size="small"
                      color={doc.status === 'completed' ? 'success' : 
                             doc.status === 'processing' ? 'info' : 'error'}
                      className="ml-2"
                    />
                  </Box>
                  
                  {doc.thumbnail ? (
                    <Box 
                      className="mb-2 h-32 bg-gray-100 rounded overflow-hidden flex items-center justify-center"
                    >
                      <img 
                        src={doc.thumbnail} 
                        alt={doc.fileName} 
                        className="object-contain h-full w-full"
                      />
                    </Box>
                  ) : (
                    <Box className="mb-2 h-32 bg-gray-100 rounded flex items-center justify-center">
                      {getFileIcon(doc.fileType)}
                    </Box>
                  )}
                  
                  <Typography variant="caption" className="block text-gray-500">
                    Uploaded: {formatDate(doc.uploadDate)}
                  </Typography>
                  <Typography variant="caption" className="block text-gray-500">
                    Size: {formatFileSize(doc.size)}
                  </Typography>
                </CardContent>
                
                <CardActions>
                  <Button 
                    size="small" 
                    color="primary"
                    onClick={() => setSelectedDocumentId(doc.id)}
                    fullWidth
                  >
                    View Analysis
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {totalPages > 1 && (
        <Box className="flex justify-center mt-6">
          <Pagination 
            count={totalPages} 
            page={page} 
            onChange={handlePageChange} 
            color="primary" 
          />
        </Box>
      )}
      
      <Menu
        anchorEl={actionMenuAnchorEl}
        open={Boolean(actionMenuAnchorEl)}
        onClose={handleActionMenuClose}
      >
        <MenuItem onClick={handleActionMenuClose}>
          View Details
        </MenuItem>
        <MenuItem onClick={handleActionMenuClose}>
          Download
        </MenuItem>
        <MenuItem onClick={handleActionMenuClose}>
          Share
        </MenuItem>
        <MenuItem onClick={handleActionMenuClose}>
          Add to Syllabus
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={handleActionMenuClose}
          className="text-red-600"
        >
          <DeleteOutline fontSize="small" className="mr-2" />
          Delete
        </MenuItem>
      </Menu>

      {selectedDocumentId && (
        <Box className="mt-6">
          <Typography variant="h6" className="mb-3">Document Analysis</Typography>
          <DocumentAnalysisViewer documentId={selectedDocumentId} />
        </Box>
      )}
    </Box>
  );
};

// app/document-intelligence/page.tsx
'use client';

import React from 'react';
import { Box, Container, Typography, Paper, Tabs, Tab } from '@mui/material';
import { DocumentLibrary } from '@/components/document-intelligence/DocumentLibrary';

export default function DocumentIntelligencePage() {
  const [activeTab, setActiveTab] = React.useState(0);
  
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  return (
    <Container maxWidth="xl">
      <Box className="py-6">
        <Typography variant="h4" className="mb-6">Document Intelligence</Typography>
        
        <Paper elevation={1} className="mb-6">
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Document Library" />
            <Tab label="Upload & Analysis" />
            <Tab label="Knowledge Graph" />
            <Tab label="Terminology" />
          </Tabs>
        </Paper>
        
        {activeTab === 0 && <DocumentLibrary />}
        {activeTab === 1 && (
          <Typography variant="body1">Upload & Analysis Tab Content</Typography>
        )}
        {activeTab === 2 && (
          <Typography variant="body1">Knowledge Graph Tab Content</Typography>
        )}
        {activeTab === 3 && (
          <Typography variant="body1">Terminology Tab Content</Typography>
        )}
      </Box>
    </Container>
  );
}
