// components/compliance/RegulatoryComplianceMatrix.tsx
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Button,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
} from '@mui/material';
import {
  Search,
  FilterList,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Info,
  CloudDownload,
  MoreVert,
  Visibility,
} from '@mui/icons-material';

interface RegulatoryRequirement {
  id: string;
  code: string;
  description: string;
  authority: string;
  category: string;
  status: 'compliant' | 'partially-compliant' | 'non-compliant' | 'not-applicable';
  mappedElements: {
    id: string;
    type: 'module' | 'exercise' | 'document';
    name: string;
  }[];
  lastVerified?: string;
  notes?: string;
}

export const RegulatoryComplianceMatrix: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAuthority, setSelectedAuthority] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRequirement, setSelectedRequirement] = useState<RegulatoryRequirement | null>(null);

  // Mock data
  const requirements: RegulatoryRequirement[] = [
    {
      id: 'req-1',
      code: 'EASA FCL.725.A(b)(1)',
      description: 'Technical training covering aircraft systems knowledge',
      authority: 'EASA',
      category: 'Type Rating',
      status: 'compliant',
      mappedElements: [
        { id: 'mod-1', type: 'module', name: 'Aircraft Systems - Powerplant' },
        { id: 'mod-2', type: 'module', name: 'Aircraft Systems - Hydraulics' },
        { id: 'ex-1', type: 'exercise', name: 'Systems Knowledge Evaluation' },
      ],
      lastVerified: '2023-07-15T14:30:00Z',
    },
    {
      id: 'req-2',
      code: 'EASA FCL.725.A(b)(3)',
      description: 'Flying training covering normal, abnormal and emergency procedures',
      authority: 'EASA',
      category: 'Type Rating',
      status: 'partially-compliant',
      mappedElements: [
        { id: 'mod-3', type: 'module', name: 'Normal Procedures' },
        { id: 'mod-4', type: 'module', name: 'Abnormal Procedures' },
      ],
      lastVerified: '2023-07-10T09:15:00Z',
      notes: 'Emergency procedures coverage needs enhancement',
    },
    {
      id: 'req-3',
      code: 'FAA 14 CFR §61.31(a)',
      description: 'Type rating requirements for large aircraft and turbine-powered aircraft',
      authority: 'FAA',
      category: 'Type Rating',
      status: 'non-compliant',
      mappedElements: [],
      lastVerified: '2023-07-05T11:30:00Z',
      notes: 'No mapped content for this requirement yet',
    },
    {
      id: 'req-4',
      code: 'ICAO Annex 1-2.1.3',
      description: 'Requirements for the issue of multi-crew pilot license',
      authority: 'ICAO',
      category: 'MPL',
      status: 'compliant',
      mappedElements: [
        { id: 'mod-5', type: 'module', name: 'Multi-Crew Coordination' },
        { id: 'doc-1', type: 'document', name: 'ICAO MPL Compliance Guide' },
      ],
      lastVerified: '2023-07-12T15:45:00Z',
    },
    {
      id: 'req-5',
      code: 'DGCA CAR Section 7 Series M Part II',
      description: 'Requirements for issue of licenses and ratings for pilots',
      authority: 'DGCA',
      category: 'Licensing',
      status: 'not-applicable',
      mappedElements: [],
      lastVerified: '2023-07-08T10:20:00Z',
      notes: 'Not applicable for current training programs',
    },
  ];

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleCloseFilter = () => {
    setFilterAnchorEl(null);
  };

  const handleAuthorityChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedAuthority(event.target.value as string);
  };

  const handleCategoryChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedCategory(event.target.value as string);
  };

  const handleStatusChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedStatus(event.target.value as string);
  };

  const handleActionMenuOpen = (event: React.MouseEvent<HTMLElement>, requirement: RegulatoryRequirement) => {
    setActionMenuAnchorEl(event.currentTarget);
    setSelectedRequirement(requirement);
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchorEl(null);
    setSelectedRequirement(null);
  };

  const handleExportCSV = () => {
    // Implementation would go here
    console.log('Exporting to CSV...');
  };

  // Filter the requirements based on search and filters
  const filteredRequirements = requirements.filter((req) => {
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !req.code.toLowerCase().includes(query) &&
        !req.description.toLowerCase().includes(query) &&
        !req.authority.toLowerCase().includes(query) &&
        !req.category.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Apply authority filter
    if (selectedAuthority !== 'all' && req.authority !== selectedAuthority) {
      return false;
    }

    // Apply category filter
    if (selectedCategory !== 'all' && req.category !== selectedCategory) {
      return false;
    }

    // Apply status filter
    if (selectedStatus !== 'all' && req.status !== selectedStatus) {
      return false;
    }

    return true;
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not verified';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle fontSize="small" className="text-green-500" />;
      case 'partially-compliant':
        return <Warning fontSize="small" className="text-amber-500" />;
      case 'non-compliant':
        return <ErrorIcon fontSize="small" className="text-red-500" />;
      case 'not-applicable':
        return <Info fontSize="small" className="text-gray-500" />;
      default:
        return null;
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'compliant':
        return <Chip label="Compliant" size="small" color="success" />;
      case 'partially-compliant':
        return <Chip label="Partially Compliant" size="small" color="warning" />;
      case 'non-compliant':
        return <Chip label="Non-Compliant" size="small" color="error" />;
      case 'not-applicable':
        return <Chip label="Not Applicable" size="small" color="default" />;
      default:
        return null;
    }
  };

  // Get unique authorities and categories for filters
  const authorities = ['all', ...new Set(requirements.map((req) => req.authority))];
  const categories = ['all', ...new Set(requirements.map((req) => req.category))];

  return (
    <Paper elevation={2} className="overflow-hidden">
      <Box className="p-4 bg-gray-50 border-b flex justify-between items-center">
        <Typography variant="h6">Regulatory Compliance Matrix</Typography>
        <Button
          variant="outlined"
          startIcon={<CloudDownload />}
          onClick={handleExportCSV}
        >
          Export
        </Button>
      </Box>

      <Box className="p-4">
        <Box className="flex flex-wrap gap-3 mb-4">
          <TextField
            placeholder="Search requirements..."
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-grow"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />

          <Button 
            variant="outlined" 
            startIcon={<FilterList />} 
            onClick={handleFilterClick}
          >
            Filters
          </Button>
        </Box>

        {loading ? (
          <Box className="flex justify-center p-6">
            <CircularProgress />
          </Box>
        ) : filteredRequirements.length === 0 ? (
          <Box className="text-center p-6">
            <Typography variant="body1" color="textSecondary">
              No requirements found matching your filters
            </Typography>
            <Button
              variant="text"
              color="primary"
              onClick={() => {
                setSearchQuery('');
                setSelectedAuthority('all');
                setSelectedCategory('all');
                setSelectedStatus('all');
              }}
              className="mt-2"
            >
              Clear Filters
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead className="bg-gray-50">
                <TableRow>
                  <TableCell>Requirement Code</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Authority</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Mapped Elements</TableCell>
                  <TableCell>Last Verified</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRequirements.map((req) => (
                  <TableRow key={req.id} hover>
                    <TableCell className="font-medium">{req.code}</TableCell>
                    <TableCell>{req.description}</TableCell>
                    <TableCell>{req.authority}</TableCell>
                    <TableCell>{req.category}</TableCell>
                    <TableCell>
                      <Box className="flex items-center">
                        {getStatusIcon(req.status)}
                        <Typography variant="body2" className="ml-1">
                          {getStatusChip(req.status)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {req.mappedElements.length > 0 ? (
                        <Chip
                          label={`${req.mappedElements.length} elements`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          None
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(req.lastVerified)}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={(e) => handleActionMenuOpen(e, req)}
                      >
                        <MoreVert fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Filters Menu */}
      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={handleCloseFilter}
        PaperProps={{
          elevation: 2,
          sx: { width: 300, maxHeight: 500, p: 2 },
        }}
      >
        <Typography variant="subtitle2" className="mb-3">
          Filter Requirements
        </Typography>

        <FormControl fullWidth variant="outlined" size="small" className="mb-3">
          <InputLabel>Authority</InputLabel>
          <Select
            value={selectedAuthority}
            onChange={handleAuthorityChange}
            label="Authority"
          >
            {authorities.map((authority) => (
              <MenuItem key={authority} value={authority}>
                {authority === 'all' ? 'All Authorities' : authority}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth variant="outlined" size="small" className="mb-3">
          <InputLabel>Category</InputLabel>
          <Select
            value={selectedCategory}
            onChange={handleCategoryChange}
            label="Category"
          >
            {categories.map((category) => (
              <MenuItem key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth variant="outlined" size="small" className="mb-3">
          <InputLabel>Status</InputLabel>
          <Select
            value={selectedStatus}
            onChange={handleStatusChange}
            label="Status"
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="compliant">Compliant</MenuItem>
            <MenuItem value="partially-compliant">Partially Compliant</MenuItem>
            <MenuItem value="non-compliant">Non-Compliant</MenuItem>
            <MenuItem value="not-applicable">Not Applicable</MenuItem>
          </Select>
        </FormControl>

        <Box className="flex justify-end mt-2">
          <Button
            variant="text"
            onClick={() => {
              setSelectedAuthority('all');
              setSelectedCategory('all');
              setSelectedStatus('all');
            }}
            className="mr-2"
          >
            Reset
          </Button>
          <Button variant="contained" onClick={handleCloseFilter}>
            Apply Filters
          </Button>
        </Box>
      </Menu>

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchorEl}
        open={Boolean(actionMenuAnchorEl)}
        onClose={handleActionMenuClose}
      >
        <MenuItem onClick={handleActionMenuClose}>
          <Visibility fontSize="small" className="mr-2" />
          View Details
        </MenuItem>
        <MenuItem onClick={handleActionMenuClose}>
          <Visibility fontSize="small" className="mr-2" />
          View Mapped Elements
        </MenuItem>
        <MenuItem onClick={handleActionMenuClose}>
          <CloudDownload fontSize="small" className="mr-2" />
          Export Details
        </MenuItem>
      </Menu>
    </Paper>
  );
};

// components/compliance/AuditTrailLog.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  InputAdornment,
  Button,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  Search,
  FilterList,
  Event,
  Person,
  Info,
  Warning,
  SyncAlt,
  Edit,
  Add,
  Delete,
  Visibility,
  Download,
  CloudDownload,
  Close,
} from '@mui/icons-material';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  changes?: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
  ipAddress: string;
  severity: 'info' | 'warning' | 'critical';
  isVerified: boolean; // Whether the entry has been verified on blockchain
}

export const AuditTrailLog: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  
  // Mock data
  const auditLogs: AuditLogEntry[] = [
    {
      id: 'log-1',
      timestamp: '2023-08-15T14:30:00Z',
      userId: 'user-1',
      userName: 'John Miller',
      userRole: 'Instructor',
      action: 'create',
      entityType: 'syllabus',
      entityId: 'syllabus-1',
      entityName: 'B737 Type Rating Syllabus',
      ipAddress: '192.168.1.100',
      severity: 'info',
      isVerified: true,
    },
    {
      id: 'log-2',
      timestamp: '2023-08-15T15:45:00Z',
      userId: 'user-1',
      userName: 'John Miller',
      userRole: 'Instructor',
      action: 'modify',
      entityType: 'exercise',
      entityId: 'exercise-23',
      entityName: 'Engine Failure After Takeoff',
      changes: [
        { field: 'description', oldValue: 'Basic engine failure scenario', newValue: 'Comprehensive engine failure with additional complications' },
        { field: 'duration', oldValue: '60', newValue: '90' },
      ],
      ipAddress: '192.168.1.100',
      severity: 'info',
      isVerified: true,
    },
    {
      id: 'log-3',
      timestamp: '2023-08-16T09:20:00Z',
      userId: 'user-2',
      userName: 'Sarah Johnson',
      userRole: 'Admin',
      action: 'delete',
      entityType: 'document',
      entityId: 'document-15',
      entityName: 'Outdated Training Manual',
      ipAddress: '192.168.1.105',
      severity: 'warning',
      isVerified: true,
    },
    {
      id: 'log-4',
      timestamp: '2023-08-16T11:30:00Z',
      userId: 'user-3',
      userName: 'Mike Davis',
      userRole: 'Instructor',
      action: 'approve',
      entityType: 'assessment',
      entityId: 'assessment-42',
      entityName: 'Final Type Rating Checkride',
      ipAddress: '192.168.1.110',
      severity: 'critical',
      isVerified: true,
    },
    {
      id: 'log-5',
      timestamp: '2023-08-16T16:15:00Z',
      userId: 'user-2',
      userName: 'Sarah Johnson',
      userRole: 'Admin',
      action: 'modify',
      entityType: 'user',
      entityId: 'user-5',
      entityName: 'Robert Chen',
      changes: [
        { field: 'role', oldValue: 'Trainee', newValue: 'Instructor' },
        { field: 'permissions', oldValue: 'basic_access', newValue: 'instructor_access' },
      ],
      ipAddress: '192.168.1.105',
      severity: 'warning',
      isVerified: false,
    },
  ];

  const itemsPerPage = 10;
  const totalPages = Math.ceil(auditLogs.length / itemsPerPage);

  // Simulate loading data
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [page, selectedUserId, selectedEntityType, selectedAction, selectedSeverity, searchQuery]);

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleViewDetails = (entry: AuditLogEntry) => {
    setSelectedEntry(entry);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedEntry(null);
  };

  const handleExportLogs = () => {
    // Implementation would go here
    console.log('Exporting audit logs...');
  };

  // Filter the audit logs based on search and filters
  const filteredLogs = auditLogs.filter((log) => {
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !log.userName.toLowerCase().includes(query) &&
        !log.entityName.toLowerCase().includes(query) &&
        !log.action.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Apply user filter
    if (selectedUserId !== 'all' && log.userId !== selectedUserId) {
      return false;
    }

    // Apply entity type filter
    if (selectedEntityType !== 'all' && log.entityType !== selectedEntityType) {
      return false;
    }

    // Apply action filter
    if (selectedAction !== 'all' && log.action !== selectedAction) {
      return false;
    }

    // Apply severity filter
    if (selectedSeverity !== 'all' && log.severity !== selectedSeverity) {
      return false;
    }

    return true;
  });

  const paginatedLogs = filteredLogs.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionChip = (action: string) => {
    switch (action) {
      case 'create':
        return <Chip label="Create" size="small" color="success" />;
      case 'modify':
        return <Chip label="Modify" size="small" color="primary" />;
      case 'delete':
        return <Chip label="Delete" size="small" color="error" />;
      case 'approve':
        return <Chip label="Approve" size="small" color="info" />;
      default:
        return <Chip label={action} size="small" />;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'info':
        return <Info className="text-blue-500" />;
      case 'warning':
        return <Warning className="text-amber-500" />;
      case 'critical':
        return <Warning className="text-red-500" />;
      default:
        return <Info className="text-gray-500" />;
    }
  };

  // Get unique users, entity types, and actions for filters
  const users = [
    { id: 'all', name: 'All Users' },
    ...auditLogs
      .filter((log, index, self) => self.findIndex((l) => l.userId === log.userId) === index)
      .map((log) => ({ id: log.userId, name: log.userName })),
  ];

  const entityTypes = [
    'all',
    ...new Set(auditLogs.map((log) => log.entityType)),
  ];

  const actions = [
    'all',
    ...new Set(auditLogs.map((log) => log.action)),
  ];

  return (
    <Paper elevation={2} className="overflow-hidden">
      <Box className="p-4 bg-gray-50 border-b flex justify-between items-center">
        <Typography variant="h6">Audit Trail Log</Typography>
        <Button
          variant="outlined"
          startIcon={<CloudDownload />}
          onClick={handleExportLogs}
        >
          Export Logs
        </Button>
      </Box>

      <Box className="p-4">
        <Box className="flex flex-wrap gap-3 mb-4">
          <TextField
            placeholder="Search logs..."
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-grow"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />

          <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
            <InputLabel>User</InputLabel>
            <Select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value as string)}
              label="User"
            >
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Entity Type</InputLabel>
            <Select
              value={selectedEntityType}
              onChange={(e) => setSelectedEntityType(e.target.value as string)}
              label="Entity Type"
            >
              {entityTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type === 'all' ? 'All Entity Types' : type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Action</InputLabel>
            <Select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value as string)}
              label="Action"
            >
              {actions.map((action) => (
                <MenuItem key={action} value={action}>
                  {action === 'all' ? 'All Actions' : action}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Severity</InputLabel>
            <Select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value as string)}
              label="Severity"
            >
              <MenuItem value="all">All Severities</MenuItem>
              <MenuItem value="info">Info</MenuItem>
              <MenuItem value="warning">Warning</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {loading ? (
          <Box className="flex justify-center p-6">
            <CircularProgress />
          </Box>
        ) : paginatedLogs.length === 0 ? (
          <Box className="text-center p-6">
            <Typography variant="body1" color="textSecondary">
              No audit logs found matching your filters
            </Typography>
            <Button
              variant="text"
              color="primary"
              onClick={() => {
                setSearchQuery('');
                setSelectedUserId('all');
                setSelectedEntityType('all');
                setSelectedAction('all');
                setSelectedSeverity('all');
              }}
              className="mt-2"
            >
              Clear Filters
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead className="bg-gray-50">
                <TableRow>
                  <TableCell width="180">Timestamp</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Entity</TableCell>
                  <TableCell>Blockchain Verified</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedLogs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell className="whitespace-nowrap">
                      <Box className="flex items-center">
                        {getSeverityIcon(log.severity)}
                        <Typography variant="body2" className="ml-2">
                          {formatDate(log.timestamp)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box className="flex items-center">
                        <Person fontSize="small" className="mr-1 text-gray-400" />
                        <Box>
                          <Typography variant="body2" className="font-medium">
                            {log.userName}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {log.userRole}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{getActionChip(log.action)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" className="font-medium">
                        {log.entityName}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {log.entityType}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {log.isVerified ? (
                        <Chip
                          icon={<CheckCircle fontSize="small" />}
                          label="Verified"
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      ) : (
                        <Chip
                          icon={<SyncAlt fontSize="small" />}
                          label="Pending"
                          size="small"
                          color="default"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => handleViewDetails(log)}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {filteredLogs.length > itemsPerPage && (
          <Box className="flex justify-center mt-4">
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}
      </Box>

      {/* Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle className="flex justify-between items-center">
          <Typography variant="h6">Audit Log Details</Typography>
          <IconButton onClick={handleCloseDetails} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedEntry && (
            <Box>
              <Box className="grid grid-cols-2 gap-4 mb-4">
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Timestamp
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(selectedEntry.timestamp)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    User
                  </Typography>
                  <Typography variant="body1">
                    {selectedEntry.userName} ({selectedEntry.userRole})
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Action
                  </Typography>
                  <Typography variant="body1">
                    {getActionChip(selectedEntry.action)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Entity
                  </Typography>
                  <Typography variant="body1">
                    {selectedEntry.entityName} ({selectedEntry.entityType})
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    IP Address
                  </Typography>
                  <Typography variant="body1">{selectedEntry.ipAddress}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Blockchain Verification
                  </Typography>
                  <Typography variant="body1">
                    {selectedEntry.isVerified ? (
                      <Box className="flex items-center">
                        <CheckCircle fontSize="small" className="text-green-500 mr-1" />
                        Verified on Blockchain
                      </Box>
                    ) : (
                      <Box className="flex items-center">
                        <SyncAlt fontSize="small" className="text-gray-500 mr-1" />
                        Verification Pending
                      </Box>
                    )}
                  </Typography>
                </Box>
              </Box>

              {selectedEntry.changes && selectedEntry.changes.length > 0 && (
                <Box className="mt-4">
                  <Typography variant="subtitle2" className="mb-2">
                    Changes
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead className="bg-gray-50">
                        <TableRow>
                          <TableCell>Field</TableCell>
                          <TableCell>Old Value</TableCell>
                          <TableCell>New Value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedEntry.changes.map((change, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{change.field}</TableCell>
                            <TableCell>{change.oldValue}</TableCell>
                            <TableCell>{change.newValue}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Close</Button>
          <Button 
            variant="outlined" 
            startIcon={<Download />}
            onClick={handleCloseDetails}
          >
            Export Details
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

// components/compliance/RegulatoryUpdatesTracker.tsx
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  Divider,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Notifications,
  NotificationsActive,
  Search,
  FilterAlt,
  NewReleases,
  CheckCircle,
  ErrorOutline,
  PriorityHigh,
  Schedule,
  CalendarToday,
  ArrowForward,
  Refresh,
  MoreVert,
  Visibility,
  Download,
  Article,
  OpenInNew,
  Assessment,
  Close,
} from '@mui/icons-material';

interface RegulatoryUpdate {
  id: string;
  title: string;
  description: string;
  authority: string;
  releaseDate: string;
  effectiveDate: string;
  category: string;
  tags: string[];
  status: 'new' | 'in-review' | 'analyzed' | 'implemented';
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  impactAreas: string[];
  documentUrl: string;
  assignedTo?: {
    id: string;
    name: string;
  };
}

export const RegulatoryUpdatesTracker: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUpdate, setSelectedUpdate] = useState<RegulatoryUpdate | null>(null);
  const [updateDetailsOpen, setUpdateDetailsOpen] = useState(false);
  const [impactAnalysisOpen, setImpactAnalysisOpen] = useState(false);

  // Mock data
  const updates: RegulatoryUpdate[] = [
    {
      id: 'update-1',
      title: 'EASA FCL.740 Amendment - Recency Requirements Update',
      description: 'Updates to recency requirements for pilot license holders, introducing new provisions for maintaining currency during extended periods of inactivity.',
      authority: 'EASA',
      releaseDate: '2023-07-15T00:00:00Z',
      effectiveDate: '2023-10-01T00:00:00Z',
      category: 'Pilot Licensing',
      tags: ['Recency', 'License', 'Currency'],
      status: 'new',
      impactLevel: 'high',
      impactAreas: ['Type Rating Training', 'Recurrent Training'],
      documentUrl: 'https://example.com/easa-fcl740-amendment',
    },
    {
      id: 'update-2',
      title: 'FAA AC 120-117 - Pilot Professional Development',
      description: 'New Advisory Circular providing guidance on pilot professional development programs, including mentoring and leadership training requirements.',
      authority: 'FAA',
      releaseDate: '2023-07-10T00:00:00Z',
      effectiveDate: '2023-09-15T00:00:00Z',
      category: 'Training Programs',
      tags: ['Professional Development', 'Mentoring', 'Leadership'],
      status: 'in-review',
      impactLevel: 'medium',
      impactAreas: ['Instructor Training', 'CRM Training'],
      documentUrl: 'https://example.com/faa-ac120-117',
      assignedTo: {
        id: 'user-2',
        name: 'Sarah Johnson',
      },
    },
    {
      id: 'update-3',
      title: 'ICAO Annex 1 Amendment 177 - MPL Requirements',
      description: 'Updates to Multi-crew Pilot License (MPL) requirements, introducing enhanced simulation training provisions and competency assessment criteria.',
      authority: 'ICAO',
      releaseDate: '2023-06-20T00:00:00Z',
      effectiveDate: '2023-11-01T00:00:00Z',
      category: 'MPL Training',
      tags: ['MPL', 'Simulation', 'Competency Assessment'],
      status: 'analyzed',
      impactLevel: 'critical',
      impactAreas: ['MPL Programs', 'Simulator Training', 'Assessments'],
      documentUrl: 'https://example.com/icao-annex1-amdt177',
      assignedTo: {
        id: 'user-1',
        name: 'John Miller',
      },
    },
    {
      id: 'update-4',
      title: 'DGCA CAR Section 7 Series M Part I - Remote Pilot License',
      description: 'New regulations for Remote Pilot License issuance and training requirements for unmanned aircraft systems (UAS).',
      authority: 'DGCA',
      releaseDate: '2023-06-05T00:00:00Z',
      effectiveDate: '2023-08-01T00:00:00Z',
      category: 'UAS Training',
      tags: ['Remote Pilot', 'Drone', 'UAS'],
      status: 'implemented',
      impactLevel: 'low',
      impactAreas: ['UAS Training Programs'],
      documentUrl: 'https://example.com/dgca-car-remote-pilot',
    },
  ];

  const handleTabChange = (_: React.ChangeEvent<{}>, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleViewDetails = (update: RegulatoryUpdate) => {
    setSelectedUpdate(update);
    setUpdateDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setUpdateDetailsOpen(false);
  };

  const handleViewImpactAnalysis = (update: RegulatoryUpdate) => {
    setSelectedUpdate(update);
    setImpactAnalysisOpen(true);
  };

  const handleCloseImpactAnalysis = () => {
    setImpactAnalysisOpen(false);
  };

  // Filter updates based on tab and search
  const filteredUpdates = updates.filter((update) => {
    // Filter by tab
    if (activeTab === 1 && update.status !== 'new') return false;
    if (activeTab === 2 && update.status !== 'in-review') return false;
    if (activeTab === 3 && update.status !== 'analyzed') return false;
    if (activeTab === 4 && update.status !== 'implemented') return false;

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        update.title.toLowerCase().includes(query) ||
        update.description.toLowerCase().includes(query) ||
        update.authority.toLowerCase().includes(query) ||
        update.category.toLowerCase().includes(query) ||
        update.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return true;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getImpactLevelChip = (level: string) => {
    switch (level) {
      case 'low':
        return <Chip label="Low Impact" size="small" color="success" />;
      case 'medium':
        return <Chip label="Medium Impact" size="small" color="info" />;
      case 'high':
        return <Chip label="High Impact" size="small" color="warning" />;
      case 'critical':
        return <Chip label="Critical Impact" size="small" color="error" />;
      default:
        return null;
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'new':
        return <Chip label="New" size="small" color="error" icon={<NewReleases />} />;
      case 'in-review':
        return <Chip label="In Review" size="small" color="warning" icon={<Assessment />} />;
      case 'analyzed':
        return <Chip label="Analyzed" size="small" color="info" icon={<CheckCircle />} />;
      case 'implemented':
        return <Chip label="Implemented" size="small" color="success" icon={<CheckCircle />} />;
      default:
        return null;
    }
  };

  return (
    <Paper elevation={2} className="overflow-hidden">
      <Box className="p-4 bg-gray-50 border-b">
        <Box className="flex justify-between items-center">
          <Typography variant="h6">Regulatory Updates Tracker</Typography>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<Refresh />}
          >
            Check for Updates
          </Button>
        </Box>
      </Box>

      <Box className="p-4">
        <Box className="flex flex-wrap gap-3 mb-4">
          <TextField
            placeholder="Search updates..."
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-grow"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />

          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            className="min-w-0"
          >
            <Tab label="All" />
            <Tab 
              label="New" 
              icon={<Chip label={updates.filter(u => u.status === 'new').length} size="small" color="error" />}
              iconPosition="end"
            />
            <Tab 
              label="In Review" 
              icon={<Chip label={updates.filter(u => u.status === 'in-review').length} size="small" color="warning" />}
              iconPosition="end"
            />
            <Tab 
              label="Analyzed" 
              icon={<Chip label={updates.filter(u => u.status === 'analyzed').length} size="small" color="info" />}
              iconPosition="end"
            />
            <Tab 
              label="Implemented" 
              icon={<Chip label={updates.filter(u => u.status === 'implemented').length} size="small" color="success" />}
              iconPosition="end"
            />
          </Tabs>
        </Box>

        {filteredUpdates.length === 0 ? (
          <Box className="text-center p-6">
            <Typography variant="body1" color="textSecondary">
              No regulatory updates found
            </Typography>
          </Box>
        ) : (
          <List className="space-y-4">
            {filteredUpdates.map((update) => (
              <Card key={update.id} variant="outlined">
                <CardContent className="pb-2">
                  <Box className="flex justify-between items-start">
                    <Box className="flex items-center mb-2">
                      {getStatusChip(update.status)}
                      <Typography variant="subtitle1" className="ml-2 font-medium">
                        {update.title}
                      </Typography>
                    </Box>
                    {getImpactLevelChip(update.impactLevel)}
                  </Box>
                  
                  <Typography variant="body2" color="textSecondary" className="mb-3">
                    {update.description}
                  </Typography>
                  
                  <Box className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <Box>
                      <Typography variant="caption" color="textSecondary" className="block">
                        Authority
                      </Typography>
                      <Typography variant="body2">{update.authority}</Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="caption" color="textSecondary" className="block">
                        Released
                      </Typography>
                      <Typography variant="body2">{formatDate(update.releaseDate)}</Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="caption" color="textSecondary" className="block">
                        Effective Date
                      </Typography>
                      <Typography variant="body2" className="flex items-center">
                        {formatDate(update.effectiveDate)}
                        {new Date(update.effectiveDate) > new Date() && (
                          <Schedule className="ml-1 text-amber-500" fontSize="small" />
                        )}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box className="flex flex-wrap gap-1 mb-2">
                    <Chip
                      label={update.category}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    {update.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>
                  
                  {update.assignedTo && (
                    <Box className="mt-2">
                      <Typography variant="caption" color="textSecondary" className="block">
                        Assigned to
                      </Typography>
                      <Typography variant="body2">{update.assignedTo.name}</Typography>
                    </Box>
                  )}
                </CardContent>
                
                <Divider />
                
                <Box className="flex justify-between items-center px-4 py-2">
                  <Box>
                    <Button
                      size="small"
                      startIcon={<Article />}
                      href={update.documentUrl}
                      target="_blank"
                      rel="noopener"
                    >
                      View Document
                    </Button>
                  </Box>
                  
                  <Box>
                    <Button
                      size="small"
                      startIcon={<Assessment />}
                      onClick={() => handleViewImpactAnalysis(update)}
                      disabled={update.status === 'new'}
                    >
                      Impact Analysis
                    </Button>
                    <Button
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => handleViewDetails(update)}
                      className="ml-2"
                    >
                      Details
                    </Button>
                  </Box>
                </Box>
              </Card>
            ))}
          </List>
        )}
      </Box>

      {/* Update Details Dialog */}
      <Dialog
        open={updateDetailsOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle className="flex justify-between items-center">
          <Typography variant="h6">Regulatory Update Details</Typography>
          <IconButton onClick={handleCloseDetails} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedUpdate && (
            <Box>
              <Box className="flex justify-between items-start mb-4">
                <Typography variant="h6">{selectedUpdate.title}</Typography>
                {getStatusChip(selectedUpdate.status)}
              </Box>
              
              <Typography variant="body1" className="mb-4">
                {selectedUpdate.description}
              </Typography>
              
              <Box className="grid grid-cols-2 gap-4 mb-4">
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Authority
                  </Typography>
                  <Typography variant="body1">{selectedUpdate.authority}</Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Category
                  </Typography>
                  <Typography variant="body1">{selectedUpdate.category}</Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Release Date
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(selectedUpdate.releaseDate)}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Effective Date
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(selectedUpdate.effectiveDate)}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Impact Level
                  </Typography>
                  <Typography variant="body1">
                    {getImpactLevelChip(selectedUpdate.impactLevel)}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Assigned To
                  </Typography>
                  <Typography variant="body1">
                    {selectedUpdate.assignedTo?.name || 'Not assigned'}
                  </Typography>
                </Box>
              </Box>
              
              <Box className="mb-4">
                <Typography variant="subtitle2" color="textSecondary">
                  Impact Areas
                </Typography>
                <Box className="flex flex-wrap gap-1 mt-1">
                  {selectedUpdate.impactAreas.map((area) => (
                    <Chip key={area} label={area} />
                  ))}
                </Box>
              </Box>
              
              <Box className="mb-4">
                <Typography variant="subtitle2" color="textSecondary">
                  Tags
                </Typography>
                <Box className="flex flex-wrap gap-1 mt-1">
                  {selectedUpdate.tags.map((tag) => (
                    <Chip key={tag} label={tag} variant="outlined" size="small" />
                  ))}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Close</Button>
          <Button
            variant="outlined"
            startIcon={<Article />}
            href={selectedUpdate?.documentUrl}
            target="_blank"
            rel="noopener"
          >
            View Original Document
          </Button>
          <Button
            variant="contained"
            startIcon={<Assessment />}
            onClick={() => {
              handleCloseDetails();
              if (selectedUpdate) handleViewImpactAnalysis(selectedUpdate);
            }}
            disabled={selectedUpdate?.status === 'new'}
          >
            View Impact Analysis
          </Button>
        </DialogActions>
      </Dialog>

      {/* Impact Analysis Dialog */}
      <Dialog
        open={impactAnalysisOpen}
        onClose={handleCloseImpactAnalysis}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle className="flex justify-between items-center">
          <Typography variant="h6">Impact Analysis</Typography>
          <IconButton onClick={handleCloseImpactAnalysis} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedUpdate && (
            <Box>
              <Box className="flex justify-between items-start mb-4">
                <Typography variant="h6">{selectedUpdate.title}</Typography>
                {getImpactLevelChip(selectedUpdate.impactLevel)}
              </Box>
              
              <Box className="bg-amber-50 border border-amber-200 rounded p-3 mb-4">
                <Typography variant="subtitle2" className="text-amber-800">
                  Executive Summary
                </Typography>
                <Typography variant="body2" className="text-amber-700">
                  This regulatory update has significant impacts on our training programs, specifically in the areas of {selectedUpdate.impactAreas.join(', ')}. Implementation will require updates to syllabus content, instructor training, and assessment methods.
                </Typography>
              </Box>
              
              <Typography variant="subtitle1" className="mb-2">
                Affected Training Elements
              </Typography>
              <TableContainer className="mb-4">
                <Table size="small">
                  <TableHead className="bg-gray-50">
                    <TableRow>
                      <TableCell>Element Type</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Impact Level</TableCell>
                      <TableCell>Required Changes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Syllabus</TableCell>
                      <TableCell>B737 Type Rating</TableCell>
                      <TableCell>
                        <Chip label="High" size="small" color="warning" />
                      </TableCell>
                      <TableCell>Update module content and assessment criteria</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Module</TableCell>
                      <TableCell>Aircraft Systems</TableCell>
                      <TableCell>
                        <Chip label="Medium" size="small" color="info" />
                      </TableCell>
                      <TableCell>Add new content on system limitations</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Exercise</TableCell>
                      <TableCell>Emergency Procedures</TableCell>
                      <TableCell>
                        <Chip label="Critical" size="small" color="error" />
                      </TableCell>
                      <TableCell>Complete revision of exercise objectives and scenarios</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Assessment</TableCell>
                      <TableCell>Final Checkride</TableCell>
                      <TableCell>
                        <Chip label="High" size="small" color="warning" />
                      </TableCell>
                      <TableCell>Update grading criteria and minimum performance standards</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Typography variant="subtitle1" className="mb-2">
                Implementation Timeline
              </Typography>
              <List className="border rounded mb-4">
                <ListItem>
                  <ListItemIcon>
                    <CalendarToday color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Phase 1: Documentation Updates"
                    secondary="August 1 - August 15, 2023"
                  />
                </ListItem>
                <Divider variant="inset" component="li" />
                <ListItem>
                  <ListItemIcon>
                    <CalendarToday color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Phase 2: Instructor Training"
                    secondary="August 16 - August 31, 2023"
                  />
                </ListItem>
                <Divider variant="inset" component="li" />
                <ListItem>
                  <ListItemIcon>
                    <CalendarToday color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Phase 3: Syllabus and Content Updates"
                    secondary="September 1 - September 15, 2023"
                  />
                </ListItem>
                <Divider variant="inset" component="li" />
                <ListItem>
                  <ListItemIcon>
                    <CalendarToday color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Phase 4: Implementation and Verification"
                    secondary="September 16 - September 30, 2023"
                  />
                </ListItem>
              </List>
              
              <Typography variant="subtitle1" className="mb-2">
                Resources Required
              </Typography>
              <Box className="grid grid-cols-2 gap-4 mb-4">
                <Paper variant="outlined" className="p-3">
                  <Typography variant="subtitle2">Staff Resources</Typography>
                  <Typography variant="body2">
                    • 2 Instructional Designers: 80 hours<br />
                    • 4 Subject Matter Experts: 40 hours each<br />
                    • 1 Compliance Officer: 60 hours
                  </Typography>
                </Paper>
                
                <Paper variant="outlined" className="p-3">
                  <Typography variant="subtitle2">Technical Resources</Typography>
                  <Typography variant="body2">
                    • Training content updates<br />
                    • Simulator scenario reprogramming<br />
                    • Assessment tool reconfiguration
                  </Typography>
                </Paper>
              </Box>
              
              <Typography variant="subtitle1" className="mb-2">
                Risk Assessment
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead className="bg-gray-50">
                    <TableRow>
                      <TableCell>Risk</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>Mitigation Strategy</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Insufficient implementation time</TableCell>
                      <TableCell>
                        <Chip label="High" size="small" color="error" />
                      </TableCell>
                      <TableCell>Request extension from authority; prioritize critical elements</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Instructor adaptation challenges</TableCell>
                      <TableCell>
                        <Chip label="Medium" size="small" color="warning" />
                      </TableCell>
                      <TableCell>Conduct early workshops; provide detailed guidance materials</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Compliance interpretation errors</TableCell>
                      <TableCell>
                        <Chip label="Medium" size="small" color="warning" />
                      </TableCell>
                      <TableCell>Seek official clarification; consult with regulatory experts</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseImpactAnalysis}>Close</Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
          >
            Download Analysis
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

// app/compliance/page.tsx
'use client';

import React, { useState } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  Paper 
} from '@mui/material';
import { RegulatoryComplianceMatrix } from '@/components/compliance/RegulatoryComplianceMatrix';
import { AuditTrailLog } from '@/components/compliance/AuditTrailLog';
import { RegulatoryUpdatesTracker } from '@/components/compliance/RegulatoryUpdatesTracker';

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="xl">
      <Box className="py-6">
        <Typography variant="h4" className="mb-6">Compliance & Audit Management</Typography>
        
        <Paper elevation={1} className="mb-6">
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Regulatory Compliance Matrix" />
            <Tab label="Audit Trail Log" />
            <Tab label="Regulatory Updates Tracker" />
            <Tab label="Document Verification" />
          </Tabs>
        </Paper>
        
        {activeTab === 0 && <RegulatoryComplianceMatrix />}
        {activeTab === 1 && <AuditTrailLog />}
        {activeTab === 2 && <RegulatoryUpdatesTracker />}
        {activeTab === 3 && (
          <Typography variant="body1">Document Verification Tab Content</Typography>
        )}
      </Box>
    </Container>
  );
};
