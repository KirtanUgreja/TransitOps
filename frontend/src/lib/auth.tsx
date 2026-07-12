"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api, setToken } from "@/lib/api";
import type { Role } from "@/lib/rbac";

export type User = { id: number; name: string; email: string; role: Role };

type AuthCtx = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithClerk: (token: string, email?: string, name?: string) => Promise<User>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);
const USER_KEY = "transitops_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      try { setUser(JSON.parse(raw)); } catch { /* corrupt */ }
    }
    setReady(true);
  }, []);

  async function login(email: string, password: string) {
    const res = await api<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setUser(res.user);
  }

  // Bridge a Clerk session into an app user + JWT (Clerk = admin/Fleet Manager identity).
  async function loginWithClerk(token: string, email?: string, name?: string) {
    const res = await api<{ token: string; user: User }>("/auth/clerk", {
      method: "POST",
      body: JSON.stringify({ token, email, name }),
    });
    setToken(res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  }

  function logout() {
    setToken(null);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    window.location.href = "/login";
  }

  return <Ctx.Provider value={{ user, ready, login, loginWithClerk, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
