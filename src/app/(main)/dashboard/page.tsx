"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Sparkles, 
  Wallet, 
  CreditCard,
  Smartphone,
  ChevronRight,
  Coffee,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  UserCheck
} from "lucide-react";

// Mock Data for Wallets (English)
const MOCK_WALLETS = [
  { id: "1", name: "Cash", balance: 1500000, type: "cash", color: "from-emerald-500 to-teal-600" },
  { id: "2", name: "Techcombank", balance: 15200000, type: "bank", color: "from-blue-500 to-indigo-600" },
  { id: "3", name: "MoMo Wallet", balance: 3800000, type: "e-wallet", color: "from-pink-500 to-rose-600" },
  { id: "4", name: "Credit Card", balance: -4000000, type: "credit", color: "from-slate-700 to-slate-900" },
];

// Mock Data for Recent Transactions (English with Notes)
const MOCK_TRANSACTIONS = [
  { id: "t1", title: "Highlands Coffee", amount: -55000, category: "Dining", wallet: "MoMo Wallet", time: "Today, 14:32", type: "EXPENSE", note: "Meeting with client Nam" },
  { id: "t2", title: "June Salary Inflow", amount: 18000000, category: "Income", wallet: "Techcombank", time: "Yesterday, 09:00", type: "INCOME", note: "Base salary + performance bonus" },
  { id: "t3", title: "Loan from Nam", amount: 2000000, category: "Loans", wallet: "Cash", time: "Jul 01, 18:15", type: "DEBT_BORROWED", note: "For mechanical keyboard purchase" },
  { id: "t4", title: "Uniqlo Clothing Shop", amount: -450000, category: "Shopping", wallet: "Credit Card", time: "Jun 29, 20:10", type: "EXPENSE", note: "Summer t-shirts and jeans" },
  { id: "t5", title: "Repaid Vy", amount: -500000, category: "Repayments", wallet: "MoMo Wallet", time: "Jun 28, 11:30", type: "DEBT_REPAYMENT", note: "Settled lunch debt" },
];

