import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useLocation } from "wouter";

import AdminDashboard from "@/pages/dashboard";
import AdminUsers from "@/pages/users";
import AdminUserDetail from "@/pages/user-detail";
import AdminDeposits from "@/pages/deposits";
import AdminWithdrawals from "@/pages/withdrawals";
import AdminPlans from "@/pages/plans";
import AdminGiftCodes from "@/pages/gift-codes";
import AdminAnnouncements from "@/pages/announcements";
import AdminAuditLogs from "@/pages/audit-logs";
import LoginPage from "@/pages/login";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30_000,
    },
  },
});

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAdmin, token } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!token || !user) {
        setLocation("/login");
      } else if (!isAdmin) {
        setLocation("/login");
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

  if (!isAdmin) return null;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/">
        <AdminGuard><AdminDashboard /></AdminGuard>
      </Route>
      <Route path="/users">
        <AdminGuard><AdminUsers /></AdminGuard>
      </Route>
      <Route path="/users/:id">
        <AdminGuard><AdminUserDetail /></AdminGuard>
      </Route>
      <Route path="/deposits">
        <AdminGuard><AdminDeposits /></AdminGuard>
      </Route>
      <Route path="/withdrawals">
        <AdminGuard><AdminWithdrawals /></AdminGuard>
      </Route>
      <Route path="/plans">
        <AdminGuard><AdminPlans /></AdminGuard>
      </Route>
      <Route path="/gift-codes">
        <AdminGuard><AdminGiftCodes /></AdminGuard>
      </Route>
      <Route path="/announcements">
        <AdminGuard><AdminAnnouncements /></AdminGuard>
      </Route>
      <Route path="/audit-logs">
        <AdminGuard><AdminAuditLogs /></AdminGuard>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
