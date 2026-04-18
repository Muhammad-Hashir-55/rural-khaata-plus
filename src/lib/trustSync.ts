import { supabase } from "@/integrations/supabase/client";
import { computeTrustScore, type Tx } from "@/lib/trustScore";

export async function syncCustomerTrustScore(userId: string, customerId: string) {
  const { data: txs } = await supabase
    .from("transactions")
    .select("type, amount, paid, due_date, paid_at, transaction_date")
    .eq("user_id", userId)
    .eq("customer_id", customerId);

  const score = computeTrustScore(((txs as Tx[] | null) ?? []).map((tx) => ({ ...tx, amount: Number(tx.amount) })));
  await supabase.from("customers").update({ trust_score: score }).eq("id", customerId).eq("user_id", userId);
}
