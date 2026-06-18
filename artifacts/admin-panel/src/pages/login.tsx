import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLogin } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const { setToken, isAdmin, token } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = useLogin();

  if (token && isAdmin) {
    setLocation("/");
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { data: { email, password } },
      {
        onSuccess: (data) => {
          if (data.user.role !== "admin" && data.user.role !== "super_admin") {
            toast({ title: "Access Denied", description: "You must be an admin to access this panel.", variant: "destructive" });
            return;
          }
          setToken(data.token);
          setLocation("/");
        },
        onError: () => {
          toast({ title: "Login Failed", description: "Invalid email or password.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded bg-primary text-primary-foreground mb-4">
            <span className="font-display text-xl font-bold">T</span>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-wider">ADMIN PANEL</h1>
          <p className="text-sm text-muted-foreground mt-1">Tesla Invest Control Center</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</label>
            <Input
              type="email"
              placeholder="admin@tesla.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-background border-border/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-background border-border/50"
            />
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={login.isPending}>
            {login.isPending ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}
