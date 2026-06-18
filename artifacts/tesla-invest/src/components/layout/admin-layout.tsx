import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Car, 
  Gift, 
  Megaphone, 
  ShieldAlert,
  LogOut
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function AdminLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const [location] = useLocation();
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card">
        <div className="flex h-16 items-center border-b border-border px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground">
              <span className="font-display font-bold">T</span>
            </div>
            <span className="font-display text-lg font-bold tracking-wider">ADMIN</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-1 p-4">
          <div className="mb-2 px-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Overview
          </div>
          <NavItem href="/admin" icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" active={location === "/admin"} />
          
          <div className="mb-2 mt-4 px-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Management
          </div>
          <NavItem href="/admin/users" icon={<Users className="h-4 w-4" />} label="Users" active={location.startsWith("/admin/users")} />
          <NavItem href="/admin/deposits" icon={<ArrowDownToLine className="h-4 w-4" />} label="Deposits" active={location.startsWith("/admin/deposits")} />
          <NavItem href="/admin/withdrawals" icon={<ArrowUpFromLine className="h-4 w-4" />} label="Withdrawals" active={location.startsWith("/admin/withdrawals")} />
          
          <div className="mb-2 mt-4 px-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Configuration
          </div>
          <NavItem href="/admin/plans" icon={<Car className="h-4 w-4" />} label="Investment Plans" active={location.startsWith("/admin/plans")} />
          <NavItem href="/admin/gift-codes" icon={<Gift className="h-4 w-4" />} label="Gift Codes" active={location.startsWith("/admin/gift-codes")} />
          <NavItem href="/admin/announcements" icon={<Megaphone className="h-4 w-4" />} label="Announcements" active={location.startsWith("/admin/announcements")} />
          
          <div className="mb-2 mt-4 px-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Security
          </div>
          <NavItem href="/admin/audit-logs" icon={<ShieldAlert className="h-4 w-4" />} label="Audit Logs" active={location.startsWith("/admin/audit-logs")} />
        </div>

        <div className="absolute bottom-0 left-0 w-full border-t border-border p-4">
          <button 
            onClick={() => logout()}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-8 backdrop-blur-md">
          <h1 className="font-display text-xl font-semibold">{title || "Admin Panel"}</h1>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-muted-foreground hover:text-white transition-colors">
              Exit Admin
            </Link>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active 
          ? "bg-primary/10 text-primary" 
          : "text-muted-foreground hover:bg-white/5 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
