import { AppLayout } from "@/components/layouts/app-layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Laptop,
  LifeBuoy,
  Mail,
  MessageSquare,
  PenTool,
  Phone,
  BookOpen,
  Book,
  FileText,
  Network,
  HelpCircle
} from "lucide-react";

export default function HelpPage() {
  return (
    <AppLayout>
      <div className="container py-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">Help Center</h1>
            <p className="text-muted-foreground">
              Find answers to common questions and learn how to use the platform
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>
                Quick introduction to the Advanced Pilot Training Platform
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4 border-dashed">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <BookOpen className="h-8 w-8 text-primary" />
                      <h3 className="font-medium">Training Programs</h3>
                      <p className="text-sm text-muted-foreground">
                        Create and manage training syllabi for pilots
                      </p>
                    </div>
                  </Card>
                  <Card className="p-4 border-dashed">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <FileText className="h-8 w-8 text-primary" />
                      <h3 className="font-medium">Document Processing</h3>
                      <p className="text-sm text-muted-foreground">
                        Extract information from regulatory documents
                      </p>
                    </div>
                  </Card>
                  <Card className="p-4 border-dashed">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <Network className="h-8 w-8 text-primary" />
                      <h3 className="font-medium">Knowledge Graph</h3>
                      <p className="text-sm text-muted-foreground">
                        Visualize connections between aviation concepts
                      </p>
                    </div>
                  </Card>
                </div>
              </div>

              <Tabs defaultValue="general">
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="general">General Questions</TabsTrigger>
                  <TabsTrigger value="instructors">For Instructors</TabsTrigger>
                  <TabsTrigger value="trainees">For Trainees</TabsTrigger>
                </TabsList>
                <TabsContent value="general" className="space-y-4">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>What is the Advanced Pilot Training Platform?</AccordionTrigger>
                      <AccordionContent>
                        The Advanced Pilot Training Platform is a comprehensive system designed to streamline aviation training management. It provides tools for creating training programs, managing documents, tracking trainee progress, and ensuring regulatory compliance.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                      <AccordionTrigger>How do I navigate the platform?</AccordionTrigger>
                      <AccordionContent>
                        Use the sidebar navigation to access different sections of the platform. The main areas include Dashboard, Training Programs, Document Management, and Knowledge Graph. Each section has specific tools and features relevant to that area.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                      <AccordionTrigger>What are the system requirements?</AccordionTrigger>
                      <AccordionContent>
                        The platform is web-based and works on any modern browser, including Chrome, Firefox, Safari, and Edge. No installation is required. For the best experience, we recommend using a device with at least 8GB of RAM and a screen resolution of 1366x768 or higher.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-4">
                      <AccordionTrigger>How secure is my data?</AccordionTrigger>
                      <AccordionContent>
                        All data is encrypted during transmission and at rest. We use industry-standard security protocols and regular security audits to ensure your data remains protected. User access is controlled through role-based permissions, and sensitive operations are logged for audit purposes.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </TabsContent>
                
                <TabsContent value="instructors" className="space-y-4">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>How do I create a new training program?</AccordionTrigger>
                      <AccordionContent>
                        Navigate to the Training Programs section from the sidebar, then click the "Create New Program" button. You can either start from scratch, use a template, or generate a program based on regulatory documents using our AI-powered syllabus generator.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                      <AccordionTrigger>How do I schedule training sessions?</AccordionTrigger>
                      <AccordionContent>
                        Within a training program, navigate to the "Sessions" tab and click "Schedule New Session." You can select the module, lesson, date, time, duration, instructor, and trainees. The system will check for scheduling conflicts automatically.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                      <AccordionTrigger>How do I track trainee performance?</AccordionTrigger>
                      <AccordionContent>
                        You can view individual trainee performance in the "Trainees" section or through the "Analytics" dashboard. Performance metrics include attendance, assessment scores, completion rates, and skill progression over time.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </TabsContent>
                
                <TabsContent value="trainees" className="space-y-4">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>How do I view my assigned training?</AccordionTrigger>
                      <AccordionContent>
                        Your current training programs and scheduled sessions appear on your dashboard. You can also navigate to the "My Training" section to see a complete list of all programs you're enrolled in, along with your progress in each.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                      <AccordionTrigger>How do I access training materials?</AccordionTrigger>
                      <AccordionContent>
                        Training materials are available within each module and lesson of your assigned programs. Navigate to the specific program, then select the module or lesson to access the associated materials, which may include documents, videos, interactive content, and assessment questions.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                      <AccordionTrigger>How do I submit assessments?</AccordionTrigger>
                      <AccordionContent>
                        Assessments are accessible from the "Assessments" tab within a training program. Open the assessment, complete the required questions or tasks, and click "Submit" when finished. Some assessments may be timed, so pay attention to any countdown timers displayed.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Support</CardTitle>
              <CardDescription>
                Need more help? Contact our support team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Mail className="h-8 w-8 text-primary" />
                    <h3 className="font-medium">Email Support</h3>
                    <p className="text-sm text-muted-foreground">
                      support@60minutesaviation.com
                    </p>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Phone className="h-8 w-8 text-primary" />
                    <h3 className="font-medium">Phone Support</h3>
                    <p className="text-sm text-muted-foreground">
                      +1 (555) 123-4567
                    </p>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <MessageSquare className="h-8 w-8 text-primary" />
                    <h3 className="font-medium">Live Chat</h3>
                    <p className="text-sm text-muted-foreground">
                      Available 24/7
                    </p>
                  </div>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}