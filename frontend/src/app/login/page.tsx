"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bus, ShieldCheck } from "lucide-react";
import { SignInButton, SignUpButton, useAuth as useClerkAuth } from "@clerk/nextjs";
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
  const { login, user, clerkError } = useAuth();
  const router = useRouter();
  const { isSignedIn } = useClerkAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // The AuthProvider is the single source of truth: once it has a `user` (either from
  // the JWT login below or from bridging a Clerk session), enter the app. This page
  // never touches the Clerk bridge, so it can't race the (app) guard.
  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  // Clerk signed in but the app session isn't ready yet → the provider is bridging.
  const bridging = isSignedIn && !user && !clerkError;

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
      {/* Brand panel — deliberate dark panel with an amber wash, contrasts the white sign-in side. */}
      <aside className="relative hidden flex-col justify-between overflow-hidden p-12 text-neutral-100 lg:flex
        bg-[radial-gradient(120%_120%_at_0%_0%,#3a2a12_0%,#1c1917_45%,#0c0a09_100%)]">
        <div
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle,var(--primary),transparent 70%)" }}
        />
        <div className="relative flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <Bus className="size-5" />
          </span>
          <div>
            <div className="font-heading text-xl font-semibold tracking-tight">TransitOps</div>
            <div className="text-xs text-neutral-400">Smart Transport Operations Platform</div>
          </div>
        </div>

        <div className="relative space-y-6">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-primary">One login · four roles</div>
            <p className="mt-3 max-w-sm font-heading text-2xl font-medium leading-snug text-neutral-100">
              Run the whole fleet from one control room.
            </p>
            <p className="mt-2 max-w-sm text-sm text-neutral-400">
              Access is scoped by role the moment you sign in — every screen and action enforced
              server-side.
            </p>
          </div>
          <ul className="space-y-2">
            {DEMO.map((d) => (
              <li key={d.role}
                className="flex items-baseline justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5">
                <span className="text-sm font-medium">{ROLE_LABELS[d.role]}</span>
                <span className="text-xs text-neutral-400">{SCOPE[d.role]}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-[11px] uppercase tracking-widest text-neutral-500">
          TransitOps © 2026 · RBAC enabled
        </div>
      </aside>

      {/* Sign-in card */}
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Sign in to your account</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Enter your credentials to continue</p>

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

            <Button type="submit" className="w-full" disabled={busy || bridging}>
              {busy ? "Signing in…" : "Sign In"}
            </Button>
          </form>

          {/* Admin sign-in via Clerk — the Fleet Manager's direct login / sign-up. */}
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-2">
            {isSignedIn ? (
              // Already signed into Clerk — don't re-open the modal (single-session mode
              // makes that error). Just continue into the app (the provider bridges).
              <Button className="w-full" disabled={bridging}
                onClick={() => router.replace("/dashboard")}>
                <ShieldCheck className="size-4" />
                {clerkError ? "Retry" : bridging ? "Entering…" : "Continue as admin"}
              </Button>
            ) : (
              <>
                <SignInButton mode="modal">
                  <Button variant="outline" className="w-full">
                    <ShieldCheck className="size-4" /> Admin sign-in (Clerk)
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button type="button" className="w-full text-center text-xs text-muted-foreground hover:text-foreground">
                    New admin? Create an account
                  </button>
                </SignUpButton>
              </>
            )}
            <p className="text-center text-[11px] text-muted-foreground">
              Admins sign in with Clerk and manage users. Other roles use the issued credentials above.
            </p>
          </div>

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
