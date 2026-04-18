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
import { syncCustomerTrustScore } from "@/lib/trustSync";
import { cn } from "@/lib/utils";
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
  const optionalLabel = t("optional") === "optional" ? "Optional" : t("optional");
  const rupeesSymbol = t("rupees_symbol") === "rupees_symbol" ? "Rs" : t("rupees_symbol");
  const descriptionPlaceholder =
    t("description_placeholder") === "description_placeholder"
      ? "Add a short note (item, reason, etc.)"
      : t("description_placeholder");
  const voiceEntryDescription =
    t("voice_entry_description") === "voice_entry_description"
      ? "Use voice first, then review or edit below."
      : t("voice_entry_description");
  const savingLabel = t("saving") === "saving" ? "Saving..." : t("saving");
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
    if (error) {
      toast.error(error.message);
      return;
    }

    await syncCustomerTrustScore(user.id, parsed.data.customer_id);
    toast.success(t("added"));
    navigate(presetCustomer ? `/app/customers/${presetCustomer}` : "/app");
  };

  return (
    <AppShell>
      <div className="space-y-4 md:space-y-6 max-w-2xl mx-auto pb-8 px-2 md:px-0">
        {/* Header */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="hover:bg-primary/10 -ml-3"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> {t("back")}
          </Button>
          <h1 className="text-4xl font-bold">{t("add_transaction")}</h1>
          <p className="text-muted-foreground">{voiceEntryDescription}</p>
        </div>

        {/* Voice Recording Section */}
        <Card className="p-8 border-0 shadow-md rounded-lg bg-gradient-to-br from-primary/5 via-card to-card overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />
          <div className="relative z-10">
            <div className="space-y-1 mb-6">
              <h2 className="text-xl font-bold">{t("voice_entry")}</h2>
              <p className="text-sm text-muted-foreground">{t("example_phrase")}</p>
            </div>
            <VoiceButton onResult={handleVoice} />
            {voicePreview && (
              <div className="mt-6 rounded-lg bg-white/50 dark:bg-card p-4 border border-primary/20 animate-fade-up space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {t("parsed_as")}
                  </p>
                </div>
                <p className="text-base font-medium text-foreground">"{voicePreview}"</p>
              </div>
            )}
          </div>
        </Card>

        {/* Manual Entry Form */}
        <Card className="p-8 border border-border/50 shadow-md rounded-lg">
          <h2 className="text-xl font-bold mb-6">{t("manual_entry")}</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Customer Selection */}
            <div className="space-y-2">
              <Label className="text-sm md:text-base font-semibold">{t("customer_name")}</Label>
              {customers.length === 0 ? (
                <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
                  <p className="text-sm text-muted-foreground">
                    {t("no_customers")}
                  </p>
                  <a
                    className="text-primary font-semibold hover:underline text-sm"
                    href="/app/customers"
                  >
                    {t("add_customer")} →
                  </a>
                </div>
              ) : (
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="h-13 md:h-12 text-base font-semibold border-2">
                    <SelectValue placeholder={t("customer_name")} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Type Selection */}
            <div className="space-y-2">
              <Label className="text-sm md:text-base font-semibold">{t("date")}</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setType("credit")}
                  className={cn(
                    "p-4 md:p-3 rounded-xl border-2 font-bold text-lg md:text-base transition-smooth active:scale-95",
                    type === "credit"
                      ? "border-success bg-success/15 text-success shadow-md"
                      : "border-border bg-card text-muted-foreground hover:border-success/50 hover:bg-success/5"
                  )}
                >
                  ↓ {t("credit")}
                </button>
                <button
                  type="button"
                  onClick={() => setType("debit")}
                  className={cn(
                    "p-4 md:p-3 rounded-xl border-2 font-bold text-lg md:text-base transition-smooth active:scale-95",
                    type === "debit"
                      ? "border-destructive bg-destructive/15 text-destructive shadow-md"
                      : "border-border bg-card text-muted-foreground hover:border-destructive/50 hover:bg-destructive/5"
                  )}
                >
                  ↑ {t("debit")}
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amt" className="text-base font-semibold">
                {t("amount")} ({t("rupees")})
              </Label>
              <div className="relative">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-full flex items-center px-4 text-xl font-bold text-primary">
                  {rupeesSymbol}
                </span>
                <Input
                  id="amt"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="h-13 md:h-12 text-xl md:text-lg font-bold pl-14 pr-4"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="desc" className="text-base font-semibold">
                {t("description")} ({optionalLabel})
              </Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
                placeholder={descriptionPlaceholder}
                className="min-h-28 md:min-h-24 resize-none text-base p-4 md:p-3 border-2"
              />
              <p className="text-xs text-muted-foreground text-right">
                {description.length}/300
              </p>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="d" className="text-base font-semibold">
                  {t("date")}
                </Label>
                <Input
                  id="d"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="h-13 md:h-12 text-base font-semibold border-2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dd" className="text-base font-semibold">
                  {t("due_date")} ({optionalLabel})
                </Label>
                <Input
                  id="dd"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-13 md:h-12 text-base font-semibold border-2"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={saving || !customerId}
              className="w-full h-14 md:h-13 text-lg md:text-base font-bold gradient-primary text-primary-foreground shadow-lg hover:shadow-xl hover:-translate-y-1 transition-smooth active:scale-95"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {savingLabel}
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  {t("save")}
                </>
              )}
            </Button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
};

export default AddTransaction;
