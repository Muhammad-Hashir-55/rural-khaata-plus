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

const StatCard = ({ icon: Icon, label, value, gradient, prefix, trend, isPrimary }: any) => (
  <Card className={cn(
    "p-6 border-2 rounded-xl text-primary-foreground overflow-hidden relative group transition-smooth",
    isPrimary ? "shadow-lg hover:shadow-xl hover:-translate-y-2" : "shadow-md hover:shadow-lg hover:-translate-y-1",
    gradient
  )}>
    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-smooth" />
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-3">
        <div className={cn("p-3 rounded-xl backdrop-blur-sm", isPrimary ? "bg-white/30" : "bg-white/20")}>
          <Icon className={cn("h-6 w-6", isPrimary && "w-7 h-7")} />
        </div>
        {trend && (
          <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", trend > 0 ? "bg-white/30" : "bg-white/20")}>
            {trend > 0 ? "📈" : "📉"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-xs opacity-80 font-semibold tracking-widest uppercase">{label}</p>
      <p className={cn("font-bold mt-3", isPrimary ? "text-4xl" : "text-3xl")}>
        {prefix && <span className={cn("font-medium opacity-80 mr-1", isPrimary ? "text-lg" : "text-base")}>{prefix}</span>}
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
      <div className="space-y-6 md:space-y-8 pb-8">
        {/* Header */}
        <div className="space-y-1 md:space-y-2">
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight">{t("dashboard")}</h1>
          <p className="text-sm md:text-base text-muted-foreground">{t("welcome_back")}</p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
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
            isPrimary
          />
          <Card className="p-6 rounded-xl shadow-md border-2 border-border bg-gradient-to-br from-card to-card/50 group hover:shadow-lg hover:-translate-y-1 transition-smooth">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-primary/15 rounded-xl">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">{t("active_customers")}</p>
            <p className="text-3xl font-bold mt-3 text-foreground">{customers.length}</p>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <Button
            size="lg"
            onClick={() => navigate("/app/transactions/new")}
            className="h-14 md:h-13 justify-start text-lg md:text-base font-bold gradient-primary text-primary-foreground shadow-lg hover:shadow-xl hover:-translate-y-1 transition-smooth active:scale-95 group"
          >
            <Mic className="h-6 w-6 mr-3 group-hover:animate-float" />
            {t("voice_entry")} / {t("quick_add")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/app/customers")}
            className="h-14 md:h-13 justify-start text-lg md:text-base font-bold border-2 border-primary text-primary hover:bg-primary/10 transition-smooth active:scale-95"
          >
            <Plus className="h-6 w-6 mr-3" />
            {t("add_customer")}
          </Button>
        </div>

        {/* Recent Transactions */}
        <div className="space-y-3 md:space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              {t("recent")}
            </h2>
            {recent.length > 0 && (
              <Link
                to="/app/customers"
                className="text-xs md:text-sm font-semibold text-primary hover:text-primary-dark transition-smooth whitespace-nowrap"
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
            <div className="space-y-2.5">
              {recent.map((tx, idx) => {
                const c = customerById[tx.customer_id];
                const isCredit = tx.type === "credit";
                return (
                  <Link
                    key={tx.id}
                    to={`/app/customers/${tx.customer_id}`}
                    className={cn(
                      "flex items-center gap-4 p-4 md:p-5 rounded-xl border-2 bg-card hover:shadow-md hover:bg-card/90 transition-smooth group",
                      isCredit ? "border-l-4 border-l-success border-success/20" : "border-l-4 border-l-destructive border-destructive/20"
                    )}
                    style={{ animation: `fade-up 0.4s ease-out ${idx * 0.05}s both` }}
                  >
                    <div
                      className={cn(
                        "h-12 w-12 rounded-full flex items-center justify-center font-bold flex-shrink-0",
                        isCredit ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                      )}
                    >
                      {isCredit ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm md:text-base text-foreground truncate group-hover:text-primary transition-smooth">
                        {c?.name ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(tx.transaction_date)} · {tx.description || (isCredit ? t("credit") : t("debit"))}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "font-bold whitespace-nowrap text-right flex-shrink-0",
                        isCredit ? "text-success" : "text-destructive"
                      )}
                    >
                      <div className="text-xs md:text-sm text-muted-foreground uppercase font-semibold">{isCredit ? t("credit") : t("debit")}</div>
                      <div className="text-lg md:text-xl font-bold mt-1">{isCredit ? "+" : "−"} {t("rupees")} {formatMoney(tx.amount)}</div>
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
