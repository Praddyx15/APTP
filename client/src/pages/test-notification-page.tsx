import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useWebSocket } from '@/hooks/use-websocket';
import { WebSocketStatus } from '@/components/notification/websocket-status';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestNotificationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isConnected } = useWebSocket();
  const [title, setTitle] = useState('Test Notification');
  const [message, setMessage] = useState('This is a test notification from the system.');
  const [notificationType, setNotificationType] = useState('system');
  const [priority, setPriority] = useState('medium');
  const [loading, setLoading] = useState(false);

  async function sendTestNotification() {
    if (!user) return;
    
    setLoading(true);

    try {
      const response = await apiRequest('POST', '/api/notifications', {
        title,
        message,
        type: notificationType,
        userId: user.id,
        priority,
        link: '/test-notification'
      });

      if (response.ok) {
        toast({
          title: 'Notification Sent',
          description: 'Test notification has been sent successfully.',
          variant: 'default',
        });
      } else {
        const error = await response.text();
        throw new Error(error || 'Failed to send notification');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send notification',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-6">
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Test Notification System</CardTitle>
          <CardDescription>
            Create a test notification to verify the notification system is working properly.
            <WebSocketStatus />
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Notification Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter notification title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Input
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter notification message"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={notificationType}
                onValueChange={setNotificationType}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                  <SelectItem value="session">Session</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="achievement">Achievement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={setPriority}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={sendTestNotification} 
            disabled={loading || !isConnected || !title || !message}
            className="w-full"
          >
            {loading ? 'Sending...' : 'Send Test Notification'}
          </Button>
          
          {!isConnected && (
            <p className="text-sm text-destructive mt-2">
              WebSocket connection is required to send real-time notifications. Please wait for connection to be established.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}