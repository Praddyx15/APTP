// /frontend/components/collaboration/CollaborationWorkspace.tsx
import React, { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { 
  Box, 
  Grid, 
  Tabs, 
  Tab, 
  Typography, 
  Button, 
  CircularProgress,
  Divider,
  Paper,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import { 
  Users, 
  MessageSquare, 
  FileText, 
  Clock, 
  Settings, 
  Share2, 
  Bell,
  UserPlus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import WorkspaceMembers from './WorkspaceMembers';
import ChatPanel from './ChatPanel';
import DocumentCollaboration from './DocumentCollaboration';
import ActivityTimeline from './ActivityTimeline';
import WorkspaceSettings from './WorkspaceSettings';
import AuthContext from '../../contexts/AuthContext';
import { useCollaboration } from '../../hooks/useCollaboration';
import { useNotification } from '../../hooks/useNotification';
import InviteUserModal from './InviteUserModal';
import { Workspace, WorkspaceUser } from '../../types/collaboration';

interface CollaborationWorkspaceProps {
  workspaceId: string;
}

const CollaborationWorkspace: React.FC<CollaborationWorkspaceProps> = ({ workspaceId }) => {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const { notify } = useNotification();
  
  const [activeTab, setActiveTab] = useState<number>(0);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [inviteModalOpen, setInviteModalOpen] = useState<boolean>(false);
  
  const { 
    workspace, 
    members, 
    loading, 
    error, 
    messages, 
    sendMessage,
    documents,
    activities,
    userRole,
    inviteUser,
    removeUser,
    updateUserRole,
    leaveWorkspace
  } = useCollaboration(workspaceId);
  
  useEffect(() => {
    if (error) {
      notify('Error loading workspace', error.message, 'error');
    }
  }, [error, notify]);
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  const handleInviteUser = async (email: string, role: string) => {
    try {
      await inviteUser(email, role);
      notify('User invited', 'Invitation sent successfully', 'success');
      setInviteModalOpen(false);
    } catch (err) {
      notify('Invitation failed', err.message, 'error');
    }
  };
  
  const handleLeaveWorkspace = async () => {
    if (window.confirm('Are you sure you want to leave this workspace?')) {
      try {
        await leaveWorkspace();
        notify('Left workspace', 'You have left the workspace', 'info');
        router.push('/workspaces');
      } catch (err) {
        notify('Error leaving workspace', err.message, 'error');
      }
    }
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }
  
  if (!workspace) {
    return (
      <Box p={3}>
        <Typography variant="h5">Workspace not found or you don't have access</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => router.push('/workspaces')}
          sx={{ mt: 2 }}
        >
          Back to Workspaces
        </Button>
      </Box>
    );
  }
  
  const isOwner = workspace.ownerId === user?.id;
  const canInvite = isOwner || userRole === 'ADMIN';
  
  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', overflow: 'hidden' }}>
      {/* Sidebar */}
      <Box
        sx={{
          width: sidebarOpen ? 280 : 0,
          transition: 'width 0.3s ease',
          overflow: 'hidden',
          borderRight: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="h6" noWrap sx={{ mb: 1 }}>
            {workspace.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {workspace.description || 'No description'}
          </Typography>
        </Box>
        
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Members
          </Typography>
          <Box sx={{ maxHeight: 150, overflowY: 'auto' }}>
            {members.slice(0, 5).map((member: WorkspaceUser) => (
              <Box 
                key={member.userId} 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mb: 1,
                  '&:last-child': { mb: 0 }
                }}
              >
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    mr: 1
                  }}
                >
                  {member.userName?.charAt(0)}
                </Box>
                <Typography variant="body2" noWrap>
                  {member.userName}
                </Typography>
                {member.userId === workspace.ownerId && (
                  <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                    (Owner)
                  </Typography>
                )}
              </Box>
            ))}
            {members.length > 5 && (
              <Typography variant="caption" color="text.secondary">
                +{members.length - 5} more members
              </Typography>
            )}
          </Box>
          {canInvite && (
            <Button
              startIcon={<UserPlus size={16} />}
              variant="outlined"
              size="small"
              fullWidth
              sx={{ mt: 1 }}
              onClick={() => setInviteModalOpen(true)}
            >
              Invite Member
            </Button>
          )}
        </Box>
        
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Recent Activity
          </Typography>
          <Box sx={{ maxHeight: 150, overflowY: 'auto' }}>
            {activities.slice(0, 3).map((activity) => (
              <Box 
                key={activity.id} 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mb: 1,
                  '&:last-child': { mb: 0 }
                }}
              >
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: 'action.selected',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 1
                  }}
                >
                  <Clock size={14} />
                </Box>
                <Box>
                  <Typography variant="body2" noWrap>
                    {activity.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(activity.timestamp).toLocaleTimeString()} by {activity.userName}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
        
        <Box sx={{ mt: 'auto', p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button
            variant="outlined"
            color="secondary"
            fullWidth
            onClick={handleLeaveWorkspace}
          >
            Leave Workspace
          </Button>
        </Box>
      </Box>
      
      {/* Toggle sidebar button */}
      <Box 
        sx={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: `1px solid ${theme.palette.divider}`
        }}
      >
        <IconButton onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <ChevronLeft /> : <ChevronRight />}
        </IconButton>
      </Box>
      
      {/* Main content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="workspace tabs">
            <Tab icon={<MessageSquare size={16} />} label="Chat" />
            <Tab icon={<FileText size={16} />} label="Documents" />
            <Tab icon={<Users size={16} />} label="Members" />
            <Tab icon={<Clock size={16} />} label="Activity" />
            {(isOwner || userRole === 'ADMIN') && (
              <Tab icon={<Settings size={16} />} label="Settings" />
            )}
          </Tabs>
        </Box>
        
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {activeTab === 0 && (
            <ChatPanel 
              messages={messages} 
              onSendMessage={sendMessage} 
              workspace={workspace}
              members={members}
            />
          )}
          {activeTab === 1 && (
            <DocumentCollaboration 
              workspaceId={workspaceId} 
              documents={documents}
              userRole={userRole}
            />
          )}
          {activeTab === 2 && (
            <WorkspaceMembers 
              members={members} 
              workspace={workspace}
              onRemoveUser={removeUser}
              onUpdateRole={updateUserRole}
              userRole={userRole}
              currentUserId={user?.id}
            />
          )}
          {activeTab === 3 && (
            <ActivityTimeline 
              activities={activities} 
              workspaceId={workspaceId}
            />
          )}
          {activeTab === 4 && (isOwner || userRole === 'ADMIN') && (
            <WorkspaceSettings 
              workspace={workspace} 
              workspaceId={workspaceId}
            />
          )}
        </Box>
      </Box>
      
      <InviteUserModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onInvite={handleInviteUser}
      />
    </Box>
  );
};

export default CollaborationWorkspace;

// /frontend/components/collaboration/ChatPanel.tsx
import React, { useState, useRef, useEffect, useContext } from 'react';
import { 
  Box, 
  TextField, 
  IconButton, 
  Typography, 
  Avatar, 
  Paper,
  Chip,
  Menu,
  MenuItem,
  Divider,
  CircularProgress,
  useTheme
} from '@mui/material';
import { 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical, 
  Copy,
  Trash2,
  Flag 
} from 'lucide-react';
import Picker from 'emoji-picker-react';
import { Message, Workspace, WorkspaceUser } from '../../types/collaboration';
import AuthContext from '../../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (content: string, type?: string) => Promise<void>;
  workspace: Workspace;
  members: WorkspaceUser[];
}

const ChatPanel: React.FC<ChatPanelProps> = ({ 
  messages, 
  onSendMessage, 
  workspace,
  members 
}) => {
  const theme = useTheme();
  const { user } = useContext(AuthContext);
  const [messageInput, setMessageInput] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [contextMenu, setContextMenu] = useState<{ 
    mouseX: number; 
    mouseY: number; 
    messageId: string | null 
  } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (messageInput.trim()) {
      setSending(true);
      try {
        await onSendMessage(messageInput);
        setMessageInput('');
      } catch (error) {
        console.error('Failed to send message:', error);
      } finally {
        setSending(false);
      }
    }
  };
  
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Handle file upload logic here
    console.log('File selected:', files[0].name);
    
    // Clear the input for future uploads
    e.target.value = '';
  };
  
  const handleEmojiClick = (emojiData: any, event: MouseEvent) => {
    setMessageInput(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };
  
  const handleContextMenu = (event: React.MouseEvent, messageId: string) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      messageId
    });
  };
  
  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };
  
  const handleCopyMessage = () => {
    const message = messages.find(m => m.id === contextMenu?.messageId);
    if (message) {
      navigator.clipboard.writeText(message.content);
    }
    handleCloseContextMenu();
  };
  
  const handleDeleteMessage = () => {
    // Implement delete message logic
    console.log('Delete message:', contextMenu?.messageId);
    handleCloseContextMenu();
  };
  
  const handleReportMessage = () => {
    // Implement report message logic
    console.log('Report message:', contextMenu?.messageId);
    handleCloseContextMenu();
  };
  
  const getMemberName = (userId: string): string => {
    const member = members.find(m => m.userId === userId);
    return member?.userName || 'Unknown User';
  };
  
  const groupMessagesByDate = () => {
    const groups: { [date: string]: Message[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.timestamp).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  };
  
  const messageGroups = groupMessagesByDate();
  
  return (
    <Box 
      sx={{ 
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
    >
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          p: 1
        }}
      >
        {Object.entries(messageGroups).map(([date, messagesGroup]) => (
          <Box key={date}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                mb: 2,
                position: 'relative'
              }}
            >
              <Divider sx={{ width: '100%', position: 'absolute', top: '50%' }} />
              <Chip 
                label={date === new Date().toLocaleDateString() ? 'Today' : date}
                sx={{ zIndex: 1, bgcolor: theme.palette.background.paper }}
              />
            </Box>
            
            {messagesGroup.map((message) => {
              const isCurrentUser = message.senderId === user?.id;
              const senderName = getMemberName(message.senderId);
              
              return (
                <Box
                  key={message.id}
                  sx={{
                    display: 'flex',
                    flexDirection: isCurrentUser ? 'row-reverse' : 'row',
                    mb: 2
                  }}
                  onContextMenu={(e) => handleContextMenu(e, message.id)}
                >
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      mr: isCurrentUser ? 0 : 1,
                      ml: isCurrentUser ? 1 : 0,
                      bgcolor: isCurrentUser ? 'primary.main' : 'secondary.main'
                    }}
                  >
                    {senderName.charAt(0)}
                  </Avatar>
                  
                  <Box
                    sx={{
                      maxWidth: '70%',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        mb: 0.5,
                        textAlign: isCurrentUser ? 'right' : 'left',
                        color: 'text.secondary'
                      }}
                    >
                      {isCurrentUser ? 'You' : senderName} • {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                    </Typography>
                    
                    <Paper
                      elevation={1}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: isCurrentUser 
                          ? theme.palette.primary.light
                          : theme.palette.action.hover,
                        color: isCurrentUser
                          ? theme.palette.primary.contrastText
                          : theme.palette.text.primary
                      }}
                    >
                      <Typography variant="body1">
                        {message.content}
                      </Typography>
                    </Paper>
                    
                    {message.attachment && (
                      <Paper
                        elevation={1}
                        sx={{
                          p: 1,
                          mt: 1,
                          borderRadius: 1,
                          bgcolor: isCurrentUser 
                            ? theme.palette.primary.light
                            : theme.palette.action.hover,
                          color: isCurrentUser
                            ? theme.palette.primary.contrastText
                            : theme.palette.text.primary,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <Paperclip size={16} />
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {message.attachment.fileName}
                        </Typography>
                      </Paper>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        ))}
        
        <div ref={messagesEndRef} />
      </Box>
      
      <Box
        component="form"
        onSubmit={handleSendMessage}
        sx={{
          p: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        <IconButton
          onClick={handleFileSelect}
          disabled={sending}
          color="primary"
        >
          <Paperclip size={20} />
        </IconButton>
        
        <Box sx={{ position: 'relative' }}>
          <IconButton
            ref={emojiButtonRef}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={sending}
            color="primary"
          >
            <Smile size={20} />
          </IconButton>
          
          {showEmojiPicker && (
            <Box
              sx={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                zIndex: 1
              }}
            >
              <Picker onEmojiClick={handleEmojiClick} />
            </Box>
          )}
        </Box>
        
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Type a message..."
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          disabled={sending}
          size="small"
          InputProps={{
            sx: { borderRadius: 4 }
          }}
        />
        
        <IconButton
          type="submit"
          color="primary"
          disabled={!messageInput.trim() || sending}
        >
          {sending ? <CircularProgress size={20} /> : <Send size={20} />}
        </IconButton>
        
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
      </Box>
      
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={handleCopyMessage}>
          <Copy size={16} />
          <Typography sx={{ ml: 1 }}>Copy</Typography>
        </MenuItem>
        <MenuItem onClick={handleDeleteMessage}>
          <Trash2 size={16} />
          <Typography sx={{ ml: 1 }}>Delete</Typography>
        </MenuItem>
        <MenuItem onClick={handleReportMessage}>
          <Flag size={16} />
          <Typography sx={{ ml: 1 }}>Report</Typography>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ChatPanel;

// /frontend/components/collaboration/DocumentCollaboration.tsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardActions,
  IconButton,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useTheme
} from '@mui/material';
import { 
  FileText, 
  Upload, 
  Plus, 
  Edit, 
  Trash2, 
  MoreVertical,
  Download,
  Copy,
  Share2,
  Eye,
  Clock,
  Users
} from 'lucide-react';
import { Document, DocumentVersion } from '../../types/collaboration';
import { useDocumentService } from '../../hooks/useDocumentService';
import { useNotification } from '../../hooks/useNotification';
import DocumentViewer from './DocumentViewer';
import VersionHistoryDialog from './VersionHistoryDialog';

interface DocumentCollaborationProps {
  workspaceId: string;
  documents: Document[];
  userRole: string;
}

const DocumentCollaboration: React.FC<DocumentCollaborationProps> = ({ 
  workspaceId, 
  documents,
  userRole
}) => {
  const theme = useTheme();
  const { notify } = useNotification();
  const [uploadDialogOpen, setUploadDialogOpen] = useState<boolean>(false);
  const [newDocName, setNewDocName] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [viewDialogOpen, setViewDialogOpen] = useState<boolean>(false);
  const [versionDialogOpen, setVersionDialogOpen] = useState<boolean>(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>(documents);
  
  const { 
    uploadDocument,
    deleteDocument,
    getVersionHistory,
    downloadDocument,
    revertToVersion
  } = useDocumentService();
  
  useEffect(() => {
    if (searchTerm) {
      const filtered = documents.filter(doc => 
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredDocuments(filtered);
    } else {
      setFilteredDocuments(documents);
    }
  }, [searchTerm, documents]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      if (!newDocName) {
        setNewDocName(file.name);
      }
    }
  };
  
  const handleUpload = async () => {
    if (!selectedFile || !newDocName) {
      notify('Error', 'Please select a file and provide a name', 'error');
      return;
    }
    
    setUploading(true);
    try {
      await uploadDocument(workspaceId, selectedFile, newDocName);
      notify('Success', 'Document uploaded successfully', 'success');
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setNewDocName('');
    } catch (error) {
      notify('Error', 'Failed to upload document', 'error');
    } finally {
      setUploading(false);
    }
  };
  
  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, document: Document) => {
    setAnchorEl(event.currentTarget);
    setSelectedDocument(document);
  };
  
  const handleCloseMenu = () => {
    setAnchorEl(null);
  };
  
  const handleViewDocument = () => {
    handleCloseMenu();
    setViewDialogOpen(true);
  };
  
  const handleViewVersions = async () => {
    handleCloseMenu();
    setVersionDialogOpen(true);
  };
  
  const handleDeleteDocument = async () => {
    if (!selectedDocument) return;
    
    if (window.confirm(`Are you sure you want to delete "${selectedDocument.name}"?`)) {
      try {
        await deleteDocument(workspaceId, selectedDocument.id);
        notify('Success', 'Document deleted successfully', 'success');
      } catch (error) {
        notify('Error', 'Failed to delete document', 'error');
      }
    }
    handleCloseMenu();
  };
  
  const handleDownloadDocument = async () => {
    if (!selectedDocument) return;
    
    try {
      await downloadDocument(workspaceId, selectedDocument.id);
    } catch (error) {
      notify('Error', 'Failed to download document', 'error');
    }
    handleCloseMenu();
  };
  
  const canModifyDocuments = ['OWNER', 'ADMIN', 'EDITOR'].includes(userRole);
  
  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">Documents</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            size="small"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            variant="outlined"
          />
          {canModifyDocuments && (
            <Button 
              variant="contained" 
              color="primary"
              startIcon={<Upload />}
              onClick={() => setUploadDialogOpen(true)}
            >
              Upload Document
            </Button>
          )}
        </Box>
      </Box>
      
      <Grid container spacing={3}>
        {filteredDocuments.length === 0 ? (
          <Grid item xs={12}>
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                justifyContent: 'center',
                p: 4,
                border: `1px dashed ${theme.palette.divider}`,
                borderRadius: 1
              }}
            >
              <FileText size={48} color={theme.palette.text.secondary} />
              <Typography variant="h6" sx={{ mt: 2 }}>
                No documents found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {searchTerm 
                  ? 'No documents match your search criteria' 
                  : 'Upload documents to collaborate with your team'}
              </Typography>
              {canModifyDocuments && !searchTerm && (
                <Button
                  variant="outlined"
                  startIcon={<Upload />}
                  onClick={() => setUploadDialogOpen(true)}
                >
                  Upload Document
                </Button>
              )}
            </Box>
          </Grid>
        ) : (
          filteredDocuments.map((doc) => (
            <Grid item xs={12} sm={6} md={4} key={doc.id}>
              <Card 
                elevation={2}
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[4]
                  }
                }}
              >
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <FileText size={24} color={theme.palette.primary.main} />
                      <Typography variant="h6" sx={{ ml: 1, wordBreak: 'break-word' }}>
                        {doc.name}
                      </Typography>
                    </Box>
                    <IconButton 
                      size="small"
                      onClick={(e) => handleOpenMenu(e, doc)}
                    >
                      <MoreVertical size={18} />
                    </IconButton>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {doc.description || 'No description'}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Clock size={14} color={theme.palette.text.secondary} />
                    <Typography variant="caption" color="text.secondary">
                      Last updated: {new Date(doc.updatedAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Users size={14} color={theme.palette.text.secondary} />
                    <Typography variant="caption" color="text.secondary">
                      {doc.accessCount} views • {doc.editCount} edits
                    </Typography>
                  </Box>
                </CardContent>
                
                <Divider />
                
                <CardActions sx={{ justifyContent: 'space-between', p: 1 }}>
                  <Button 
                    startIcon={<Eye size={16} />} 
                    size="small"
                    onClick={() => {
                      setSelectedDocument(doc);
                      setViewDialogOpen(true);
                    }}
                  >
                    View
                  </Button>
                  
                  {canModifyDocuments && (
                    <Button 
                      startIcon={<Edit size={16} />} 
                      size="small"
                      onClick={() => {
                        setSelectedDocument(doc);
                        setViewDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
      
      {/* Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload Document</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Document Name"
            fullWidth
            value={newDocName}
            onChange={(e) => setNewDocName(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <Box
            sx={{
              border: `1px dashed ${theme.palette.divider}`,
              borderRadius: 1,
              p: 3,
              textAlign: 'center',
              mb: 2
            }}
          >
            {selectedFile ? (
              <Box>
                <Typography variant="body1">{selectedFile.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => setSelectedFile(null)}
                  >
                    Remove
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box>
                <Upload size={32} color={theme.palette.text.secondary} />
                <Typography variant="body1" sx={{ mt: 1, mb: 1 }}>
                  Drag and drop your file here or click to browse
                </Typography>
                <Button
                  variant="contained"
                  component="label"
                >
                  Choose File
                  <input
                    type="file"
                    hidden
                    onChange={handleFileChange}
                  />
                </Button>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleUpload} 
            variant="contained" 
            disabled={!selectedFile || !newDocName || uploading}
          >
            {uploading ? <CircularProgress size={24} /> : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Document Viewer Dialog */}
      {selectedDocument && (
        <DocumentViewer
          open={viewDialogOpen}
          onClose={() => setViewDialogOpen(false)}
          document={selectedDocument}
          workspaceId={workspaceId}
          readOnly={!canModifyDocuments}
        />
      )}
      
      {/* Version History Dialog */}
      {selectedDocument && (
        <VersionHistoryDialog
          open={versionDialogOpen}
          onClose={() => setVersionDialogOpen(false)}
          document={selectedDocument}
          workspaceId={workspaceId}
          readOnly={!canModifyDocuments}
        />
      )}
      
      {/* Document Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={handleViewDocument}>
          <ListItemIcon>
            <Eye size={18} />
          </ListItemIcon>
          <ListItemText>View</ListItemText>
        </MenuItem>
        
        {canModifyDocuments && (
          <MenuItem onClick={handleViewDocument}>
            <ListItemIcon>
              <Edit size={18} />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}
        
        <MenuItem onClick={handleDownloadDocument}>
          <ListItemIcon>
            <Download size={18} />
          </ListItemIcon>
          <ListItemText>Download</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleViewVersions}>
          <ListItemIcon>
            <Clock size={18} />
          </ListItemIcon>
          <ListItemText>Version History</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleCloseMenu}>
          <ListItemIcon>
            <Share2 size={18} />
          </ListItemIcon>
          <ListItemText>Share</ListItemText>
        </MenuItem>
        
        {canModifyDocuments && (
          <MenuItem onClick={handleDeleteDocument}>
            <ListItemIcon>
              <Trash2 size={18} color={theme.palette.error.main} />
            </ListItemIcon>
            <ListItemText sx={{ color: theme.palette.error.main }}>
              Delete
            </ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export default DocumentCollaboration;

// /frontend/hooks/useCollaboration.ts
import { useState, useEffect, useContext, useCallback } from 'react';
import AuthContext from '../contexts/AuthContext';
import api from '../services/api';
import { Workspace, WorkspaceUser, Message, Document, Activity } from '../types/collaboration';
import { useSocket } from './useSocket';

export const useCollaboration = (workspaceId: string) => {
  const { user } = useContext(AuthContext);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceUser[]>([]);
  const [userRole, setUserRole] = useState<string>('VIEWER');
  const [messages, setMessages] = useState<Message[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  const { socket, connected } = useSocket(`/workspace/${workspaceId}`);
  
  // Fetch workspace data
  const fetchWorkspace = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/workspaces/${workspaceId}`);
      setWorkspace(response.data);
      
      // Find current user's role
      if (user) {
        const currentUserMember = response.data.members.find(
          (member: WorkspaceUser) => member.userId === user.id
        );
        if (currentUserMember) {
          setUserRole(currentUserMember.role);
        }
      }
    } catch (err) {
      setError(err as Error);
    }
  }, [workspaceId, user]);
  
  // Fetch workspace members
  const fetchMembers = useCallback(async () => {
    try {
      const response = await api.get(`/workspaces/${workspaceId}/users`);
      setMembers(response.data);
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  }, [workspaceId]);
  
  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const response = await api.get(`/workspaces/${workspaceId}/messages`);
      setMessages(response.data);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }, [workspaceId]);
  
  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    try {
      const response = await api.get(`/workspaces/${workspaceId}/documents`);
      setDocuments(response.data);
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  }, [workspaceId]);
  
  // Fetch activities
  const fetchActivities = useCallback(async () => {
    try {
      const response = await api.get(`/workspaces/${workspaceId}/activities`);
      setActivities(response.data);
    } catch (err) {
      console.error('Error fetching activities:', err);
    }
  }, [workspaceId]);
  
  // Initialize data
  useEffect(() => {
    const initData = async () => {
      try {
        await fetchWorkspace();
        await Promise.all([
          fetchMembers(),
          fetchMessages(),
          fetchDocuments(),
          fetchActivities()
        ]);
      } catch (err) {
        console.error('Error initializing data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    initData();
  }, [fetchWorkspace, fetchMembers, fetchMessages, fetchDocuments, fetchActivities]);
  
  // Socket event handlers
  useEffect(() => {
    if (!socket || !connected) return;
    
    // New message event
    socket.on('new_message', (message: Message) => {
      setMessages(prev => [...prev, message]);
      
      // Add to activities
      const activity: Activity = {
        id: message.id,
        type: 'MESSAGE',
        title: 'New message',
        description: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''),
        userId: message.senderId,
        userName: members.find(m => m.userId === message.senderId)?.userName || 'Unknown',
        timestamp: message.timestamp,
        resourceId: message.id
      };
      setActivities(prev => [activity, ...prev]);
    });
    
    // User added event
    socket.on('user_added', (data: { userId: string, userName: string, role: string }) => {
      const newMember: WorkspaceUser = {
        userId: data.userId,
        userName: data.userName,
        role: data.role
      };
      
      setMembers(prev => [...prev, newMember]);
      
      // Add to activities
      const activity: Activity = {
        id: Date.now().toString(),
        type: 'USER',
        title: 'User joined',
        description: `${data.userName} joined the workspace`,
        userId: data.userId,
        userName: data.userName,
        timestamp: new Date().toISOString(),
        resourceId: data.userId
      };
      setActivities(prev => [activity, ...prev]);
    });
    
    // User removed event
    socket.on('user_removed', (data: { userId: string }) => {
      setMembers(prev => prev.filter(member => member.userId !== data.userId));
      
      // Add to activities
      const removedMember = members.find(m => m.userId === data.userId);
      if (removedMember) {
        const activity: Activity = {
          id: Date.now().toString(),
          type: 'USER',
          title: 'User removed',
          description: `${removedMember.userName} was removed from the workspace`,
          userId: data.userId,
          userName: removedMember.userName,
          timestamp: new Date().toISOString(),
          resourceId: data.userId
        };
        setActivities(prev => [activity, ...prev]);
      }
    });
    
    // User role updated event
    socket.on('user_role_updated', (data: { userId: string, role: string }) => {
      setMembers(prev => 
        prev.map(member => 
          member.userId === data.userId 
            ? { ...member, role: data.role } 
            : member
        )
      );
      
      // If current user's role updated
      if (user && data.userId === user.id) {
        setUserRole(data.role);
      }
      
      // Add to activities
      const updatedMember = members.find(m => m.userId === data.userId);
      if (updatedMember) {
        const activity: Activity = {
          id: Date.now().toString(),
          type: 'USER',
          title: 'Role updated',
          description: `${updatedMember.userName}'s role changed to ${data.role}`,
          userId: data.userId,
          userName: updatedMember.userName,
          timestamp: new Date().toISOString(),
          resourceId: data.userId
        };
        setActivities(prev => [activity, ...prev]);
      }
    });
    
    // Document updated event
    socket.on('document_updated', (document: Document) => {
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === document.id ? document : doc
        )
      );
      
      // Add to activities
      const activity: Activity = {
        id: Date.now().toString(),
        type: 'DOCUMENT',
        title: 'Document updated',
        description: `${document.name} was updated`,
        userId: document.lastModifiedBy || '',
        userName: members.find(m => m.userId === document.lastModifiedBy)?.userName || 'Unknown',
        timestamp: document.updatedAt,
        resourceId: document.id
      };
      setActivities(prev => [activity, ...prev]);
    });
    
    // New document event
    socket.on('new_document', (document: Document) => {
      setDocuments(prev => [...prev, document]);
      
      // Add to activities
      const activity: Activity = {
        id: Date.now().toString(),
        type: 'DOCUMENT',
        title: 'Document created',
        description: `${document.name} was created`,
        userId: document.createdBy,
        userName: members.find(m => m.userId === document.createdBy)?.userName || 'Unknown',
        timestamp: document.createdAt,
        resourceId: document.id
      };
      setActivities(prev => [activity, ...prev]);
    });
    
    // Document deleted event
    socket.on('document_deleted', (documentId: string) => {
      const deletedDoc = documents.find(doc => doc.id === documentId);
      
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      
      // Add to activities
      if (deletedDoc) {
        const activity: Activity = {
          id: Date.now().toString(),
          type: 'DOCUMENT',
          title: 'Document deleted',
          description: `${deletedDoc.name} was deleted`,
          userId: user?.id || '',
          userName: user?.name || 'Unknown',
          timestamp: new Date().toISOString(),
          resourceId: documentId
        };
        setActivities(prev => [activity, ...prev]);
      }
    });
    
    return () => {
      socket.off('new_message');
      socket.off('user_added');
      socket.off('user_removed');
      socket.off('user_role_updated');
      socket.off('document_updated');
      socket.off('new_document');
      socket.off('document_deleted');
    };
  }, [socket, connected, user, members, documents]);
  
  // Send a message
  const sendMessage = async (content: string, type: string = 'TEXT') => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      const response = await api.post(`/workspaces/${workspaceId}/messages`, {
        content,
        type
      });
      
      // Socket will handle updating the UI
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };
  
  // Invite a user to the workspace
  const inviteUser = async (email: string, role: string) => {
    try {
      const response = await api.post(`/workspaces/${workspaceId}/users`, {
        email,
        role
      });
      return response.data;
    } catch (error) {
      console.error('Error inviting user:', error);
      throw error;
    }
  };
  
  // Remove a user from the workspace
  const removeUser = async (userId: string) => {
    try {
      await api.delete(`/workspaces/${workspaceId}/users/${userId}`);
      // Socket will handle updating the UI
    } catch (error) {
      console.error('Error removing user:', error);
      throw error;
    }
  };
  
  // Update a user's role
  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      await api.put(`/workspaces/${workspaceId}/users/${userId}/role`, {
        role: newRole
      });
      // Socket will handle updating the UI
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  };
  
  // Leave the workspace
  const leaveWorkspace = async () => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      await api.delete(`/workspaces/${workspaceId}/users/${user.id}`);
      return true;
    } catch (error) {
      console.error('Error leaving workspace:', error);
      throw error;
    }
  };
  
  return {
    workspace,
    members,
    loading,
    error,
    messages,
    documents,
    activities,
    userRole,
    sendMessage,
    inviteUser,
    removeUser,
    updateUserRole,
    leaveWorkspace,
    refreshData: () => {
      fetchWorkspace();
      fetchMembers();
      fetchMessages();
      fetchDocuments();
      fetchActivities();
    }
  };
};
