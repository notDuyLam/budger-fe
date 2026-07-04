"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Bell, User, Sun, Moon, LogOut } from "lucide-react";
import { useAuth } from "@/components/shared/AuthProvider";

export default function Header() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const { user, signOut } = useAuth();

  useEffect(() => {
    // Sync React state with active class on html element
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setTheme("light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setTheme("dark");
    }
  };

  const getPageTitle = (path: string) => {
    switch (path) {
      case "/dashboard":
        return "Overview";
      case "/transactions":
        return "Transactions & AI";
      case "/debts":
        return "Debt Ledger";
      case "/analytics":
        return "Analytics";
      default:
        return "Budger";
    }
  };

  // Get username from email (e.g. hello@gmail.com -> hello)
  const getUserDisplayName = () => {
    if (!user || !user.email) return "Member";
    return user.email.split("@")[0];
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-background/80 text-foreground backdrop-blur-md border-b border-border px-5 py-4 flex items-center justify-between">
      <div className="flex flex-col">
        <h2 className="text-lg font-bold font-heading tracking-tight leading-tight">
          {getPageTitle(pathname)}
        </h2>
        <span className="text-[10px] text-muted-foreground font-medium">
          Welcome back, <span className="font-semibold text-foreground">{getUserDisplayName()}</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        {/* Theme Toggle Button */}
        <button 
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-indigo-500" />
          )}
        </button>

        {/* Mock Notification */}
        <button className="relative p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </button>

        {/* Profile Avatar & Display */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500 dark:text-emerald-400 text-xs font-semibold">
            <User className="h-4 w-4" />
          </div>
          
          {user && (
            <button
              onClick={signOut}
              title="Sign Out"
              className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 transition-all flex items-center justify-center cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

