export const formatMoney = (n: number) => {
  const abs = Math.abs(n);
  return abs.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};

export const daysBetween = (a: Date, b: Date) =>
  Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));

export const formatDate = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};
