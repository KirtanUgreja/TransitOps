import { cn } from "@/lib/utils";

// Soft-filled signal pills — a tinted background + matching text, driven by the --signal-* tokens.
const TONE: Record<string, string> = {
  Available: "bg-signal-available/12 text-signal-available",
  Completed: "bg-signal-available/12 text-signal-available",
  "On Trip": "bg-signal-ontrip/12 text-signal-ontrip",
  Dispatched: "bg-signal-ontrip/12 text-signal-ontrip",
  "In Shop": "bg-signal-shop/15 text-signal-shop",
  Active: "bg-signal-shop/15 text-signal-shop",
  Draft: "bg-signal-shop/15 text-signal-shop",
  Suspended: "bg-signal-alert/12 text-signal-alert",
  Cancelled: "bg-signal-alert/12 text-signal-alert",
  Retired: "bg-signal-retired/12 text-signal-retired",
  "Off Duty": "bg-signal-retired/12 text-signal-retired",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = TONE[status] ?? "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        tone,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

// Red soft pill for expired driver licenses.
export function ExpiredTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-signal-alert/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-signal-alert",
        className,
      )}
    >
      Expired
    </span>
  );
}
