export const inr = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

export const km = (n: number) => n.toLocaleString("en-IN") + " km";

export const pct = (n: number) => `${n}%`;

// "2025-03-31" -> "03/2025"
export const monthYear = (iso: string) => {
  const [y, m] = iso.split("-");
  return `${m}/${y}`;
};

// "2026-07" -> "Jul"
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthLabel = (ym: string) => {
  const m = Number(ym.split("-")[1]);
  return MONTHS[m - 1] ?? ym;
};
