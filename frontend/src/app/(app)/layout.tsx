"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth as useClerkAuth, useUser } from "@clerk/nextjs";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, ready, loginWithClerk } = useAuth();
  const { isLoaded: clerkLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const router = useRouter();
  const [bridging, setBridging] = useState(false);

  // If Clerk is signed in but we have no app session yet, bridge it here —
  // Clerk's post-auth redirect can land on any protected route, not just /login.
  useEffect(() => {
    if (!ready || user || !clerkLoaded) return;
    if (isSignedIn && !bridging) {
      setBridging(true);
      (async () => {
        try {
          const token = await getToken();
          if (token) {
            await loginWithClerk(
              token,
              clerkUser?.primaryEmailAddress?.emailAddress,
              clerkUser?.fullName ?? undefined,
            );
            return;
          }
        } catch { /* fall through to login */ }
        router.replace("/login");
      })();
    } else if (!isSignedIn && !bridging) {
      router.replace("/login");
    }
  }, [ready, user, clerkLoaded, isSignedIn, bridging, getToken, clerkUser, loginWithClerk, router]);

  if (!ready || !user) return null;
  return <AppShell>{children}</AppShell>;
}
