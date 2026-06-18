import { useAuth } from "@/hooks/use-auth";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon, Settings, ShieldCheck, Mail, History } from "lucide-react";
import { Link } from "wouter";

export default function Profile() {
  const { user, logout } = useAuth();

  return (
    <MobileLayout title="PROFILE">
      <div className="p-4 space-y-6">
        
        {/* User Card */}
        <Card className="border-border bg-card overflow-hidden">
          <CardContent className="p-6 text-center">
            <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
              <UserIcon className="h-10 w-10 text-primary" />
            </div>
            <h2 className="font-display text-xl font-bold tracking-wider">{user?.full_name}</h2>
            <div className="flex items-center justify-center gap-1 mt-1 text-sm text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span>{user?.email}</span>
            </div>
            
            <div className="mt-6 inline-flex items-center gap-2 bg-background px-4 py-2 rounded-full border border-border/50">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              <span className="text-xs uppercase tracking-widest font-medium">Account Verified</span>
            </div>
          </CardContent>
        </Card>

        {/* Menu */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-2">Settings & Activity</p>
          
          <Link href="/transactions">
            <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border/50 hover:bg-card/80 transition-colors">
              <div className="flex items-center gap-3">
                <div className="bg-background p-2 rounded-md">
                  <History className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium">Transaction History</span>
              </div>
            </div>
          </Link>

          <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border/50 hover:bg-card/80 transition-colors opacity-50 cursor-not-allowed">
            <div className="flex items-center gap-3">
              <div className="bg-background p-2 rounded-md">
                <Settings className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium">Account Settings</span>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <Button 
            variant="outline" 
            onClick={logout}
            className="w-full h-12 text-destructive hover:text-destructive hover:bg-destructive/10 border-border/50 font-display tracking-widest uppercase"
          >
            <LogOut className="h-4 w-4 mr-2" /> SIGN OUT
          </Button>
        </div>

      </div>
    </MobileLayout>
  );
}
