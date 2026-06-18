import { useAdminGetAnalytics, getAdminGetAnalyticsQueryKey } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";

export default function AdminDashboard() {
  const { token } = useAuth();
  const { data, isLoading } = useAdminGetAnalytics({
    query: { enabled: !!token, queryKey: getAdminGetAnalyticsQueryKey() }
  });

  return (
    <AdminLayout title="Analytics Overview">
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Users" value={data?.total_users} sub={`+${data?.new_users_today} today`} />
          <StatCard title="Active Users" value={data?.active_users} />
          <StatCard title="Total Deposits" value={`$${data?.total_deposits?.toFixed(2)}`} sub={`+${data?.deposits_today} today`} />
          <StatCard title="Total Withdrawals" value={`$${data?.total_withdrawals?.toFixed(2)}`} sub={`+${data?.withdrawals_today} today`} />
          <StatCard title="Total Investments" value={`$${data?.total_investments?.toFixed(2)}`} />
          <StatCard title="Total User Balance" value={`$${data?.total_balance?.toFixed(2)}`} />
        </div>
      )}
    </AdminLayout>
  );
}

function StatCard({ title, value, sub }: { title: string; value: any; sub?: string }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-display font-bold text-white">{value || 0}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}
