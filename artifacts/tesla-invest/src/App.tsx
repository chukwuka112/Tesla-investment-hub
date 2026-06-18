import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
// Pages
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Dashboard from "@/pages/dashboard";
import Plans from "@/pages/plans";
import Invest from "@/pages/invest";
import Deposit from "@/pages/deposit";
import Withdraw from "@/pages/withdraw";
import Team from "@/pages/team";
import Gift from "@/pages/gift";
import Notifications from "@/pages/notifications";
import Profile from "@/pages/profile";
import Transactions from "@/pages/transactions";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* Public Auth Routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />

      {/* Protected User Routes */}
      <Route path="/">
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      </Route>
      <Route path="/plans">
        <ProtectedRoute><Plans /></ProtectedRoute>
      </Route>
      <Route path="/invest/:id">
        <ProtectedRoute><Invest /></ProtectedRoute>
      </Route>
      <Route path="/deposit">
        <ProtectedRoute><Deposit /></ProtectedRoute>
      </Route>
      <Route path="/withdraw">
        <ProtectedRoute><Withdraw /></ProtectedRoute>
      </Route>
      <Route path="/team">
        <ProtectedRoute><Team /></ProtectedRoute>
      </Route>
      <Route path="/gift">
        <ProtectedRoute><Gift /></ProtectedRoute>
      </Route>
      <Route path="/notifications">
        <ProtectedRoute><Notifications /></ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute><Profile /></ProtectedRoute>
      </Route>
      <Route path="/transactions">
        <ProtectedRoute><Transactions /></ProtectedRoute>
      </Route>

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
