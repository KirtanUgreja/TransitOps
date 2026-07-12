export const inr = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

export const km = (n: number) => n.toLocaleString("en-IN") + " km";

export const pct = (n: number) => `${n}%`;

// "2025-03-31" -> "03/2025"
export const monthYear = (iso: string) => {
  const [y, m] = iso.split("-");
  return `${m}/${y}`;
};
