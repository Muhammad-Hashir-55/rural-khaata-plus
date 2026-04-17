import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCircle2, MessageCircle, Phone } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { useCustomers, useTransactions } from "@/hooks/useLedger";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatMoney, daysBetween } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const Reminders = () => {
  const { t } = useI18n();
  const { customers } = useCustomers();
  const { transactions, refresh } = useTransactions();

  const customerById = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c])), [customers]);

  const items = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    return transactions
      .filter((tx) => !tx.paid && tx.type === "credit" && tx.due_date)
      .map((tx) => {
        const due = new Date(tx.due_date!);
        const days = daysBetween(today, due); // positive = overdue
        return { tx, days };
      })
      .filter((x) => x.days >= -3) // show due within 3 days or overdue
      .sort((a, b) => b.days - a.days);
  }, [transactions]);

  const markPaid = async (id: string) => {
    const { error } = await supabase.from("transactions").update({ paid: true, paid_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("saved"));
    refresh();
  };

  const sendWhatsApp = (txId: string) => {
    const tx = transactions.find((t) => t.id === txId);
    if (!tx) return;
    const c = customerById[tx.customer_id];
    if (!c?.phone) { toast.error(t("phone")); return; }
    const msg = `${t("hello")} ${c.name}, ${t("rupees")} ${formatMoney(tx.amount)} ${t("balance")}.${tx.due_date ? ` ${t("due_date")}: ${formatDate(tx.due_date)}` : ""}`;
    const phone = c.phone.replace(/[^\d]/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t("reminders")}</h1>
        </div>

        {items.length === 0 ? (
          <Card className="p-10 text-center border-dashed">
            <CheckCircle2 className="h-10 w-10 mx-auto text-success mb-2" />
            <p className="font-semibold">{t("no_reminders")}</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {items.map(({ tx, days }) => {
              const c = customerById[tx.customer_id];
              const isOverdue = days > 0;
              return (
                <Card key={tx.id} className={cn("p-4 border-border", isOverdue && "border-destructive/40")}>
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-full gradient-warm flex items-center justify-center text-primary font-bold">
                      {c?.name.charAt(0).toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link to={`/app/customers/${tx.customer_id}`} className="font-bold hover:underline truncate block">
                        {c?.name ?? "—"}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {t("rupees")} {formatMoney(tx.amount)}{tx.description ? ` · ${tx.description}` : ""}
                      </p>
                      <span className={cn(
                        "inline-block mt-1 text-xs font-semibold rounded-full px-2 py-0.5",
                        isOverdue ? "bg-destructive/15 text-destructive" : days === 0 ? "bg-warning/20 text-warning-foreground" : "bg-primary/15 text-primary"
                      )}>
                        {isOverdue ? t("overdue_by", { n: days }) : days === 0 ? t("due_today") : t("due_in_days", { n: -days })}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {c?.phone && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => sendWhatsApp(tx.id)} className="gap-1.5">
                          <MessageCircle className="h-4 w-4" /> {t("remind_whatsapp")}
                        </Button>
                        <a href={`tel:${c.phone}`}>
                          <Button size="sm" variant="ghost" className="gap-1.5">
                            <Phone className="h-4 w-4" /> {c.phone}
                          </Button>
                        </a>
                      </>
                    )}
                    <Button size="sm" onClick={() => markPaid(tx.id)} className="ms-auto gap-1.5 bg-success text-success-foreground hover:bg-success/90">
                      <CheckCircle2 className="h-4 w-4" /> {t("mark_paid")}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default Reminders;
