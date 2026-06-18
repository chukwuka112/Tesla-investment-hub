import { Link, useLocation } from "wouter";
import { Home, Car, Users, User, Bell } from "lucide-react";
import { useGetNotifications, getGetNotificationsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";

export function MobileLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const [location] = useLocation();
  const { token } = useAuth();

  const { data: notifications } = useGetNotifications({
    query: {
      enabled: !!token,
      queryKey: getGetNotificationsQueryKey(),
    }
  });

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[430px] flex-col bg-background shadow-2xl relative overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground">
            <span className="font-display font-bold">T</span>
          </div>
          <span className="font-display text-lg font-bold tracking-wider">{title || "TESLA INVEST"}</span>
        </div>
        <Link href="/notifications" className="relative p-2 hover:bg-white/5 rounded-full transition-colors">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-20 scrollbar-none">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 z-50 w-full max-w-[430px] border-t border-border bg-background/90 backdrop-blur-lg pb-safe">
        <div className="flex h-16 items-center justify-around px-2">
          <NavItem href="/" icon={<Home className="h-6 w-6" />} label="Home" active={location === "/"} />
          <NavItem href="/plans" icon={<Car className="h-6 w-6" />} label="Plans" active={location === "/plans" || location.startsWith("/invest/")} />
          <NavItem href="/team" icon={<Users className="h-6 w-6" />} label="Team" active={location === "/team"} />
          <NavItem href="/profile" icon={<User className="h-6 w-6" />} label="Profile" active={location === "/profile"} />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link href={href} className={`flex flex-col items-center justify-center w-16 h-full space-y-1 transition-colors ${active ? "text-primary" : "text-muted-foreground hover:text-white"}`}>
      <div className={`${active ? "scale-110" : "scale-100"} transition-transform duration-200`}>
        {icon}
      </div>
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
    </Link>
  );
}
