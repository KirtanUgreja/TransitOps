"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Truck, Users, Route, Wrench,
  Fuel, BarChart3, Settings, Bus, Search, LogOut, Menu,
} from "lucide-react";
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
    <nav className="flex flex-col gap-1 px-3">
      {items.map((n) => {
        const active = pathname === n.href || pathname.startsWith(n.href + "/");
        const Icon = n.icon;
        return (
          <Link key={n.href} href={n.href} onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
            )}>
            <Icon className="size-4 shrink-0" />
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
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Bus className="size-4" />
      </span>
      <span className="font-semibold tracking-tight text-sidebar-foreground">TransitOps</span>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="grid min-h-screen grid-rows-[auto_1fr] lg:grid-cols-[16rem_1fr] lg:grid-rows-1">
      {/* Desktop sidebar */}
      <aside className="hidden bg-sidebar lg:flex lg:flex-col lg:row-span-full">
        <Brand />
        <div className="mt-2 flex-1 overflow-y-auto pb-4">
          <NavLinks />
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:col-start-2">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/95 px-4 py-2.5 backdrop-blur lg:px-6">
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

          <div className="relative hidden max-w-sm flex-1 sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search…" className="pl-9" />
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
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="size-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
