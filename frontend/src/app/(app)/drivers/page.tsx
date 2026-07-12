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
import { monthYear } from "@/lib/format";
import { DRIVER_STATUSES, LICENSE_CATEGORIES, type Driver } from "@/lib/types";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge, ExpiredTag } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

// Statuses a human can set. "On Trip" is system-set by dispatch/complete.
const TOGGLEABLE = ["Available", "Off Duty", "Suspended"] as const;

const schema = z.object({
  name: z.string().min(1, "Required"),
  license_no: z.string().min(1, "Required"),
  license_category: z.enum(LICENSE_CATEGORIES),
  license_expiry: z.string().min(1, "Required"),
  contact: z.string(),
  safety_score: z.coerce.number().gte(0).lte(100),
});
type FormValues = z.input<typeof schema>;

export default function DriversPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canWrite = can(user?.role, "drivers", true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ["drivers"],
    queryFn: () => api<Driver[]>("/drivers"),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api(`/drivers/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["drivers"] }); toast.success("Status updated"); },
    onError: (e: ApiError) => toast.error(e.detail),
  });

  const columns: Column<Driver>[] = [
    { key: "name", header: "Driver", sortable: true },
    { key: "license_no", header: "License No.", sortable: true,
      cell: (d) => <span className="font-mono text-xs">{d.license_no}</span> },
    { key: "license_category", header: "Category", sortable: true },
    { key: "license_expiry", header: "Expiry", sortable: true,
      cell: (d) => (
        <span className="flex items-center gap-2">
          {monthYear(d.license_expiry)}
          {d.license_expired && <ExpiredTag />}
        </span>
      ) },
    { key: "contact", header: "Contact" },
    { key: "trips_completed", header: "Trips", sortable: true, className: "text-right tabular-nums" },
    { key: "safety_score", header: "Safety %", sortable: true, className: "text-right tabular-nums",
      cell: (d) => `${d.safety_score}%` },
    { key: "status", header: "Status", sortable: true,
      cell: (d) => canWrite ? (
        <Select value={TOGGLEABLE.includes(d.status as typeof TOGGLEABLE[number]) ? d.status : ""}
          disabled={d.status === "On Trip"}
          onValueChange={(v) => v && setStatus.mutate({ id: d.id, status: v })}>
          <SelectTrigger className="h-7 w-[130px] text-xs">
            <SelectValue placeholder={d.status} />
          </SelectTrigger>
          <SelectContent>
            {TOGGLEABLE.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      ) : <StatusBadge status={d.status} /> },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Drivers &amp; Safety</h1>
          <p className="text-sm text-muted-foreground">Driver profiles and license compliance</p>
        </div>
        {canWrite && (
          <Button onClick={() => setOpen(true)}><Plus className="size-4" /> Add Driver</Button>
        )}
      </div>

      <div className="rounded-lg border border-signal-alert/20 bg-signal-alert/5 px-3 py-2 text-xs text-muted-foreground">
        Expired license or Suspended status → driver is blocked from trip assignment.
      </div>

      <Input placeholder="Search name or license…" value={search}
        onChange={(e) => setSearch(e.target.value)} className="w-[240px]" />

      <DataTable columns={columns} rows={drivers} loading={isLoading} search={search}
        rowKey={(d) => d.id} empty="No drivers match." />

      {open && (
        <DriverDialog onClose={() => setOpen(false)}
          onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["drivers"] }); }} />
      )}
    </div>
  );
}

function DriverDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", license_no: "", license_category: "LMV",
      license_expiry: "", contact: "", safety_score: 100 },
  });
  const { register, handleSubmit, setValue, watch, setError, formState: { errors } } = form;

  const save = useMutation({
    mutationFn: (values: FormValues) =>
      api("/drivers", { method: "POST", body: JSON.stringify(schema.parse(values)) }),
    onSuccess: () => { toast.success("Driver added"); onSaved(); },
    onError: (e: ApiError) => {
      if (e.status === 409) setError("license_no", { message: e.detail });
      else toast.error(e.detail);
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Driver</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => save.mutate(v))} className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" error={errors.name?.message}><Input {...register("name")} /></Field>
          <Field label="License No." error={errors.license_no?.message}><Input {...register("license_no")} /></Field>
          <Field label="Category" error={errors.license_category?.message}>
            <Select value={watch("license_category")}
              onValueChange={(v) => v && setValue("license_category", v as typeof LICENSE_CATEGORIES[number])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LICENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="License Expiry" error={errors.license_expiry?.message}>
            <Input type="date" {...register("license_expiry")} />
          </Field>
          <Field label="Contact" error={errors.contact?.message}><Input {...register("contact")} /></Field>
          <Field label="Safety Score (0–100)" error={errors.safety_score?.message}>
            <Input type="number" {...register("safety_score")} />
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
