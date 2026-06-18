import { useAuth } from "@/hooks/use-auth";
import { useGetNotifications, getGetNotificationsQueryKey, useMarkAllNotificationsRead, useMarkNotificationRead } from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2, ArrowDownToLine, ArrowUpFromLine, Activity } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function Notifications() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useGetNotifications({
    query: { enabled: !!token, queryKey: getGetNotificationsQueryKey() }
  });

  const markAllRead = useMarkAllNotificationsRead();
  const markRead = useMarkNotificationRead();

  const handleMarkAll = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
      }
    });
  };

  const handleMarkSingle = (id: string) => {
    markRead.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
      }
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <ArrowDownToLine className="h-4 w-4 text-green-500" />;
      case 'withdrawal': return <ArrowUpFromLine className="h-4 w-4 text-primary" />;
      case 'investment': return <Activity className="h-4 w-4 text-accent" />;
      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const hasUnread = notifications?.some(n => !n.is_read);

  return (
    <MobileLayout title="NOTIFICATIONS">
      <div className="p-4 space-y-4">
        
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Recent Activity</h2>
          {hasUnread && (
            <Button variant="ghost" size="sm" onClick={handleMarkAll} disabled={markAllRead.isPending} className="h-8 text-xs text-primary hover:text-primary/80">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Mark all read
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : notifications && notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div 
                key={notif.id} 
                onClick={() => !notif.is_read && handleMarkSingle(notif.id)}
                className={`p-4 rounded-lg border transition-colors ${
                  notif.is_read 
                    ? "bg-card/50 border-border/50 opacity-70" 
                    : "bg-card border-border cursor-pointer hover:bg-card/80"
                }`}
              >
                <div className="flex gap-3">
                  <div className={`mt-0.5 shrink-0 flex h-8 w-8 items-center justify-center rounded-full ${notif.is_read ? 'bg-background' : 'bg-background shadow-[0_0_10px_rgba(255,255,255,0.1)]'}`}>
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className={`font-display text-sm font-bold ${notif.is_read ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {notif.title}
                      </h4>
                      {!notif.is_read && <div className="h-2 w-2 rounded-full bg-primary mt-1 shrink-0" />}
                    </div>
                    <p className={`text-xs mt-1 leading-relaxed ${notif.is_read ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/50 mt-2 uppercase tracking-wider">
                      {format(new Date(notif.created_at), "MMM d, HH:mm")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 rounded-lg border border-dashed border-border bg-card/20">
            <Bell className="mx-auto h-8 w-8 text-muted-foreground mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">No notifications</p>
          </div>
        )}

      </div>
    </MobileLayout>
  );
}
