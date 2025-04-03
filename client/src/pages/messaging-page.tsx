import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { queryClient, apiRequest } from "@/lib/queryClient";
import DashboardContainer from "../components/dashboard-container";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PlusCircle,
  Search,
  Send,
  MoreVertical,
  File,
  Image,
  Paperclip,
  Users,
  UserPlus,
  X,
  MessageSquare,
  ArrowLeftRight,
  Trash2,
  Bell,
  BellOff,
  Clock,
  Check,
  Pin,
  Download,
} from "lucide-react";

// Interface definitions
interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  attachments?: MessageAttachment[];
  isRead: boolean;
}

interface MessageAttachment {
  id: number;
  type: "image" | "file";
  name: string;
  url: string;
  size?: number;
  thumbnailUrl?: string;
}

interface Conversation {
  id: number;
  type: "private" | "group";
  name?: string;
  participants: Participant[];
  lastMessage?: {
    content: string;
    timestamp: string;
    senderId: number;
  };
  unreadCount: number;
  isStarred: boolean;
  isPinned: boolean;
}

interface Participant {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  status?: "online" | "offline" | "away";
  lastSeen?: string;
  isTyping?: boolean;
}

const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.getDate() === now.getDate() &&
                 date.getMonth() === now.getMonth() &&
                 date.getFullYear() === now.getFullYear();
  
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.getDate() === yesterday.getDate() &&
                     date.getMonth() === yesterday.getMonth() &&
                     date.getFullYear() === yesterday.getFullYear();
  
  if (isYesterday) {
    return 'Yesterday';
  }
  
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const MessagingPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const webSocket = useWebSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newMessage, setNewMessage] = useState("");
  const [newConversationDialog, setNewConversationDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "direct" | "groups">("all");
  const [newConversationData, setNewConversationData] = useState({
    type: "private" as "private" | "group",
    recipients: [] as number[],
    name: "",
  });

  // Mock data for conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      // In a real implementation, this would call an API
      // return await apiRequest("GET", "/api/conversations");
      
      // Mock data
      return [
        {
          id: 1,
          type: "private",
          participants: [
            {
              id: 1,
              name: "John Doe",
              email: "john.doe@example.com",
              avatar: "/avatars/john-doe.jpg",
              status: "online",
            },
            {
              id: user?.id || 0,
              name: user?.firstName + " " + user?.lastName || "Current User",
              email: user?.email || "user@example.com",
              status: "online",
            }
          ],
          lastMessage: {
            content: "When is the next training session scheduled?",
            timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            senderId: 1,
          },
          unreadCount: 2,
          isStarred: true,
          isPinned: true,
        },
        {
          id: 2,
          type: "group",
          name: "B737 Type Rating Group",
          participants: [
            {
              id: 2,
              name: "Sarah Johnson",
              email: "sarah.j@example.com",
              avatar: "/avatars/sarah-johnson.jpg",
              status: "offline",
              lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            },
            {
              id: 3,
              name: "Mike Smith",
              email: "mike.s@example.com",
              status: "away",
              lastSeen: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            },
            {
              id: user?.id || 0,
              name: user?.firstName + " " + user?.lastName || "Current User",
              email: user?.email || "user@example.com",
              status: "online",
            }
          ],
          lastMessage: {
            content: "I've uploaded the updated syllabus document to the resource section",
            timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
            senderId: 2,
          },
          unreadCount: 0,
          isStarred: false,
          isPinned: false,
        },
        {
          id: 3,
          type: "private",
          participants: [
            {
              id: 4,
              name: "Emma Watson",
              email: "emma.w@example.com",
              avatar: "/avatars/emma-watson.jpg",
              status: "online",
            },
            {
              id: user?.id || 0,
              name: user?.firstName + " " + user?.lastName || "Current User",
              email: user?.email || "user@example.com",
              status: "online",
            }
          ],
          lastMessage: {
            content: "Could you review my assessment feedback?",
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            senderId: 4,
          },
          unreadCount: 0,
          isStarred: true,
          isPinned: false,
        },
        {
          id: 4,
          type: "group",
          name: "Instructor Team",
          participants: [
            {
              id: 5,
              name: "Robert Brown",
              email: "robert.b@example.com",
              status: "online",
            },
            {
              id: 6,
              name: "Lisa Chang",
              email: "lisa.c@example.com",
              avatar: "/avatars/lisa-chang.jpg",
              status: "offline",
              lastSeen: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
            },
            {
              id: 1,
              name: "John Doe",
              email: "john.doe@example.com",
              avatar: "/avatars/john-doe.jpg",
              status: "online",
            },
            {
              id: user?.id || 0,
              name: user?.firstName + " " + user?.lastName || "Current User",
              email: user?.email || "user@example.com",
              status: "online",
            }
          ],
          lastMessage: {
            content: "Let's discuss the upcoming simulator sessions during tomorrow's meeting",
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            senderId: 5,
          },
          unreadCount: 0,
          isStarred: false,
          isPinned: false,
        }
      ];
    },
  });

  // Mock data for messages in a conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["messages", selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation) return [];
      
      // In a real implementation, this would call an API
      // return await apiRequest("GET", `/api/conversations/${selectedConversation.id}/messages`);
      
      // Mock data
      const baseDate = new Date();
      baseDate.setHours(baseDate.getHours() - 2);
      
      const mockMessages: Message[] = [];
      const conversationId = selectedConversation.id;
      const otherParticipant = selectedConversation.participants.find(p => p.id !== user?.id);
      
      if (conversationId === 1) {
        mockMessages.push(
          {
            id: 1,
            conversationId: 1,
            senderId: otherParticipant?.id || 1,
            senderName: otherParticipant?.name || "John Doe",
            senderAvatar: otherParticipant?.avatar,
            content: "Hi there! I wanted to ask about the upcoming training schedule.",
            timestamp: new Date(baseDate.getTime() - 60 * 60 * 1000).toISOString(),
            isRead: true,
          },
          {
            id: 2,
            conversationId: 1,
            senderId: user?.id || 0,
            senderName: user?.firstName + " " + user?.lastName || "You",
            content: "Hello! Sure, what specific details do you need?",
            timestamp: new Date(baseDate.getTime() - 55 * 60 * 1000).toISOString(),
            isRead: true,
          },
          {
            id: 3,
            conversationId: 1,
            senderId: otherParticipant?.id || 1,
            senderName: otherParticipant?.name || "John Doe",
            senderAvatar: otherParticipant?.avatar,
            content: "I'm particularly interested in the simulator sessions for next week.",
            timestamp: new Date(baseDate.getTime() - 50 * 60 * 1000).toISOString(),
            isRead: true,
          },
          {
            id: 4,
            conversationId: 1,
            senderId: user?.id || 0,
            senderName: user?.firstName + " " + user?.lastName || "You",
            content: "We have simulator sessions scheduled for Tuesday and Thursday from 9 AM to 1 PM. There's also an additional session on Friday afternoon if you need more practice time.",
            timestamp: new Date(baseDate.getTime() - 45 * 60 * 1000).toISOString(),
            isRead: true,
          },
          {
            id: 5,
            conversationId: 1,
            senderId: otherParticipant?.id || 1,
            senderName: otherParticipant?.name || "John Doe",
            senderAvatar: otherParticipant?.avatar,
            content: "That's perfect! I'll join on Tuesday and Thursday. What specific scenarios will we be covering?",
            timestamp: new Date(baseDate.getTime() - 40 * 60 * 1000).toISOString(),
            isRead: true,
          },
          {
            id: 6,
            conversationId: 1,
            senderId: user?.id || 0,
            senderName: user?.firstName + " " + user?.lastName || "You",
            content: "Tuesday will focus on emergency procedures and abnormal situations, while Thursday will cover complex navigation and low visibility operations.",
            timestamp: new Date(baseDate.getTime() - 35 * 60 * 1000).toISOString(),
            isRead: true,
          },
          {
            id: 7,
            conversationId: 1,
            senderId: otherParticipant?.id || 1,
            senderName: otherParticipant?.name || "John Doe",
            senderAvatar: otherParticipant?.avatar,
            content: "Thanks for the information! Should I prepare anything specific beforehand?",
            timestamp: new Date(baseDate.getTime() - 30 * 60 * 1000).toISOString(),
            isRead: true,
          },
          {
            id: 8,
            conversationId: 1,
            senderId: user?.id || 0,
            senderName: user?.firstName + " " + user?.lastName || "You",
            content: "I recommend reviewing the emergency checklists and SOP for the specific scenarios. I'll send you some study materials later today.",
            timestamp: new Date(baseDate.getTime() - 25 * 60 * 1000).toISOString(),
            isRead: true,
          },
          {
            id: 9,
            conversationId: 1,
            senderId: otherParticipant?.id || 1,
            senderName: otherParticipant?.name || "John Doe",
            senderAvatar: otherParticipant?.avatar,
            content: "Perfect, I'll be looking forward to that.",
            timestamp: new Date(baseDate.getTime() - 20 * 60 * 1000).toISOString(),
            isRead: true,
          },
          {
            id: 10,
            conversationId: 1,
            senderId: otherParticipant?.id || 1,
            senderName: otherParticipant?.name || "John Doe",
            senderAvatar: otherParticipant?.avatar,
            content: "By the way, will the simulator sessions be recorded for later review?",
            timestamp: new Date(baseDate.getTime() - 10 * 60 * 1000).toISOString(),
            isRead: true,
          },
          {
            id: 11,
            conversationId: 1,
            senderId: otherParticipant?.id || 1,
            senderName: otherParticipant?.name || "John Doe",
            senderAvatar: otherParticipant?.avatar,
            content: "When is the next training session scheduled?",
            timestamp: new Date(baseDate.getTime() - 5 * 60 * 1000).toISOString(),
            isRead: false,
          }
        );
      } else if (conversationId === 2) {
        // Mock group conversation
        const participants = selectedConversation.participants;
        
        mockMessages.push(
          {
            id: 101,
            conversationId: 2,
            senderId: participants[0].id,
            senderName: participants[0].name,
            senderAvatar: participants[0].avatar,
            content: "Hello everyone! I've updated the training materials for the B737 Type Rating course.",
            timestamp: new Date(baseDate.getTime() - 5 * 60 * 60 * 1000).toISOString(),
            isRead: true,
          },
          {
            id: 102,
            conversationId: 2,
            senderId: participants[1].id,
            senderName: participants[1].name,
            content: "Thanks Sarah! Where can we find the updated materials?",
            timestamp: new Date(baseDate.getTime() - 4.5 * 60 * 60 * 1000).toISOString(),
            isRead: true,
          },
          {
            id: 103,
            conversationId: 2,
            senderId: participants[0].id,
            senderName: participants[0].name,
            senderAvatar: participants[0].avatar,
            content: "I've uploaded them to the Resources section. You'll find new versions of the study guides and checklists.",
            timestamp: new Date(baseDate.getTime() - 4 * 60 * 60 * 1000).toISOString(),
            isRead: true,
            attachments: [
              {
                id: 1,
                type: "file",
                name: "B737_Type_Rating_Study_Guide_v2.pdf",
                url: "/files/B737_Type_Rating_Study_Guide_v2.pdf",
                size: 2450000
              }
            ]
          },
          {
            id: 104,
            conversationId: 2,
            senderId: user?.id || 0,
            senderName: user?.firstName + " " + user?.lastName || "You",
            content: "Great work! I'll review them right away.",
            timestamp: new Date(baseDate.getTime() - 3.5 * 60 * 60 * 1000).toISOString(),
            isRead: true,
          },
          {
            id: 105,
            conversationId: 2,
            senderId: participants[0].id,
            senderName: participants[0].name,
            senderAvatar: participants[0].avatar,
            content: "I've also created some flashcards for quick review before simulator sessions.",
            timestamp: new Date(baseDate.getTime() - 3.25 * 60 * 60 * 1000).toISOString(),
            isRead: true,
          },
          {
            id: 106,
            conversationId: 2,
            senderId: participants[1].id,
            senderName: participants[1].name,
            content: "That's really helpful. By the way, are there any changes to the emergency procedures section?",
            timestamp: new Date(baseDate.getTime() - 3 * 60 * 60 * 1000).toISOString(),
            isRead: true,
          },
          {
            id: 107,
            conversationId: 2,
            senderId: participants[0].id,
            senderName: participants[0].name,
            senderAvatar: participants[0].avatar,
            content: "Yes, I've updated the engine failure procedures based on the latest manufacturer recommendations.",
            timestamp: new Date(baseDate.getTime() - 2.5 * 60 * 60 * 1000).toISOString(),
            isRead: true,
          },
          {
            id: 108,
            conversationId: 2,
            senderId: participants[0].id,
            senderName: participants[0].name,
            senderAvatar: participants[0].avatar,
            content: "I've uploaded the updated syllabus document to the resource section",
            timestamp: new Date(baseDate.getTime() - 1 * 60 * 60 * 1000).toISOString(),
            isRead: true,
          }
        );
      } else {
        // For other conversations, generate generic messages
        mockMessages.push(
          {
            id: 201,
            conversationId,
            senderId: otherParticipant?.id || 1,
            senderName: otherParticipant?.name || "User",
            senderAvatar: otherParticipant?.avatar,
            content: "Hello there! How's your training going?",
            timestamp: new Date(baseDate.getTime() - 25 * 60 * 60 * 1000).toISOString(),
            isRead: true,
          },
          {
            id: 202,
            conversationId,
            senderId: user?.id || 0,
            senderName: user?.firstName + " " + user?.lastName || "You",
            content: "Hi! It's going well, thanks for asking. I've completed most of the modules already.",
            timestamp: new Date(baseDate.getTime() - 24 * 60 * 60 * 1000).toISOString(),
            isRead: true,
          },
          {
            id: 203,
            conversationId,
            senderId: otherParticipant?.id || 1,
            senderName: otherParticipant?.name || "User",
            senderAvatar: otherParticipant?.avatar,
            content: "That's great progress! Let me know if you need any assistance.",
            timestamp: new Date(baseDate.getTime() - 23 * 60 * 60 * 1000).toISOString(),
            isRead: true,
          }
        );
      }
      
      return mockMessages;
    },
    enabled: !!selectedConversation
  });

  // Mock data for contacts/users
  const { data: contacts = [] } = useQuery<Participant[]>({
    queryKey: ["contacts"],
    queryFn: async () => {
      // In a real implementation, this would call an API
      // return await apiRequest("GET", "/api/contacts");
      
      // Mock data
      return [
        {
          id: 1,
          name: "John Doe",
          email: "john.doe@example.com",
          avatar: "/avatars/john-doe.jpg",
          status: "online",
        },
        {
          id: 2,
          name: "Sarah Johnson",
          email: "sarah.j@example.com",
          avatar: "/avatars/sarah-johnson.jpg",
          status: "offline",
          lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 3,
          name: "Mike Smith",
          email: "mike.s@example.com",
          status: "away",
          lastSeen: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        },
        {
          id: 4,
          name: "Emma Watson",
          email: "emma.w@example.com",
          avatar: "/avatars/emma-watson.jpg",
          status: "online",
        },
        {
          id: 5,
          name: "Robert Brown",
          email: "robert.b@example.com",
          status: "online",
        },
        {
          id: 6,
          name: "Lisa Chang",
          email: "lisa.c@example.com",
          avatar: "/avatars/lisa-chang.jpg",
          status: "offline",
          lastSeen: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        },
      ];
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: number, content: string }) => {
      // In a real implementation, this would call an API
      // return await apiRequest("POST", `/api/conversations/${conversationId}/messages`, { content });
      
      // Mock implementation
      // In a real app, the server would return the new message with an ID
      return {
        id: Math.floor(Math.random() * 10000),
        conversationId,
        senderId: user?.id || 0,
        senderName: user?.firstName + " " + user?.lastName || "You",
        content,
        timestamp: new Date().toISOString(),
        isRead: true
      };
    },
    onSuccess: (newMessage) => {
      // Update the messages cache
      queryClient.setQueryData<Message[]>(
        ["messages", newMessage.conversationId],
        (oldMessages = []) => [...oldMessages, newMessage]
      );

      // Update the conversation's last message
      queryClient.setQueryData<Conversation[]>(
        ["conversations"],
        (oldConversations = []) => {
          return oldConversations.map(conv => {
            if (conv.id === newMessage.conversationId) {
              return {
                ...conv,
                lastMessage: {
                  content: newMessage.content,
                  timestamp: newMessage.timestamp,
                  senderId: newMessage.senderId
                }
              };
            }
            return conv;
          });
        }
      );

      // In a real app, this would be handled by the WebSocket
      // Scroll to bottom on new message
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const createConversationMutation = useMutation({
    mutationFn: async (data: typeof newConversationData) => {
      // In a real implementation, this would call an API
      // return await apiRequest("POST", "/api/conversations", data);
      
      // Mock implementation
      // Simulate a server response with a new conversation
      const newId = Math.floor(Math.random() * 10000);
      const participants = [
        ...(data.recipients.map(id => contacts.find(c => c.id === id)).filter(Boolean) as Participant[]),
        {
          id: user?.id || 0,
          name: user?.firstName + " " + user?.lastName || "Current User",
          email: user?.email || "user@example.com",
          status: "online"
        }
      ];
      
      return {
        id: newId,
        type: data.type,
        name: data.type === 'group' ? data.name : undefined,
        participants,
        unreadCount: 0,
        isStarred: false,
        isPinned: false,
      };
    },
    onSuccess: (newConversation) => {
      // Update conversations cache
      queryClient.setQueryData<Conversation[]>(
        ["conversations"],
        (oldConversations = []) => [...oldConversations, newConversation]
      );
      
      // Close dialog and reset form
      setNewConversationDialog(false);
      setNewConversationData({
        type: "private",
        recipients: [],
        name: "",
      });
      
      // Select the new conversation
      setSelectedConversation(newConversation);
      
      toast({
        title: "Conversation created",
        description: "Your new conversation has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create conversation",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mark messages as read
  const markAsReadMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      // In a real implementation, this would call an API
      // return await apiRequest("POST", `/api/conversations/${conversationId}/read`);
      
      // Mock implementation
      return { conversationId };
    },
    onSuccess: (data) => {
      // Update unread count in conversation
      queryClient.setQueryData<Conversation[]>(
        ["conversations"],
        (oldConversations = []) => {
          return oldConversations.map(conv => {
            if (conv.id === data.conversationId) {
              return {
                ...conv,
                unreadCount: 0
              };
            }
            return conv;
          });
        }
      );
      
      // Mark all messages as read
      queryClient.setQueryData<Message[]>(
        ["messages", data.conversationId],
        (oldMessages = []) => {
          return oldMessages.map(msg => ({
            ...msg,
            isRead: true
          }));
        }
      );
    }
  });

  // Handle WebSocket connection
  useEffect(() => {
    if (!webSocket.connected) {
      webSocket.connect();
    }
    
    // Set up message handler
    const handleMessage = (data: any) => {
      try {
        if (data.type === 'message') {
          // Update messages and conversation
          const newMessage = data.payload;
          
          // Add message to the cache if conversation is selected
          if (selectedConversation?.id === newMessage.conversationId) {
            queryClient.setQueryData<Message[]>(
              ["messages", newMessage.conversationId],
              (oldMessages = []) => [...oldMessages, newMessage]
            );
            
            // Mark as read
            markAsReadMutation.mutate(newMessage.conversationId);
          }
          
          // Update conversation's last message
          queryClient.setQueryData<Conversation[]>(
            ["conversations"],
            (oldConversations = []) => {
              return oldConversations.map(conv => {
                if (conv.id === newMessage.conversationId) {
                  return {
                    ...conv,
                    lastMessage: {
                      content: newMessage.content,
                      timestamp: newMessage.timestamp,
                      senderId: newMessage.senderId
                    },
                    unreadCount: selectedConversation?.id === newMessage.conversationId 
                      ? 0 
                      : (conv.unreadCount || 0) + 1
                  };
                }
                return conv;
              });
            }
          );
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    };
    
    // Subscribe to the 'messages' channel
    webSocket.subscribe('messages');
    
    // Set up message event handler
    if (webSocket.lastMessage) {
      handleMessage(webSocket.lastMessage);
    }
    
    return () => {
      // Clean up on unmount
      webSocket.unsubscribe('messages');
    };
  }, [webSocket, selectedConversation, queryClient, markAsReadMutation]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView();
  }, [messages]);

  // Mark messages as read when conversation is selected
  useEffect(() => {
    if (selectedConversation && selectedConversation.unreadCount > 0) {
      markAsReadMutation.mutate(selectedConversation.id);
    }
  }, [selectedConversation, markAsReadMutation]);

  // Handle sending message
  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    sendMessageMutation.mutate({
      conversationId: selectedConversation.id,
      content: newMessage.trim()
    });
    
    setNewMessage("");
  };

  // Handle creating a new conversation
  const handleCreateConversation = () => {
    if (newConversationData.type === "private" && newConversationData.recipients.length !== 1) {
      toast({
        title: "Invalid recipients",
        description: "Please select exactly one recipient for private conversations.",
        variant: "destructive",
      });
      return;
    }
    
    if (newConversationData.type === "group") {
      if (newConversationData.recipients.length < 2) {
        toast({
          title: "Invalid recipients",
          description: "Please select at least two recipients for group conversations.",
          variant: "destructive",
        });
        return;
      }
      
      if (!newConversationData.name.trim()) {
        toast({
          title: "Missing group name",
          description: "Please provide a name for the group conversation.",
          variant: "destructive",
        });
        return;
      }
    }
    
    createConversationMutation.mutate(newConversationData);
  };

  // Filter conversations based on tab and search
  const filteredConversations = conversations.filter(conv => {
    // Filter by tab
    if (activeTab === "direct" && conv.type !== "private") return false;
    if (activeTab === "groups" && conv.type !== "group") return false;
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      // For private conversations, check the other participant's name
      if (conv.type === "private") {
        const otherParticipant = conv.participants.find(p => p.id !== user?.id);
        return otherParticipant?.name.toLowerCase().includes(query) || 
               otherParticipant?.email.toLowerCase().includes(query);
      } 
      // For group conversations, check the group name
      else {
        return conv.name?.toLowerCase().includes(query);
      }
    }
    
    return true;
  });

  // Sort conversations: pinned first, then by last message time
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    // Pinned conversations first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    
    // Then sort by last message time (newest first)
    if (a.lastMessage && b.lastMessage) {
      return new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime();
    }
    
    // If one has a last message and the other doesn't
    if (a.lastMessage && !b.lastMessage) return -1;
    if (!a.lastMessage && b.lastMessage) return 1;
    
    // If neither has a last message, sort by ID
    return a.id - b.id;
  });

  // Function to get conversation display name
  const getConversationName = (conversation: Conversation): string => {
    if (conversation.type === "group") {
      return conversation.name || "Group Conversation";
    } else {
      // For private conversations, show the other participant's name
      const otherParticipant = conversation.participants.find(p => p.id !== user?.id);
      return otherParticipant?.name || "Private Conversation";
    }
  };

  return (
    <DashboardContainer>
      <Helmet>
        <title>Messaging | Advanced Pilot Training Platform</title>
      </Helmet>
      
      <div className="flex h-[calc(100vh-4rem)] flex-col">
        <div className="border-b pb-2 px-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Messages</h1>
          <div className="flex items-center gap-2">
            <Dialog open={newConversationDialog} onOpenChange={setNewConversationDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  New Conversation
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>New Conversation</DialogTitle>
                  <DialogDescription>
                    Create a new conversation with individuals or groups.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label htmlFor="conversation-type" className="mb-1 block">Conversation Type</Label>
                    <Select
                      value={newConversationData.type}
                      onValueChange={(value: "private" | "group") => setNewConversationData({
                        ...newConversationData,
                        type: value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select conversation type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Private (1-on-1)</SelectItem>
                        <SelectItem value="group">Group</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {newConversationData.type === "group" && (
                    <div>
                      <Label htmlFor="group-name" className="mb-1 block">Group Name</Label>
                      <Input
                        id="group-name"
                        placeholder="Enter group name"
                        value={newConversationData.name}
                        onChange={(e) => setNewConversationData({
                          ...newConversationData,
                          name: e.target.value
                        })}
                      />
                    </div>
                  )}
                  
                  <div>
                    <Label className="mb-1 block">
                      {newConversationData.type === "private" ? "Recipient" : "Participants"}
                    </Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {newConversationData.recipients.map((recipientId) => {
                        const recipient = contacts.find(c => c.id === recipientId);
                        if (!recipient) return null;
                        
                        return (
                          <Badge key={recipientId} variant="secondary" className="gap-1 py-1 px-3">
                            {recipient.name}
                            <button 
                              onClick={() => setNewConversationData({
                                ...newConversationData,
                                recipients: newConversationData.recipients.filter(id => id !== recipientId)
                              })}
                              className="ml-1"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                    <Select
                      onValueChange={(value) => {
                        const id = parseInt(value, 10);
                        if (!newConversationData.recipients.includes(id)) {
                          setNewConversationData({
                            ...newConversationData,
                            recipients: [...newConversationData.recipients, id]
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${newConversationData.type === "private" ? "a recipient" : "participants"}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {contacts
                          .filter(contact => contact.id !== user?.id && !newConversationData.recipients.includes(contact.id))
                          .map((contact) => (
                            <SelectItem key={contact.id} value={contact.id.toString()}>
                              <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${
                                  contact.status === "online" ? "bg-green-500" :
                                  contact.status === "away" ? "bg-yellow-500" : "bg-gray-300"
                                }`} />
                                {contact.name}
                              </div>
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleCreateConversation}
                    disabled={createConversationMutation.isPending}
                  >
                    {createConversationMutation.isPending ? "Creating..." : "Create Conversation"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <div className="flex-1 flex overflow-hidden">
          {/* Conversations list */}
          <div className="w-80 border-r flex flex-col overflow-hidden">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="flex-1 flex flex-col">
              <TabsList className="grid grid-cols-3 m-2">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="direct">Direct</TabsTrigger>
                <TabsTrigger value="groups">Groups</TabsTrigger>
              </TabsList>
              
              <ScrollArea className="flex-1">
                <div className="space-y-1 p-2">
                  {conversationsLoading ? (
                    <div className="flex justify-center items-center h-20">
                      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                    </div>
                  ) : sortedConversations.length === 0 ? (
                    <div className="text-center py-8 px-4 text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      {searchQuery ? (
                        <p>No conversations match your search</p>
                      ) : (
                        <p>No conversations found. Start a new one!</p>
                      )}
                    </div>
                  ) : (
                    sortedConversations.map((conversation) => {
                      const isSelected = selectedConversation?.id === conversation.id;
                      const otherParticipant = conversation.type === "private" 
                        ? conversation.participants.find(p => p.id !== user?.id)
                        : null;
                      
                      return (
                        <div
                          key={conversation.id}
                          className={`flex items-center gap-3 p-2 rounded-md cursor-pointer ${
                            isSelected ? "bg-accent" : "hover:bg-accent/50"
                          } ${conversation.isPinned ? "border-l-2 border-primary" : ""}`}
                          onClick={() => setSelectedConversation(conversation)}
                        >
                          {conversation.type === "private" ? (
                            <Avatar>
                              <AvatarImage src={otherParticipant?.avatar} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {getInitials(otherParticipant?.name || "")}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <h3 className="font-medium text-sm truncate">
                                {getConversationName(conversation)}
                              </h3>
                              <div className="text-xs text-muted-foreground">
                                {conversation.lastMessage && formatTime(conversation.lastMessage.timestamp)}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <p className="text-xs text-muted-foreground truncate">
                                {conversation.lastMessage?.content || "No messages yet"}
                              </p>
                              
                              {conversation.unreadCount > 0 && (
                                <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center rounded-full">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </Tabs>
          </div>
          
          {/* Conversation display */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Conversation header */}
                <div className="border-b p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedConversation.type === "private" ? (
                      <>
                        <Avatar>
                          <AvatarImage src={selectedConversation.participants.find(p => p.id !== user?.id)?.avatar} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(getConversationName(selectedConversation))}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h2 className="font-semibold">
                            {getConversationName(selectedConversation)}
                          </h2>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <div className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                              selectedConversation.participants.find(p => p.id !== user?.id)?.status === "online"
                              ? "bg-green-500"
                              : selectedConversation.participants.find(p => p.id !== user?.id)?.status === "away"
                              ? "bg-yellow-500"
                              : "bg-gray-300"
                            }`} />
                            {selectedConversation.participants.find(p => p.id !== user?.id)?.status === "online"
                              ? "Online"
                              : selectedConversation.participants.find(p => p.id !== user?.id)?.status === "away"
                              ? "Away"
                              : "Offline"}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h2 className="font-semibold">
                            {selectedConversation.name || "Group Conversation"}
                          </h2>
                          <div className="text-xs text-muted-foreground">
                            {selectedConversation.participants.length} members
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Conversation Options</DropdownMenuLabel>
                      <DropdownMenuItem className="gap-2">
                        <UserPlus className="h-4 w-4" />
                        Add participants
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2">
                        <ArrowLeftRight className="h-4 w-4" />
                        Transfer files
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2">
                        {selectedConversation.isPinned ? (
                          <>
                            <Pin className="h-4 w-4" />
                            Unpin conversation
                          </>
                        ) : (
                          <>
                            <Pin className="h-4 w-4" />
                            Pin conversation
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2">
                        {selectedConversation.isStarred ? (
                          <>
                            <Bell className="h-4 w-4" />
                            Unmute notifications
                          </>
                        ) : (
                          <>
                            <BellOff className="h-4 w-4" />
                            Mute notifications
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
                        <Trash2 className="h-4 w-4" />
                        Delete conversation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                {/* Messages display */}
                <ScrollArea className="flex-1 p-4">
                  {messagesLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mb-2 opacity-50" />
                      <h3 className="text-lg font-medium mb-1">No messages yet</h3>
                      <p className="text-muted-foreground mb-4 max-w-md">
                        Send your first message to start the conversation!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message, index) => {
                        const isCurrentUser = message.senderId === user?.id;
                        const showSender = selectedConversation.type === "group" && !isCurrentUser;
                        const showAvatar = !isCurrentUser;
                        
                        // Group consecutive messages from the same sender
                        const prevMessage = index > 0 ? messages[index - 1] : null;
                        const isSameSenderAsPrev = prevMessage && prevMessage.senderId === message.senderId;
                        const timeGap = prevMessage
                          ? new Date(message.timestamp).getTime() - new Date(prevMessage.timestamp).getTime() > 5 * 60 * 1000
                          : false;
                        
                        const showSenderInfo = !isSameSenderAsPrev || timeGap;
                        
                        return (
                          <div key={message.id} className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                            <div className={`flex ${isCurrentUser ? "flex-row-reverse" : "flex-row"} max-w-[80%] gap-2`}>
                              {showAvatar && showSenderInfo ? (
                                <Avatar className="h-8 w-8 mt-1">
                                  <AvatarImage src={message.senderAvatar} />
                                  <AvatarFallback className="text-xs">
                                    {getInitials(message.senderName)}
                                  </AvatarFallback>
                                </Avatar>
                              ) : <div className="w-8" />}
                              
                              <div className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"}`}>
                                {showSender && showSenderInfo && (
                                  <div className="text-xs font-medium text-muted-foreground mb-1 ml-1">
                                    {message.senderName}
                                  </div>
                                )}
                                
                                <div className={`rounded-lg px-3 py-2 ${
                                  isCurrentUser 
                                    ? "bg-primary text-primary-foreground" 
                                    : "bg-muted"
                                }`}>
                                  <p className="text-sm">{message.content}</p>
                                  
                                  {message.attachments && message.attachments.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                      {message.attachments.map(attachment => (
                                        <div 
                                          key={attachment.id}
                                          className={`flex items-center gap-2 rounded p-2 ${
                                            isCurrentUser ? "bg-primary/80" : "bg-background"
                                          }`}
                                        >
                                          {attachment.type === "image" ? (
                                            <Image className="h-4 w-4" />
                                          ) : (
                                            <File className="h-4 w-4" />
                                          )}
                                          <span className="text-xs truncate flex-1">{attachment.name}</span>
                                          <Button variant="ghost" size="icon" className="h-6 w-6">
                                            <Download className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex items-center mt-1 gap-1">
                                  <time className="text-xs text-muted-foreground">
                                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </time>
                                  
                                  {isCurrentUser && (
                                    message.isRead ? (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger>
                                            <Check className="h-3 w-3 text-primary" />
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Read</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    ) : (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger>
                                            <Clock className="h-3 w-3 text-muted-foreground" />
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Delivered</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
                
                {/* Message input */}
                <div className="border-t p-3">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Type your message..."
                        className="min-h-[80px] resize-none py-3 pr-12"
                      />
                      <div className="absolute bottom-3 right-3 flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                          <Paperclip className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Button
                      className="self-end"
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-xl font-medium mb-2">No conversation selected</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Select an existing conversation or start a new one to begin messaging.
                </p>
                <Button 
                  onClick={() => setNewConversationDialog(true)}
                  className="gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  Start a new conversation
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardContainer>
  );
};

export default MessagingPage;