export default function Dashboard() {
  const [wallets] = useState(MOCK_WALLETS);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);

  // Calculate Net Worth
  const totalAssets = wallets.reduce((sum, w) => sum + w.balance, 0);

  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-US") + " VND";
  };

  const getWalletIcon = (type: string) => {
    switch (type) {
      case "cash": return Wallet;
      case "bank": return CreditCard;
      case "e-wallet": return Smartphone;
      default: return CreditCard;
    }
  };

  const getTxIcon = (category: string) => {
    switch (category) {
      case "Dining": return Coffee;
      case "Income": return DollarSign;
      case "Loans": return TrendingUp;
      case "Shopping": return ShoppingBag;
      case "Repayments": return UserCheck;
      default: return Coffee;
    }
  };

  return (
    <div className="flex-1 space-y-6 relative pb-20 text-foreground">
      
      {/* 1. NET WORTH SUMMARY CARD */}
      <div className="rounded-3xl bg-card border border-border p-6 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 dark:bg-emerald-500/10 blur-[40px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/5 dark:bg-blue-500/10 blur-[35px] rounded-full pointer-events-none" />
        
        <p className="text-xs font-bold text-muted-foreground tracking-wide uppercase">Net Worth</p>
        <div className="mt-2 flex items-baseline gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight font-heading">
            {formatCurrency(totalAssets)}
          </h1>
          <span className="text-xs text-emerald-500 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
            <ArrowUpRight className="h-3 w-3" /> +2.4%
          </span>
        </div>

        <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">This Month's Income</span>
            <span className="text-sm font-bold text-emerald-500">{formatCurrency(18000000)}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">This Month's Expense</span>
            <span className="text-sm font-bold text-rose-500">{formatCurrency(4500000)}</span>
          </div>
        </div>
      </div>

      {/* 2. RESPONSIVE GRID FOR DESKTOP VIEWS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* WALLETS SECTION */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Accounts & Wallets ({wallets.length})</h3>
            <button className="text-xs text-emerald-500 font-semibold hover:underline flex items-center gap-0.5">
              Manage <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          {/* Responsive container: Grid on desktop/tablet, horizontal scroll on mobile */}
          <div className="flex md:grid flex-row md:grid-cols-2 gap-4 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-none snap-x snap-mandatory md:snap-none px-1">
            {wallets.map((wallet) => {
              const WalletIcon = getWalletIcon(wallet.type);
              const isSelected = selectedWalletId === wallet.id;

              return (
                <div
                  key={wallet.id}
                  onClick={() => setSelectedWalletId(isSelected ? null : wallet.id)}
                  className={`snap-start shrink-0 w-44 md:w-auto md:shrink rounded-2xl p-4 bg-gradient-to-br ${wallet.color} border transition-all duration-305 cursor-pointer select-none flex flex-col justify-between h-28 relative overflow-hidden ${
                    isSelected 
                      ? "ring-2 ring-emerald-500 dark:ring-white scale-[1.02] border-white/40 shadow-lg shadow-black/30" 
                      : "border-transparent hover:scale-[1.01]"
                  }`}
                >
                  <div className="absolute top-[-10%] right-[-10%] w-20 h-20 bg-white/5 rounded-full pointer-events-none" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-white/95 tracking-wide bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-md">
                      {wallet.name}
                    </span>
                    <WalletIcon className="h-4 w-4 text-white/80" />
                  </div>
                  
                  <div className="mt-auto">
                    <span className="text-[9px] text-white/60 block uppercase font-medium">Balance</span>
                    <span className="text-base font-extrabold text-white leading-none font-heading block mt-0.5">
                      {formatCurrency(wallet.balance)}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Quick add wallet card */}
            <div className="snap-start shrink-0 w-32 md:w-auto md:shrink rounded-2xl p-4 border border-dashed border-border bg-card/40 hover:bg-card hover:border-muted-foreground/40 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer h-28 select-none">
              <div className="p-2 rounded-full bg-accent text-muted-foreground">
                <Plus className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground">Add Wallet</span>
            </div>
          </div>
        </div>

        {/* RECENT TRANSACTIONS SECTION */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent Transactions</h3>
            <Link href="/transactions" className="text-xs text-emerald-500 font-semibold hover:underline flex items-center gap-0.5">
              Details <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {MOCK_TRANSACTIONS.map((tx) => {
              const TxIcon = getTxIcon(tx.category);
              const isExpense = tx.amount < 0 && tx.type !== "DEBT_REPAYMENT";
              const isRepayment = tx.type === "DEBT_REPAYMENT";
              const isBorrowed = tx.type === "DEBT_BORROWED";

              return (
                <div 
                  key={tx.id} 
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-card border border-border hover:border-muted-foreground/30 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${
                      isExpense 
                        ? "bg-rose-500/10 text-rose-500" 
                        : isRepayment 
                          ? "bg-indigo-500/10 text-indigo-500"
                          : isBorrowed
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-emerald-500/10 text-emerald-500"
                    }`}>
                      <TxIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold">{tx.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-muted-foreground font-medium">{tx.time}</span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span className="text-[9px] text-muted-foreground">{tx.wallet}</span>
                      </div>
                      
                      {/* TRANSACTION NOTE DISPLAY */}
                      {tx.note && (
                        <p className="text-[9px] text-muted-foreground/80 italic mt-1 font-medium bg-accent/40 px-1.5 py-0.5 rounded inline-block">
                          Note: "{tx.note}"
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className={`text-xs font-bold font-heading ${
                      tx.amount < 0 
                        ? "text-rose-500" 
                        : "text-emerald-500"
                    }`}>
                      {tx.amount > 0 ? "+" : ""}{formatCurrency(tx.amount)}
                    </span>
                    <span className="text-[9px] text-muted-foreground block mt-0.5">{tx.category}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 4. FLOATING ACTION BUTTON (FAB) */}
      <Link 
        href="/transactions?tab=ai"
        className="fixed bottom-24 right-6 md:absolute md:bottom-8 md:right-8 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-500 hover:scale-105 active:scale-95 transition-all duration-200 z-30"
      >
        <Sparkles className="h-6 w-6 stroke-[2]" />
      </Link>
    </div>
  );
}
