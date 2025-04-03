import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

interface DashboardContainerProps {
  children: ReactNode;
}

const DashboardContainer = ({ children }: DashboardContainerProps) => {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    setLocation("/auth");
    return null;
  }

  return <div className="min-h-screen bg-background">{children}</div>;
};

export default DashboardContainer;