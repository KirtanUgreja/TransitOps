"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Download } from "lucide-react";
import { api, downloadUrl } from "@/lib/api";
import { inr } from "@/lib/format";
import type { AnalyticsSummary } from "@/lib/types";
import { DataTable, type Column } from "@/components/data-table";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const STATS = (d: AnalyticsSummary) => [
  { label: "Fuel Efficiency", value: `${d.fuel_efficiency_km_l} km/l` },
  { label: "Fleet Utilization", value: `${d.fleet_utilization_pct}%` },
  { label: "Operational Cost", value: inr(d.operational_cost) },
  { label: "Vehicle ROI", value: `${d.avg_roi_pct}%` },
];

// recharts needs concrete colors — read the theme's chart tokens at render.
function chartColor(varName: string) {
  if (typeof window === "undefined") return "#000";
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function ChartTooltip({ active, payload, label, fmt }: {
  active?: boolean; payload?: { value: number }[]; label?: string; fmt: (n: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-1.5 text-xs shadow-md">
      <div className="font-medium">{label}</div>
      <div className="tabular-nums text-muted-foreground">{fmt(payload[0].value)}</div>
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

  const amber = chartColor("--chart-1");
  const steel = chartColor("--chart-2");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports &amp; Analytics</h1>
          <p className="text-sm text-muted-foreground">Cost, ROI, and efficiency reporting</p>
        </div>
        <div className="flex gap-2">
          <a href={downloadUrl("/analytics/export.csv")} className={buttonVariants({ variant: "secondary" })}>
            <Download className="size-4" /> Export CSV
          </a>
          <a href={downloadUrl("/analytics/export.pdf")} className={buttonVariants({ variant: "secondary" })}>
            <Download className="size-4" /> Export PDF
          </a>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {isLoading || !data
          ? Array.from({ length: 4 }).map((_, i) => <Card key={i} className="p-4"><Skeleton className="h-12 w-full" /></Card>)
          : STATS(data).map((s) => (
            <Card key={s.label} className="gap-1 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</div>
              <div className="text-2xl font-semibold tabular-nums">{s.value}</div>
            </Card>
          ))}
      </div>
      <p className="text-xs text-muted-foreground">
        ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost
      </p>

      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="gap-3 p-4">
          <div className="text-sm font-semibold uppercase tracking-wide">Monthly Revenue</div>
          <div className="h-64">
            {data && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthly_revenue} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                  <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false}
                    fontSize={11} stroke="var(--muted-foreground)" width={44} />
                  <Tooltip cursor={{ fill: "var(--accent)" }} content={<ChartTooltip fmt={inr} />} />
                  <Bar dataKey="revenue" fill={amber} radius={[4, 4, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="gap-3 p-4">
          <div className="text-sm font-semibold uppercase tracking-wide">Top Costliest Vehicles</div>
          <div className="h-64">
            {data && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={data.costliest_vehicles}
                  margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                  <YAxis type="category" dataKey="name" tickLine={false} axisLine={false}
                    fontSize={11} width={64} stroke="var(--muted-foreground)" />
                  <Tooltip cursor={{ fill: "var(--accent)" }} content={<ChartTooltip fmt={inr} />} />
                  <Bar dataKey="total_cost" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    {data.costliest_vehicles.map((_, i) => <Cell key={i} fill={steel} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Per-vehicle cost/ROI table */}
      <Card className="gap-3 p-4">
        <div className="text-sm font-semibold uppercase tracking-wide">Per-Vehicle Cost &amp; ROI</div>
        <DataTable columns={perVehicleCols} rows={data?.per_vehicle ?? []} loading={isLoading}
          rowKey={(r) => r.vehicle_id} empty="No data." />
      </Card>
    </div>
  );
}
