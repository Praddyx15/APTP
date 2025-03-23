// components/syllabus-builder/SyllabusTemplateSelector.tsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Button, 
  Skeleton,
  Chip,
  CircularProgress
} from '@mui/material';
import { 
  School, 
  FlightTakeoff, 
  Settings, 
  Info, 
  Check, 
  Star, 
  StarBorder,
  CorporateFare
} from '@mui/icons-material';
import { syllabusApi } from '@/lib/api/apiClient';

interface Template {
  id: string;
  title: string;
  description: string;
  type: 'JOC/MCC' | 'Type Rating' | 'Recurrent' | 'Custom' | 'Commercial' | 'Flight Instructor';
  authority: 'EASA' | 'FAA' | 'ICAO' | 'DGCA' | 'Custom';
  tags: string[];
  moduleCount: number;
  estimatedDuration: string;
  popularity: number;
  thumbnail?: string;
  isFavorite: boolean;
}

interface SyllabusTemplateSelectorProps {
  onSelectTemplate: (templateId: string) => void;
}

export const SyllabusTemplateSelector: React.FC<SyllabusTemplateSelectorProps> = ({ 
  onSelectTemplate 
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  
  useEffect(() => {
    fetchTemplates();
  }, []);
  
  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await syllabusApi.getTemplates();
      setTemplates(result);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    onSelectTemplate(templateId);
  };
  
  const getTemplateIcon = (type: string) => {
    switch (type) {
      case 'JOC/MCC':
        return <CorporateFare />;
      case 'Type Rating':
        return <FlightTakeoff />;
      case 'Recurrent':
        return <Settings />;
      case 'Flight Instructor':
        return <School />;
      default:
        return <Info />;
    }
  };
  
  const toggleFavorite = async (templateId: string, isFavorite: boolean) => {
    // Update UI optimistically
    setTemplates(templates.map(t => 
      t.id === templateId ? { ...t, isFavorite: !isFavorite } : t
    ));
    
    // In a real app, you'd call an API here to update the favorite status
    // try {
    //   await syllabusApi.updateFavoriteStatus(templateId, !isFavorite);
    // } catch (error) {
    //   // Revert on error
    //   setTemplates(templates.map(t => 
    //     t.id === templateId ? { ...t, isFavorite: isFavorite } : t
    //   ));
    // }
  };
  
  if (loading) {
    return (
      <Grid container spacing={3}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Grid item xs={12} sm={6} md={4} key={i}>
            <Card>
              <CardContent>
                <Skeleton variant="rectangular" height={40} className="mb-2" />
                <Skeleton variant="rectangular" height={100} />
                <Box className="mt-2">
                  <Skeleton variant="text" />
                  <Skeleton variant="text" width="60%" />
                </Box>
              </CardContent>
              <CardActions>
                <Skeleton variant="rectangular" height={36} width="100%" />
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }
  
  if (error) {
    return (
      <Box className="p-6 text-center text-red-600">
        <Typography variant="body1">{error}</Typography>
        <Button 
          variant="outlined" 
          color="primary" 
          onClick={fetchTemplates}
          className="mt-4"
        >
          Retry
        </Button>
      </Box>
    );
  }
  
  return (
    <Grid container spacing={3}>
      {templates.map((template) => (
        <Grid item xs={12} sm={6} md={4} key={template.id}>
          <Card 
            className={`h-full ${selectedTemplate === template.id ? 'ring-2 ring-blue-500' : ''}`}
            elevation={selectedTemplate === template.id ? 3 : 1}
          >
            <Box className="p-4 flex items-center justify-between bg-gray-50">
              <Box className="flex items-center">
                <Box className="mr-2 text-blue-500">
                  {getTemplateIcon(template.type)}
                </Box>
                <Typography variant="h6" className="truncate" title={template.title}>
                  {template.title}
                </Typography>
              </Box>
              <Button
                onClick={() => toggleFavorite(template.id, template.isFavorite)}
                className="min-w-0 p-1"
              >
                {template.isFavorite ? (
                  <Star className="text-amber-500" />
                ) : (
                  <StarBorder />
                )}
              </Button>
            </Box>
            
            <CardContent>
              <Box className="flex flex-wrap gap-1 mb-3">
                <Chip 
                  label={template.type} 
                  size="small" 
                  color="primary" 
                  variant="outlined" 
                />
                <Chip 
                  label={template.authority} 
                  size="small" 
                  color="secondary" 
                  variant="outlined" 
                />
                {template.tags.slice(0, 2).map((tag, index) => (
                  <Chip key={index} label={tag} size="small" />
                ))}
                {template.tags.length > 2 && (
                  <Chip 
                    label={`+${template.tags.length - 2}`} 
                    size="small" 
                    variant="outlined" 
                  />
                )}
              </Box>
              
              <Typography variant="body2" color="textSecondary" className="mb-3">
                {template.description}
              </Typography>
              
              <Box className="flex flex-wrap items-center text-sm text-gray-500 mb-2">
                <Box className="flex items-center mr-4">
                  <Info fontSize="small" className="mr-1" />
                  <Typography variant="body2">
                    {template.moduleCount} modules
                  </Typography>
                </Box>
                <Box className="flex items-center">
                  <Settings fontSize="small" className="mr-1" />
                  <Typography variant="body2">
                    {template.estimatedDuration}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
            
            <CardActions className="bg-gray-50">
              <Button 
                variant={selectedTemplate === template.id ? "contained" : "outlined"}
                color="primary"
                fullWidth
                onClick={() => handleSelectTemplate(template.id)}
                startIcon={selectedTemplate === template.id ? <Check /> : undefined}
              >
                {selectedTemplate === template.id ? "Selected" : "Select Template"}
              </Button>
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

// components/syllabus-builder/ModuleList.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Collapse,
  Chip,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  DragIndicator,
  MoreVert,
  Add,
  Edit,
  Delete,
  FileCopy,
  Warning,
  Info,
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface Exercise {
  id: string;
  title: string;
  type: string;
  duration: number;
  status: 'draft' | 'approved' | 'modified';
  compliance: {
    status: 'compliant' | 'warning' | 'non-compliant';
    message?: string;
  };
}

interface Module {
  id: string;
  title: string;
  description: string;
  exercises: Exercise[];
  expanded?: boolean;
}

interface ModuleListProps {
  modules: Module[];
  onModulesChange: (modules: Module[]) => void;
  onEditExercise: (moduleId: string, exerciseId: string) => void;
}

export const ModuleList: React.FC<ModuleListProps> = ({
  modules,
  onModulesChange,
  onEditExercise,
}) => {
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(
    modules.reduce((acc, module) => {
      acc[module.id] = module.expanded || false;
      return acc;
    }, {} as Record<string, boolean>)
  );
  
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [activeExercise, setActiveExercise] = useState<string | null>(null);

  const toggleModule = (moduleId: string) => {
    setExpandedModules({
      ...expandedModules,
      [moduleId]: !expandedModules[moduleId],
    });
  };

  const handleModuleMenuClick = (event: React.MouseEvent<HTMLElement>, moduleId: string) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setActiveModule(moduleId);
    setActiveExercise(null);
  };

  const handleExerciseMenuClick = (
    event: React.MouseEvent<HTMLElement>,
    moduleId: string,
    exerciseId: string
  ) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setActiveModule(moduleId);
    setActiveExercise(exerciseId);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setActiveModule(null);
    setActiveExercise(null);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) {
      return;
    }

    const { source, destination, type } = result;

    // Handle module reordering
    if (type === 'module') {
      const reorderedModules = [...modules];
      const [removed] = reorderedModules.splice(source.index, 1);
      reorderedModules.splice(destination.index, 0, removed);
      onModulesChange(reorderedModules);
      return;
    }

    // Handle exercise reordering within the same module
    if (source.droppableId === destination.droppableId) {
      const moduleId = source.droppableId;
      const moduleIndex = modules.findIndex((m) => m.id === moduleId);
      
      if (moduleIndex === -1) return;
      
      const moduleExercises = [...modules[moduleIndex].exercises];
      const [removed] = moduleExercises.splice(source.index, 1);
      moduleExercises.splice(destination.index, 0, removed);
      
      const updatedModules = [...modules];
      updatedModules[moduleIndex] = {
        ...updatedModules[moduleIndex],
        exercises: moduleExercises,
      };
      
      onModulesChange(updatedModules);
      return;
    }

    // Handle exercise moving between modules
    const sourceModuleId = source.droppableId;
    const destModuleId = destination.droppableId;
    const sourceModuleIndex = modules.findIndex((m) => m.id === sourceModuleId);
    const destModuleIndex = modules.findIndex((m) => m.id === destModuleId);
    
    if (sourceModuleIndex === -1 || destModuleIndex === -1) return;
    
    const sourceExercises = [...modules[sourceModuleIndex].exercises];
    const destExercises = [...modules[destModuleIndex].exercises];
    
    const [removed] = sourceExercises.splice(source.index, 1);
    destExercises.splice(destination.index, 0, removed);
    
    const updatedModules = [...modules];
    updatedModules[sourceModuleIndex] = {
      ...updatedModules[sourceModuleIndex],
      exercises: sourceExercises,
    };
    updatedModules[destModuleIndex] = {
      ...updatedModules[destModuleIndex],
      exercises: destExercises,
    };
    
    onModulesChange(updatedModules);
  };

  const getComplianceIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return null;
      case 'warning':
        return (
          <Tooltip title="Compliance warning">
            <Warning className="text-amber-500" />
          </Tooltip>
        );
      case 'non-compliant':
        return (
          <Tooltip title="Non-compliant">
            <Warning className="text-red-500" />
          </Tooltip>
        );
      default:
        return null;
    }
  };

  return (
    <Box>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="modules" type="module">
          {(provided) => (
            <List {...provided.droppableProps} ref={provided.innerRef} className="p-0">
              {modules.map((module, moduleIndex) => (
                <Draggable key={module.id} draggableId={module.id} index={moduleIndex}>
                  {(provided) => (
                    <Paper
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="mb-4"
                      elevation={1}
                    >
                      <ListItem
                        button
                        onClick={() => toggleModule(module.id)}
                        className="bg-gray-50"
                      >
                        <div {...provided.dragHandleProps} className="mr-2">
                          <DragIndicator className="text-gray-400" />
                        </div>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle1" className="font-medium">
                              {module.title}
                            </Typography>
                          }
                          secondary={
                            <Box className="flex items-center flex-wrap gap-2 mt-1">
                              <Typography variant="body2" color="textSecondary" noWrap>
                                {module.exercises.length} exercises
                              </Typography>
                              <Typography variant="body2" color="textSecondary" noWrap>
                                {module.exercises.reduce((total, ex) => total + ex.duration, 0)} minutes
                              </Typography>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={(e) => handleModuleMenuClick(e, module.id)}
                            size="small"
                          >
                            <MoreVert />
                          </IconButton>
                          {expandedModules[module.id] ? <ExpandLess /> : <ExpandMore />}
                        </ListItemSecondaryAction>
                      </ListItem>

                      <Collapse in={expandedModules[module.id]} timeout="auto" unmountOnExit>
                        <Droppable droppableId={module.id} type="exercise">
                          {(provided) => (
                            <List
                              dense
                              className="pl-10 py-0"
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                            >
                              {module.exercises.map((exercise, exerciseIndex) => (
                                <Draggable key={exercise.id} draggableId={exercise.id} index={exerciseIndex}>
                                  {(provided) => (
                                    <ListItem
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className="border-b last:border-b-0"
                                    >
                                      <ListItemIcon className="min-w-0">
                                        <DragIndicator className="text-gray-300" />
                                      </ListItemIcon>
                                      <ListItemText
                                        primary={
                                          <Box className="flex items-center">
                                            <Typography variant="body1">
                                              {exercise.title}
                                            </Typography>
                                            {exercise.status === 'modified' && (
                                              <Chip
                                                label="Modified"
                                                size="small"
                                                color="warning"
                                                className="ml-2"
                                              />
                                            )}
                                            {exercise.status === 'draft' && (
                                              <Chip
                                                label="Draft"
                                                size="small"
                                                color="default"
                                                className="ml-2"
                                              />
                                            )}
                                          </Box>
                                        }
                                        secondary={
                                          <Box className="flex items-center mt-1">
                                            <Chip
                                              label={exercise.type}
                                              size="small"
                                              variant="outlined"
                                              className="mr-2"
                                            />
                                            <Typography variant="body2" color="textSecondary">
                                              {exercise.duration} min
                                            </Typography>
                                          </Box>
                                        }
                                      />
                                      <ListItemSecondaryAction>
                                        {getComplianceIcon(exercise.compliance.status)}
                                        <IconButton
                                          edge="end"
                                          onClick={(e) =>
                                            handleExerciseMenuClick(e, module.id, exercise.id)
                                          }
                                          size="small"
                                        >
                                          <MoreVert />
                                        </IconButton>
                                      </ListItemSecondaryAction>
                                    </ListItem>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                              <ListItem button className="text-blue-500 hover:bg-blue-50">
                                <ListItemIcon>
                                  <Add />
                                </ListItemIcon>
                                <ListItemText primary="Add Exercise" />
                              </ListItem>
                            </List>
                          )}
                        </Droppable>
                      </Collapse>
                    </Paper>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </List>
          )}
        </Droppable>
      </DragDropContext>

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        {activeModule && !activeExercise && (
          <>
            <MenuItem onClick={handleMenuClose}>
              <Edit fontSize="small" className="mr-2" /> Edit Module
            </MenuItem>
            <MenuItem onClick={handleMenuClose}>
              <Add fontSize="small" className="mr-2" /> Add Exercise
            </MenuItem>
            <MenuItem onClick={handleMenuClose}>
              <FileCopy fontSize="small" className="mr-2" /> Duplicate
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleMenuClose} className="text-red-600">
              <Delete fontSize="small" className="mr-2" /> Delete Module
            </MenuItem>
          </>
        )}

        {activeModule && activeExercise && (
          <>
            <MenuItem 
              onClick={() => {
                onEditExercise(activeModule, activeExercise!);
                handleMenuClose();
              }}
            >
              <Edit fontSize="small" className="mr-2" /> Edit Exercise
            </MenuItem>
            <MenuItem onClick={handleMenuClose}>
              <FileCopy fontSize="small" className="mr-2" /> Duplicate
            </MenuItem>
            <MenuItem onClick={handleMenuClose}>
              <Info fontSize="small" className="mr-2" /> View Compliance
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleMenuClose} className="text-red-600">
              <Delete fontSize="small" className="mr-2" /> Delete Exercise
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  );
};

// components/syllabus-builder/ComplianceIndicator.tsx
import React from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Error,
  InfoOutlined,
  ArrowForward,
} from '@mui/icons-material';

interface ComplianceItem {
  id: string;
  title: string;
  source: string;
  status: 'compliant' | 'warning' | 'non-compliant';
  message?: string;
  relatedElements?: {
    id: string;
    title: string;
    type: 'module' | 'exercise';
  }[];
}

interface ComplianceIndicatorProps {
  compliance: {
    overallStatus: 'compliant' | 'warning' | 'non-compliant';
    score: number; // 0-100
    items: ComplianceItem[];
  };
  onViewElement?: (elementType: 'module' | 'exercise', id: string) => void;
}

export const ComplianceIndicator: React.FC<ComplianceIndicatorProps> = ({
  compliance,
  onViewElement,
}) => {
  const { overallStatus, score, items } = compliance;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'text-green-500';
      case 'warning':
        return 'text-amber-500';
      case 'non-compliant':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="text-green-500" />;
      case 'warning':
        return <Warning className="text-amber-500" />;
      case 'non-compliant':
        return <Error className="text-red-500" />;
      default:
        return <InfoOutlined className="text-gray-500" />;
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'bg-green-50';
      case 'warning':
        return 'bg-amber-50';
      case 'non-compliant':
        return 'bg-red-50';
      default:
        return 'bg-gray-50';
    }
  };

  return (
    <Paper elevation={1}>
      <Box className={`p-4 ${getStatusBgColor(overallStatus)}`}>
        <Box className="flex items-center mb-2">
          {getStatusIcon(overallStatus)}
          <Typography variant="h6" className="ml-2">
            Compliance Status
          </Typography>
        </Box>

        <Box className="mb-2">
          <Box className="flex justify-between mb-1">
            <Typography variant="body2" color="textSecondary">
              Overall compliance
            </Typography>
            <Typography
              variant="body2"
              className={getStatusColor(overallStatus)}
              fontWeight="medium"
            >
              {score}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={score}
            color={
              overallStatus === 'compliant'
                ? 'success'
                : overallStatus === 'warning'
                ? 'warning'
                : 'error'
            }
          />
        </Box>
      </Box>

      <Divider />

      <List dense>
        {items.map((item) => (
          <ListItem key={item.id} className={getStatusBgColor(item.status)}>
            <ListItemIcon>{getStatusIcon(item.status)}</ListItemIcon>
            <ListItemText
              primary={
                <Box className="flex items-center">
                  <Typography variant="body2" fontWeight="medium">
                    {item.title}
                  </Typography>
                  <Tooltip title={`Source: ${item.source}`}>
                    <InfoOutlined
                      fontSize="small"
                      className="ml-1 text-gray-500"
                      style={{ fontSize: '16px' }}
                    />
                  </Tooltip>
                </Box>
              }
              secondary={
                item.message && (
                  <Typography variant="body2" color="textSecondary">
                    {item.message}
                  </Typography>
                )
              }
            />
            {item.relatedElements && item.relatedElements.length > 0 && (
              <Tooltip title="View related element">
                <IconButton
                  size="small"
                  onClick={() =>
                    onViewElement?.(
                      item.relatedElements![0].type,
                      item.relatedElements![0].id
                    )
                  }
                >
                  <ArrowForward fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

// components/syllabus-builder/SyllabusVersionHistory.tsx
import React from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  Collapse,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  History,
  Person,
  CompareArrows,
  Restore,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';

interface VersionChange {
  type: 'added' | 'modified' | 'removed';
  element: {
    type: 'module' | 'exercise' | 'setting';
    id: string;
    title: string;
  };
  details?: string;
}

interface Version {
  id: string;
  number: string;
  timestamp: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  message: string;
  changes: VersionChange[];
}

interface SyllabusVersionHistoryProps {
  versions: Version[];
  onCompareVersions: (versionA: string, versionB: string) => void;
  onRestoreVersion: (versionId: string) => void;
}

export const SyllabusVersionHistory: React.FC<SyllabusVersionHistoryProps> = ({
  versions,
  onCompareVersions,
  onRestoreVersion,
}) => {
  const [expandedVersions, setExpandedVersions] = React.useState<Record<string, boolean>>({});

  const toggleVersion = (versionId: string) => {
    setExpandedVersions({
      ...expandedVersions,
      [versionId]: !expandedVersions[versionId],
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Paper elevation={1}>
      <Box className="p-4 bg-gray-50 border-b flex items-center">
        <History className="mr-2" />
        <Typography variant="h6">Version History</Typography>
      </Box>

      <List className="py-0">
        {versions.map((version, index) => (
          <React.Fragment key={version.id}>
            <ListItem button onClick={() => toggleVersion(version.id)}>
              <ListItemIcon>
                <Box className="flex flex-col items-center">
                  <Box
                    className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium"
                  >
                    {index === 0 ? 'C' : index + 1}
                  </Box>
                  {index < versions.length - 1 && (
                    <Box className="w-0.5 h-full bg-gray-200 my-1" />
                  )}
                </Box>
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box className="flex items-center">
                    <Typography variant="body1" fontWeight="medium">
                      {index === 0 ? 'Current Version' : `Version ${version.number}`}
                    </Typography>
                    {index === 0 && (
                      <Chip
                        label="Latest"
                        size="small"
                        color="primary"
                        className="ml-2"
                      />
                    )}
                  </Box>
                }
                secondary={
                  <Box className="mt-1">
                    <Box className="flex items-center">
                      <Person fontSize="small" className="mr-1 text-gray-500" />
                      <Typography variant="body2" color="textSecondary">
                        {version.author.name} • {formatDate(version.timestamp)}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      className="mt-1"
                    >
                      {version.message}
                    </Typography>
                  </Box>
                }
              />
              <Box className="flex items-center">
                {index > 0 && (
                  <Tooltip title="Restore this version">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestoreVersion(version.id);
                      }}
                    >
                      <Restore />
                    </IconButton>
                  </Tooltip>
                )}
                {index > 0 && (
                  <Tooltip title="Compare with current">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCompareVersions(versions[0].id, version.id);
                      }}
                    >
                      <CompareArrows />
                    </IconButton>
                  </Tooltip>
                )}
                {expandedVersions[version.id] ? <ExpandLess /> : <ExpandMore />}
              </Box>
            </ListItem>

            <Collapse in={expandedVersions[version.id]} timeout="auto" unmountOnExit>
              <Box className="pl-16 pr-4 py-2 bg-gray-50">
                <Typography variant="subtitle2" className="mb-2">
                  Changes
                </Typography>
                <List dense className="pl-2">
                  {version.changes.map((change, changeIndex) => (
                    <ListItem key={changeIndex} className="py-1">
                      <ListItemText
                        primary={
                          <Box className="flex items-center">
                            <Chip
                              label={change.type}
                              size="small"
                              color={
                                change.type === 'added'
                                  ? 'success'
                                  : change.type === 'modified'
                                  ? 'warning'
                                  : 'error'
                              }
                              className="mr-2"
                            />
                            <Typography variant="body2">
                              {change.element.type === 'module'
                                ? 'Module: '
                                : change.element.type === 'exercise'
                                ? 'Exercise: '
                                : 'Setting: '}
                              {change.element.title}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          change.details && (
                            <Typography
                              variant="body2"
                              color="textSecondary"
                              className="mt-1 pl-2 border-l-2 border-gray-300"
                            >
                              {change.details}
                            </Typography>
                          )
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Collapse>
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

// app/syllabus-builder/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Paper,
  Divider,
  Grid,
  TextField,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import { 
  NavigateNext, 
  NavigateBefore, 
  Save, 
  VerifiedUser, 
  History,
  Visibility
} from '@mui/icons-material';
import { syllabusApi } from '@/lib/api/apiClient';
import { SyllabusTemplateSelector } from '@/components/syllabus-builder/SyllabusTemplateSelector';
import { ModuleList } from '@/components/syllabus-builder/ModuleList';
import { ComplianceIndicator } from '@/components/syllabus-builder/ComplianceIndicator';
import { SyllabusVersionHistory } from '@/components/syllabus-builder/SyllabusVersionHistory';

// Mock data for modules
const mockModules = [
  {
    id: 'module-1',
    title: 'Ground School Introduction',
    description: 'Basic introduction to aircraft systems and procedures',
    expanded: true,
    exercises: [
      {
        id: 'ex-1-1',
        title: 'Aircraft General Knowledge',
        type: 'Theory',
        duration: 120,
        status: 'approved',
        compliance: {
          status: 'compliant',
        },
      },
      {
        id: 'ex-1-2',
        title: 'Flight Planning',
        type: 'Theory',
        duration: 90,
        status: 'modified',
        compliance: {
          status: 'warning',
          message: 'Content modified from regulatory requirement',
        },
      },
    ],
  },
  {
    id: 'module-2',
    title: 'Basic Flight Training',
    description: 'Introduction to basic flight maneuvers',
    exercises: [
      {
        id: 'ex-2-1',
        title: 'Pre-flight Procedures',
        type: 'Simulator',
        duration: 60,
        status: 'approved',
        compliance: {
          status: 'compliant',
        },
      },
      {
        id: 'ex-2-2',
        title: 'Basic Aircraft Control',
        type: 'Simulator',
        duration: 120,
        status: 'draft',
        compliance: {
          status: 'non-compliant',
          message: 'Missing required elements for EASA compliance',
        },
      },
    ],
  },
];

// Mock compliance data
const mockCompliance = {
  overallStatus: 'warning' as const,
  score: 85,
  items: [
    {
      id: 'comp-1',
      title: 'EASA FCL.725.A Type Rating Training',
      source: 'EASA Part-FCL',
      status: 'compliant' as const,
    },
    {
      id: 'comp-2',
      title: 'EASA AMC1 FCL.725.A(b) Flight Training',
      source: 'EASA Part-FCL',
      status: 'warning' as const,
      message: 'Flight planning module content has been modified from standard',
      relatedElements: [
        {
          id: 'ex-1-2',
          title: 'Flight Planning',
          type: 'exercise' as const,
        },
      ],
    },
    {
      id: 'comp-3',
      title: 'EASA AMC1 FCL.725.A(c) Skill Test',
      source: 'EASA Part-FCL',
      status: 'non-compliant' as const,
      message: 'Basic Aircraft Control exercise missing required elements',
      relatedElements: [
        {
          id: 'ex-2-2',
          title: 'Basic Aircraft Control',
          type: 'exercise' as const,
        },
      ],
    },
  ],
};

// Mock version history
const mockVersions = [
  {
    id: 'v-current',
    number: '1.2',
    timestamp: new Date().toISOString(),
    author: {
      id: 'user-1',
      name: 'Jane Smith',
    },
    message: 'Updated Flight Planning module content',
    changes: [
      {
        type: 'modified' as const,
        element: {
          type: 'exercise' as const,
          id: 'ex-1-2',
          title: 'Flight Planning',
        },
        details: 'Added content specific to airline operations',
      },
    ],
  },
  {
    id: 'v-1',
    number: '1.1',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    author: {
      id: 'user-1',
      name: 'Jane Smith',
    },
    message: 'Added Basic Flight Training module',
    changes: [
      {
        type: 'added' as const,
        element: {
          type: 'module' as const,
          id: 'module-2',
          title: 'Basic Flight Training',
        },
      },
      {
        type: 'added' as const,
        element: {
          type: 'exercise' as const,
          id: 'ex-2-1',
          title: 'Pre-flight Procedures',
        },
      },
      {
        type: 'added' as const,
        element: {
          type: 'exercise' as const,
          id: 'ex-2-2',
          title: 'Basic Aircraft Control',
        },
      },
    ],
  },
  {
    id: 'v-0',
    number: '1.0',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    author: {
      id: 'user-2',
      name: 'John Doe',
    },
    message: 'Initial syllabus creation',
    changes: [
      {
        type: 'added' as const,
        element: {
          type: 'module' as const,
          id: 'module-1',
          title: 'Ground School Introduction',
        },
      },
      {
        type: 'added' as const,
        element: {
          type: 'exercise' as const,
          id: 'ex-1-1',
          title: 'Aircraft General Knowledge',
        },
      },
      {
        type: 'added' as const,
        element: {
          type: 'exercise' as const,
          id: 'ex-1-2',
          title: 'Flight Planning',
        },
      },
    ],
  },
];

const steps = ['Select Template', 'Basic Information', 'Customize Content', 'Review & Publish'];

export default function SyllabusBuilderPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [syllabusTitle, setSyllabusTitle] = useState('');
  const [syllabusDescription, setSyllabusDescription] = useState('');
  const [modules, setModules] = useState(mockModules);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
  };

  const handleModulesChange = (updatedModules: any[]) => {
    setModules(updatedModules);
  };

  const handleEditExercise = (moduleId: string, exerciseId: string) => {
    // Handle exercise editing - would open modal or navigate to exercise editor
    console.log(`Edit exercise ${exerciseId} in module ${moduleId}`);
  };

  const handleViewElement = (elementType: 'module' | 'exercise', elementId: string) => {
    // Scroll to element or navigate to it
    console.log(`Navigate to ${elementType} ${elementId}`);
  };

  const handleCompareVersions = (versionA: string, versionB: string) => {
    console.log(`Compare versions ${versionA} and ${versionB}`);
  };

  const handleRestoreVersion = (versionId: string) => {
    console.log(`Restore version ${versionId}`);
  };

  const handleSaveSyllabus = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Call API to save syllabus
      // const result = await syllabusApi.updateSyllabus('syllabus-id', {
      //   title: syllabusTitle,
      //   description: syllabusDescription,
      //   modules,
      // });
      
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Success
      console.log('Syllabus saved successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to save syllabus');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Call API to publish syllabus
      // const result = await syllabusApi.publishSyllabus('syllabus-id');
      
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Navigate to syllabus view or dashboard
      console.log('Syllabus published successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to publish syllabus');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="xl">
      <Box className="py-6">
        <Typography variant="h4" className="mb-6">Syllabus Builder</Typography>
        
        <Stepper activeStep={activeStep} className="mb-8">
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {activeStep === 0 && (
          <Box>
            <Typography variant="h5" className="mb-4">Select a Template</Typography>
            <Typography variant="body1" className="mb-6">
              Choose a starting point for your training syllabus. You'll be able to customize it in the next steps.
            </Typography>
            
            <SyllabusTemplateSelector onSelectTemplate={handleTemplateSelect} />
            
            <Box className="mt-6 flex justify-end">
              <Button
                variant="contained"
                color="primary"
                onClick={handleNext}
                endIcon={<NavigateNext />}
                disabled={!selectedTemplate}
              >
                Continue
              </Button>
            </Box>
          </Box>
        )}
        
        {activeStep === 1 && (
          <Box>
            <Typography variant="h5" className="mb-4">Basic Information</Typography>
            <Typography variant="body1" className="mb-6">
              Enter the basic details for your training syllabus.
            </Typography>
            
            <Paper elevation={1} className="p-6 mb-6">
              <Grid container spacing={4}>
                <Grid item xs={12}>
                  <TextField
                    label="Syllabus Title"
                    variant="outlined"
                    fullWidth
                    value={syllabusTitle}
                    onChange={(e) => setSyllabusTitle(e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Description"
                    variant="outlined"
                    fullWidth
                    multiline
                    rows={4}
                    value={syllabusDescription}
                    onChange={(e) => setSyllabusDescription(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Aircraft Type"
                    variant="outlined"
                    fullWidth
                    defaultValue="Boeing 737-800"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Regulatory Framework"
                    variant="outlined"
                    fullWidth
                    defaultValue="EASA Part-FCL"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Training Organization"
                    variant="outlined"
                    fullWidth
                    defaultValue="Example Training Academy"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Estimated Duration"
                    variant="outlined"
                    fullWidth
                    defaultValue="4 weeks"
                  />
                </Grid>
              </Grid>
            </Paper>
            
            <Box className="flex justify-between">
              <Button
                variant="outlined"
                onClick={handleBack}
                startIcon={<NavigateBefore />}
              >
                Back
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleNext}
                endIcon={<NavigateNext />}
                disabled={!syllabusTitle}
              >
                Continue
              </Button>
            </Box>
          </Box>
        )}
        
        {activeStep === 2 && (
          <Box>
            <Typography variant="h5" className="mb-4">Customize Content</Typography>
            <Typography variant="body1" className="mb-6">
              Drag and drop to reorganize modules and exercises. Click on items to edit their details.
            </Typography>
            
            <Grid container spacing={4}>
              <Grid item xs={12} md={8}>
                <Paper elevation={1} className="p-4 mb-4">
                  <Box className="flex justify-between items-center mb-4">
                    <Typography variant="h6">Training Modules</Typography>
                    <Button 
                      variant="outlined" 
                      startIcon={<Save />}
                      onClick={handleSaveSyllabus}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <CircularProgress size={24} /> : 'Save'}
                    </Button>
                  </Box>
                  <ModuleList 
                    modules={modules} 
                    onModulesChange={handleModulesChange}
                    onEditExercise={handleEditExercise}
                  />
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Paper elevation={1} className="p-4 mb-4">
                  <Box className="flex items-center mb-4">
                    <VerifiedUser className="mr-2 text-blue-500" />
                    <Typography variant="h6">Compliance Status</Typography>
                  </Box>
                  <ComplianceIndicator 
                    compliance={mockCompliance}
                    onViewElement={handleViewElement}
                  />
                </Paper>
                
                <Paper elevation={1} className="p-4">
                  <Box className="flex items-center mb-4">
                    <History className="mr-2 text-blue-500" />
                    <Typography variant="h6">Version History</Typography>
                  </Box>
                  <SyllabusVersionHistory 
                    versions={mockVersions}
                    onCompareVersions={handleCompareVersions}
                    onRestoreVersion={handleRestoreVersion}
                  />
                </Paper>
              </Grid>
            </Grid>
            
            {error && (
              <Alert severity="error" className="my-4">
                {error}
              </Alert>
            )}
            
            <Box className="flex justify-between mt-6">
              <Button
                variant="outlined"
                onClick={handleBack}
                startIcon={<NavigateBefore />}
              >
                Back
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleNext}
                endIcon={<NavigateNext />}
              >
                Continue to Review
              </Button>
            </Box>
          </Box>
        )}
        
        {activeStep === 3 && (
          <Box>
            <Typography variant="h5" className="mb-4">Review & Publish</Typography>
            <Typography variant="body1" className="mb-6">
              Review your syllabus before publishing it. Once published, it will be available for use in training.
            </Typography>
            
            <Paper elevation={1} className="mb-6">
              <Tabs 
                value={activeTab} 
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab label="Summary" />
                <Tab label="Modules & Exercises" />
                <Tab label="Compliance" />
                <Tab label="Preview" />
              </Tabs>
              
              <Box className="p-6">
                {activeTab === 0 && (
                  <Box>
                    <Typography variant="h6" className="mb-4">Syllabus Summary</Typography>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Box className="mb-4">
                          <Typography variant="subtitle1" fontWeight="medium">Title</Typography>
                          <Typography variant="body1">{syllabusTitle}</Typography>
                        </Box>
                        
                        <Box className="mb-4">
                          <Typography variant="subtitle1" fontWeight="medium">Description</Typography>
                          <Typography variant="body1">{syllabusDescription}</Typography>
                        </Box>
                        
                        <Box className="mb-4">
                          <Typography variant="subtitle1" fontWeight="medium">Regulatory Framework</Typography>
                          <Typography variant="body1">EASA Part-FCL</Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Box className="mb-4">
                          <Typography variant="subtitle1" fontWeight="medium">Content Statistics</Typography>
                          <Box className="mt-2">
                            <Typography variant="body1">Modules: {modules.length}</Typography>
                            <Typography variant="body1">
                              Exercises: {modules.reduce((total, module) => total + module.exercises.length, 0)}
                            </Typography>
                            <Typography variant="body1">
                              Total Duration: {modules.reduce((total, module) => 
                                total + module.exercises.reduce((sum, ex) => sum + ex.duration, 0), 0)} minutes
                            </Typography>
                          </Box>
                        </Box>
                        
                        <Box className="mb-4">
                          <Typography variant="subtitle1" fontWeight="medium">Compliance Score</Typography>
                          <Box className="flex items-center mt-1">
                            <Box 
                              className="h-2 bg-gray-200 rounded-full flex-1 mr-2"
                            >
                              <Box 
                                className="h-2 bg-amber-500 rounded-full"
                                style={{ width: `${mockCompliance.score}%` }}
                              />
                            </Box>
                            <Typography variant="body1" fontWeight="medium">
                              {mockCompliance.score}%
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                )}
                
                {activeTab === 1 && (
                  <Box>
                    <Typography variant="h6" className="mb-4">Modules & Exercises</Typography>
                    <ModuleList 
                      modules={modules} 
                      onModulesChange={handleModulesChange}
                      onEditExercise={handleEditExercise}
                    />
                  </Box>
                )}
                
                {activeTab === 2 && (
                  <Box>
                    <Typography variant="h6" className="mb-4">Compliance Details</Typography>
                    <ComplianceIndicator 
                      compliance={mockCompliance}
                      onViewElement={handleViewElement}
                    />
                  </Box>
                )}
                
                {activeTab === 3 && (
                  <Box>
                    <Typography variant="h6" className="mb-4">Syllabus Preview</Typography>
                    <Box className="flex justify-center">
                      <Button
                        variant="outlined"
                        startIcon={<Visibility />}
                        size="large"
                      >
                        Open Full Preview
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
            </Paper>
            
            {error && (
              <Alert severity="error" className="my-4">
                {error}
              </Alert>
            )}
            
            <Box className="flex justify-between">
              <Button
                variant="outlined"
                onClick={handleBack}
                startIcon={<NavigateBefore />}
              >
                Back
              </Button>
              <Box>
                <Button
                  variant="outlined"
                  className="mr-3"
                  onClick={handleSaveSyllabus}
                  disabled={isSubmitting}
                >
                  Save as Draft
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <CircularProgress size={24} />
                  ) : (
                    'Publish Syllabus'
                  )}
                </Button>
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </Container>
  );
}
