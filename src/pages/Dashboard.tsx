import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight, Plus, TrendingUp, Users, Zap, Mic } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n/I18nProvider";
import { useCustomers, useTransactions } from "@/hooks/useLedger";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const StatCard = ({ icon: Icon, label, value, gradient, prefix, trend }: any) => (
  <Card className={cn("p-6 border-0 shadow-md rounded-lg text-primary-foreground overflow-hidden relative group", gradient)}>
    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-smooth" />
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <span className={cn("text-xs font-semibold px-2 py-1 rounded-full", trend > 0 ? "bg-white/20" : "bg-white/10")}>
            {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-sm opacity-90 font-medium tracking-wide uppercase">{label}</p>
      <p className="text-3xl font-bold mt-2">
        {prefix && <span className="text-lg font-medium opacity-80 mr-1">{prefix}</span>}
        {value}
      </p>
    </div>
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

  const recent = transactions.slice(0, 5);
  const customerById = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c])), [customers]);

  return (
    <AppShell>
      <div className="space-y-8 pb-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">{t("dashboard")}</h1>
          <p className="text-muted-foreground">{t("welcome_back")}</p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={ArrowDownLeft}
            label={t("total_owed_to_you")}
            value={formatMoney(stats.owedToYou)}
            prefix={t("rupees")}
            gradient="gradient-success"
            trend={12}
          />
          <StatCard
            icon={ArrowUpRight}
            label={t("total_you_owe")}
            value={formatMoney(stats.youOwe)}
            prefix={t("rupees")}
            gradient="gradient-danger"
          />
          <StatCard
            icon={Zap}
            label={t("net_balance")}
            value={formatMoney(stats.net)}
            prefix={t("rupees")}
            gradient="gradient-primary"
          />
          <Card className="p-6 rounded-lg shadow-md border border-border/50 bg-gradient-to-br from-card to-card/50 group hover:shadow-lg transition-smooth">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">{t("active_customers")}</p>
            <p className="text-3xl font-bold mt-2 text-foreground">{customers.length}</p>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            size="lg"
            onClick={() => navigate("/app/transactions/new")}
            className="h-14 justify-start text-base font-semibold gradient-primary text-primary-foreground shadow-lg hover:shadow-xl transition-smooth active:scale-95 group"
          >
            <Mic className="h-5 w-5 mr-3 group-hover:animate-float" />
            {t("voice_entry")} / {t("quick_add")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/app/customers")}
            className="h-14 justify-start text-base font-semibold border-2 hover:bg-primary/5 transition-smooth"
          >
            <Plus className="h-5 w-5 mr-3" />
            {t("add_customer")}
          </Button>
        </div>

        {/* Recent Transactions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              {t("recent")}
            </h2>
            {recent.length > 0 && (
              <Link
                to="/app/customers"
                className="text-sm font-semibold text-primary hover:text-primary-dark transition-smooth"
              >
                {t("view_all")} →
              </Link>
            )}
          </div>

          {recent.length === 0 ? (
            <Card className="p-12 text-center border-2 border-dashed">
              <div className="space-y-3">
                <div className="flex justify-center">
                  <Mic className="h-12 w-12 text-muted-foreground opacity-50" />
                </div>
                <p className="text-muted-foreground font-medium">{t("no_recent")}</p>
                <p className="text-sm text-muted-foreground/75">{t("start_by_adding_transaction")}</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {recent.map((tx, idx) => {
                const c = customerById[tx.customer_id];
                const isCredit = tx.type === "credit";
                return (
                  <Link
                    key={tx.id}
                    to={`/app/customers/${tx.customer_id}`}
                    className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border/50 hover:border-primary/50 hover:shadow-md hover:bg-card/80 transition-smooth group"
                    style={{ animation: `fade-up 0.4s ease-out ${idx * 0.05}s both` }}
                  >
                    <div
                      className={cn(
                        "h-12 w-12 rounded-full flex items-center justify-center font-semibold",
                        isCredit ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                      )}
                    >
                      {isCredit ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate group-hover:text-primary transition-smooth">
                        {c?.name ?? "—"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(tx.transaction_date)} · {tx.description || (isCredit ? t("credit") : t("debit"))}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "font-bold whitespace-nowrap text-right",
                        isCredit ? "text-success" : "text-destructive"
                      )}
                    >
                      <div className="text-sm text-muted-foreground">{isCredit ? t("credit") : t("debit")}</div>
                      <div className="text-lg">{isCredit ? "+" : "−"}{t("rupees")} {formatMoney(tx.amount)}</div>
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
