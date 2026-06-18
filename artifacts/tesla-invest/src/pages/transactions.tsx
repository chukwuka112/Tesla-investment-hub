import { useAuth } from "@/hooks/use-auth";
import { useGetDeposits, getGetDepositsQueryKey, useGetWithdrawals, getGetWithdrawalsQueryKey } from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDownToLine, ArrowUpFromLine, Clock, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function Transactions() {
  const { token } = useAuth();

  const { data: deposits, isLoading: loadDep } = useGetDeposits({
    query: { enabled: !!token, queryKey: getGetDepositsQueryKey() }
  });

  const { data: withdrawals, isLoading: loadWit } = useGetWithdrawals({
    query: { enabled: !!token, queryKey: getGetWithdrawalsQueryKey() }
  });

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'approved': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-accent" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'approved': return 'text-green-500';
      case 'rejected': return 'text-destructive';
      default: return 'text-accent';
    }
  };

  return (
    <MobileLayout title="HISTORY">
      <div className="p-4">
        
        <Tabs defaultValue="deposits" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-6 bg-card border border-border h-12">
            <TabsTrigger value="deposits" className="font-display tracking-wider uppercase text-xs">Deposits</TabsTrigger>
            <TabsTrigger value="withdrawals" className="font-display tracking-wider uppercase text-xs">Withdrawals</TabsTrigger>
          </TabsList>

          <TabsContent value="deposits" className="space-y-3">
            {loadDep ? (
              <div className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
            ) : deposits && deposits.length > 0 ? (
              deposits.map(d => (
                <div key={d.id} className="p-4 rounded-lg bg-card border border-border/50 flex justify-between items-center">
                  <div className="flex gap-3 items-center">
                    <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center shrink-0">
                      <ArrowDownToLine className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="font-display font-bold">${d.amount.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{format(new Date(d.created_at), "MMM d, HH:mm")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 mb-1">
                      {getStatusIcon(d.status)}
                      <span className={`text-[10px] uppercase tracking-wider font-bold ${getStatusColor(d.status)}`}>{d.status}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase">{d.currency}</p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState message="No deposits found" />
            )}
          </TabsContent>

          <TabsContent value="withdrawals" className="space-y-3">
            {loadWit ? (
               <div className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
            ) : withdrawals && withdrawals.length > 0 ? (
              withdrawals.map(w => (
                <div key={w.id} className="p-4 rounded-lg bg-card border border-border/50 flex justify-between items-center">
                  <div className="flex gap-3 items-center">
                    <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center shrink-0">
                      <ArrowUpFromLine className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-display font-bold">${w.amount.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{format(new Date(w.created_at), "MMM d, HH:mm")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 mb-1">
                      {getStatusIcon(w.status)}
                      <span className={`text-[10px] uppercase tracking-wider font-bold ${getStatusColor(w.status)}`}>{w.status}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase truncate max-w-[80px]" title={w.wallet_address}>{w.wallet_address.substring(0,6)}...</p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState message="No withdrawals found" />
            )}
          </TabsContent>
        </Tabs>

      </div>
    </MobileLayout>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 rounded-lg border border-dashed border-border bg-card/20">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
