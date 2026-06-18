import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  useGetDashboard, getGetDashboardQueryKey,
  useGetAnnouncements, getGetAnnouncementsQueryKey,
  useGetInvestments, getGetInvestmentsQueryKey
} from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownToLine, ArrowUpFromLine, Gift, Users, ChevronRight, Activity, TrendingUp, Bell } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { user, token } = useAuth();
  
  const { data: dashboard, isLoading: loadingDash } = useGetDashboard({
    query: { enabled: !!token, queryKey: getGetDashboardQueryKey() }
  });
  
  const { data: announcements, isLoading: loadingAnn } = useGetAnnouncements({
    query: { enabled: !!token, queryKey: getGetAnnouncementsQueryKey() }
  });
  
  const { data: investments, isLoading: loadingInv } = useGetInvestments({
    query: { enabled: !!token, queryKey: getGetInvestmentsQueryKey() }
  });

  const activeInvestments = investments?.filter(i => i.status === 'active') || [];
  const pinnedAnnouncement = announcements?.find(a => a.is_pinned);

  return (
    <MobileLayout title="OVERVIEW">
      <div className="p-4 space-y-6">
        {/* User Greeting */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Welcome back</p>
            <h2 className="text-xl font-display font-semibold truncate max-w-[200px]">{user?.full_name}</h2>
          </div>
        </div>

        {/* Balance Card */}
        <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card to-card/50 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Balance</p>
              <Activity className="h-4 w-4 text-primary" />
            </div>
            {loadingDash ? (
              <Skeleton className="h-10 w-40" />
            ) : (
              <h3 className="font-display text-4xl font-bold tracking-wider">
                ${dashboard?.balance?.toFixed(2) || '0.00'}
              </h3>
            )}
            
            <div className="mt-6 flex justify-between items-center border-t border-border/50 pt-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Earnings</p>
                {loadingDash ? (
                  <Skeleton className="h-5 w-20 mt-1" />
                ) : (
                  <p className="font-display text-lg font-bold text-accent">+${dashboard?.total_earnings?.toFixed(2) || '0.00'}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Active ROI</p>
                <p className="font-display text-lg font-bold text-green-500">
                  ${dashboard?.active_investments_value?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-3">
          <QuickAction icon={<ArrowDownToLine className="h-5 w-5" />} label="Deposit" href="/deposit" />
          <QuickAction icon={<ArrowUpFromLine className="h-5 w-5" />} label="Withdraw" href="/withdraw" />
          <QuickAction icon={<Users className="h-5 w-5" />} label="Team" href="/team" />
          <QuickAction icon={<Gift className="h-5 w-5" />} label="Gift" href="/gift" />
        </div>

        {/* Announcement */}
        {pinnedAnnouncement && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 text-primary/10">
              <Bell className="h-16 w-16" />
            </div>
            <div className="flex items-start gap-3 relative z-10">
              <div className="mt-0.5 rounded-full bg-primary/20 p-1.5 text-primary">
                <Bell className="h-3 w-3" />
              </div>
              <div>
                <h4 className="font-display text-sm font-bold uppercase">{pinnedAnnouncement.title}</h4>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{pinnedAnnouncement.content}</p>
              </div>
            </div>
          </div>
        )}

        {/* Active Investments */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Active Plans</h3>
            <Link href="/plans" className="flex items-center text-xs text-primary hover:underline">
              See All <ChevronRight className="h-3 w-3 ml-1" />
            </Link>
          </div>

          {loadingInv ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : activeInvestments.length > 0 ? (
            <div className="space-y-3">
              {activeInvestments.slice(0, 3).map((inv) => (
                <Card key={inv.id} className="border-border/50 bg-card/50 overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h4 className="font-display font-bold">{inv.plan?.name}</h4>
                        <p className="text-xs text-muted-foreground">{inv.plan?.model_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-bold text-accent">+${inv.total_earned?.toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Earned</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] uppercase text-muted-foreground">
                        <span>Progress</span>
                        <span>{inv.progress_percentage || 0}%</span>
                      </div>
                      <Progress value={inv.progress_percentage || 0} className="h-1.5" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-8 text-center bg-card/20">
              <TrendingUp className="mx-auto h-8 w-8 text-muted-foreground mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No active investments yet</p>
              <Link href="/plans">
                <Button variant="outline" size="sm" className="mt-4 font-display uppercase tracking-wider text-xs">
                  Browse Plans
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}

function QuickAction({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <Link href={href} className="group flex flex-col items-center gap-2">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-card border border-border shadow-sm transition-all group-hover:border-primary/50 group-hover:bg-primary/10">
        <div className="text-foreground transition-colors group-hover:text-primary">
          {icon}
        </div>
      </div>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-foreground">
        {label}
      </span>
    </Link>
  );
}

