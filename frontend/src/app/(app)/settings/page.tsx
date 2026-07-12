"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { can, MATRIX, ROLE_LABELS, type Resource, type Role } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

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
        <h1 className="text-2xl font-semibold tracking-tight">Settings &amp; RBAC</h1>
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
    </div>
  );
}
