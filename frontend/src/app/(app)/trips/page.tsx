"use client";

import { useState } from "react";
import {
  ArrowRight, Ban, CheckCircle2, MapPin, Navigation, Package, Route, Send, Truck,
} from "lucide-react";
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
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Trip Dispatcher</h1>
        <p className="text-sm text-muted-foreground">Draft, dispatch, complete, and cancel trips</p>
      </div>

      {/* Lifecycle summary — big, clickable stage pills that double as the filter tabs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {LIFECYCLE.map((s) => {
          const n = trips.filter((t) => t.status === s).length;
          const active = tab === s;
          return (
            <button key={s} onClick={() => setTab(s)}
              className={`group flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all ${
                active
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "hover:border-primary/40 hover:bg-accent/50"}`}>
              <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <StageDot status={s} /> {s}
              </span>
              <span className={`font-heading text-3xl font-semibold tabular-nums ${active ? "text-primary" : ""}`}>{n}</span>
            </button>
          );
        })}
      </div>

      <div className={`grid gap-6 ${canWrite ? "lg:grid-cols-[380px_1fr]" : ""}`}>
        {canWrite && <CreateTrip onCreated={refresh} />}

        {/* Live board */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
              <StageDot status={tab} /> {tab} trips
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                {board.length}
              </span>
            </h2>
          </div>

          {board.length === 0 ? (
            <div className="grid h-40 place-items-center rounded-xl border border-dashed text-center">
              <div className="space-y-1">
                <Route className="mx-auto size-6 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No {tab.toLowerCase()} trips.</p>
              </div>
            </div>
          ) : (
            <div className={`grid gap-3 ${canWrite ? "" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
              {board.map((t) => (
                <TripCard key={t.id} trip={t} canWrite={canWrite} pending={act.isPending}
                  onDispatch={() => act.mutate({ id: t.id, action: "dispatch" })}
                  onCancel={() => act.mutate({ id: t.id, action: "cancel" })}
                  onComplete={() => setCompleting(t)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {completing && (
        <CompleteDialog trip={completing} onClose={() => setCompleting(null)}
          onDone={() => { setCompleting(null); refresh(); }} />
      )}
    </div>
  );
}

// A small colored dot per lifecycle stage, reusing the status tokens.
function StageDot({ status }: { status: string }) {
  const tone = status === "Completed" ? "bg-signal-available"
    : status === "Dispatched" ? "bg-signal-ontrip"
    : status === "Cancelled" ? "bg-signal-alert"
    : "bg-signal-shop"; // Draft
  return <span className={`inline-block size-2 rounded-full ${tone}`} />;
}

function TripCard({ trip: t, canWrite, pending, onDispatch, onCancel, onComplete }: {
  trip: Trip; canWrite: boolean; pending: boolean;
  onDispatch: () => void; onCancel: () => void; onComplete: () => void;
}) {
  return (
    <Card className="gap-3 p-4 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">{t.code}</span>
        <StatusBadge status={t.status} />
      </div>

      {/* Route */}
      <div className="flex items-center gap-2 text-sm font-medium">
        <MapPin className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 truncate">{t.source}</span>
        <ArrowRight className="size-4 shrink-0 text-primary" />
        <span className="min-w-0 truncate">{t.destination}</span>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Truck className="size-3.5" />
          {t.vehicle_name && t.driver_name ? `${t.vehicle_name} · ${t.driver_name}` : "Unassigned"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Package className="size-3.5" /> {t.cargo_weight_kg.toLocaleString("en-IN")} kg
        </span>
        <span className="inline-flex items-center gap-1">
          <Navigation className="size-3.5" /> {t.planned_distance_km} km
        </span>
      </div>

      {canWrite && (t.status === "Draft" || t.status === "Dispatched") && (
        <div className="flex gap-2 border-t pt-3">
          {t.status === "Draft" && (
            <Button size="sm" className="flex-1" disabled={pending} onClick={onDispatch}>
              <Send className="size-3.5" /> Dispatch
            </Button>
          )}
          {t.status === "Dispatched" && (
            <Button size="sm" className="flex-1" onClick={onComplete}>
              <CheckCircle2 className="size-3.5" /> Complete
            </Button>
          )}
          <Button size="sm" variant="ghost" className="text-signal-alert hover:text-signal-alert"
            disabled={pending} onClick={onCancel}>
            <Ban className="size-3.5" /> Cancel
          </Button>
        </div>
      )}
    </Card>
  );
}

const createSchema = z.object({
  source: z.string().min(1, "Required"),
  destination: z.string().min(1, "Required"),
  cargo_weight_kg: z.coerce.number().gt(0, "Must be > 0"),
  planned_distance_km: z.coerce.number().gt(0, "Must be > 0"),
});
type CreateValues = z.input<typeof createSchema>;

function CreateTrip({ onCreated }: { onCreated: () => void }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { source: "", destination: "", cargo_weight_kg: 0, planned_distance_km: 0 },
  });
  const [vehicleId, setVehicleId] = useState(NONE);
  const [driverId, setDriverId] = useState(NONE);

  const cargo = Number(watch("cargo_weight_kg")) || 0;

  // Cargo-aware options: the recommendation depends on the weight, so refetch as it changes.
  const { data: options } = useQuery({
    queryKey: ["trip-options", cargo],
    queryFn: () => api<TripOptions>(`/trips/options?cargo=${cargo}`),
  });
  const rec = options?.recommended;

  // Whether the current selection already matches the recommendation (so we can hide "Apply").
  const recApplied = rec != null
    && vehicleId === (rec.vehicle_id != null ? String(rec.vehicle_id) : NONE)
    && driverId === (rec.driver_id != null ? String(rec.driver_id) : NONE);
  const applyRec = () => {
    if (!rec) return;
    setVehicleId(rec.vehicle_id != null ? String(rec.vehicle_id) : NONE);
    setDriverId(rec.driver_id != null ? String(rec.driver_id) : NONE);
  };

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
    <Card className="h-fit gap-4 p-5">
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

        {/* Heuristic recommendation — smallest fitting vehicle + safest available driver */}
        {rec?.reason && (
          <div className="flex items-start justify-between gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs">
            <div>
              <span className="font-medium">⚡ Recommended:</span> {rec.reason}
            </div>
            {recApplied ? (
              <span className="shrink-0 text-signal-available">✓ applied</span>
            ) : (
              <button type="button" className="shrink-0 font-medium text-primary hover:underline"
                onClick={applyRec}>
                Apply
              </button>
            )}
          </div>
        )}
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
