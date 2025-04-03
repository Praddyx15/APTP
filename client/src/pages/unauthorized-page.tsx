import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { ShieldAlert, Home, ArrowLeft } from "lucide-react";

export default function UnauthorizedPage() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="px-6 py-10 mx-auto text-center max-w-2xl rounded-lg shadow-md bg-white dark:bg-gray-800">
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-full bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400">
            <ShieldAlert size={48} />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl mb-4">
          Access Denied
        </h1>
        
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
          You don't have permission to access this page.
          {user ? ` Your current role (${user.role}) doesn't have the required access level.` : ''}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
            variant="outline"
          >
            <Home size={18} />
            Go to Home
          </Button>
          
          <Button 
            onClick={() => window.history.back()}
            className="flex items-center gap-2"
            variant="outline"
          >
            <ArrowLeft size={18} />
            Go Back
          </Button>
          
          <Button 
            onClick={() => logout()}
            className="flex items-center gap-2"
            variant="destructive"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}