import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Users as UsersIcon, Trash2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useI18n } from "@/i18n/I18nProvider";
import { useCustomers, useTransactions } from "@/hooks/useLedger";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { formatMoney } from "@/lib/format";
import { computeTrustScore, trustLabel } from "@/lib/trustScore";
import { z } from "zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const customerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

const Customers = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const { customers, refresh } = useCustomers();
  const { transactions } = useTransactions();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const txByCustomer = useMemo(() => {
    const m: Record<string, typeof transactions> = {};
    for (const tx of transactions) (m[tx.customer_id] ||= []).push(tx);
    return m;
  }, [transactions]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone?.includes(q))
      .map((c) => {
        const txs = txByCustomer[c.id] ?? [];
        let balance = 0;
        for (const tx of txs) if (!tx.paid) balance += tx.type === "credit" ? tx.amount : -tx.amount;
        const score = computeTrustScore(txs as any);
        return { ...c, balance, score };
      });
  }, [customers, txByCustomer, search]);

  const handleAdd = async () => {
    const parsed = customerSchema.safeParse({ name, phone, notes });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (!user) return;

    setSaving(true);
    const { error } = await supabase.from("customers").insert({
      user_id: user.id,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      notes: parsed.data.notes || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("added"));
    setName(""); setPhone(""); setNotes(""); setOpen(false);
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirm_delete"))) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("deleted"));
    refresh();
  };

  return (
    <AppShell>
      <div className="space-y-6 pb-8">
        {/* Header with Add Button */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-4xl font-bold">{t("customers")}</h1>
            <p className="text-muted-foreground text-sm mt-1">{list.length} {t("customer", { count: list.length })}</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground shadow-lg hover:shadow-xl transition-smooth active:scale-95 h-11">
                <Plus className="h-5 w-5 mr-2" /> {t("add_customer")}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-2xl">{t("add_customer")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="cn" className="font-semibold">{t("customer_name")}</Label>
                  <Input
                    id="cn"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                    placeholder={t("enter_name")}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cp" className="font-semibold">{t("phone")} ({t("optional")})</Label>
                  <Input
                    id="cp"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={20}
                    placeholder="+92 300 1234567"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnotes" className="font-semibold">{t("notes")} ({t("optional")})</Label>
                  <Textarea
                    id="cnotes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={500}
                    placeholder={t("add_notes")}
                    className="min-h-24 resize-none"
                  />
                </div>
              </div>
              <DialogFooter className="gap-3">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="border-border"
                >
                  {t("cancel")}
                </Button>
                <Button
                  onClick={handleAdd}
                  disabled={saving}
                  className="gradient-primary text-primary-foreground"
                >
                  {saving ? "..." : t("save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder={t("search_customers")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-12 h-11 bg-card border-border/50 focus:border-primary"
          />
        </div>

        {/* Empty State */}
        {list.length === 0 ? (
          <Card className="p-12 text-center border-2 border-dashed">
            <div className="space-y-3">
              <div className="flex justify-center">
                <UsersIcon className="h-12 w-12 text-muted-foreground/50" />
              </div>
              <p className="font-semibold text-lg">{t("no_customers")}</p>
              <p className="text-sm text-muted-foreground">{t("no_customers_sub")}</p>
            </div>
          </Card>
        ) : (
          /* Customers Grid */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c, idx) => {
              const lbl = trustLabel(c.score);
              const balanceIsPositive = c.balance > 0;
              const balanceIsNegative = c.balance < 0;
              return (
                <Link
                  key={c.id}
                  to={`/app/customers/${c.id}`}
                  className="group"
                  style={{ animation: `fade-up 0.4s ease-out ${idx * 0.05}s both` }}
                >
                  <Card className="p-5 border border-border/50 shadow-md hover:shadow-lg hover:border-primary/50 transition-smooth group-hover:bg-card/80 h-full flex flex-col">
                    {/* Header with Name and Delete */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="h-14 w-14 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xl shrink-0 shadow-md group-hover:shadow-lg transition-smooth">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground truncate group-hover:text-primary transition-smooth">
                          {c.name}
                        </p>
                        {c.phone && (
                          <p className="text-xs text-muted-foreground truncate">{c.phone}</p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleDelete(c.id);
                        }}
                        className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-smooth"
                        aria-label={t("delete")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Balance and Trust Score */}
                    <div className="space-y-3 mt-auto pt-4 border-t border-border/50">
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase font-bold text-muted-foreground tracking-wide mb-1">
                            {t("balance")}
                          </p>
                          <p
                            className={cn(
                              "text-lg font-bold",
                              balanceIsPositive
                                ? "text-success"
                                : balanceIsNegative
                                  ? "text-destructive"
                                  : "text-foreground"
                            )}
                          >
                            {balanceIsPositive ? "+" : balanceIsNegative ? "−" : ""}{" "}
                            {t("rupees")} {formatMoney(Math.abs(c.balance))}
                          </p>
                        </div>
                        <div
                          className={cn(
                            "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold",
                            lbl.color === "success" && "bg-success/15 text-success",
                            lbl.color === "primary" && "bg-primary/15 text-primary",
                            lbl.color === "warning" && "bg-warning/15 text-warning",
                            lbl.color === "destructive" && "bg-destructive/15 text-destructive"
                          )}
                        >
                          ⭐ {c.score}
                        </div>
                      </div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">
                        {t(lbl.key)}
                      </p>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default Customers;
