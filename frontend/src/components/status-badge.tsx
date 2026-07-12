import { cn } from "@/lib/utils";

// Signal-light semantics shared by vehicles, drivers, trips, maintenance.
const TONE: Record<string, string> = {
  Available: "text-signal-available",
  Completed: "text-signal-available",
  "On Trip": "text-signal-ontrip",
  Dispatched: "text-signal-ontrip",
  Active: "text-signal-ontrip",
  "In Shop": "text-signal-shop",
  Suspended: "text-signal-shop",
  Cancelled: "text-signal-shop",
  Retired: "text-signal-retired",
  Draft: "text-signal-retired",
  "Off Duty": "text-signal-retired",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = TONE[status] ?? "text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        tone,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
