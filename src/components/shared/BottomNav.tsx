"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquare, Receipt, PieChart } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Overview", href: "/dashboard", icon: Home },
    { name: "Transactions", href: "/transactions", icon: MessageSquare },
    { name: "Debts", href: "/debts", icon: Receipt },
    { name: "Analytics", href: "/analytics", icon: PieChart },
  ];

  return (
    <div className="border-t border-border bg-card/95 backdrop-blur-md px-6 py-2 pb-6 md:pb-3 flex justify-around items-center w-full relative z-40 text-foreground">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-200 ${
              isActive 
                ? "text-emerald-500 dark:text-emerald-400 font-semibold scale-105" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className={`relative p-1 rounded-lg ${isActive ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400" : ""}`}>
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-[10px] tracking-wide">{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
