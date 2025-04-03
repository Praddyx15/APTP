import React, { useState } from 'react';
import { SyllabusStructure, SyllabusSection, LearningObjective, BloomLevel } from '@/lib/document-processor';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, FileText, Book, Target, BarChart, Info, ListTree } from 'lucide-react';

interface DocumentViewerProps {
  document: SyllabusStructure;
  onEdit?: (document: SyllabusStructure) => void;
  className?: string;
}

export function DocumentViewer({ document, onEdit, className = '' }: DocumentViewerProps) {
  const [activeTab, setActiveTab] = useState('structure');

  // Helper function to render a section recursively
  const renderSection = (section: SyllabusSection, depth = 0) => {
    return (
      <div key={section.id} className="mb-2">
        <div className={`flex items-start gap-2 mb-1 ${depth > 0 ? 'ml-' + (depth * 4) : ''}`}>
          <ChevronRight 
            className="w-4 h-4 mt-1 text-gray-400 flex-shrink-0"
            style={{ marginLeft: `${depth * 0.5}rem` }}
          />
          <div>
            <h4 className={`font-medium ${depth === 0 ? 'text-base' : 'text-sm'}`}>
              {section.title}
            </h4>
            {section.pageNumber && (
              <span className="text-xs text-gray-500">
                Page {section.pageNumber}
              </span>
            )}
            {section.content && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {section.content.substring(0, 150)}
                {section.content.length > 150 ? '...' : ''}
              </p>
            )}
          </div>
        </div>
        
        {section.subsections.length > 0 && (
          <div className="mt-2">
            {section.subsections.map(subsection => renderSection(subsection, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Render learning objectives
  const renderObjectives = (objectives: LearningObjective[]) => {
    // Group objectives by type
    const groupedObjectives = objectives.reduce((acc, obj) => {
      const type = obj.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(obj);
      return acc;
    }, {} as Record<string, LearningObjective[]>);

    return (
      <div className="space-y-4">
        {Object.entries(groupedObjectives).map(([type, objs]) => (
          <div key={type} className="space-y-2">
            <h3 className="text-base font-medium capitalize">{type} Objectives</h3>
            <div className="space-y-3">
              {objs.map(obj => (
                <Card key={obj.id} className="overflow-hidden">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-sm font-medium">
                        {obj.text.substring(0, 100)}
                        {obj.text.length > 100 ? '...' : ''}
                      </CardTitle>
                      {obj.blooms && (
                        <Badge 
                          variant="outline" 
                          className={`capitalize ${getBadgeColorForBloom(obj.blooms)}`}
                        >
                          {obj.blooms}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs">
                      Section: {obj.section}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {obj.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {obj.keywords.slice(0, 5).map((keyword, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                        {obj.keywords.length > 5 && (
                          <Badge variant="secondary" className="text-xs">
                            +{obj.keywords.length - 5} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Helper for badge colors based on Bloom's Taxonomy level
  const getBadgeColorForBloom = (bloom: BloomLevel): string => {
    switch (bloom) {
      case BloomLevel.REMEMBER:
        return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case BloomLevel.UNDERSTAND:
        return 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case BloomLevel.APPLY:
        return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      case BloomLevel.ANALYZE:
        return 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
      case BloomLevel.EVALUATE:
        return 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case BloomLevel.CREATE:
        return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  // Metadata display
  const renderMetadata = () => {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Document Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Title</dt>
                <dd className="font-medium">{document.title || 'Untitled'}</dd>
              </div>
              {document.author && (
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">Author</dt>
                  <dd>{document.author}</dd>
                </div>
              )}
              {document.date && (
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">Date</dt>
                  <dd>{document.date}</dd>
                </div>
              )}
              {document.version && (
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">Version</dt>
                  <dd>{document.version}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Sections</dt>
                <dd>{document.sections.length}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Modules</dt>
                <dd>{document.modules?.length || 0}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
          
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="additional-metadata">
            <AccordionTrigger className="text-sm font-medium">
              Additional Metadata
            </AccordionTrigger>
            <AccordionContent>
              <div className="text-sm space-y-2">
                {Object.entries(document.metadata || {})
                  .filter(([key]) => !['title', 'author', 'date', 'version'].includes(key))
                  .map(([key, value]) => (
                    <div key={key} className="grid grid-cols-2 gap-2">
                      <span className="text-gray-500 dark:text-gray-400 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </span>
                      <span>{value?.toString() || '-'}</span>
                    </div>
                  ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    );
  };

  // Module display
  const renderModules = () => {
    if (!document.modules || document.modules.length === 0) {
      return (
        <div className="text-center py-6">
          <p className="text-gray-500 dark:text-gray-400">No modules available</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {document.modules.map(module => (
          <Card key={module.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{module.title}</CardTitle>
                <Badge variant="outline">
                  {module.duration} hrs
                </Badge>
              </div>
              <CardDescription>
                {module.description.substring(0, 200)}
                {module.description.length > 200 ? '...' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium mb-2">Learning Objectives</h4>
                  {module.learningObjectives.length === 0 ? (
                    <p className="text-sm text-gray-500">No learning objectives defined</p>
                  ) : (
                    <ul className="list-disc pl-5 space-y-1">
                      {module.learningObjectives.slice(0, 3).map(obj => (
                        <li key={obj.id} className="text-sm">
                          {obj.text.substring(0, 100)}
                          {obj.text.length > 100 ? '...' : ''}
                        </li>
                      ))}
                      {module.learningObjectives.length > 3 && (
                        <li className="text-sm text-gray-500">
                          +{module.learningObjectives.length - 3} more objectives
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4 flex justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">Priority:</span>
                <div className="flex space-x-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div 
                      key={i}
                      className={`w-2 h-5 rounded-sm ${
                        i < module.priority / 2 
                          ? 'bg-primary' 
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // You can add module details view here
                  console.log('View module details', module);
                }}
              >
                View Details
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className={`w-full ${className}`}>
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/50">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{document.title || 'Untitled Document'}</CardTitle>
              <CardDescription>
                {document.author ? `By ${document.author}` : ''}
                {document.date ? ` • ${document.date}` : ''}
                {document.version ? ` • Version ${document.version}` : ''}
              </CardDescription>
            </div>
            {onEdit && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onEdit(document)}
              >
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        
        <Tabs 
          defaultValue="structure" 
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="border-b px-4 py-2">
            <TabsList className="grid grid-cols-5">
              <TabsTrigger value="structure" className="flex items-center gap-2">
                <ListTree className="w-4 h-4" />
                <span className="hidden sm:inline">Structure</span>
              </TabsTrigger>
              <TabsTrigger value="objectives" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                <span className="hidden sm:inline">Objectives</span>
              </TabsTrigger>
              <TabsTrigger value="modules" className="flex items-center gap-2">
                <Book className="w-4 h-4" />
                <span className="hidden sm:inline">Modules</span>
              </TabsTrigger>
              <TabsTrigger value="metadata" className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                <span className="hidden sm:inline">Info</span>
              </TabsTrigger>
              <TabsTrigger value="toc" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">TOC</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <CardContent className="p-0">
            <ScrollArea className="h-[60vh] sm:h-[65vh]">
              <div className="p-6">
                <TabsContent value="structure" className="mt-0">
                  {document.sections.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-gray-500 dark:text-gray-400">No structure detected</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {document.sections.map(section => renderSection(section))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="objectives" className="mt-0">
                  {!document.modules || document.modules.every(m => !m.learningObjectives.length) ? (
                    <div className="text-center py-6">
                      <p className="text-gray-500 dark:text-gray-400">No learning objectives detected</p>
                    </div>
                  ) : (
                    renderObjectives(
                      document.modules
                        .flatMap(m => m.learningObjectives)
                        .filter(Boolean)
                    )
                  )}
                </TabsContent>
                
                <TabsContent value="modules" className="mt-0">
                  {renderModules()}
                </TabsContent>
                
                <TabsContent value="metadata" className="mt-0">
                  {renderMetadata()}
                </TabsContent>
                
                <TabsContent value="toc" className="mt-0">
                  {!document.toc || document.toc.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-gray-500 dark:text-gray-400">No table of contents detected</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <h3 className="font-medium mb-3">Table of Contents</h3>
                      {document.toc.map((item, i) => (
                        <div 
                          key={i} 
                          className="flex justify-between hover:bg-muted/50 p-1 rounded-sm"
                          style={{ paddingLeft: `${(item.level - 1) * 1.5}rem` }}
                        >
                          <span className="text-sm">{item.title}</span>
                          <span className="text-sm text-gray-500">Page {item.pageNumber}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </div>
            </ScrollArea>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}