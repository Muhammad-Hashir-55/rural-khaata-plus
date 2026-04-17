import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight, Plus, TrendingUp, Users, Wallet, Mic } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n/I18nProvider";
import { useCustomers, useTransactions } from "@/hooks/useLedger";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const StatCard = ({ icon: Icon, label, value, gradient, prefix }: any) => (
  <Card className={cn("p-5 border-0 shadow-soft text-primary-foreground", gradient)}>
    <div className="flex items-center justify-between mb-2">
      <Icon className="h-5 w-5 opacity-90" />
    </div>
    <p className="text-xs opacity-90 font-medium uppercase tracking-wide">{label}</p>
    <p className="text-2xl font-extrabold mt-1">
      {prefix && <span className="text-base font-medium opacity-80 mr-1">{prefix}</span>}
      {value}
    </p>
  </Card>
);

const Dashboard = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { customers } = useCustomers();
  const { transactions } = useTransactions();

  const stats = useMemo(() => {
    let owedToYou = 0, youOwe = 0;
    for (const tx of transactions) {
      if (tx.paid) continue;
      if (tx.type === "credit") owedToYou += tx.amount;
      else youOwe += tx.amount;
    }
    return { owedToYou, youOwe, net: owedToYou - youOwe };
  }, [transactions]);

  const recent = transactions.slice(0, 6);
  const customerById = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c])), [customers]);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={ArrowDownLeft} label={t("total_owed_to_you")} value={formatMoney(stats.owedToYou)} prefix={t("rupees")} gradient="gradient-credit" />
          <StatCard icon={ArrowUpRight} label={t("total_you_owe")} value={formatMoney(stats.youOwe)} prefix={t("rupees")} gradient="gradient-debit" />
          <StatCard icon={Wallet} label={t("net_balance")} value={formatMoney(stats.net)} prefix={t("rupees")} gradient="gradient-primary" />
          <Card className="p-5 shadow-soft border-border">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{t("active_customers")}</p>
            <p className="text-2xl font-extrabold mt-1">{customers.length}</p>
          </Card>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button
            size="lg"
            onClick={() => navigate("/app/transactions/new")}
            className="h-16 justify-start text-base gradient-primary text-primary-foreground shadow-soft hover:shadow-elevated transition-smooth"
          >
            <Mic className="!h-6 !w-6 mr-2" />
            {t("voice_entry")} / {t("quick_add")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/app/customers")}
            className="h-16 justify-start text-base"
          >
            <Plus className="!h-6 !w-6 mr-2" />
            {t("add_customer")}
          </Button>
        </div>

        {/* Recent */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {t("recent")}
            </h2>
            {recent.length > 0 && (
              <Link to="/app/customers" className="text-sm text-primary font-medium hover:underline">
                {t("view_all")}
              </Link>
            )}
          </div>
          {recent.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <p className="text-muted-foreground">{t("no_recent")}</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {recent.map((tx) => {
                const c = customerById[tx.customer_id];
                const isCredit = tx.type === "credit";
                return (
                  <Link
                    key={tx.id}
                    to={`/app/customers/${tx.customer_id}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:shadow-soft transition-smooth"
                  >
                    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", isCredit ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
                      {isCredit ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{c?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(tx.transaction_date)} · {tx.description || (isCredit ? t("credit") : t("debit"))}</p>
                    </div>
                    <div className={cn("font-bold whitespace-nowrap", isCredit ? "text-success" : "text-destructive")}>
                      {isCredit ? "+" : "−"} {t("rupees")} {formatMoney(tx.amount)}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default Dashboard;
