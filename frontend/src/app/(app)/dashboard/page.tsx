"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area, AreaChart, CartesianGrid, PolarAngleAxis, RadialBar, RadialBarChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { inr, monthLabel } from "@/lib/format";
import type { AnalyticsSummary, DashboardKpis } from "@/lib/types";
import { VEHICLE_TYPES, VEHICLE_STATUSES } from "@/lib/types";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const REGIONS = ["Gandhinagar", "Ahmedabad", "Sanand", "Kalol"];
const ALL = "__all__";

const KPIS: { key: keyof DashboardKpis; label: string }[] = [
  { key: "active_vehicles", label: "Active Vehicles" },
  { key: "available_vehicles", label: "Available" },
  { key: "in_maintenance", label: "In Maintenance" },
  { key: "active_trips", label: "Active Trips" },
  { key: "pending_trips", label: "Pending Trips" },
  { key: "drivers_on_duty", label: "Drivers On Duty" },
];

// Status → chart color token, for the gauge legend + ring segments.
const STATUS_COLOR: Record<string, string> = {
  Available: "var(--signal-available)",
  "On Trip": "var(--signal-ontrip)",
  "In Shop": "var(--signal-shop)",
  Retired: "var(--signal-retired)",
};

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: readonly string[];
}) {
  const items = { [ALL]: `${label}: All`, ...Object.fromEntries(options.map((o) => [o, o])) };
  return (
    <Select items={items} value={value} onValueChange={(v) => onChange(v ?? ALL)}>
      <SelectTrigger className="h-9 w-[160px] rounded-full"><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{label}: All</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function ChartTooltip({ active, payload, label, fmt }: {
  active?: boolean; payload?: { value: number }[]; label?: string; fmt: (n: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-foreground px-3 py-1.5 text-background shadow-lg">
      {label && <div className="text-[11px] opacity-70">{label}</div>}
      <div className="font-heading text-sm font-semibold tabular-nums">{fmt(payload[0].value)}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [type, setType] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [region, setRegion] = useState(ALL);

  const params = new URLSearchParams();
  if (type !== ALL) params.set("type", type);
  if (status !== ALL) params.set("status", status);
  if (region !== ALL) params.set("region", region);
  const qs = params.toString();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", qs],
    queryFn: () => api<DashboardKpis>(`/dashboard/kpis${qs ? `?${qs}` : ""}`),
  });

  // Monthly revenue for the trend chart — only for roles that can read analytics.
  const showTrend = can(user?.role, "analytics");
  const { data: analytics } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => api<AnalyticsSummary>("/analytics/summary"),
    enabled: showTrend,
  });

  const util = data?.fleet_utilization_pct ?? 0;
  const gaugeData = [{ name: "util", value: util, fill: "var(--primary)" }];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Fleet operations at a glance</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect label="Type" value={type} onChange={setType} options={VEHICLE_TYPES} />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={VEHICLE_STATUSES} />
          <FilterSelect label="Region" value={region} onChange={setRegion} options={REGIONS} />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {KPIS.map((k) => (
          <StatCard key={k.key} label={k.label}
            value={(data?.[k.key] as number) ?? 0} loading={isLoading} />
        ))}
      </div>

      {/* Gauge + trend */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* Fleet utilization radial gauge */}
        <Card className="gap-0 p-5">
          <div className="text-sm font-semibold">Fleet Utilization</div>
          <div className="relative">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart data={gaugeData} startAngle={210} endAngle={-30}
                  innerRadius="72%" outerRadius="100%" barSize={16}>
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar background={{ fill: "var(--muted)" }} dataKey="value"
                    cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-heading text-4xl font-semibold tabular-nums leading-none text-primary">
                {isLoading ? "—" : `${util}%`}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">On trip / active fleet</span>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {VEHICLE_STATUSES.map((s) => (
              <div key={s} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="size-2 rounded-full" style={{ background: STATUS_COLOR[s] }} />
                  {s}
                </span>
                <span className="font-medium tabular-nums">
                  {isLoading ? "—" : data?.vehicle_status_counts[s] ?? 0}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Monthly revenue trend */}
        <Card className="gap-3 p-5">
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-semibold">Monthly Revenue</div>
            <span className="text-xs text-muted-foreground">last 6 months</span>
          </div>
          <div className="h-[200px]">
            {!showTrend ? (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                Revenue trend is available to analytics roles.
              </div>
            ) : !analytics ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.monthly_revenue} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickFormatter={monthLabel} tickLine={false} axisLine={false}
                    fontSize={11} stroke="var(--muted-foreground)" tickMargin={8} />
                  <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false}
                    fontSize={11} stroke="var(--muted-foreground)" width={42} />
                  <Tooltip cursor={{ stroke: "var(--border)" }} content={<ChartTooltip fmt={inr} />} />
                  <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2.5}
                    fill="url(#revGrad)" dot={{ r: 3, fill: "var(--chart-1)" }}
                    activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Recent trips */}
      <Card className="gap-0 p-0">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="text-sm font-semibold">Recent Trips</div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trip</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-4 w-full" /></TableCell></TableRow>
                ))
              ) : data?.recent_trips.length ? (
                data.recent_trips.map((t) => (
                  <TableRow key={t.code}>
                    <TableCell className="font-mono text-xs">{t.code}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.source} → {t.destination}</TableCell>
                    <TableCell>{t.vehicle_name ?? "—"}</TableCell>
                    <TableCell>{t.driver_name ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="h-20 text-center text-muted-foreground">No trips.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
