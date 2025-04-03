import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, FileText, CheckCircle, AlertTriangle, Upload } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function OCRProcessingTab() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  
  const handleFileChange = (acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    setError(null);
    setResult(null);
  };
  
  const processOCR = async () => {
    if (files.length === 0) {
      setError('Please select a file to process');
      return;
    }
    
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    
    // Simulate OCR processing with progress
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 5;
        if (newProgress >= 100) {
          clearInterval(interval);
          
          // Simulate OCR result
          setTimeout(() => {
            setIsProcessing(false);
            setResult('This is a simulated OCR result. The actual OCR processing implementation will be added in the next iteration. The extracted text would appear here with proper formatting and structure recognition.');
            setActiveTab('result');
          }, 500);
          
          return 100;
        }
        return newProgress;
      });
    }, 200);
  };
  
  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Upload Document</span>
          </TabsTrigger>
          <TabsTrigger 
            value="result" 
            className="flex items-center gap-2"
            disabled={!result}
          >
            <CheckCircle className="h-4 w-4" />
            <span>OCR Result</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div 
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('file-input')?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.add('border-primary');
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.remove('border-primary');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.remove('border-primary');
                    
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      const file = e.dataTransfer.files[0];
                      if (file.size > 10 * 1024 * 1024) {
                        setError('File size exceeds 10MB limit');
                        return;
                      }
                      
                      const acceptedTypes = [
                        'application/pdf',
                        'image/jpeg',
                        'image/png',
                        'image/tiff'
                      ];
                      
                      if (!acceptedTypes.includes(file.type)) {
                        setError('Invalid file type. Please upload a PDF, JPG, PNG, or TIFF file.');
                        return;
                      }
                      
                      setFiles([file]);
                      setError(null);
                    }
                  }}
                >
                  <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-medium mb-1">Upload Document</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {files.length > 0 
                      ? `Selected: ${files[0].name} (${(files[0].size / 1024 / 1024).toFixed(2)} MB)` 
                      : 'Drag & drop or click to select a document'}
                  </p>
                  <p className="text-xs text-muted-foreground/75">
                    Supported formats: PDF, JPG, PNG, TIFF (Max: 10MB)
                  </p>
                  <input
                    id="file-input"
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.tiff"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const file = e.target.files[0];
                        if (file.size > 10 * 1024 * 1024) {
                          setError('File size exceeds 10MB limit');
                          return;
                        }
                        setFiles([file]);
                      }
                    }}
                  />
                </div>
                
                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                {isProcessing ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processing document...</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-sm text-muted-foreground">
                      {progress < 30 
                        ? 'Analyzing document structure...' 
                        : progress < 60 
                        ? 'Extracting text content...' 
                        : 'Finalizing results...'}
                    </p>
                  </div>
                ) : (
                  <Button 
                    onClick={processOCR} 
                    disabled={files.length === 0}
                    className="w-full"
                  >
                    Process Document
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="result" className="space-y-4">
          {result && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">OCR Result</h3>
                    <Button variant="outline" onClick={() => setActiveTab('upload')}>
                      Process Another Document
                    </Button>
                  </div>
                  
                  <div className="p-4 border rounded-md bg-muted/30">
                    <pre className="whitespace-pre-wrap text-sm">{result}</pre>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea 
                      id="notes" 
                      placeholder="Add your notes about this OCR result..." 
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        if (result) {
                          navigator.clipboard.writeText(result)
                            .then(() => {
                              alert('Text copied to clipboard');
                            })
                            .catch(err => {
                              console.error('Could not copy text: ', err);
                              setError('Failed to copy text to clipboard');
                            });
                        }
                      }}
                    >
                      Copy Text
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        if (result) {
                          const blob = new Blob([result], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'ocr-result.txt';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }
                      }}
                    >
                      Download as TXT
                    </Button>
                    <Button onClick={() => alert('This feature will be implemented in the future update.')}>
                      Save to Documents
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}