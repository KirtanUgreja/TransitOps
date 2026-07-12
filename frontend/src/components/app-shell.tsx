"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Truck, Users, Route, Wrench,
  Fuel, BarChart3, Settings, Bus, Search, LogOut, Menu,
} from "lucide-react";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { useAuth } from "@/lib/auth";
import { can, ROLE_LABELS, type Resource } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV: { href: string; label: string; resource: Resource; icon: React.ElementType }[] = [
  { href: "/dashboard", label: "Dashboard", resource: "dashboard", icon: LayoutDashboard },
  { href: "/fleet", label: "Fleet", resource: "fleet", icon: Truck },
  { href: "/drivers", label: "Drivers", resource: "drivers", icon: Users },
  { href: "/trips", label: "Trips", resource: "trips", icon: Route },
  { href: "/maintenance", label: "Maintenance", resource: "maintenance", icon: Wrench },
  { href: "/fuel-expenses", label: "Fuel & Expenses", resource: "fuel_expenses", icon: Fuel },
  { href: "/analytics", label: "Analytics", resource: "analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", resource: "settings", icon: Settings },
];

function initials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const items = NAV.filter((n) => can(user?.role, n.resource));
  return (
    <nav className="flex flex-col gap-0.5 px-3">
      <div className="px-3 pb-2 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
        Menu
      </div>
      {items.map((n) => {
        const active = pathname === n.href || pathname.startsWith(n.href + "/");
        const Icon = n.icon;
        return (
          <Link key={n.href} href={n.href} onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                : "font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}>
            <Icon className={cn("size-[18px] shrink-0", active ? "text-primary" : "text-sidebar-foreground/60")} />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-6 py-5">
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <Bus className="size-5" />
      </span>
      <span className="font-heading text-lg font-semibold tracking-tight text-sidebar-foreground">TransitOps</span>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { signOut, isSignedIn } = useClerkAuth();

  async function handleLogout() {
    if (isSignedIn) await signOut();  // clear Clerk session for admin users
    logout();                          // clear app JWT + redirect
  }

  if (!user) return null;

  return (
    <div className="grid min-h-screen grid-rows-[auto_1fr] lg:grid-cols-[16rem_1fr] lg:grid-rows-1">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col lg:row-span-full">
        <Brand />
        <div className="mt-1 flex-1 overflow-y-auto pb-4">
          <NavLinks />
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:col-start-2">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur-md lg:px-8">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger
              aria-label="Open menu"
              className="grid size-9 place-items-center rounded-md transition-colors hover:bg-accent lg:hidden">
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Brand />
              <NavLinks />
            </SheetContent>
          </Sheet>

          <div className="relative hidden max-w-md flex-1 sm:block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search or type a command…"
              className="h-10 rounded-full border-transparent bg-muted pl-10 focus-visible:bg-card" />
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent">
                <span className="grid size-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {initials(user.name)}
                </span>
                <span className="hidden text-sm leading-tight sm:block">
                  <span className="block font-medium">{user.name}</span>
                  <span className="block text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</span>
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="size-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
