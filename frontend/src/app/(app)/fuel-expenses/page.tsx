"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { inr } from "@/lib/format";
import type { CostsSummary, Expense, FuelAnomaly, FuelLog, Vehicle } from "@/lib/types";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export default function FuelExpensesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canWrite = can(user?.role, "fuel_expenses", true);
  const [dialog, setDialog] = useState<"fuel" | "expense" | null>(null);

  const { data: fuel = [], isLoading: fuelLoading } = useQuery({
    queryKey: ["fuel-logs"], queryFn: () => api<FuelLog[]>("/fuel-logs"),
  });
  const { data: expenses = [], isLoading: expLoading } = useQuery({
    queryKey: ["expenses"], queryFn: () => api<Expense[]>("/expenses"),
  });
  const { data: summary } = useQuery({
    queryKey: ["costs"], queryFn: () => api<CostsSummary>("/costs/summary"),
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"], queryFn: () => api<Vehicle[]>("/vehicles"),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["fuel-logs"] });
    qc.invalidateQueries({ queryKey: ["expenses"] });
    qc.invalidateQueries({ queryKey: ["costs"] });
    qc.invalidateQueries({ queryKey: ["analytics"] });
  };

  const fuelCols: Column<FuelLog>[] = [
    { key: "vehicle_name", header: "Vehicle", sortable: true, cell: (f) => f.vehicle_name ?? "—" },
    { key: "date", header: "Date", sortable: true },
    { key: "liters", header: "Liters", sortable: true, className: "text-right tabular-nums" },
    { key: "cost", header: "Fuel Cost", sortable: true, className: "text-right", cell: (f) => inr(f.cost) },
  ];

  const expCols: Column<Expense>[] = [
    { key: "trip_id", header: "Trip", cell: (e) => e.trip_id ? `TR${String(e.trip_id).padStart(3, "0")}` : "—" },
    { key: "vehicle_name", header: "Vehicle", sortable: true, cell: (e) => e.vehicle_name ?? "—" },
    { key: "type", header: "Type", sortable: true },
    { key: "amount", header: "Amount", sortable: true, className: "text-right", cell: (e) => inr(e.amount) },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Fuel &amp; Expenses</h1>
          <p className="text-sm text-muted-foreground">Fuel logs, tolls, and operational cost</p>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setDialog("expense")}><Plus className="size-4" /> Add Expense</Button>
            <Button onClick={() => setDialog("fuel")}><Plus className="size-4" /> Log Fuel</Button>
          </div>
        )}
      </div>

      {can(user?.role, "analytics") && <FuelAnomaliesCard />}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="gap-3 p-4">
          <div className="text-sm font-semibold uppercase tracking-wide">Fuel Logs</div>
          <DataTable columns={fuelCols} rows={fuel} loading={fuelLoading} rowKey={(f) => f.id} empty="No fuel logs." />
        </Card>
        <Card className="gap-3 p-4">
          <div className="text-sm font-semibold uppercase tracking-wide">Other Expenses (Toll / Misc)</div>
          <DataTable columns={expCols} rows={expenses} loading={expLoading} rowKey={(e) => e.id} empty="No expenses." />
        </Card>
      </div>

      {/* AUTO footer — straight from API, never computed client-side */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3">
        <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Total Operational Cost (auto) = Fuel + Maintenance
        </span>
        <span className="text-xl font-semibold tabular-nums text-primary">
          {summary ? inr(summary.total_operational_cost) : "—"}
        </span>
      </div>

      {dialog === "fuel" && (
        <FuelDialog vehicles={vehicles} onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); refresh(); }} />
      )}
      {dialog === "expense" && (
        <ExpenseDialog vehicles={vehicles} onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); refresh(); }} />
      )}
    </div>
  );
}

const fuelSchema = z.object({
  vehicle_id: z.coerce.number().int().positive("Select a vehicle"),
  liters: z.coerce.number().gt(0, "Must be > 0"),
  cost: z.coerce.number().gte(0, "Must be ≥ 0"),
  date: z.string().min(1, "Required"),
});
type FuelValues = z.input<typeof fuelSchema>;

