"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, UserPlus } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { can, MATRIX, ROLE_LABELS, type Resource, type Role } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type UserRow = { id: number; name: string; email: string; role: Role };
type CreatedUser = UserRow & { password: string; email_sent: boolean };
const CREATABLE: Role[] = ["fleet_manager", "dispatcher", "safety_officer", "financial_analyst"];

const SETTINGS_KEY = "transitops_settings";
const RESOURCES: Resource[] = [
  "dashboard", "fleet", "drivers", "trips", "maintenance", "fuel_expenses", "analytics", "settings",
];
const RES_LABELS: Record<Resource, string> = {
  dashboard: "Dashboard", fleet: "Fleet", drivers: "Drivers", trips: "Trips",
  maintenance: "Maintenance", fuel_expenses: "Fuel/Exp", analytics: "Analytics", settings: "Settings",
};

// ponytail: client-side only; move to a server settings table when settings need to be multi-user.
export default function SettingsPage() {
  const { user } = useAuth();
  const [depot, setDepot] = useState("Gandhinagar Depot GJ4");

  useEffect(() => {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) { try { setDepot(JSON.parse(raw).depot ?? depot); } catch { /* corrupt */ } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function save() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ depot }));
    toast.success("Settings saved");
  }

  if (!can(user?.role, "settings")) {
    return (
      <div className="grid h-64 place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">
        You don&apos;t have access to Settings.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Settings &amp; RBAC</h1>
        <p className="text-sm text-muted-foreground">Depot configuration and access control</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="h-fit gap-4 p-4">
          <div className="text-sm font-semibold uppercase tracking-wide">General</div>
          <div className="space-y-1.5">
            <Label>Depot Name</Label>
            <Input value={depot} onChange={(e) => setDepot(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input value="INR ₹" disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Distance Unit</Label>
              <Input value="Kilometers" disabled />
            </div>
          </div>
          <Button className="w-fit" onClick={save}>Save changes</Button>
        </Card>

        <Card className="gap-3 p-4">
          <div className="text-sm font-semibold uppercase tracking-wide">Role-Based Access (RBAC)</div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  {RESOURCES.map((r) => <TableHead key={r} className="text-center text-xs">{RES_LABELS[r]}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Object.keys(MATRIX) as Role[]).map((role) => (
                  <TableRow key={role}>
                    <TableCell className="font-medium whitespace-nowrap">{ROLE_LABELS[role]}</TableCell>
                    {RESOURCES.map((res) => {
                      const a = MATRIX[role][res];
                      return (
                        <TableCell key={res} className="text-center">
                          {a === "full" ? <span className="text-signal-available">✓</span>
                            : a === "view" ? <span className="text-xs text-muted-foreground">view</span>
                            : <span className="text-muted-foreground/40">–</span>}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">✓ full · view read-only · – no access. Enforced server-side.</p>
        </Card>
      </div>

      <UserManagement />
    </div>
  );
}

function UserManagement() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("dispatcher");
  const [created, setCreated] = useState<CreatedUser | null>(null);

  const { data: users = [] } = useQuery({
    queryKey: ["users"], queryFn: () => api<UserRow[]>("/users"),
  });

  const createUser = useMutation({
    mutationFn: () => api<CreatedUser>("/users", {
      method: "POST", body: JSON.stringify({ name, email, role }),
    }),
    onSuccess: (u) => {
      setCreated(u);
      setName(""); setEmail("");
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success(`User created — share the credentials with ${u.name}`);
    },
    onError: (e: ApiError) => toast.error(e.detail),
  });

  return (
    <Card className="gap-4 p-4">
      <div className="text-sm font-semibold uppercase tracking-wide">User Management</div>
      <p className="text-xs text-muted-foreground">
        Create accounts for other roles. A password is generated once — copy it and hand it to the
        user; they sign in with the issued credentials.
      </p>

      <form className="grid gap-3 sm:grid-cols-[1fr_1fr_160px_auto] sm:items-end"
        onSubmit={(e) => { e.preventDefault(); createUser.mutate(); }}>
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Role</Label>
          <Select items={Object.fromEntries(CREATABLE.map((r) => [r, ROLE_LABELS[r]]))}
            value={role} onValueChange={(v) => v && setRole(v as Role)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CREATABLE.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={createUser.isPending}>
          <UserPlus className="size-4" /> Create
        </Button>
      </form>

      {created && (
        <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
          <div className="mb-1 font-medium">Credentials for {created.name} ({ROLE_LABELS[created.role]})</div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs">
            <span>email: {created.email}</span>
            <span>password: {created.password}</span>
            <button type="button" className="inline-flex items-center gap-1 text-primary hover:underline"
              onClick={() => {
                navigator.clipboard.writeText(`email: ${created.email}\npassword: ${created.password}`);
                toast.success("Copied");
              }}>
              <Copy className="size-3" /> copy
            </button>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {created.email_sent
              ? `✓ Credentials emailed to ${created.email}. `
              : "Email not sent (Resend not configured) — share these manually. "}
            Shown once — the password isn&apos;t stored in plain text.
          </p>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>{ROLE_LABELS[u.role]}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
