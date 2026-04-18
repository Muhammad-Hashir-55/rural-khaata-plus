import { Link } from "react-router-dom";
import { Mic, ScanLine, Shield, Bell, Languages, BookOpen, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const Feature = ({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) => (
  <div className="rounded-2xl bg-card p-6 shadow-soft border border-border transition-smooth hover:shadow-elevated hover:-translate-y-1 animate-fade-up">
    <div className="h-12 w-12 rounded-xl gradient-warm flex items-center justify-center mb-4 text-primary">
      <Icon className="h-6 w-6" />
    </div>
    <h3 className="font-bold text-lg mb-1.5">{title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
  </div>
);

const Landing = () => {
  const { t } = useI18n();

  const features = [
    { icon: Mic, k: "voice" },
    { icon: ScanLine, k: "ocr" },
    { icon: Shield, k: "trust" },
    { icon: Bell, k: "reminders" },
    { icon: Languages, k: "multi" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30">
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground shadow-soft">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg">{t("app_name")}</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                {t("sign_in")}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-warm opacity-60 pointer-events-none" />
        <div className="container relative py-16 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-4 py-1.5 text-xs font-semibold text-primary mb-6 shadow-soft">
            <Sparkles className="h-3.5 w-3.5" />
            {t("tagline")}
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-5 max-w-3xl mx-auto leading-[1.1]">
            {t("hero_title")}
          </h1>
          <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto mb-9 leading-relaxed">
            {t("hero_sub")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/auth?mode=signup">
              <Button size="lg" className="h-14 px-8 text-base gradient-primary text-primary-foreground shadow-elevated hover:scale-105 transition-smooth">
                {t("get_started")}
                <ArrowRight className="ml-1 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="h-14 px-8 text-base">
                {t("sign_in")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-16 md:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div key={f.k} style={{ animationDelay: `${i * 60}ms` }}>
              <Feature icon={f.icon} title={t(`feature_${f.k}`)} desc={t(`feature_${f.k}_desc`)} />
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-20">
        <div className="rounded-3xl gradient-primary p-10 md:p-16 text-center shadow-elevated text-primary-foreground">
          <h2 className="text-2xl md:text-4xl font-extrabold mb-3">{t("hero_title")}</h2>
          <p className="opacity-90 mb-7 max-w-xl mx-auto">{t("hero_sub")}</p>
          <Link to="/auth?mode=signup">
            <Button size="lg" variant="secondary" className="h-14 px-8 text-base bg-card text-primary hover:bg-card/90">
              {t("get_started")}
              <ArrowRight className="ml-1 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-6">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {t("app_name")}
        </div>
      </footer>
    </div>
  );
};

export default Landing;
