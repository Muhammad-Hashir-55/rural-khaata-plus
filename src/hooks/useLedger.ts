import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";

export type Customer = {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  trust_score: number;
  created_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  customer_id: string;
  type: "credit" | "debit";
  amount: number;
  description: string | null;
  transaction_date: string;
  due_date: string | null;
  paid: boolean;
  paid_at: string | null;
  created_at: string;
};

export const useCustomers = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });
    setCustomers((data as Customer[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return { customers, loading, refresh };
};

export const useTransactions = (customerId?: string) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let q = supabase.from("transactions").select("*").order("transaction_date", { ascending: false }).order("created_at", { ascending: false });
    if (customerId) q = q.eq("customer_id", customerId);
    const { data } = await q;
    setTransactions(((data as any[]) ?? []).map((t) => ({ ...t, amount: Number(t.amount) })) as Transaction[]);
    setLoading(false);
  }, [user, customerId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { transactions, loading, refresh };
};
