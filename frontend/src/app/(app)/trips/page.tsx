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
import type { Trip, TripOptions } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";
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

const LIFECYCLE = ["Draft", "Dispatched", "Completed", "Cancelled"] as const;
const NONE = "__none__";

export default function TripsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canWrite = can(user?.role, "trips", true);
  const [tab, setTab] = useState<(typeof LIFECYCLE)[number]>("Draft");
  const [completing, setCompleting] = useState<Trip | null>(null);

  const { data: trips = [] } = useQuery({ queryKey: ["trips"], queryFn: () => api<Trip[]>("/trips") });
  const { data: options } = useQuery({
    queryKey: ["trip-options"], queryFn: () => api<TripOptions>("/trips/options"), enabled: canWrite,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["trips"] });
    qc.invalidateQueries({ queryKey: ["trip-options"] });
    qc.invalidateQueries({ queryKey: ["vehicles"] });
    qc.invalidateQueries({ queryKey: ["drivers"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const act = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "dispatch" | "cancel" }) =>
      api(`/trips/${id}/${action}`, { method: "POST", body: action === "dispatch" ? "{}" : undefined }),
    onSuccess: (_d, v) => { refresh(); toast.success(v.action === "dispatch" ? "Dispatched — vehicle & driver On Trip" : "Trip cancelled"); },
    onError: (e: ApiError) => toast.error(e.detail),
  });

  const board = trips.filter((t) => t.status === tab);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trip Dispatcher</h1>
        <p className="text-sm text-muted-foreground">Draft, dispatch, complete, and cancel trips</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        {canWrite && <CreateTrip options={options} onCreated={refresh} />}

        <div className="space-y-3">
          {/* Lifecycle strip */}
          <div className="flex gap-1 rounded-lg border p-1">
            {LIFECYCLE.map((s) => {
              const n = trips.filter((t) => t.status === s).length;
              return (
                <button key={s} onClick={() => setTab(s)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    tab === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>
                  {s} <span className="tabular-nums opacity-70">{n}</span>
                </button>
              );
            })}
          </div>

          {/* Live board */}
          <div className="space-y-2">
            {board.length === 0 && (
              <div className="grid h-32 place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">
                No {tab.toLowerCase()} trips.
              </div>
            )}
            {board.map((t) => (
              <Card key={t.id} className="flex-row items-center justify-between gap-4 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{t.code}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="mt-0.5 truncate text-sm font-medium">{t.source} → {t.destination}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.vehicle_name && t.driver_name ? `${t.vehicle_name} / ${t.driver_name}` : "Unassigned"}
                    {" · "}{t.cargo_weight_kg.toLocaleString("en-IN")} kg · {t.planned_distance_km} km
                  </div>
                </div>
                {canWrite && (
                  <div className="flex shrink-0 gap-1">
                    {t.status === "Draft" && (
                      <Button size="sm" disabled={act.isPending}
                        onClick={() => act.mutate({ id: t.id, action: "dispatch" })}>Dispatch</Button>
                    )}
                    {t.status === "Dispatched" && (
                      <Button size="sm" onClick={() => setCompleting(t)}>Complete</Button>
                    )}
                    {(t.status === "Draft" || t.status === "Dispatched") && (
                      <Button size="sm" variant="ghost" className="text-signal-alert" disabled={act.isPending}
                        onClick={() => act.mutate({ id: t.id, action: "cancel" })}>Cancel</Button>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>

      {completing && (
        <CompleteDialog trip={completing} onClose={() => setCompleting(null)}
          onDone={() => { setCompleting(null); refresh(); }} />
      )}
    </div>
  );
}

const createSchema = z.object({
  source: z.string().min(1, "Required"),
  destination: z.string().min(1, "Required"),
  cargo_weight_kg: z.coerce.number().gt(0, "Must be > 0"),
  planned_distance_km: z.coerce.number().gt(0, "Must be > 0"),
});
type CreateValues = z.input<typeof createSchema>;

function CreateTrip({ options, onCreated }: { options?: TripOptions; onCreated: () => void }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { source: "", destination: "", cargo_weight_kg: 0, planned_distance_km: 0 },
  });
  const [vehicleId, setVehicleId] = useState(NONE);
  const [driverId, setDriverId] = useState(NONE);

  const cargo = Number(watch("cargo_weight_kg")) || 0;
  const vehicle = options?.available_vehicles.find((v) => String(v.id) === vehicleId);
  const overCapacity = vehicle ? cargo > vehicle.max_capacity_kg : false;
  const over = vehicle ? cargo - vehicle.max_capacity_kg : 0;

  // base-ui Select.Value renders these labels for the selected value (else it shows the raw id).
  const vehicleItems: Record<string, string> = { [NONE]: "Unassigned" };
  options?.available_vehicles.forEach((v) => {
    vehicleItems[String(v.id)] = `${v.name} – ${v.max_capacity_kg.toLocaleString("en-IN")} kg capacity`;
  });
  const driverItems: Record<string, string> = { [NONE]: "Unassigned" };
  options?.available_drivers.forEach((d) => { driverItems[String(d.id)] = `${d.name} · ${d.safety_score}%`; });

  const create = useMutation({
    mutationFn: ({ values, dispatch }: { values: CreateValues; dispatch: boolean }) => {
      const body = JSON.stringify({
        ...createSchema.parse(values),
        vehicle_id: vehicleId === NONE ? null : Number(vehicleId),
        driver_id: driverId === NONE ? null : Number(driverId),
      });
      return api(`/trips${dispatch ? "?dispatch=true" : ""}`, { method: "POST", body });
    },
    onSuccess: (_d, v) => { toast.success(v.dispatch ? "Dispatched — vehicle & driver On Trip" : "Saved as draft"); onCreated(); },
    onError: (e: ApiError) => toast.error(e.detail),
  });

  const canDispatch = !!vehicle && driverId !== NONE && !overCapacity;

  return (
    <Card className="h-fit gap-4 p-4">
      <div className="text-sm font-semibold uppercase tracking-wide">Create Trip</div>
      <form className="space-y-3" onSubmit={handleSubmit(() => {})}>
        <Field label="Source" error={errors.source?.message}><Input {...register("source")} /></Field>
        <Field label="Destination" error={errors.destination?.message}><Input {...register("destination")} /></Field>

        <div className="space-y-1.5">
          <Label>Vehicle (available only)</Label>
          <Select items={vehicleItems} value={vehicleId} onValueChange={(v) => setVehicleId(v ?? NONE)}>
            <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Unassigned</SelectItem>
              {options?.available_vehicles.map((v) => (
                <SelectItem key={v.id} value={String(v.id)}>
                  {v.name} – {v.max_capacity_kg.toLocaleString("en-IN")} kg capacity
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Driver (available only)</Label>
          <Select items={driverItems} value={driverId} onValueChange={(v) => setDriverId(v ?? NONE)}>
            <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Unassigned</SelectItem>
              {options?.available_drivers.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>{d.name} · {d.safety_score}%</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Field label="Cargo Weight (kg)" error={errors.cargo_weight_kg?.message}>
          <Input type="number" {...register("cargo_weight_kg")} />
        </Field>
        <Field label="Planned Distance (km)" error={errors.planned_distance_km?.message}>
          <Input type="number" {...register("planned_distance_km")} />
        </Field>

        {/* Live capacity check — client mirror of rule 5 */}
        {vehicle && overCapacity && (
          <div className="rounded-md border border-signal-alert bg-signal-alert/10 p-3 text-xs">
            <div>Vehicle Capacity: {vehicle.max_capacity_kg.toLocaleString("en-IN")} kg</div>
            <div>Cargo Weight: {cargo.toLocaleString("en-IN")} kg</div>
            <div className="mt-1 font-semibold text-signal-alert">
              ❌ Capacity exceeded by {over.toLocaleString("en-IN")} kg — dispatch blocked
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" className="flex-1" disabled={create.isPending}
            onClick={handleSubmit((values) => create.mutate({ values, dispatch: false }))}>
            Save as Draft
          </Button>
          <Button type="button" className="flex-1" disabled={!canDispatch || create.isPending}
            onClick={handleSubmit((values) => create.mutate({ values, dispatch: true }))}>
            Dispatch
          </Button>
        </div>
      </form>
    </Card>
  );
}

const completeSchema = z.object({
  end_odometer_km: z.coerce.number().gte(0),
  fuel_liters: z.coerce.number().gt(0),
  fuel_cost: z.coerce.number().gte(0),
  revenue: z.coerce.number().gte(0),
});
type CompleteValues = z.input<typeof completeSchema>;

function CompleteDialog({ trip, onClose, onDone }: { trip: Trip; onClose: () => void; onDone: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<CompleteValues>({
    resolver: zodResolver(completeSchema),
    defaultValues: { end_odometer_km: 0, fuel_liters: 0, fuel_cost: 0, revenue: 0 },
  });
  const complete = useMutation({
    mutationFn: (v: CompleteValues) =>
      api(`/trips/${trip.id}/complete`, { method: "POST", body: JSON.stringify(completeSchema.parse(v)) }),
    onSuccess: () => { toast.success("Completed — vehicle & driver back to Available"); onDone(); },
    onError: (e: ApiError) => toast.error(e.detail),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Complete {trip.code}</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">
          On complete: odometer → fuel log → Vehicle &amp; Driver set Available.
        </p>
        <form onSubmit={handleSubmit((v) => complete.mutate(v))} className="grid gap-4 sm:grid-cols-2">
          <Field label="End Odometer (km)" error={errors.end_odometer_km?.message}>
            <Input type="number" {...register("end_odometer_km")} />
          </Field>
          <Field label="Fuel Liters" error={errors.fuel_liters?.message}>
            <Input type="number" {...register("fuel_liters")} />
          </Field>
          <Field label="Fuel Cost (₹)" error={errors.fuel_cost?.message}>
            <Input type="number" {...register("fuel_cost")} />
          </Field>
          <Field label="Revenue (₹)" error={errors.revenue?.message}>
            <Input type="number" {...register("revenue")} />
          </Field>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={complete.isPending}>{complete.isPending ? "Completing…" : "Complete Trip"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
