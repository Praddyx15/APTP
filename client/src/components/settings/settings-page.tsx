import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Save, User, Bell, Shield, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("account");

  // For demonstration purposes, we're not actually updating anything
  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your settings have been saved successfully.",
    });
  };

  if (!user) return null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-slate-500">Manage your account settings and preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="account" className="data-[state=active]:bg-white">
            <User className="h-4 w-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-white">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-white">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your account details and personal information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-slate-300 flex items-center justify-center text-slate-600 text-xl font-medium">
                  {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                </div>
                <Button variant="outline">Change Avatar</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue={user.firstName} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" defaultValue={user.lastName} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" defaultValue={user.email} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select defaultValue={user.role}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instructor">Instructor</SelectItem>
                    <SelectItem value="trainee">Trainee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Display Preferences</CardTitle>
              <CardDescription>
                Customize how you see the application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">
                    Enable dark mode for the application.
                  </p>
                </div>
                <Switch defaultChecked={false} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Compact View</p>
                  <p className="text-sm text-muted-foreground">
                    Show more content on screen.
                  </p>
                </div>
                <Switch defaultChecked={false} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how you receive notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email.
                  </p>
                </div>
                <Switch defaultChecked={true} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Session Reminders</p>
                  <p className="text-sm text-muted-foreground">
                    Get reminders before upcoming sessions.
                  </p>
                </div>
                <Switch defaultChecked={true} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Assessment Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications about new assessments.
                  </p>
                </div>
                <Switch defaultChecked={true} />
              </div>

              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" />
              </div>

              <Button onClick={handleSave}>
                <Key className="h-4 w-4 mr-2" />
                Update Password
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enable 2FA</p>
                  <p className="text-sm text-muted-foreground">
                    Protect your account with two-factor authentication.
                  </p>
                </div>
                <Switch defaultChecked={false} />
              </div>

              <Button variant="outline" disabled>
                Set Up 2FA
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
