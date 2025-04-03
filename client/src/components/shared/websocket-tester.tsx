import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useWebSocket, useNotifications } from '@/providers/websocket-provider';
import { ConnectionStatus } from '@/lib/websocket';
import { ScrollArea } from '@/components/ui/scroll-area';

export function WebSocketTester() {
  const { isConnected, connectionStatus, sendMessage } = useWebSocket();
  const { notifications, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
  
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState('general');
  const [messageType, setMessageType] = useState('notification');
  
  const statusColors = {
    [ConnectionStatus.CONNECTING]: 'bg-yellow-200 text-yellow-800',
    [ConnectionStatus.OPEN]: 'bg-green-200 text-green-800',
    [ConnectionStatus.CLOSING]: 'bg-orange-200 text-orange-800',
    [ConnectionStatus.CLOSED]: 'bg-red-200 text-red-800',
    [ConnectionStatus.ERROR]: 'bg-red-200 text-red-800',
  };
  
  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    // For test notifications, create a notification payload
    if (messageType === 'notification') {
      sendMessage('notification', {
        id: Date.now().toString(),
        type: 'info',
        title: 'Test Notification',
        message: message,
        timestamp: new Date().toISOString(),
      }, channel);
    } else {
      // For custom messages, send raw message
      sendMessage(messageType, {
        content: message,
        timestamp: new Date().toISOString(),
      }, channel);
    }
    
    setMessage('');
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>WebSocket Tester</CardTitle>
          <CardDescription>
            Test WebSocket connection and send messages
          </CardDescription>
          <div className="flex items-center gap-2">
            <span>Status:</span>
            <Badge className={statusColors[connectionStatus] || ''}>
              {connectionStatus}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Message Type</label>
              <select
                className="w-full p-2 border rounded-md"
                value={messageType}
                onChange={(e) => setMessageType(e.target.value)}
              >
                <option value="notification">Notification</option>
                <option value="chat">Chat</option>
                <option value="system">System</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Channel</label>
              <Input 
                value={channel} 
                onChange={(e) => setChannel(e.target.value)} 
                placeholder="Channel name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Message</label>
              <Textarea 
                value={message} 
                onChange={(e) => setMessage(e.target.value)} 
                placeholder="Type your message here"
                className="min-h-[100px]"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleSendMessage} 
            disabled={!isConnected || !message.trim()}
            className="w-full"
          >
            Send Message
          </Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Received notifications ({notifications.length}, {notifications.filter(n => !n.read).length} unread)
          </CardDescription>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              Mark All as Read
            </Button>
            <Button variant="outline" size="sm" onClick={clearNotifications}>
              Clear All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] rounded-md border p-2">
            {notifications.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                No notifications yet
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`p-3 rounded-md border ${notification.read ? 'bg-muted/30' : 'bg-accent/10'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-medium">{notification.title}</div>
                      <Badge variant={notification.read ? 'outline' : 'default'} className="ml-2">
                        {notification.read ? 'read' : 'new'}
                      </Badge>
                    </div>
                    <div className="text-sm mt-1">{notification.message}</div>
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-xs text-muted-foreground">
                        {new Date(notification.timestamp).toLocaleString()}
                      </div>
                      {!notification.read && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => markAsRead(notification.id)}
                        >
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}