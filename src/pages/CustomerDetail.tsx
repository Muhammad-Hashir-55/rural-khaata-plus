import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Bell, Loader2, Phone, Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n/I18nProvider";
import { useTransactions } from "@/hooks/useLedger";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatMoney, daysBetween } from "@/lib/format";
import { computeTrustScore, trustLabel } from "@/lib/trustScore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Customer = { id: string; name: string; phone: string | null; notes: string | null };

const CustomerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const { transactions, refresh } = useTransactions(id);
  const [filter, setFilter] = useState<"all" | "credit" | "debit" | "unpaid">("all");

  useEffect(() => {
    if (!id) return;
    supabase.from("customers").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      setCustomer(data as Customer);
      setLoading(false);
    });
  }, [id]);

  const balance = useMemo(() => {
    let b = 0;
    for (const tx of transactions) if (!tx.paid) b += tx.type === "credit" ? tx.amount : -tx.amount;
    return b;
  }, [transactions]);

  const score = useMemo(() => computeTrustScore(transactions as any), [transactions]);
  const lbl = trustLabel(score);

  const filtered = useMemo(() => {
    if (filter === "all") return transactions;
    if (filter === "unpaid") return transactions.filter((t) => !t.paid);
    return transactions.filter((t) => t.type === filter);
  }, [transactions, filter]);

  const togglePaid = async (txId: string, paid: boolean) => {
    const { error } = await supabase
      .from("transactions")
      .update({ paid: !paid, paid_at: !paid ? new Date().toISOString() : null })
      .eq("id", txId);
    if (error) { toast.error(error.message); return; }
    toast.success(t("saved"));
    refresh();
  };

  const deleteTx = async (txId: string) => {
    if (!confirm(t("confirm_delete"))) return;
    const { error } = await supabase.from("transactions").delete().eq("id", txId);
    if (error) { toast.error(error.message); return; }
    toast.success(t("deleted"));
    refresh();
  };

  const sendWhatsApp = (txId: string) => {
    if (!customer?.phone) { toast.error(t("phone")); return; }
    const tx = transactions.find((t) => t.id === txId);
    if (!tx) return;
    const msg = `${t("hello")} ${customer.name}, ${t("rupees")} ${formatMoney(tx.amount)} ${t("balance")}.${tx.due_date ? ` ${t("due_date")}: ${formatDate(tx.due_date)}` : ""}`;
    const phone = customer.phone.replace(/[^\d]/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  if (loading) {
    return <AppShell><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AppShell>;
  }

  if (!customer) {
    return <AppShell><Card className="p-8 text-center">Not found</Card></AppShell>;
  }

  return (
    <AppShell>
      <div className="space-y-5">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ms-2">
          <ArrowLeft className="h-4 w-4 me-1" /> {t("back")}
        </Button>

        {/* Customer header card */}
        <Card className="p-6 shadow-soft border-border">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-full gradient-warm flex items-center justify-center text-primary font-bold text-2xl shrink-0">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-extrabold truncate">{customer.name}</h1>
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
                  <Phone className="h-3.5 w-3.5" /> {customer.phone}
                </a>
              )}
              {customer.notes && <p className="text-sm text-muted-foreground mt-1">{customer.notes}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="rounded-xl gradient-warm p-4">
              <p className="text-[11px] uppercase font-semibold text-muted-foreground">{t("balance")}</p>
              <p className={cn("text-xl font-extrabold mt-1", balance > 0 ? "text-success" : balance < 0 ? "text-destructive" : "")}>
                {balance >= 0 ? "+" : "−"} {t("rupees")} {formatMoney(balance)}
              </p>
            </div>
            <div className="rounded-xl bg-card border border-border p-4">
              <p className="text-[11px] uppercase font-semibold text-muted-foreground">{t("trust_score")}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-xl font-extrabold">{score}</p>
                <span className={cn(
                  "text-xs font-bold rounded-full px-2 py-0.5",
                  lbl.color === "success" && "bg-success/15 text-success",
                  lbl.color === "primary" && "bg-primary/15 text-primary",
                  lbl.color === "warning" && "bg-warning/20 text-warning-foreground",
                  lbl.color === "destructive" && "bg-destructive/15 text-destructive",
                )}>{t(lbl.key)}</span>
              </div>
            </div>
          </div>
          <Link to={`/app/transactions/new?customer=${customer.id}`}>
            <Button className="w-full mt-4 h-12 gradient-primary text-primary-foreground">
              <Plus className="h-5 w-5 me-1" /> {t("add_transaction")}
            </Button>
          </Link>
        </Card>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1">
          {([
            ["all", "filter_all"],
            ["credit", "filter_credit"],
            ["debit", "filter_debit"],
            ["unpaid", "filter_unpaid"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-smooth",
                filter === key ? "bg-primary text-primary-foreground shadow-soft" : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {t(label)}
            </button>
          ))}
        </div>

        {/* Transactions */}
        <div>
          <h2 className="text-lg font-bold mb-3">{t("history")}</h2>
          {filtered.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <p className="text-muted-foreground">{t("no_transactions")}</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((tx) => {
                const isCredit = tx.type === "credit";
                const today = new Date(); today.setHours(0,0,0,0);
                const overdueDays = tx.due_date && !tx.paid ? daysBetween(today, new Date(tx.due_date)) : 0;
                const isOverdue = overdueDays > 0 && !tx.paid;
                return (
                  <Card key={tx.id} className={cn("p-4 border-border transition-smooth", isOverdue && "border-destructive/40")}>
                    <div className="flex items-start gap-3">
                      <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", isCredit ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
                        {isCredit ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="font-bold">{isCredit ? t("credit") : t("debit")}</p>
                          <p className={cn("font-extrabold whitespace-nowrap", isCredit ? "text-success" : "text-destructive")}>
                            {isCredit ? "+" : "−"} {t("rupees")} {formatMoney(tx.amount)}
                          </p>
                        </div>
                        {tx.description && <p className="text-sm text-muted-foreground mt-0.5">{tx.description}</p>}
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                          <span>{formatDate(tx.transaction_date)}</span>
                          {tx.due_date && (
                            <span className={cn("rounded-full px-2 py-0.5 font-semibold",
                              tx.paid ? "bg-success/15 text-success" :
                              isOverdue ? "bg-destructive/15 text-destructive" :
                              "bg-warning/20 text-warning-foreground"
                            )}>
                              {tx.paid ? t("paid") : isOverdue ? t("overdue_by", { n: overdueDays }) : t("due_in_days", { n: -overdueDays })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Button size="sm" variant={tx.paid ? "outline" : "secondary"} onClick={() => togglePaid(tx.id, tx.paid)} className="gap-1.5">
                        {tx.paid ? <Circle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        {tx.paid ? t("mark_unpaid") : t("mark_paid")}
                      </Button>
                      {!tx.paid && customer.phone && (
                        <Button size="sm" variant="outline" onClick={() => sendWhatsApp(tx.id)} className="gap-1.5">
                          <Bell className="h-4 w-4" /> {t("remind_whatsapp")}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => deleteTx(tx.id)} className="ms-auto text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default CustomerDetail;
