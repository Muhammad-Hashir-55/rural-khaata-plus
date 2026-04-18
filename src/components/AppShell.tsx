import { Link, NavLink, useNavigate } from "react-router-dom";
import { Home, Users, ScanLine, LogOut, Bell, BookOpen } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/auth/AuthProvider";
import LanguageSwitcher from "./LanguageSwitcher";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const { t } = useI18n();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const navItems = [
    { to: "/app", icon: Home, label: t("dashboard"), end: true },
    { to: "/app/customers", icon: Users, label: t("customers") },
    { to: "/app/reminders", icon: Bell, label: t("reminders") },
    { to: "/app/scan", icon: ScanLine, label: t("scan") },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-card/80 backdrop-blur-xl shadow-sm">
        <div className="container flex items-center justify-between gap-3 py-4">
          {/* Logo & Brand */}
          <Link
            to="/app"
            className="flex items-center gap-3 hover:opacity-80 transition-smooth"
          >
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground shadow-md font-bold text-lg">
              ₹
            </div>
            <div className="leading-tight hidden sm:block">
              <p className="font-bold text-base leading-tight">
                {profile?.shop_name || t("app_name")}
              </p>
              <p className="text-xs text-muted-foreground">
                {profile?.owner_name || t("ledger")}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-smooth",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden xl:inline">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 ml-auto">
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              aria-label={t("sign_out")}
              className="hover:bg-destructive/10 hover:text-destructive transition-smooth"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-28 md:pb-8 overflow-x-hidden">
        <div className="container py-6 md:py-8 animate-fade-up">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-card/95 backdrop-blur-xl shadow-lg">
        <div className="grid grid-cols-4 gap-1 p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg text-[10px] font-semibold transition-smooth",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-muted/60"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="leading-tight">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default AppShell;
