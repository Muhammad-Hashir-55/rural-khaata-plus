import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import AppShell from "@/components/AppShell";
import VoiceButton from "@/components/VoiceButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/i18n/I18nProvider";
import { useCustomers } from "@/hooks/useLedger";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { parseVoiceTransaction } from "@/lib/parseVoice";
import { z } from "zod";
import { toast } from "sonner";

const txSchema = z.object({
  customer_id: z.string().uuid(),
  type: z.enum(["credit", "debit"]),
  amount: z.number().positive().max(99999999),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  transaction_date: z.string().min(1),
  due_date: z.string().optional().or(z.literal("")),
});

const AddTransaction = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const { customers, refresh: refreshCustomers } = useCustomers();
  const presetCustomer = params.get("customer") || "";

  const [customerId, setCustomerId] = useState(presetCustomer);
  const [type, setType] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [voicePreview, setVoicePreview] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (presetCustomer) setCustomerId(presetCustomer);
  }, [presetCustomer]);

  const handleVoice = async (raw: string) => {
    setVoicePreview(raw);
    const parsed = parseVoiceTransaction(raw);
    if (parsed.amount) setAmount(String(parsed.amount));
    if (parsed.type) setType(parsed.type);
    if (parsed.name) {
      // Match existing customer by name (case-insensitive contains)
      const match = customers.find((c) => c.name.toLowerCase().includes(parsed.name!.toLowerCase()));
      if (match) {
        setCustomerId(match.id);
      } else if (user) {
        // Auto-create customer
        const { data, error } = await supabase
          .from("customers")
          .insert({ user_id: user.id, name: parsed.name })
          .select()
          .single();
        if (!error && data) {
          await refreshCustomers();
          setCustomerId(data.id);
          toast.success(`${t("added")}: ${parsed.name}`);
        }
      }
    }
    if (!parsed.name) setDescription(raw);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amountNum = parseFloat(amount);
    const parsed = txSchema.safeParse({
      customer_id: customerId,
      type,
      amount: amountNum,
      description,
      transaction_date: date,
      due_date: dueDate,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      customer_id: parsed.data.customer_id,
      type: parsed.data.type,
      amount: parsed.data.amount,
      description: parsed.data.description || null,
      transaction_date: parsed.data.transaction_date,
      due_date: parsed.data.due_date || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("added"));
    navigate(presetCustomer ? `/app/customers/${presetCustomer}` : "/app");
  };

  return (
    <AppShell>
      <div className="space-y-5 max-w-2xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ms-2">
          <ArrowLeft className="h-4 w-4 me-1" /> {t("back")}
        </Button>

        <h1 className="text-2xl font-bold">{t("add_transaction")}</h1>

        {/* Voice section */}
        <Card className="p-6 gradient-warm border-0 shadow-soft">
          <h2 className="font-bold text-center mb-1">{t("voice_entry")}</h2>
          <p className="text-xs text-center text-muted-foreground mb-5">{t("example_phrase")}</p>
          <VoiceButton onResult={handleVoice} />
          {voicePreview && (
            <div className="mt-5 rounded-xl bg-card p-3 border border-border">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                <Sparkles className="h-3 w-3" /> {t("parsed_as")}
              </p>
              <p className="text-sm font-medium">"{voicePreview}"</p>
            </div>
          )}
        </Card>

        {/* Manual form */}
        <Card className="p-6 border-border">
          <h2 className="font-bold mb-4">{t("manual_entry")}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>{t("customer_name")}</Label>
              {customers.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-2">
                  {t("no_customers")} — <a className="text-primary underline" href="/app/customers">{t("add_customer")}</a>
                </p>
              ) : (
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger><SelectValue placeholder={t("customer_name")} /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label>{t("type")}</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setType("credit")}
                  className={`p-3 rounded-xl border-2 font-semibold text-sm transition-smooth ${type === "credit" ? "border-success bg-success/10 text-success" : "border-border bg-card text-muted-foreground"}`}
                >
                  {t("credit")}
                </button>
                <button
                  type="button"
                  onClick={() => setType("debit")}
                  className={`p-3 rounded-xl border-2 font-semibold text-sm transition-smooth ${type === "debit" ? "border-destructive bg-destructive/10 text-destructive" : "border-border bg-card text-muted-foreground"}`}
                >
                  {t("debit")}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="amt">{t("amount")} ({t("rupees")})</Label>
              <Input id="amt" type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required className="text-lg font-bold h-12" />
            </div>

            <div>
              <Label htmlFor="desc">{t("description")}</Label>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="d">{t("date")}</Label>
                <Input id="d" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="dd">{t("due_date")}</Label>
                <Input id="dd" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>

            <Button type="submit" disabled={saving || !customerId} className="w-full h-12 gradient-primary text-primary-foreground">
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : t("save")}
            </Button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
};

export default AddTransaction;
