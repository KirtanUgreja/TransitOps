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
import { inr, km } from "@/lib/format";
import { VEHICLE_TYPES, VEHICLE_STATUSES, type Vehicle } from "@/lib/types";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const ALL = "__all__";

const schema = z.object({
  registration_no: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  type: z.enum(VEHICLE_TYPES),
  max_capacity_kg: z.coerce.number().gt(0, "Must be > 0"),
  odometer_km: z.coerce.number().gte(0, "Must be ≥ 0"),
  acquisition_cost: z.coerce.number().gte(0, "Must be ≥ 0"),
  region: z.string(),
});
type FormValues = z.input<typeof schema>;

export default function FleetPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canWrite = can(user?.role, "fleet", true);

  const [type, setType] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [open, setOpen] = useState(false);

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => api<Vehicle[]>("/vehicles"),
  });

  const shown = vehicles.filter((v) =>
    (type === ALL || v.type === type) && (status === ALL || v.status === status));

  const retire = useMutation({
    mutationFn: (v: Vehicle) =>
      api(`/vehicles/${v.id}`, { method: "PATCH", body: JSON.stringify({ status: "Retired" }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vehicles"] }); toast.success("Vehicle retired"); },
    onError: (e: ApiError) => toast.error(e.detail),
  });

  const columns: Column<Vehicle>[] = [
    { key: "registration_no", header: "Reg. No.", sortable: true,
      cell: (v) => <span className="font-mono text-xs">{v.registration_no}</span> },
    { key: "name", header: "Name / Model", sortable: true },
    { key: "type", header: "Type", sortable: true },
    { key: "max_capacity_kg", header: "Capacity", sortable: true,
      cell: (v) => `${v.max_capacity_kg.toLocaleString("en-IN")} kg` },
    { key: "odometer_km", header: "Odometer", sortable: true, cell: (v) => km(v.odometer_km) },
    { key: "acquisition_cost", header: "Acq. Cost", sortable: true, cell: (v) => inr(v.acquisition_cost) },
    { key: "status", header: "Status", sortable: true, cell: (v) => <StatusBadge status={v.status} /> },
    ...(canWrite ? [{
      key: "actions", header: "", className: "text-right",
      cell: (v: Vehicle) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => { setEditing(v); setOpen(true); }}>Edit</Button>
          {v.status !== "Retired" && (
            <Button size="sm" variant="ghost" className="text-signal-alert"
              onClick={() => retire.mutate(v)}>Retire</Button>
          )}
        </div>
      ),
    }] : []),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vehicle Registry</h1>
          <p className="text-sm text-muted-foreground">Register and manage the fleet</p>
        </div>
        {canWrite && (
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="size-4" /> Add Vehicle
          </Button>
        )}
      </div>

      <div className="rounded-md border-l-2 border-primary bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
        Registration No. must be unique · Retired / In Shop vehicles are hidden from Trip Dispatcher.
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select items={{ [ALL]: "Type: All", ...Object.fromEntries(VEHICLE_TYPES.map((t) => [t, t])) }}
          value={type} onValueChange={(v) => setType(v ?? ALL)}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Type: All</SelectItem>
            {VEHICLE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select items={{ [ALL]: "Status: All", ...Object.fromEntries(VEHICLE_STATUSES.map((s) => [s, s])) }}
          value={status} onValueChange={(v) => setStatus(v ?? ALL)}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Status: All</SelectItem>
            {VEHICLE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Search reg. no…" value={search}
          onChange={(e) => setSearch(e.target.value)} className="w-[200px]" />
      </div>

      <DataTable columns={columns} rows={shown} loading={isLoading} search={search}
        rowKey={(v) => v.id} empty="No vehicles match." />

      {open && (
        <VehicleDialog vehicle={editing} onClose={() => setOpen(false)}
          onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["vehicles"] }); }} />
      )}
    </div>
  );
}

function VehicleDialog({ vehicle, onClose, onSaved }: {
  vehicle: Vehicle | null; onClose: () => void; onSaved: () => void;
}) {
  const editing = !!vehicle;
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: vehicle
      ? { registration_no: vehicle.registration_no, name: vehicle.name, type: vehicle.type as typeof VEHICLE_TYPES[number],
          max_capacity_kg: vehicle.max_capacity_kg, odometer_km: vehicle.odometer_km,
          acquisition_cost: vehicle.acquisition_cost, region: vehicle.region }
      : { registration_no: "", name: "", type: "Van", max_capacity_kg: 0, odometer_km: 0, acquisition_cost: 0, region: "" },
  });
  const { register, handleSubmit, setValue, watch, setError, formState: { errors } } = form;

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const body = JSON.stringify(schema.parse(values));
      return editing
        ? api(`/vehicles/${vehicle!.id}`, { method: "PATCH", body })
        : api("/vehicles", { method: "POST", body });
    },
    onSuccess: () => { toast.success(editing ? "Vehicle updated" : "Vehicle added"); onSaved(); },
    onError: (e: ApiError) => {
      if (e.status === 409) setError("registration_no", { message: e.detail });
      else toast.error(e.detail);
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => save.mutate(v))} className="grid gap-4 sm:grid-cols-2">
          <Field label="Reg. No. (unique)" error={errors.registration_no?.message}>
            <Input {...register("registration_no")} />
          </Field>
          <Field label="Name / Model" error={errors.name?.message}>
            <Input {...register("name")} />
          </Field>
          <Field label="Type" error={errors.type?.message}>
            <Select value={watch("type")} onValueChange={(v) => v && setValue("type", v as typeof VEHICLE_TYPES[number])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{VEHICLE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Region" error={errors.region?.message}>
            <Input {...register("region")} />
          </Field>
          <Field label="Capacity (kg)" error={errors.max_capacity_kg?.message}>
            <Input type="number" {...register("max_capacity_kg")} />
          </Field>
          <Field label="Odometer (km)" error={errors.odometer_km?.message}>
            <Input type="number" {...register("odometer_km")} />
          </Field>
          <Field label="Acquisition Cost (₹)" error={errors.acquisition_cost?.message}>
            <Input type="number" {...register("acquisition_cost")} />
          </Field>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
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
