"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { ROLE_LABELS, type Role } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMO: { email: string; role: Role }[] = [
  { email: "fleet@transitops.in", role: "fleet_manager" },
  { email: "dispatch@transitops.in", role: "dispatcher" },
  { email: "safety@transitops.in", role: "safety_officer" },
  { email: "finance@transitops.in", role: "financial_analyst" },
];

const SCOPE: Record<Role, string> = {
  fleet_manager: "Fleet, Maintenance, Analytics",
  dispatcher: "Dashboard, Trips",
  safety_officer: "Drivers, Compliance",
  financial_analyst: "Fuel & Expenses, Analytics",
};

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? "Invalid credentials" : "Something went wrong");
      setBusy(false);
    }
  }

  function fill(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("demo1234");
    setError("");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Brand / command panel */}
      <aside className="hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Bus className="size-5" />
          </span>
          <div>
            <div className="text-lg font-semibold tracking-tight">TransitOps</div>
            <div className="text-xs text-sidebar-foreground/60">Smart Transport Operations Platform</div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="text-sm font-medium uppercase tracking-wider text-primary">One login, four roles</div>
            <p className="mt-1 max-w-sm text-sm text-sidebar-foreground/60">
              Access is scoped by role the moment you sign in — every screen and action is
              enforced server-side.
            </p>
          </div>
          <ul className="space-y-2">
            {DEMO.map((d) => (
              <li key={d.role} className="flex items-baseline justify-between gap-4 rounded-md bg-sidebar-accent/40 px-3 py-2">
                <span className="text-sm font-medium">{ROLE_LABELS[d.role]}</span>
                <span className="text-xs text-sidebar-foreground/50">{SCOPE[d.role]}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="text-xs uppercase tracking-widest text-sidebar-foreground/40">
          TransitOps © 2026 · RBAC enabled
        </div>
      </aside>

      {/* Sign-in card */}
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter your credentials to continue</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@transitops.in" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>

            {error && (
              <p className="text-sm font-medium text-destructive">❌ {error}</p>
            )}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Signing in…" : "Sign In"}
            </Button>
          </form>

          <div className="mt-8">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Demo accounts</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {DEMO.map((d) => (
                <button key={d.email} type="button" onClick={() => fill(d.email)}
                  className="rounded-md border px-3 py-2 text-left text-xs transition-colors hover:border-primary hover:bg-accent">
                  <div className="font-medium">{ROLE_LABELS[d.role]}</div>
                  <div className="truncate text-muted-foreground">{d.email}</div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">All demo accounts use password <code className="font-mono">demo1234</code>.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
