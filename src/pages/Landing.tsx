import { Link } from "react-router-dom";
import { Mic, ScanLine, Shield, Bell, Languages, BookOpen, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const Feature = ({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) => (
  <div className="rounded-2xl bg-card p-7 shadow-md border-2 border-border/50 transition-smooth hover:shadow-lg hover:-translate-y-2 hover:border-primary/30 animate-fade-up">
    <div className="h-14 w-14 rounded-xl gradient-primary flex items-center justify-center mb-5 text-primary-foreground shadow-md">
      <Icon className="h-7 w-7" />
    </div>
    <h3 className="font-bold text-lg mb-2">{title}</h3>
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
              <Button size="lg" className="h-14 md:h-13 px-8 text-base md:text-lg font-bold gradient-primary text-primary-foreground shadow-lg hover:shadow-xl hover:-translate-y-1 transition-smooth active:scale-95">
                {t("get_started")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="h-14 md:h-13 px-8 text-base md:text-lg font-bold border-2 hover:bg-primary/5">
                {t("sign_in")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-16 md:py-20">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {features.map((f, i) => (
            <div key={f.k} style={{ animationDelay: `${i * 60}ms` }}>
              <Feature icon={f.icon} title={t(`feature_${f.k}`)} desc={t(`feature_${f.k}_desc`)} />
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-12 md:pb-20 px-3 md:px-4">
        <div className="rounded-2xl md:rounded-3xl gradient-primary p-6 md:p-12 lg:p-16 text-center shadow-lg border-2 border-primary/30 text-primary-foreground">
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-extrabold mb-3 md:mb-4 leading-tight">{t("hero_title")}</h2>
          <p className="opacity-90 mb-6 md:mb-8 max-w-xl mx-auto text-sm md:text-lg">{t("hero_sub")}</p>
          <Link to="/auth?mode=signup" className="inline-block w-full sm:w-auto">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto h-12 md:h-13 px-6 md:px-8 text-sm md:text-base font-bold bg-card text-primary hover:bg-card/90 shadow-lg hover:shadow-xl transition-smooth active:scale-95">
              {t("get_started")}
              <ArrowRight className="ml-2 h-4 md:h-5 w-4 md:w-5" />
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
