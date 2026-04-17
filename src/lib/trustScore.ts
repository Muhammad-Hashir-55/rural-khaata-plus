// Algorithmic trust score (0–100) based on payment history.
// Pure function — recomputes from a customer's transactions.

export type Tx = {
  type: "credit" | "debit";
  amount: number;
  paid: boolean;
  due_date: string | null;
  paid_at: string | null;
  transaction_date: string;
};

export function computeTrustScore(txs: Tx[]): number {
  const credits = txs.filter((t) => t.type === "credit");
  if (credits.length === 0) return 75; // neutral default

  let score = 75;
  const now = new Date();
  let onTime = 0, late = 0, overdueOpen = 0;

  for (const t of credits) {
    if (t.paid) {
      if (t.due_date && t.paid_at) {
        const due = new Date(t.due_date).getTime();
        const paid = new Date(t.paid_at).getTime();
        if (paid <= due + 24 * 3600 * 1000) onTime += 1;
        else late += 1;
      } else {
        onTime += 0.5; // paid, no due date set
      }
    } else if (t.due_date) {
      const due = new Date(t.due_date).getTime();
      if (due < now.getTime()) overdueOpen += 1;
    }
  }

  score += onTime * 4;
  score -= late * 6;
  score -= overdueOpen * 10;

  // Consistency bonus
  if (credits.length >= 5) score += 5;
  if (credits.length >= 15) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function trustLabel(score: number): { key: "trusted" | "reliable" | "watch" | "overdue"; color: string } {
  if (score >= 85) return { key: "trusted", color: "success" };
  if (score >= 65) return { key: "reliable", color: "primary" };
  if (score >= 40) return { key: "watch", color: "warning" };
  return { key: "overdue", color: "destructive" };
}
