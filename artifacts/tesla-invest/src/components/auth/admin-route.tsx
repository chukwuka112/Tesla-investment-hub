import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAdmin, token } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!token || !user) {
        setLocation("/login");
      } else if (!isAdmin) {
        setLocation("/");
      }
    }
  }, [user, isLoading, isAdmin, token, setLocation]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}
