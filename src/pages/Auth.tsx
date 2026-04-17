import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { BookOpen, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/auth/AuthProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { toast } from "sonner";

const signupSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
  shop_name: z.string().trim().min(1).max(100),
  owner_name: z.string().trim().min(1).max(100),
});
const signinSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(72),
});

const Auth = () => {
  const { t, lang } = useI18n();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initial = params.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<"signin" | "signup">(initial);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");

  useEffect(() => {
    if (session) navigate("/app", { replace: true });
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const parsed = signupSchema.safeParse({ email, password, shop_name: shopName, owner_name: ownerName });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: {
              shop_name: parsed.data.shop_name,
              owner_name: parsed.data.owner_name,
              preferred_language: lang,
            },
          },
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success(t("signup_success"));
        navigate("/app", { replace: true });
      } else {
        const parsed = signinSchema.safeParse({ email, password });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) {
          toast.error(t("invalid_credentials"));
          return;
        }
        navigate("/app", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="container flex items-center justify-between py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="font-bold">{t("app_name")}</span>
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 gradient-warm">
        <Card className="w-full max-w-md p-7 shadow-elevated border-border">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-1">
              {mode === "signup" ? t("create_account") : t("sign_in")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("tagline")}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <Label htmlFor="shop">{t("shop_name")}</Label>
                  <Input id="shop" value={shopName} onChange={(e) => setShopName(e.target.value)} required maxLength={100} />
                </div>
                <div>
                  <Label htmlFor="owner">{t("owner_name")}</Label>
                  <Input id="owner" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required maxLength={100} />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="email">{t("email")}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} />
            </div>
            <div>
              <Label htmlFor="pw">{t("password")}</Label>
              <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} maxLength={72} />
            </div>
            <Button type="submit" className="w-full h-12 gradient-primary text-primary-foreground" disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === "signup" ? t("create_account") : t("sign_in")}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-5">
            {mode === "signup" ? t("already_have") : t("no_account")}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              className="text-primary font-semibold hover:underline"
            >
              {mode === "signup" ? t("sign_in") : t("sign_up")}
            </button>
          </p>
        </Card>
      </main>
    </div>
  );
};

export default Auth;
