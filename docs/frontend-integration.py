// /frontend/components/integration/IntegrationDashboard.tsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Typography, 
  Card, 
  CardContent, 
  CardHeader, 
  Button, 
  Chip, 
  Divider, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  ListItemAvatar, 
  Avatar, 
  IconButton, 
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  useTheme
} from '@mui/material';
import { 
  MonitorPlay, 
  Activity, 
  User, 
  Calendar, 
  Plus, 
  AlignLeft, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Settings,
  Link2,
  Link2Off,
  Clock,
  Zap
} from 'lucide-react';
import { useIntegrationService } from '../../hooks/useIntegrationService';
import { Connection, ConnectionHealth } from '../../types/integration';
import SimulatorConnectDialog from './SimulatorConnectDialog';
import BiometricConnectDialog from './BiometricConnectDialog';
import EnterpriseConnectDialog from './EnterpriseConnectDialog';
import CalendarConnectDialog from './CalendarConnectDialog';
import IntegrationSettingsDialog from './IntegrationSettingsDialog';
import StatusIndicator from '../common/StatusIndicator';

const IntegrationDashboard: React.FC = () => {
  const theme = useTheme();
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [simulatorDialogOpen, setSimulatorDialogOpen] = useState<boolean>(false);
  const [biometricDialogOpen, setBiometricDialogOpen] = useState<boolean>(false);
  const [enterpriseDialogOpen, setEnterpriseDialogOpen] = useState<boolean>(false);
  const [calendarDialogOpen, setCalendarDialogOpen] = useState<boolean>(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState<boolean>(false);
  
  const { 
    connections, 
    connectionHealth, 
    loading, 
    error,
    refreshConnections,
    checkConnectionHealth,
    deleteConnection,
    simulators,
    biometricDevices,
    enterpriseSystems,
    calendars,
  } = useIntegrationService();
  
  useEffect(() => {
    refreshConnections();
    
    // Check connection health every minute
    const interval = setInterval(() => {
      checkConnectionHealth();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [refreshConnections, checkConnectionHealth]);
  
  const handleOpenSettings = (connection: Connection) => {
    setSelectedConnection(connection);
    setSettingsOpen(true);
  };
  
  const handleDeleteConnection = async () => {
    if (selectedConnection) {
      await deleteConnection(selectedConnection.id);
      setConfirmDeleteOpen(false);
      setSelectedConnection(null);
    }
  };
  
  const getConnectionTypeName = (type: number): string => {
    switch (type) {
      case 0: return 'Simulator';
      case 1: return 'Biometric Device';
      case 2: return 'Enterprise System';
      case 3: return 'Calendar';
      default: return 'Unknown';
    }
  };
  
  const getConnectionStatusText = (status: number): string => {
    switch (status) {
      case 0: return 'Connected';
      case 1: return 'Disconnected';
      case 2: return 'Connecting';
      case 3: return 'Error';
      default: return 'Unknown';
    }
  };
  
  const getConnectionStatusColor = (status: number): string => {
    switch (status) {
      case 0: return 'success';
      case 1: return 'error';
      case 2: return 'warning';
      case 3: return 'error';
      default: return 'default';
    }
  };
  
  const getConnectionIcon = (type: number) => {
    switch (type) {
      case 0: return <MonitorPlay />;
      case 1: return <Activity />;
      case 2: return <User />;
      case 3: return <Calendar />;
      default: return <Link2 />;
    }
  };
  
  const getConnectionHealth = (connectionId: string): ConnectionHealth | undefined => {
    return connectionHealth.find(health => health.connectionId === connectionId);
  };
  
  const filterConnectionsByType = (type: number): Connection[] => {
    return connections.filter(conn => conn.type === type);
  };
  
  const simulatorConnections = filterConnectionsByType(0);
  const biometricConnections = filterConnectionsByType(1);
  const enterpriseConnections = filterConnectionsByType(2);
  const calendarConnections = filterConnectionsByType(3);
  
  if (loading && connections.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">External Integrations</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            startIcon={<RefreshCw />}
            onClick={refreshConnections}
          >
            Refresh
          </Button>
        </Box>
      </Box>
      
      <Grid container spacing={3}>
        {/* Simulator Integrations */}
        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <MonitorPlay size={24} color={theme.palette.primary.main} />
                  <Typography variant="h6" sx={{ ml: 1 }}>Simulator Connections</Typography>
                </Box>
              }
              action={
                <Button
                  startIcon={<Plus />}
                  variant="contained"
                  size="small"
                  onClick={() => setSimulatorDialogOpen(true)}
                >
                  Connect
                </Button>
              }
            />
            <Divider />
            <CardContent sx={{ p: 0 }}>
              {simulatorConnections.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    No simulator connections configured
                  </Typography>
                  <Button
                    startIcon={<Plus />}
                    variant="outlined"
                    size="small"
                    sx={{ mt: 2 }}
                    onClick={() => setSimulatorDialogOpen(true)}
                  >
                    Connect to Simulator
                  </Button>
                </Box>
              ) : (
                <List disablePadding>
                  {simulatorConnections.map((connection) => {
                    const health = getConnectionHealth(connection.id);
                    
                    return (
                      <React.Fragment key={connection.id}>
                        <ListItem
                          secondaryAction={
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip title="Connection Settings">
                                <IconButton edge="end" onClick={() => handleOpenSettings(connection)}>
                                  <Settings size={18} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Connection">
                                <IconButton 
                                  edge="end" 
                                  color="error"
                                  onClick={() => {
                                    setSelectedConnection(connection);
                                    setConfirmDeleteOpen(true);
                                  }}
                                >
                                  <Trash2 size={18} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          }
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                              <MonitorPlay />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={connection.name}
                            secondary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <StatusIndicator status={getConnectionStatusColor(connection.status)} />
                                <Typography variant="caption">
                                  {getConnectionStatusText(connection.status)}
                                </Typography>
                                {health && (
                                  <Tooltip title={`Latency: ${health.latencyMs}ms`}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <Zap size={12} />
                                      <Typography variant="caption">
                                        {health.latencyMs}ms
                                      </Typography>
                                    </Box>
                                  </Tooltip>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                        <Divider component="li" />
                      </React.Fragment>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* Biometric Device Integrations */}
        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Activity size={24} color={theme.palette.primary.main} />
                  <Typography variant="h6" sx={{ ml: 1 }}>Biometric Devices</Typography>
                </Box>
              }
              action={
                <Button
                  startIcon={<Plus />}
                  variant="contained"
                  size="small"
                  onClick={() => setBiometricDialogOpen(true)}
                >
                  Connect
                </Button>
              }
            />
            <Divider />
            <CardContent sx={{ p: 0 }}>
              {biometricConnections.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    No biometric devices connected
                  </Typography>
                  <Button
                    startIcon={<Plus />}
                    variant="outlined"
                    size="small"
                    sx={{ mt: 2 }}
                    onClick={() => setBiometricDialogOpen(true)}
                  >
                    Connect Biometric Device
                  </Button>
                </Box>
              ) : (
                <List disablePadding>
                  {biometricConnections.map((connection) => {
                    const health = getConnectionHealth(connection.id);
                    
                    return (
                      <React.Fragment key={connection.id}>
                        <ListItem
                          secondaryAction={
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip title="Connection Settings">
                                <IconButton edge="end" onClick={() => handleOpenSettings(connection)}>
                                  <Settings size={18} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Connection">
                                <IconButton 
                                  edge="end" 
                                  color="error"
                                  onClick={() => {
                                    setSelectedConnection(connection);
                                    setConfirmDeleteOpen(true);
                                  }}
                                >
                                  <Trash2 size={18} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          }
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                              <Activity />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={connection.name}
                            secondary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <StatusIndicator status={getConnectionStatusColor(connection.status)} />
                                <Typography variant="caption">
                                  {getConnectionStatusText(connection.status)}
                                </Typography>
                                {health && (
                                  <Tooltip title={`Latency: ${health.latencyMs}ms`}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <Zap size={12} />
                                      <Typography variant="caption">
                                        {health.latencyMs}ms
                                      </Typography>
                                    </Box>
                                  </Tooltip>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                        <Divider component="li" />
                      </React.Fragment>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* Enterprise System Integrations */}
        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <User size={24} color={theme.palette.primary.main} />
                  <Typography variant="h6" sx={{ ml: 1 }}>Enterprise Systems</Typography>
                </Box>
              }
              action={
                <Button
                  startIcon={<Plus />}
                  variant="contained"
                  size="small"
                  onClick={() => setEnterpriseDialogOpen(true)}
                >
                  Connect
                </Button>
              }
            />
            <Divider />
            <CardContent sx={{ p: 0 }}>
              {enterpriseConnections.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    No enterprise systems connected
                  </Typography>
                  <Button
                    startIcon={<Plus />}
                    variant="outlined"
                    size="small"
                    sx={{ mt: 2 }}
                    onClick={() => setEnterpriseDialogOpen(true)}
                  >
                    Connect Enterprise System
                  </Button>
                </Box>
              ) : (
                <List disablePadding>
                  {enterpriseConnections.map((connection) => {
                    const health = getConnectionHealth(connection.id);
                    
                    return (
                      <React.Fragment key={connection.id}>
                        <ListItem
                          secondaryAction={
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip title="Connection Settings">
                                <IconButton edge="end" onClick={() => handleOpenSettings(connection)}>
                                  <Settings size={18} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Connection">
                                <IconButton 
                                  edge="end" 
                                  color="error"
                                  onClick={() => {
                                    setSelectedConnection(connection);
                                    setConfirmDeleteOpen(true);
                                  }}
                                >
                                  <Trash2 size={18} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          }
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: theme.palette.success.main }}>
                              <User />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={connection.name}
                            secondary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <StatusIndicator status={getConnectionStatusColor(connection.status)} />
                                <Typography variant="caption">
                                  {getConnectionStatusText(connection.status)}
                                </Typography>
                                {health && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1 }}>
                                    <Clock size={12} />
                                    <Typography variant="caption">
                                      Last Sync: {new Date(health.checkedAt).toLocaleTimeString()}
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                        <Divider component="li" />
                      </React.Fragment>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* Calendar Integrations */}
        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Calendar size={24} color={theme.palette.primary.main} />
                  <Typography variant="h6" sx={{ ml: 1 }}>Calendar Connections</Typography>
                </Box>
              }
              action={
                <Button
                  startIcon={<Plus />}
                  variant="contained"
                  size="small"
                  onClick={() => setCalendarDialogOpen(true)}
                >
                  Connect
                </Button>
              }
            />
            <Divider />
            <CardContent sx={{ p: 0 }}>
              {calendarConnections.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    No calendar connections configured
                  </Typography>
                  <Button
                    startIcon={<Plus />}
                    variant="outlined"
                    size="small"
                    sx={{ mt: 2 }}
                    onClick={() => setCalendarDialogOpen(true)}
                  >
                    Connect to Calendar
                  </Button>
                </Box>
              ) : (
                <List disablePadding>
                  {calendarConnections.map((connection) => {
                    const health = getConnectionHealth(connection.id);
                    
                    return (
                      <React.Fragment key={connection.id}>
                        <ListItem
                          secondaryAction={
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip title="Connection Settings">
                                <IconButton edge="end" onClick={() => handleOpenSettings(connection)}>
                                  <Settings size={18} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Connection">
                                <IconButton 
                                  edge="end" 
                                  color="error"
                                  onClick={() => {
                                    setSelectedConnection(connection);
                                    setConfirmDeleteOpen(true);
                                  }}
                                >
                                  <Trash2 size={18} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          }
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: theme.palette.warning.main }}>
                              <Calendar />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={connection.name}
                            secondary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <StatusIndicator status={getConnectionStatusColor(connection.status)} />
                                <Typography variant="caption">
                                  {getConnectionStatusText(connection.status)}
                                </Typography>
                                {health && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1 }}>
                                    <Clock size={12} />
                                    <Typography variant="caption">
                                      Last Sync: {new Date(health.checkedAt).toLocaleTimeString()}
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                        <Divider component="li" />
                      </React.Fragment>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Connection Dialogs */}
      <SimulatorConnectDialog
        open={simulatorDialogOpen}
        onClose={() => setSimulatorDialogOpen(false)}
        onSuccess={() => {
          setSimulatorDialogOpen(false);
          refreshConnections();
        }}
        simulators={simulators}
      />
      
      <BiometricConnectDialog
        open={biometricDialogOpen}
        onClose={() => setBiometricDialogOpen(false)}
        onSuccess={() => {
          setBiometricDialogOpen(false);
          refreshConnections();
        }}
        devices={biometricDevices}
      />
      
      <EnterpriseConnectDialog
        open={enterpriseDialogOpen}
        onClose={() => setEnterpriseDialogOpen(false)}
        onSuccess={() => {
          setEnterpriseDialogOpen(false);
          refreshConnections();
        }}
        systems={enterpriseSystems}
      />
      
      <CalendarConnectDialog
        open={calendarDialogOpen}
        onClose={() => setCalendarDialogOpen(false)}
        onSuccess={() => {
          setCalendarDialogOpen(false);
          refreshConnections();
        }}
        calendarTypes={calendars}
      />
      
      {/* Settings Dialog */}
      {selectedConnection && (
        <IntegrationSettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          connection={selectedConnection}
          onSuccess={() => {
            setSettingsOpen(false);
            refreshConnections();
          }}
        />
      )}
      
      {/* Confirm Delete Dialog */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the connection to "{selectedConnection?.name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDeleteConnection} 
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IntegrationDashboard;

// /frontend/components/integration/SimulatorConnectDialog.tsx
import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Select, 
  Box, 
  Typography, 
  CircularProgress, 
  Stepper, 
  Step, 
  StepLabel, 
  Divider 
} from '@mui/material';
import { MonitorPlay } from 'lucide-react';
import { Simulator } from '../../types/integration';
import { useIntegrationService } from '../../hooks/useIntegrationService';

interface SimulatorConnectDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  simulators: Simulator[];
}

const SimulatorConnectDialog: React.FC<SimulatorConnectDialogProps> = ({ 
  open, 
  onClose, 
  onSuccess,
  simulators
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedSimulator, setSelectedSimulator] = useState<string>('');
  const [connectionName, setConnectionName] = useState<string>('');
  const [host, setHost] = useState<string>('localhost');
  const [port, setPort] = useState<string>('8080');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [updateRate, setUpdateRate] = useState<string>('30');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const { connectToSimulator } = useIntegrationService();
  
  useEffect(() => {
    // Reset state when dialog opens
    if (open) {
      setActiveStep(0);
      setSelectedSimulator('');
      setConnectionName('');
      setHost('localhost');
      setPort('8080');
      setUsername('');
      setPassword('');
      setUpdateRate('30');
      setError(null);
    }
  }, [open]);
  
  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };
  
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  const handleSimulatorSelect = (simulatorId: string) => {
    setSelectedSimulator(simulatorId);
    
    // Get default settings for selected simulator
    const simulator = simulators.find(sim => sim.id === simulatorId);
    if (simulator) {
      setConnectionName(simulator.name);
      setPort(simulator.defaultPort.toString());
    }
  };
  
  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const simulator = simulators.find(sim => sim.id === selectedSimulator);
      if (!simulator) {
        throw new Error('Simulator not found');
      }
      
      const params = {
        name: connectionName,
        host,
        port: parseInt(port),
        username,
        password,
        simulatorType: simulator.type,
        updateFrequencyHz: parseInt(updateRate)
      };
      
      await connectToSimulator(params);
      onSuccess();
    } catch (err) {
      setError((err as Error).message || 'Failed to connect to simulator');
    } finally {
      setLoading(false);
    }
  };
  
  const isStepValid = () => {
    switch (activeStep) {
      case 0:
        return selectedSimulator !== '';
      case 1:
        return (
          connectionName !== '' && 
          host !== '' && 
          port !== '' && 
          !isNaN(parseInt(port)) &&
          parseInt(port) > 0 && 
          parseInt(port) < 65536
        );
      case 2:
        return updateRate !== '' && !isNaN(parseInt(updateRate)) && parseInt(updateRate) > 0;
      default:
        return true;
    }
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{ sx: { overflow: 'visible' } }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MonitorPlay />
          Connect to Simulator
        </Box>
      </DialogTitle>
      
      <Divider />
      
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          <Step>
            <StepLabel>Select Simulator</StepLabel>
          </Step>
          <Step>
            <StepLabel>Connection Details</StepLabel>
          </Step>
          <Step>
            <StepLabel>Configuration</StepLabel>
          </Step>
        </Stepper>
        
        {activeStep === 0 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Select a simulator to connect to:
            </Typography>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
              {simulators.map((simulator) => (
                <Box
                  key={simulator.id}
                  onClick={() => handleSimulatorSelect(simulator.id)}
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: selectedSimulator === simulator.id ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    cursor: 'pointer',
                    bgcolor: selectedSimulator === simulator.id ? 'primary.lighter' : 'background.paper',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'primary.lighter'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MonitorPlay size={24} />
                    <Typography variant="h6">{simulator.name}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {simulator.description}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
        
        {activeStep === 1 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Enter connection details:
            </Typography>
            
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Connection Name"
                fullWidth
                value={connectionName}
                onChange={(e) => setConnectionName(e.target.value)}
                required
              />
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Host"
                  fullWidth
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  required
                />
                
                <TextField
                  label="Port"
                  fullWidth
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  required
                  inputProps={{ min: 1, max: 65535 }}
                />
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Username"
                  fullWidth
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                
                <TextField
                  label="Password"
                  fullWidth
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Box>
            </Box>
          </Box>
        )}
        
        {activeStep === 2 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Configure simulator settings:
            </Typography>
            
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel id="update-rate-label">Update Rate (Hz)</InputLabel>
                <Select
                  labelId="update-rate-label"
                  value={updateRate}
                  label="Update Rate (Hz)"
                  onChange={(e) => setUpdateRate(e.target.value)}
                >
                  <MenuItem value="10">10 Hz</MenuItem>
                  <MenuItem value="30">30 Hz</MenuItem>
                  <MenuItem value="60">60 Hz</MenuItem>
                  <MenuItem value="120">120 Hz</MenuItem>
                </Select>
              </FormControl>
              
              <Typography variant="body2" color="text.secondary">
                The update rate determines how frequently data is fetched from the simulator.
                Higher rates provide more accurate data but require more network bandwidth.
              </Typography>
              
              {error && (
                <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                  {error}
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {activeStep > 0 && (
          <Button onClick={handleBack}>Back</Button>
        )}
        {activeStep < 2 ? (
          <Button 
            onClick={handleNext} 
            variant="contained" 
            disabled={!isStepValid()}
          >
            Next
          </Button>
        ) : (
          <Button 
            onClick={handleConnect} 
            variant="contained" 
            disabled={!isStepValid() || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Connect'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default SimulatorConnectDialog;

// /frontend/hooks/useIntegrationService.ts
import { useState, useCallback, useEffect } from 'react';
import api from '../services/api';
import { 
  Connection, 
  ConnectionHealth, 
  SimulatorConnectionParams,
  BiometricDeviceParams,
  EnterpriseSystemParams,
  CalendarConnectionParams,
  Simulator,
  BiometricDevice,
  EnterpriseSystem,
  Calendar
} from '../types/integration';

export const useIntegrationService = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Available integration types
  const [simulators, setSimulators] = useState<Simulator[]>([]);
  const [biometricDevices, setBiometricDevices] = useState<BiometricDevice[]>([]);
  const [enterpriseSystems, setEnterpriseSystems] = useState<EnterpriseSystem[]>([]);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  
  // Fetch available integration types
  const fetchAvailableIntegrations = useCallback(async () => {
    try {
      const [
        simulatorsResponse,
        biometricDevicesResponse,
        enterpriseSystemsResponse,
        calendarsResponse
      ] = await Promise.all([
        api.get('/integration/simulators/available'),
        api.get('/integration/biometrics/available'),
        api.get('/integration/enterprise/available'),
        api.get('/integration/calendars/available')
      ]);
      
      setSimulators(simulatorsResponse.data);
      setBiometricDevices(biometricDevicesResponse.data);
      setEnterpriseSystems(enterpriseSystemsResponse.data);
      setCalendars(calendarsResponse.data);
    } catch (err) {
      console.error('Failed to fetch available integrations', err);
    }
  }, []);
  
  // Fetch all connections
  const refreshConnections = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/integration/connections');
      setConnections(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch connections');
      setLoading(false);
      console.error(err);
    }
  }, []);
  
  // Check connection health
  const checkConnectionHealth = useCallback(async () => {
    try {
      const response = await api.get('/integration/connections/health');
      setConnectionHealth(response.data);
    } catch (err) {
      console.error('Failed to check connection health', err);
    }
  }, []);
  
  // Connect to simulator
  const connectToSimulator = useCallback(async (params: SimulatorConnectionParams) => {
    try {
      const response = await api.post('/integration/simulators', params);
      return response.data;
    } catch (err) {
      console.error('Failed to connect to simulator', err);
      throw err;
    }
  }, []);
  
  // Connect to biometric device
  const connectToBiometricDevice = useCallback(async (params: BiometricDeviceParams) => {
    try {
      const response = await api.post('/integration/biometrics', params);
      return response.data;
    } catch (err) {
      console.error('Failed to connect to biometric device', err);
      throw err;
    }
  }, []);
  
  // Connect to enterprise system
  const connectToEnterpriseSystem = useCallback(async (params: EnterpriseSystemParams) => {
    try {
      const response = await api.post('/integration/enterprise', params);
      return response.data;
    } catch (err) {
      console.error('Failed to connect to enterprise system', err);
      throw err;
    }
  }, []);
  
  // Connect to calendar
  const connectToCalendar = useCallback(async (params: CalendarConnectionParams) => {
    try {
      const response = await api.post('/integration/calendars', params);
      return response.data;
    } catch (err) {
      console.error('Failed to connect to calendar', err);
      throw err;
    }
  }, []);
  
  // Delete connection
  const deleteConnection = useCallback(async (connectionId: string) => {
    try {
      await api.delete(`/integration/connections/${connectionId}`);
      // Remove from local state
      setConnections(prevConnections => 
        prevConnections.filter(conn => conn.id !== connectionId)
      );
      return true;
    } catch (err) {
      console.error('Failed to delete connection', err);
      throw err;
    }
  }, []);
  
  // Update connection
  const updateConnection = useCallback(async (connectionId: string, params: any) => {
    try {
      const response = await api.put(`/integration/connections/${connectionId}`, params);
      // Update in local state
      setConnections(prevConnections => 
        prevConnections.map(conn => 
          conn.id === connectionId ? { ...conn, ...response.data } : conn
        )
      );
      return response.data;
    } catch (err) {
      console.error('Failed to update connection', err);
      throw err;
    }
  }, []);
  
  // Start telemetry stream (simulator)
  const startTelemetryStream = useCallback(async (simulatorId: string, params: any) => {
    try {
      const response = await api.post(`/integration/simulators/${simulatorId}/telemetry/start`, params);
      return response.data;
    } catch (err) {
      console.error('Failed to start telemetry stream', err);
      throw err;
    }
  }, []);
  
  // Stop telemetry stream (simulator)
  const stopTelemetryStream = useCallback(async (simulatorId: string) => {
    try {
      await api.post(`/integration/simulators/${simulatorId}/telemetry/stop`);
      return true;
    } catch (err) {
      console.error('Failed to stop telemetry stream', err);
      throw err;
    }
  }, []);
  
  // Initialize
  useEffect(() => {
    fetchAvailableIntegrations();
    refreshConnections();
    checkConnectionHealth();
  }, [fetchAvailableIntegrations, refreshConnections, checkConnectionHealth]);
  
  return {
    connections,
    connectionHealth,
    loading,
    error,
    simulators,
    biometricDevices,
    enterpriseSystems,
    calendars,
    refreshConnections,
    checkConnectionHealth,
    connectToSimulator,
    connectToBiometricDevice,
    connectToEnterpriseSystem,
    connectToCalendar,
    deleteConnection,
    updateConnection,
    startTelemetryStream,
    stopTelemetryStream
  };
};

// /frontend/types/integration.ts
export interface Connection {
  id: string;
  name: string;
  type: number;
  status: number;
  errorMessage: string;
  lastConnected: string;
  createdAt: string;
  connectionParams: any;
}

export interface ConnectionHealth {
  connectionId: string;
  isHealthy: boolean;
  latencyMs: number;
  statusMessage: string;
  checkedAt: string;
}

export interface SimulatorConnectionParams {
  name: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  simulatorType: string;
  updateFrequencyHz: number;
}

export interface BiometricDeviceParams {
  name: string;
  deviceType: string;
  connectionMethod: string;
  deviceId?: string;
  host?: string;
  port?: number;
  apiKey?: string;
}

export interface EnterpriseSystemParams {
  name: string;
  systemType: string;
  baseUrl: string;
  username?: string;
  password?: string;
  apiKey?: string;
  tenantId?: string;
  syncIntervalMinutes: number;
}

export interface CalendarConnectionParams {
  name: string;
  calendarType: string;
  authMethod: string;
  baseUrl?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  calendarId?: string;
}

export interface Simulator {
  id: string;
  name: string;
  type: string;
  description: string;
  defaultHost: string;
  defaultPort: number;
  supportedFeatures: string[];
}

export interface BiometricDevice {
  id: string;
  name: string;
  type: string;
  description: string;
  connectionMethods: string[];
  dataTypes: string[];
}

export interface EnterpriseSystem {
  id: string;
  name: string;
  type: string;
  description: string;
  features: string[];
}

export interface Calendar {
  id: string;
  name: string;
  type: string;
  description: string;
  authMethods: string[];
}

export interface TelemetryData {
  timestamp: number;
  parameters: Record<string, number>;
}

export interface BiometricData {
  timestamp: number;
  deviceId: string;
  dataType: string;
  value: any;
}

export interface TraineeProfile {
  id: string;
  externalId: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  position: string;
  employeeId: string;
  hireDate: string;
  customAttributes: Record<string, string>;
}

export interface CourseRegistration {
  id: string;
  traineeId: string;
  courseId: string;
  courseName: string;
  registrationDate: string;
  startDate: string;
  endDate: string;
  status: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  attendees: string[];
  organizer: string;
  status: string;
}
