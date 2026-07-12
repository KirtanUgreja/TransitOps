"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DashboardKpis } from "@/lib/types";
import { VEHICLE_TYPES, VEHICLE_STATUSES } from "@/lib/types";
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
  { key: "available_vehicles", label: "Available Vehicles" },
  { key: "in_maintenance", label: "In Maintenance" },
  { key: "active_trips", label: "Active Trips" },
  { key: "pending_trips", label: "Pending Trips" },
  { key: "drivers_on_duty", label: "Drivers On Duty" },
];

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: readonly string[];
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? ALL)}>
      <SelectTrigger className="w-[170px]">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{label}: All</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export default function DashboardPage() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Fleet operations at a glance</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Filters</span>
        <FilterSelect label="Type" value={type} onChange={setType} options={VEHICLE_TYPES} />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={VEHICLE_STATUSES} />
        <FilterSelect label="Region" value={region} onChange={setRegion} options={REGIONS} />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-7">
        {KPIS.map((k) => (
          <Card key={k.key} className="gap-1 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k.label}</div>
            <div className="text-2xl font-semibold tabular-nums">
              {isLoading ? <Skeleton className="h-8 w-12" /> : (data?.[k.key] as number) ?? 0}
            </div>
          </Card>
        ))}
        <Card className="gap-1 border-primary/40 bg-primary/5 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fleet Utilization</div>
          <div className="text-2xl font-semibold tabular-nums text-primary">
            {isLoading ? <Skeleton className="h-8 w-12" /> : `${data?.fleet_utilization_pct ?? 0}%`}
          </div>
        </Card>
      </div>

      {/* Recent trips + status legend */}
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <Card className="p-0">
          <div className="border-b px-4 py-3 text-sm font-semibold uppercase tracking-wide">Recent Trips</div>
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

        <Card className="h-fit p-0">
          <div className="border-b px-4 py-3 text-sm font-semibold uppercase tracking-wide">Vehicle Status</div>
          <div className="divide-y">
            {VEHICLE_STATUSES.map((s) => (
              <div key={s} className="flex items-center justify-between px-4 py-2.5">
                <StatusBadge status={s} />
                <span className="text-sm font-semibold tabular-nums">
                  {isLoading ? "—" : data?.vehicle_status_counts[s] ?? 0}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
