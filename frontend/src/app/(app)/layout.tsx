"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

// The AuthProvider owns all auth decisions (localStorage restore + Clerk→JWT bridge).
// This guard just reads the result: render the app if authenticated, redirect to
// /login only once auth has fully resolved with no session. No cross-page race.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, ready, clerkError, retryClerk } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user && !clerkError) router.replace("/login");
  }, [ready, user, clerkError, router]);

  if (user) return <AppShell>{children}</AppShell>;

  if (clerkError) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t link your account. The server may be unavailable.
          </p>
          <Button onClick={retryClerk}>Try again</Button>
        </div>
      </div>
    );
  }

  return null; // loading / redirecting
}
