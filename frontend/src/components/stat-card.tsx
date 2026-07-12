import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// The ui-2 "hero number" card: small uppercase label, big display-font value.
export function StatCard({
  label, value, loading, accent, className,
}: {
  label: string;
  value: React.ReactNode;
  loading?: boolean;
  accent?: boolean;
  className?: string;
}) {
  return (
    <Card className={cn("gap-1.5 p-5", accent && "border-primary/30 bg-primary/[0.04]", className)}>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      {loading ? (
        <Skeleton className="h-9 w-16" />
      ) : (
        <div className={cn(
          "font-heading text-3xl font-semibold tabular-nums leading-none tracking-tight lg:text-4xl",
          accent && "text-primary",
        )}>
          {value}
        </div>
      )}
    </Card>
  );
}
