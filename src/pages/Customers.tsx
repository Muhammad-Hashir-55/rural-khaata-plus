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
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{t("customers")}</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground shadow-soft">
                <Plus className="h-4 w-4 mr-1" /> {t("add_customer")}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader><DialogTitle>{t("add_customer")}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label htmlFor="cn">{t("customer_name")}</Label>
                  <Input id="cn" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
                </div>
                <div>
                  <Label htmlFor="cp">{t("phone")}</Label>
                  <Input id="cp" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
                </div>
                <div>
                  <Label htmlFor="cnotes">{t("notes")}</Label>
                  <Textarea id="cnotes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
                <Button onClick={handleAdd} disabled={saving} className="gradient-primary text-primary-foreground">
                  {t("save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9 h-11 bg-card"
          />
        </div>

        {list.length === 0 ? (
          <Card className="p-10 text-center border-dashed">
            <UsersIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="font-semibold">{t("no_customers")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("no_customers_sub")}</p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => {
              const lbl = trustLabel(c.score);
              return (
                <Card key={c.id} className="p-4 hover:shadow-elevated transition-smooth border-border">
                  <div className="flex items-start gap-3">
                    <Link to={`/app/customers/${c.id}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full gradient-warm flex items-center justify-center text-primary font-bold text-lg shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold truncate">{c.name}</p>
                          {c.phone && <p className="text-xs text-muted-foreground truncate">{c.phone}</p>}
                        </div>
                      </div>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} aria-label={t("delete")}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground">{t("balance")}</p>
                      <p className={cn("font-bold", c.balance > 0 ? "text-success" : c.balance < 0 ? "text-destructive" : "text-foreground")}>
                        {c.balance >= 0 ? "+" : "−"} {t("rupees")} {formatMoney(c.balance)}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground">{t("trust_score")}</p>
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold",
                        lbl.color === "success" && "bg-success/15 text-success",
                        lbl.color === "primary" && "bg-primary/15 text-primary",
                        lbl.color === "warning" && "bg-warning/20 text-warning-foreground",
                        lbl.color === "destructive" && "bg-destructive/15 text-destructive",
                      )}>
                        {c.score} · {t(lbl.key)}
                      </span>
                    </div>
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

export default Customers;
