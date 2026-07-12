"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth as useClerkAuth, useUser } from "@clerk/nextjs";
import { api, setToken } from "@/lib/api";
import type { Role } from "@/lib/rbac";

export type User = { id: number; name: string; email: string; role: Role };

type AuthCtx = {
  user: User | null;
  /** true once we've finished deciding auth state (localStorage + any Clerk bridge). */
  ready: boolean;
  /** true if a Clerk session exists but bridging it to an app JWT failed. */
  clerkError: boolean;
  login: (email: string, password: string) => Promise<void>;
  retryClerk: () => void;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);
const USER_KEY = "transitops_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [localReady, setLocalReady] = useState(false);   // localStorage checked
  const [clerkError, setClerkError] = useState(false);
  const bridged = useRef(false);

  const { isLoaded: clerkLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user: clerkUser } = useUser();

  // 1. Restore an app session from localStorage on mount.
  useEffect(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      try { setUser(JSON.parse(raw)); } catch { /* corrupt */ }
    }
    setLocalReady(true);
  }, []);

  // 2. If Clerk is signed in but we have no app session, bridge it — ONCE.
  //    This is the single owner of the Clerk→JWT exchange; pages never do it.
  useEffect(() => {
    if (!localReady || user || !clerkLoaded || !isSignedIn || bridged.current) return;
    bridged.current = true;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("no clerk token");
        const res = await api<{ token: string; user: User }>("/auth/clerk", {
          method: "POST",
          body: JSON.stringify({
            token,
            email: clerkUser?.primaryEmailAddress?.emailAddress,
            name: clerkUser?.fullName ?? undefined,
          }),
        });
        setToken(res.token);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        setUser(res.user);
      } catch {
        setClerkError(true);
      }
    })();
  }, [localReady, user, clerkLoaded, isSignedIn, getToken, clerkUser]);

  // ready = localStorage checked AND (no Clerk session OR the Clerk bridge has resolved).
  const ready = localReady && clerkLoaded && (!isSignedIn || !!user || clerkError);

  async function login(email: string, password: string) {
    const res = await api<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setUser(res.user);
  }

  function retryClerk() {
    bridged.current = false;
    setClerkError(false);
  }

  function logout() {
    setToken(null);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    window.location.href = "/login";
  }

  return (
    <Ctx.Provider value={{ user, ready, clerkError, login, retryClerk, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
