import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogsViewerProps {
  logs: string[];
  title?: string;
  description?: string;
  onClear?: () => void;
  className?: string;
  maxHeight?: string;
  autoScroll?: boolean;
  enableDownload?: boolean;
}

export function LogsViewer({
  logs,
  title = "Logs",
  description = "Real-time log output",
  onClear,
  className,
  maxHeight = "h-[400px]",
  autoScroll = true,
  enableDownload = true,
}: LogsViewerProps) {
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom on new logs
  React.useEffect(() => {
    if (autoScroll && scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current;
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  }, [logs, autoScroll]);
  
  // Download logs as text file
  const handleDownloadLogs = () => {
    const blob = new Blob([logs.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-${new Date().toISOString().replace(/:/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea 
          ref={scrollAreaRef} 
          className={cn("rounded-md bg-muted p-4 font-mono text-sm", maxHeight)}
        >
          {logs.length > 0 ? (
            logs.map((log, index) => {
              // Parse log level from text
              let textColor = "text-foreground";
              if (log.startsWith("ERROR:")) {
                textColor = "text-red-500 dark:text-red-400";
              } else if (log.startsWith("WARN:")) {
                textColor = "text-amber-500 dark:text-amber-400";
              } else if (log.startsWith("LOG:")) {
                textColor = "text-green-500 dark:text-green-400";
              }
              
              return (
                <div 
                  key={index} 
                  className={cn("py-0.5 whitespace-pre-wrap break-all", textColor)}
                >
                  {log}
                </div>
              );
            })
          ) : (
            <div className="py-4 text-center text-muted-foreground">
              No logs yet...
            </div>
          )}
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="justify-between pt-4">
        {onClear && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onClear}
            disabled={logs.length === 0}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Clear
          </Button>
        )}
        
        {enableDownload && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadLogs}
            disabled={logs.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default LogsViewer;