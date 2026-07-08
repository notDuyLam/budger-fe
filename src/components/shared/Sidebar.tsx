"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Wallet, 
  Home, 
  MessageSquare, 
  Receipt, 
  PieChart, 
  Info, 
  ChevronRight,
  Sparkles,
  Tag
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Overview Dashboard", href: "/dashboard", icon: Home, desc: "Balances, assets & wallets" },
    { name: "Transactions & AI", href: "/transactions", icon: MessageSquare, desc: "Log expenditures & AI Chat" },
    { name: "Debt Ledger", href: "/debts", icon: Receipt, desc: "Manage loans, debts & paybacks" },
    { name: "Category Management", href: "/categories", icon: Tag, desc: "Manage income & expense categories" },
    { name: "Analytics & Reports", href: "/analytics", icon: PieChart, desc: "Visual charts & statistics" },
  ];

  return (
    <aside className="w-80 border-r border-border bg-card/85 p-6 flex flex-col justify-between shrink-0 h-full backdrop-blur-md hidden md:flex text-foreground">
      <div className="space-y-8">
        {/* Brand/Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-500/25 transition-transform group-hover:scale-105">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-heading text-lg font-bold tracking-tight leading-none">Budger</h1>
            <span className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">AI Financial Companion</span>
          </div>
        </Link>

        {/* Navigation list */}
        <div className="space-y-2">
          <p className="px-2 text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">Navigation</p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 group ${
                    isActive 
                      ? "bg-accent border border-border text-emerald-500 dark:text-emerald-400 shadow-inner" 
                      : "text-muted-foreground hover:bg-accent/40 hover:text-foreground border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg transition-colors ${
                      isActive 
                        ? "bg-emerald-500/10 text-emerald-500" 
                        : "bg-background text-muted-foreground group-hover:text-foreground"
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold">{item.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</div>
                    </div>
                  </div>
                  <ChevronRight className={`h-4 w-4 opacity-0 transition-all ${
                    isActive ? "opacity-100 text-emerald-500 dark:text-emerald-400 translate-x-0" : "group-hover:opacity-40 group-hover:translate-x-0.5 text-muted-foreground"
                  }`} />
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Feature quick info */}
        <div className="rounded-2xl bg-gradient-to-br from-card to-background border border-border p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-[30px] rounded-full pointer-events-none" />
          <div className="flex gap-3">
            <Sparkles className="h-5 w-5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold mb-1">Smart Tracking</h4>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Budger is your intelligent financial companion. Log categories, check assets, and let the AI Assistant organize your transactions seamlessly.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
        <span>v0.2.0 (Wireframe)</span>
        <a href="#" className="hover:text-foreground flex items-center gap-1">
          <Info className="h-3 w-3" /> Guides
        </a>
      </div>
    </aside>
  );
}
