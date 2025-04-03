import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { WifiIcon, WifiOffIcon, SendIcon, RefreshCwIcon } from 'lucide-react';

export function WebSocketStatus() {
  const [messages, setMessages] = useState<any[]>([]);
  const [showMessages, setShowMessages] = useState(false);
  
  const { 
    isConnected, 
    lastMessage, 
    connect, 
    disconnect, 
    ping,
    subscribe
  } = useWebSocket({
    onMessage: (data) => {
      setMessages((prev) => [...prev.slice(-9), data]);
    }
  });

  // Update the message list when a new message is received
  useEffect(() => {
    if (lastMessage) {
      setMessages((prev) => [...prev.slice(-9), lastMessage]);
    }
  }, [lastMessage]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          WebSocket Connection
          {isConnected ? (
            <Badge variant="outline" className="ml-2 bg-green-100 text-green-800">
              <WifiIcon className="h-3 w-3 mr-1" /> Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="ml-2 bg-red-100 text-red-800">
              <WifiOffIcon className="h-3 w-3 mr-1" /> Disconnected
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Real-time communication status with the server
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={isConnected ? "destructive" : "default"}
              size="sm"
              onClick={isConnected ? disconnect : connect}
            >
              {isConnected ? "Disconnect" : "Connect"}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => ping()}
              disabled={!isConnected}
            >
              <RefreshCwIcon className="h-4 w-4 mr-1" />
              Ping Server
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => subscribe('notifications')}
              disabled={!isConnected}
            >
              <SendIcon className="h-4 w-4 mr-1" />
              Subscribe to Notifications
            </Button>
          </div>
          
          <Button
            variant="link"
            size="sm"
            onClick={() => setShowMessages(!showMessages)}
            className="p-0 h-auto"
          >
            {showMessages ? "Hide Messages" : "Show Messages"}
          </Button>
          
          {showMessages && (
            <div className="mt-4 max-h-40 overflow-y-auto border rounded-md p-2">
              {messages.length > 0 ? (
                <div className="space-y-2">
                  {messages.map((msg, index) => (
                    <Alert key={index} variant="default" className="py-2">
                      <AlertTitle>{msg.type}</AlertTitle>
                      <AlertDescription className="text-xs">
                        <pre className="mt-2 w-full text-xs overflow-auto">
                          {JSON.stringify(msg, null, 2)}
                        </pre>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground text-sm py-4">
                  No messages received yet. Try pinging the server.
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Last updated: {new Date().toLocaleTimeString()}
      </CardFooter>
    </Card>
  );
}