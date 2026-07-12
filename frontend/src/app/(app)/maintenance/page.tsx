"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { inr } from "@/lib/format";
import type { Maintenance, Vehicle } from "@/lib/types";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  vehicle_id: z.coerce.number().int().positive("Select a vehicle"),
  service_type: z.string().min(1, "Required"),
  cost: z.coerce.number().gte(0, "Must be ≥ 0"),
  date: z.string().min(1, "Required"),
  status: z.enum(["Active", "Completed"]),
});
type FormValues = z.input<typeof schema>;

export default function MaintenancePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canWrite = can(user?.role, "maintenance", true);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["maintenance"], queryFn: () => api<Maintenance[]>("/maintenance"),
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"], queryFn: () => api<Vehicle[]>("/vehicles"),
  });
  const dispatchable = vehicles.filter((v) => v.status !== "Retired");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["maintenance"] });
    qc.invalidateQueries({ queryKey: ["vehicles"] });
    qc.invalidateQueries({ queryKey: ["trip-options"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const close = useMutation({
    mutationFn: (id: number) => api(`/maintenance/${id}/close`, { method: "POST" }),
    onSuccess: () => { refresh(); toast.success("Closed — vehicle back to Available"); },
    onError: (e: ApiError) => toast.error(e.detail),
  });

  const columns: Column<Maintenance>[] = [
    { key: "vehicle_name", header: "Vehicle", sortable: true, cell: (m) => m.vehicle_name ?? "—" },
    { key: "service_type", header: "Service", sortable: true },
    { key: "cost", header: "Cost", sortable: true, className: "text-right", cell: (m) => inr(m.cost) },
    { key: "date", header: "Date", sortable: true },
    { key: "status", header: "Status", sortable: true, cell: (m) => <StatusBadge status={m.status} /> },
    ...(canWrite ? [{
      key: "actions", header: "", className: "text-right",
      cell: (m: Maintenance) => m.status === "Active"
        ? <Button size="sm" variant="ghost" onClick={() => close.mutate(m.id)}>Close</Button>
        : null,
    }] : []),
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Maintenance</h1>
        <p className="text-sm text-muted-foreground">Service logs and shop status</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {canWrite && <LogForm vehicles={dispatchable} onLogged={refresh} />}

        <div className="space-y-3">
          <DataTable columns={columns} rows={logs} loading={isLoading}
            rowKey={(m) => m.id} empty="No service records." />
          <div className="space-y-1 rounded-md border-l-2 border-primary bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            <div>Available → creating active record → <span className="font-medium">In Shop</span>.</div>
            <div>In Shop → closing record (not retired) → <span className="font-medium">Available</span>.</div>
            <div>In Shop vehicles are removed from the dispatch pool.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogForm({ vehicles, onLogged }: { vehicles: Vehicle[]; onLogged: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { vehicle_id: 0, service_type: "", cost: 0, date: today, status: "Active" },
  });

  const log = useMutation({
    mutationFn: (v: FormValues) => api("/maintenance", { method: "POST", body: JSON.stringify(schema.parse(v)) }),
    onSuccess: (_d, v) => {
      toast.success(v.status === "Active" ? "Logged — vehicle set In Shop" : "Service record logged");
      reset({ vehicle_id: 0, service_type: "", cost: 0, date: today, status: "Active" });
      onLogged();
    },
    onError: (e: ApiError) => toast.error(e.detail),
  });

  const vehicleId = watch("vehicle_id");
  const status = watch("status");

  return (
    <Card className="h-fit gap-4 p-4">
      <div className="text-sm font-semibold uppercase tracking-wide">Log Service Record</div>
      <form onSubmit={handleSubmit((v) => log.mutate(v))} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Vehicle</Label>
          <Select items={Object.fromEntries(vehicles.map((v) => [String(v.id), `${v.name} · ${v.status}`]))}
            value={vehicleId ? String(vehicleId) : ""}
            onValueChange={(v) => v && setValue("vehicle_id", Number(v))}>
            <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
            <SelectContent>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={String(v.id)}>{v.name} · {v.status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.vehicle_id && <p className="text-xs text-destructive">{errors.vehicle_id.message}</p>}
        </div>

        <Field label="Service Type" error={errors.service_type?.message}>
          <Input {...register("service_type")} placeholder="e.g. Oil Change" />
        </Field>
        <Field label="Cost (₹)" error={errors.cost?.message}><Input type="number" {...register("cost")} /></Field>
        <Field label="Date" error={errors.date?.message}><Input type="date" {...register("date")} /></Field>

        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => v && setValue("status", v as "Active" | "Completed")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" className="w-full" disabled={log.isPending}>
          {log.isPending ? "Logging…" : "Log Record"}
        </Button>
      </form>
    </Card>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
