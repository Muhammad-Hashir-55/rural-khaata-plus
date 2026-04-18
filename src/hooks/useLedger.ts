import { useEffect, useMemo, useState, useCallback } from "react";
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
    if (!user) {
      setCustomers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) {
      setCustomers([]);
      setLoading(false);
      return;
    }

    const next = (data as Customer[]) ?? [];
    setCustomers(next);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return { customers, loading, refresh };
};

export const useTransactions = (customerId?: string) => {
  const { user } = useAuth();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setAllTransactions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error || !data) {
      setAllTransactions([]);
      setLoading(false);
      return;
    }

    const next = ((data as any[]) ?? []).map((t) => ({ ...t, amount: Number(t.amount) })) as Transaction[];
    setAllTransactions(next);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const transactions = useMemo(
    () => (customerId ? allTransactions.filter((tx) => tx.customer_id === customerId) : allTransactions),
    [allTransactions, customerId],
  );

  return { transactions, loading, refresh };
};
