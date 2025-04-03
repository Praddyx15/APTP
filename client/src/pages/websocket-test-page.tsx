import React from 'react';
import { Helmet } from 'react-helmet';
import { PageHeader } from '@/components/shared/page-header';
import { WebSocketTester } from '@/components/shared/websocket-tester';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * WebSocket Test Page
 * This page provides utilities for testing WebSocket functionality
 */
export default function WebSocketTestPage() {
  const [logs, setLogs] = React.useState<string[]>([]);
  
  // Override console.log to capture WebSocket logs
  React.useEffect(() => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    // Only capture WebSocket-related logs
    console.log = (...args) => {
      originalConsoleLog(...args);
      if (args[0] && typeof args[0] === 'string' && args[0].includes('[WebSocketClient]')) {
        setLogs(prev => [`LOG (${new Date().toLocaleTimeString()}): ${args.join(' ')}`, ...prev]);
      }
    };
    
    console.error = (...args) => {
      originalConsoleError(...args);
      if (args[0] && typeof args[0] === 'string' && args[0].includes('[WebSocketClient]')) {
        setLogs(prev => [`ERROR (${new Date().toLocaleTimeString()}): ${args.join(' ')}`, ...prev]);
      }
    };
    
    console.warn = (...args) => {
      originalConsoleWarn(...args);
      if (args[0] && typeof args[0] === 'string' && args[0].includes('[WebSocketClient]')) {
        setLogs(prev => [`WARN (${new Date().toLocaleTimeString()}): ${args.join(' ')}`, ...prev]);
      }
    };
    
    // Reset console.log on unmount
    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, []);
  
  // Clear logs
  const handleClearLogs = () => {
    setLogs([]);
  };
  
  return (
    <>
      <Helmet>
        <title>WebSocket Testing | Aviation Training Platform</title>
      </Helmet>
      
      <div className="container mx-auto py-8 px-4">
        <PageHeader 
          title="WebSocket Testing"
          description="Test and debug WebSocket connections and events"
          className="mb-8"
        />
        
        <WebSocketTester />
        
        <div className="mt-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>WebSocket Logs</CardTitle>
                <CardDescription>
                  Real-time logs from WebSocket activity
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleClearLogs}>
                Clear Logs
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] rounded-md border p-4">
                {logs.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">
                    No logs yet. Try sending a message.
                  </div>
                ) : (
                  <div className="space-y-1 font-mono text-sm">
                    {logs.map((log, index) => (
                      <div key={index} className="border-b border-border/40 pb-1 last:border-0">
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}