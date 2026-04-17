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
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="container flex items-center justify-between gap-3 py-3">
          <Link to="/app" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground shadow-soft">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="font-bold text-sm sm:text-base">{profile?.shop_name || t("app_name")}</p>
              <p className="text-[11px] text-muted-foreground hidden sm:block">{t("hello")}, {profile?.owner_name}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label={t("sign_out")}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
        {/* Desktop nav */}
        <nav className="hidden md:block border-t border-border bg-card">
          <div className="container flex gap-1 py-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-smooth",
                    isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      <main className="flex-1 pb-24 md:pb-8">
        <div className="container py-4 md:py-8">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur-md">
        <div className="grid grid-cols-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-smooth",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default AppShell;
