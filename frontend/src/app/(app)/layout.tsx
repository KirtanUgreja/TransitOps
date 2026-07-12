"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth as useClerkAuth, useUser } from "@clerk/nextjs";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

// Sole owner of access to protected routes. Two ways to be authenticated:
//  - an app JWT (demo/issued-credential login) → `user` is set, render the app.
//  - a Clerk session with no app JWT yet → bridge it here (Clerk lands on /dashboard).
// It must never fight the login page: it only redirects to /login when Clerk has
// finished loading AND there is no Clerk session and no app user.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, ready, loginWithClerk } = useAuth();
  const { isLoaded: clerkLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const router = useRouter();
  const bridged = useRef(false);          // ensure the bridge runs at most once
  const [bridgeError, setBridgeError] = useState(false);

  useEffect(() => {
    if (!ready || user) return;           // already have an app session → nothing to do
    if (!clerkLoaded) return;             // wait for Clerk before deciding anything

    if (isSignedIn) {
      if (bridged.current) return;        // bridge already attempted this mount
      bridged.current = true;
      (async () => {
        try {
          const token = await getToken();
          if (!token) throw new Error("no clerk token");
          await loginWithClerk(
            token,
            clerkUser?.primaryEmailAddress?.emailAddress,
            clerkUser?.fullName ?? undefined,
          );
          // success → `user` becomes set, this layout re-renders into <AppShell>.
        } catch {
          setBridgeError(true);           // stay put, show an error — never bounce to /login
        }
      })();
    } else {
      // Genuinely unauthenticated (no app JWT, no Clerk session) → go to login.
      router.replace("/login");
    }
  }, [ready, user, clerkLoaded, isSignedIn, getToken, clerkUser, loginWithClerk, router]);

  if (user) return <AppShell>{children}</AppShell>;

  // Clerk signed in but the bridge failed — offer a way out instead of looping.
  if (bridgeError) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t link your account. The server may be unavailable.
          </p>
          <Button onClick={() => { bridged.current = false; setBridgeError(false); }}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return null;  // loading / redirecting
}
