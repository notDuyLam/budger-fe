"use client";

import React, { useState } from "react";
import { 
  Calendar, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ChevronDown, 
  Coffee, 
  ShoppingBag, 
  Home, 
  RefreshCw,
  Sliders
} from "lucide-react";

// Mock data for categories (English)
const MOCK_CATEGORIES = [
  { id: "cat1", name: "Dining", amount: 2025000, percentage: 45, color: "text-emerald-500 dark:text-emerald-400", bg: "bg-emerald-500", stroke: "#10b981", icon: Coffee },
  { id: "cat2", name: "Shopping", amount: 1350000, percentage: 30, color: "text-indigo-500 dark:text-indigo-400", bg: "bg-indigo-500", stroke: "#6366f1", icon: ShoppingBag },
  { id: "cat3", name: "Transport", amount: 675000, percentage: 15, color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-500", stroke: "#f59e0b", icon: Sliders },
  { id: "cat4", name: "Housing", amount: 450000, percentage: 10, color: "text-rose-500 dark:text-rose-400", bg: "bg-rose-500", stroke: "#f43f5e", icon: Home },
];

// Mock Transactions corresponding to categories (with Notes)
const MOCK_ANALYTICS_TRANSACTIONS = [
  { id: "at1", title: "Highlands Coffee", amount: -55000, category: "Dining", time: "Today, 14:32", icon: Coffee, note: "Meeting with client Nam" },
  { id: "at2", title: "Beef Noodle Lunch", amount: -45000, category: "Dining", time: "Today, 12:15", icon: Coffee, note: "Lunch with developers" },
  { id: "at3", title: "Haidilao Hotpot Dinner", amount: -850000, category: "Dining", time: "Yesterday, 19:30", icon: Coffee, note: "Family weekend gathering" },
  { id: "at4", title: "Uniqlo T-shirt Shop", amount: -450000, category: "Shopping", time: "Jun 29, 20:10", icon: ShoppingBag, note: "Summer t-shirts and jeans" },
  { id: "at5", title: "Sneaker Shoes Shop", amount: -900000, category: "Shopping", time: "Jun 25, 15:40", icon: ShoppingBag, note: "Gifts for brother" },
  { id: "at6", title: "Grab Bike Ride", amount: -35000, category: "Transport", time: "Jun 28, 08:20", icon: Sliders, note: "Go to client office" },
  { id: "at7", title: "Grab Car Ride", amount: -240000, category: "Transport", time: "Jun 24, 17:30", icon: Sliders, note: "Go to airport" },
  { id: "at8", title: "Internet Subscription", amount: -450000, category: "Housing", time: "Jul 01, 10:00", icon: Home, note: "July home internet payment" },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<"this_week" | "this_month" | "last_month">("this_month");
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);

  // Totals
  const totalExpense = MOCK_CATEGORIES.reduce((sum, c) => sum + c.amount, 0);
  const totalIncome = 18000000;

  const formatCurrency = (val: number) => {
    return val.toLocaleString("en-US") + " VND";
  };

  const getPeriodLabel = () => {
    if (period === "this_week") return "This Week";
    if (period === "this_month") return "This Month";
    return "Last Month";
  };

  // Filter transactions
  const filteredTransactions = selectedCategoryName
    ? MOCK_ANALYTICS_TRANSACTIONS.filter((t) => t.category === selectedCategoryName)
    : MOCK_ANALYTICS_TRANSACTIONS;

  return (
    <div className="flex-1 space-y-6 relative text-foreground">
      
      {/* 1. REPORT PERIOD SELECTOR */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <button className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-xl text-xs font-semibold hover:text-emerald-500 transition-colors">
            <Calendar className="h-3.5 w-3.5 text-emerald-500" />
            <span>Period: {getPeriodLabel()}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
          
          <select 
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value as any);
              setSelectedCategoryName(null); // Reset filter
            }}
            className="absolute inset-0 opacity-0 cursor-pointer"
          >
            <option value="this_week">This Week</option>
            <option value="this_month">This Month (Jul 2026)</option>
            <option value="last_month">Last Month (Jun 2026)</option>
          </select>
        </div>

        <button className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 2. METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Total Income</span>
            <span className="text-sm font-extrabold text-emerald-500 font-heading block mt-1">
              {formatCurrency(totalIncome)}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Total Expenses</span>
            <span className="text-sm font-extrabold text-rose-500 font-heading block mt-1">
              {formatCurrency(totalExpense)}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
            <ArrowDownLeft className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* 3. CHARTS GRID (PIE & BAR SIDE BY SIDE ON DESKTOP) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PIE DONUT CHART CARD */}
        <div className="rounded-3xl bg-card border border-border p-5 space-y-4 shadow-sm">
          <div className="text-center">
            <h4 className="text-xs font-bold uppercase tracking-wider">Expense Breakdown by Category</h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">Click segments or labels below to filter transactions</p>
          </div>

          <div className="flex justify-center items-center py-2 relative">
            <svg width="160" height="160" viewBox="0 0 42 42" className="transform -rotate-90 select-none">
              {/* Background circle (theme responsive) */}
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="currentColor" strokeWidth="4.5" className="text-slate-100 dark:text-slate-800/80" />
              
              {/* Donut chart segments */}
              {/* Dining (45%) */}
              <circle
                cx="21"
                cy="21"
                r="15.915"
                fill="transparent"
                stroke="#10b981"
                strokeWidth="4.8"
                strokeDasharray="45 55"
                strokeDashoffset="100"
                className="cursor-pointer transition-all duration-300 hover:stroke-[5.5]"
                onClick={() => setSelectedCategoryName(selectedCategoryName === "Dining" ? null : "Dining")}
                opacity={selectedCategoryName && selectedCategoryName !== "Dining" ? 0.3 : 1}
              />
              {/* Shopping (30%) */}
              <circle
                cx="21"
                cy="21"
                r="15.915"
                fill="transparent"
                stroke="#6366f1"
                strokeWidth="4.8"
                strokeDasharray="30 70"
                strokeDashoffset="55"
                className="cursor-pointer transition-all duration-300 hover:stroke-[5.5]"
                onClick={() => setSelectedCategoryName(selectedCategoryName === "Shopping" ? null : "Shopping")}
                opacity={selectedCategoryName && selectedCategoryName !== "Shopping" ? 0.3 : 1}
              />
              {/* Transport (15%) */}
              <circle
                cx="21"
                cy="21"
                r="15.915"
                fill="transparent"
                stroke="#f59e0b"
                strokeWidth="4.8"
                strokeDasharray="15 85"
                strokeDashoffset="25"
                className="cursor-pointer transition-all duration-300 hover:stroke-[5.5]"
                onClick={() => setSelectedCategoryName(selectedCategoryName === "Transport" ? null : "Transport")}
                opacity={selectedCategoryName && selectedCategoryName !== "Transport" ? 0.3 : 1}
              />
              {/* Housing (10%) */}
              <circle
                cx="21"
                cy="21"
                r="15.915"
                fill="transparent"
                stroke="#f43f5e"
                strokeWidth="4.8"
                strokeDasharray="10 90"
                strokeDashoffset="10"
                className="cursor-pointer transition-all duration-300 hover:stroke-[5.5]"
                onClick={() => setSelectedCategoryName(selectedCategoryName === "Housing" ? null : "Housing")}
                opacity={selectedCategoryName && selectedCategoryName !== "Housing" ? 0.3 : 1}
              />
            </svg>

            {/* Total value displayed inside donut center */}
            <div className="absolute text-center flex flex-col items-center">
              <span className="text-[9px] text-muted-foreground uppercase font-semibold">Spent</span>
              <span className="text-xs font-bold font-heading">{formatCurrency(totalExpense)}</span>
            </div>
          </div>

          {/* Labels legend grid */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-2">
            {MOCK_CATEGORIES.map((cat) => {
              const isFiltered = selectedCategoryName === cat.name;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryName(isFiltered ? null : cat.name)}
                  className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                    isFiltered 
                      ? "bg-accent border-border font-bold scale-[1.02]" 
                      : "bg-card/40 border-transparent hover:border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${cat.bg}`} />
                    <span className="text-[10px] font-semibold">{cat.name}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">{cat.percentage}%</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* COMPARISON BAR CHART CARD */}
        <div className="rounded-3xl bg-card border border-border p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="text-center">
            <h4 className="text-xs font-bold uppercase tracking-wider">Income vs Expenses Comparison</h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">Weekly breakdown this month</p>
          </div>

          {/* Sizing Fix: Explicit height h-32 with no flex-1 properties to prevent height collapsing on mobile */}
          <div className="flex justify-center items-end h-32 gap-6 px-4 border-b border-border pb-2 pt-4 select-none">
            {/* Week 1 */}
            <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <div className="flex gap-1 items-end h-[85%]">
                <div className="w-2.5 h-[90%] bg-emerald-500/80 rounded-t-sm shadow-[0_0_10px_rgba(16,185,129,0.1)]" title="Income: 4,500,000 VND" />
                <div className="w-2.5 h-[30%] bg-rose-500/80 rounded-t-sm" title="Expense: 1,500,000 VND" />
              </div>
              <span className="text-[9px] text-muted-foreground font-medium">W1</span>
            </div>

            {/* Week 2 */}
            <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <div className="flex gap-1 items-end h-[85%]">
                <div className="w-2.5 h-[50%] bg-emerald-500/80 rounded-t-sm" title="Income: 2,500,000 VND" />
                <div className="w-2.5 h-[40%] bg-rose-500/80 rounded-t-sm" title="Expense: 2,000,000 VND" />
              </div>
              <span className="text-[9px] text-muted-foreground font-medium">W2</span>
            </div>

            {/* Week 3 */}
            <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <div className="flex gap-1 items-end h-[85%]">
                <div className="w-2.5 h-[40%] bg-emerald-500/80 rounded-t-sm" title="Income: 2,000,000 VND" />
                <div className="w-2.5 h-[15%] bg-rose-500/80 rounded-t-sm" title="Expense: 750,000 VND" />
              </div>
              <span className="text-[9px] text-muted-foreground font-medium">W3</span>
            </div>

            {/* Week 4 */}
            <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <div className="flex gap-1 items-end h-[85%]">
                <div className="w-2.5 h-[80%] bg-emerald-500/80 rounded-t-sm" title="Income: 4,000,000 VND" />
                <div className="w-2.5 h-[20%] bg-rose-500/80 rounded-t-sm" title="Expense: 1,000,000 VND" />
              </div>
              <span className="text-[9px] text-muted-foreground font-medium">W4</span>
            </div>
          </div>

          <div className="flex justify-center gap-4 text-[10px] text-muted-foreground pt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Income</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Expenses</span>
            </div>
          </div>
        </div>

      </div>

      {/* 5. FILTERED DETAILED TRANSACTION LIST */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {selectedCategoryName ? `Category details: ${selectedCategoryName}` : "All Expenditure Details"}
          </h3>
          {selectedCategoryName && (
            <button 
              onClick={() => setSelectedCategoryName(null)}
              className="text-[9px] text-rose-500 font-bold bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full cursor-pointer"
            >
              Clear filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTransactions.map((tx) => {
            const TxIcon = tx.icon;
            return (
              <div 
                key={tx.id} 
                className="flex items-center justify-between p-3.5 rounded-2xl bg-card border border-border hover:border-muted-foreground/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-background border border-border text-rose-500">
                    <TxIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold">{tx.title}</h5>
                    <span className="text-[9px] text-muted-foreground block mt-0.5">{tx.time}</span>
                    
                    {/* TRANSACTION NOTE DISPLAY */}
                    {tx.note && (
                      <p className="text-[9px] text-muted-foreground/80 italic mt-1 font-medium bg-accent/40 px-1.5 py-0.5 rounded inline-block">
                        Note: "{tx.note}"
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold font-heading text-rose-500">
                    {formatCurrency(tx.amount)}
                  </span>
                  <span className="text-[9px] text-muted-foreground block mt-0.5">{tx.category}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