function FuelAnomaliesCard() {
  const { data: anomalies = [] } = useQuery({
    queryKey: ["fuel-anomalies"], queryFn: () => api<FuelAnomaly[]>("/analytics/fuel-anomalies"),
  });
  if (anomalies.length === 0) return null; // no outliers to flag

  return (
    <Card className="gap-3 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
        Fuel Anomalies
        <span className="rounded-full bg-signal-alert/12 px-2 py-0.5 text-xs font-medium text-signal-alert normal-case tracking-normal">
          {anomalies.length}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Completed trips burning notably more fuel per km than the vehicle&apos;s own median.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {anomalies.map((a) => (
          <div key={a.trip_code}
            className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
            <div className="min-w-0">
              <div className="truncate font-medium">{a.trip_code} · {a.vehicle_name}</div>
              <div className="text-xs text-muted-foreground">
                {a.efficiency_km_l} km/L vs {a.baseline_km_l} norm
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-signal-alert/12 px-2 py-0.5 text-xs font-medium text-signal-alert">
              ⚠ {a.pct_below}% below
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function FuelDialog({ vehicles, onClose, onSaved }: { vehicles: Vehicle[]; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FuelValues>({
    resolver: zodResolver(fuelSchema),
    defaultValues: { vehicle_id: 0, liters: 0, cost: 0, date: today },
  });
  const save = useMutation({
    mutationFn: (v: FuelValues) => api("/fuel-logs", { method: "POST", body: JSON.stringify(fuelSchema.parse(v)) }),
    onSuccess: () => { toast.success("Fuel logged"); onSaved(); },
    onError: (e: ApiError) => toast.error(e.detail),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Log Fuel</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => save.mutate(v))} className="grid gap-4 sm:grid-cols-2">
          <VehicleField vehicles={vehicles} value={Number(watch("vehicle_id")) || 0}
            onChange={(id) => setValue("vehicle_id", id)} error={errors.vehicle_id?.message} />
          <Field label="Date" error={errors.date?.message}><Input type="date" {...register("date")} /></Field>
          <Field label="Liters" error={errors.liters?.message}><Input type="number" {...register("liters")} /></Field>
          <Field label="Fuel Cost (₹)" error={errors.cost?.message}><Input type="number" {...register("cost")} /></Field>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const expenseSchema = z.object({
  vehicle_id: z.coerce.number().int().positive("Select a vehicle"),
  type: z.enum(["Toll", "Misc"]),
  amount: z.coerce.number().gt(0, "Must be > 0"),
  date: z.string().min(1, "Required"),
});
type ExpenseValues = z.input<typeof expenseSchema>;

function ExpenseDialog({ vehicles, onClose, onSaved }: { vehicles: Vehicle[]; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ExpenseValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { vehicle_id: 0, type: "Toll", amount: 0, date: today },
  });
  const save = useMutation({
    mutationFn: (v: ExpenseValues) => api("/expenses", { method: "POST", body: JSON.stringify(expenseSchema.parse(v)) }),
    onSuccess: () => { toast.success("Expense added"); onSaved(); },
    onError: (e: ApiError) => toast.error(e.detail),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => save.mutate(v))} className="grid gap-4 sm:grid-cols-2">
          <VehicleField vehicles={vehicles} value={Number(watch("vehicle_id")) || 0}
            onChange={(id) => setValue("vehicle_id", id)} error={errors.vehicle_id?.message} />
          <Field label="Type" error={errors.type?.message}>
            <Select value={watch("type")} onValueChange={(v) => v && setValue("type", v as "Toll" | "Misc")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Toll">Toll</SelectItem>
                <SelectItem value="Misc">Misc</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Amount (₹)" error={errors.amount?.message}><Input type="number" {...register("amount")} /></Field>
          <Field label="Date" error={errors.date?.message}><Input type="date" {...register("date")} /></Field>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VehicleField({ vehicles, value, onChange, error }: {
  vehicles: Vehicle[]; value: number; onChange: (id: number) => void; error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>Vehicle</Label>
      <Select items={Object.fromEntries(vehicles.map((v) => [String(v.id), v.name]))}
        value={value ? String(value) : ""} onValueChange={(v) => v && onChange(Number(v))}>
        <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
        <SelectContent>
          {vehicles.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
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
