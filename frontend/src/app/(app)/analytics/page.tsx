"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Download } from "lucide-react";
import { api, downloadUrl } from "@/lib/api";
import { inr, monthLabel } from "@/lib/format";
import type { AnalyticsSummary } from "@/lib/types";
import { DataTable, type Column } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const STATS = (d: AnalyticsSummary) => [
  { label: "Fuel Efficiency", value: `${d.fuel_efficiency_km_l} km/l` },
  { label: "Fleet Utilization", value: `${d.fleet_utilization_pct}%` },
  { label: "Operational Cost", value: inr(d.operational_cost) },
  { label: "Vehicle ROI", value: `${d.avg_roi_pct}%` },
];
const STAT_LABELS = [
  { label: "Fuel Efficiency" }, { label: "Fleet Utilization" },
  { label: "Operational Cost" }, { label: "Vehicle ROI" },
];

// ui-2 black tooltip pill.
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

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics"], queryFn: () => api<AnalyticsSummary>("/analytics/summary"),
  });

  const perVehicleCols: Column<AnalyticsSummary["per_vehicle"][number]>[] = [
    { key: "registration_no", header: "Reg. No.", sortable: true,
      cell: (r) => <span className="font-mono text-xs">{r.registration_no}</span> },
    { key: "name", header: "Name", sortable: true },
    { key: "fuel_cost", header: "Fuel", sortable: true, className: "text-right", cell: (r) => inr(r.fuel_cost) },
    { key: "maintenance_cost", header: "Maintenance", sortable: true, className: "text-right", cell: (r) => inr(r.maintenance_cost) },
    { key: "total_cost", header: "Total", sortable: true, className: "text-right", cell: (r) => inr(r.total_cost) },
    { key: "revenue", header: "Revenue", sortable: true, className: "text-right", cell: (r) => inr(r.revenue) },
    { key: "roi_pct", header: "ROI %", sortable: true, className: "text-right",
      cell: (r) => <span className={r.roi_pct < 0 ? "text-signal-alert" : ""}>{r.roi_pct}%</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Reports &amp; Analytics</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Cost, ROI, and efficiency reporting</p>
        </div>
        <div className="flex gap-2">
          <a href={downloadUrl("/analytics/export.csv")} className={buttonVariants({ variant: "outline" })}>
            <Download className="size-4" /> Export CSV
          </a>
          <a href={downloadUrl("/analytics/export.pdf")} className={buttonVariants({ variant: "outline" })}>
            <Download className="size-4" /> Export PDF
          </a>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(data ? STATS(data) : STAT_LABELS).map((s, i) => (
          <StatCard key={i} label={s.label} value={data ? STATS(data)[i].value : ""}
            loading={isLoading || !data} />
        ))}
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost
      </p>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-4 p-5">
          <div className="text-sm font-semibold">Monthly Revenue</div>
          <div className="h-64">
            {data && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthly_revenue} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
                  <defs>
                    <linearGradient id="barRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.55} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickFormatter={monthLabel} tickLine={false} axisLine={false}
                    fontSize={11} stroke="var(--muted-foreground)" tickMargin={8} />
                  <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false}
                    fontSize={11} stroke="var(--muted-foreground)" width={42} />
                  <Tooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltip fmt={inr} />} />
                  <Bar dataKey="revenue" fill="url(#barRev)" radius={[6, 6, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="gap-4 p-5">
          <div className="text-sm font-semibold">Top Costliest Vehicles</div>
          <div className="h-64">
            {data && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={data.costliest_vehicles}
                  margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <defs>
                    <linearGradient id="barCost" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.95} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                  <YAxis type="category" dataKey="name" tickLine={false} axisLine={false}
                    fontSize={11} width={64} stroke="var(--muted-foreground)" />
                  <Tooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltip fmt={inr} />} />
                  <Bar dataKey="total_cost" fill="url(#barCost)" radius={[0, 6, 6, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Per-vehicle cost/ROI table */}
      <Card className="gap-3 p-5">
        <div className="text-sm font-semibold">Per-Vehicle Cost &amp; ROI</div>
        <DataTable columns={perVehicleCols} rows={data?.per_vehicle ?? []} loading={isLoading}
          rowKey={(r) => r.vehicle_id} empty="No data." />
      </Card>
    </div>
  );
}
