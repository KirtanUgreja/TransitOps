"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  /** cell renderer; defaults to String(row[key]) */
  cell?: (row: T) => React.ReactNode;
  /** value used for sorting + text search; defaults to row[key] */
  value?: (row: T) => string | number;
  sortable?: boolean;
  className?: string;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  /** substring filter across all columns' `value` */
  search?: string;
  empty?: string;
  rowKey: (row: T) => string | number;
};

export function DataTable<T>({ columns, rows, loading, search, empty = "No records.", rowKey }: Props<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [asc, setAsc] = useState(true);

  const val = (col: Column<T>, row: T) =>
    col.value ? col.value(row) : (row as Record<string, unknown>)[col.key] as string | number;

  const filtered = useMemo(() => {
    const q = search?.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      columns.some((c) => String(val(c, r) ?? "").toLowerCase().includes(q)),
    );
  }, [rows, search, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filtered;
    return [...filtered].sort((a, b) => {
      const av = val(col, a), bv = val(col, b);
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv));
      return asc ? cmp : -cmp;
    });
  }, [filtered, sortKey, asc, columns]);

  function toggleSort(key: string) {
    if (sortKey === key) setAsc((v) => !v);
    else { setSortKey(key); setAsc(true); }
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.key} className={c.className}>
                {c.sortable ? (
                  <button onClick={() => toggleSort(c.key)}
                    className="inline-flex items-center gap-1 font-medium hover:text-foreground">
                    {c.header}
                    {sortKey === c.key
                      ? (asc ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)
                      : <ChevronsUpDown className="size-3 opacity-40" />}
                  </button>
                ) : c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {columns.map((c) => (
                  <TableCell key={c.key}><Skeleton className="h-4 w-20" /></TableCell>
                ))}
              </TableRow>
            ))
          ) : sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                {empty}
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((row) => (
              <TableRow key={rowKey(row)}>
                {columns.map((c) => (
                  <TableCell key={c.key} className={cn("whitespace-nowrap", c.className)}>
                    {c.cell ? c.cell(row) : String((row as Record<string, unknown>)[c.key] ?? "")}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
