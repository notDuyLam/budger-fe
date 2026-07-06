"use client";

import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ChevronDown, 
  Coffee, 
  ShoppingBag, 
  Home, 
  Car,
  Activity,
  BookOpen,
  Gamepad2,
  DollarSign,
  TrendingUp,
  Gift,
  HelpCircle,
  RefreshCw,
  Sliders,
  Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/shared/AuthProvider";
import { Select } from "@/components/ui/select";

interface TransactionItem {
  id: string;
  title: string;
  amount: number;
  category: string;
  time: string;
  icon: React.ComponentType<any>;
  note?: string;
}

const getCategoryIconComponent = (iconName?: string | null) => {
  switch (iconName) {
    case "Coffee": return Coffee;
    case "ShoppingBag": return ShoppingBag;
    case "Home": return Home;
    case "Car": return Car;
    case "Activity": return Activity;
    case "BookOpen": return BookOpen;
    case "Gamepad2": return Gamepad2;
    case "DollarSign": return DollarSign;
    case "TrendingUp": return TrendingUp;
    case "Gift": return Gift;
    default: return HelpCircle;
  }
};

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"this_week" | "this_month" | "last_month">("this_month");
  const [chartType, setChartType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);

  // Fetch transactions of type INCOME & EXPENSE
  const fetchAnalyticsData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          categories (name, icon)
        `)
        .in("type", ["INCOME", "EXPENSE"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error("Error loading analytics data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
    }
  }, [user]);

  const formatCurrency = (val: number) => {
    return val.toLocaleString("en-US") + " VND";
  };

  // Helper to determine start and end dates for the selected period
  const getPeriodRange = (p: "this_week" | "this_month" | "last_month") => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (p === "this_week") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(now.setDate(diff));
      start.setHours(0, 0, 0, 0);
      end = new Date(); // now
    } else if (p === "this_month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = now;
    } else if (p === "last_month") {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    }

    return { start, end };
  };

  const getCategoryStyles = (name: string, index: number, iconName?: string | null) => {
    const lowercaseName = name.toLowerCase();
    const resolvedIcon = iconName ? getCategoryIconComponent(iconName) : null;
    
    if (lowercaseName.includes("dining") || lowercaseName.includes("ăn uống") || lowercaseName.includes("coffee") || lowercaseName.includes("cafe")) {
      return { color: "text-emerald-500 dark:text-emerald-400", bg: "bg-emerald-500", stroke: "#10b981", icon: resolvedIcon || Coffee };
    }
    if (lowercaseName.includes("shopping") || lowercaseName.includes("mua sắm")) {
      return { color: "text-indigo-500 dark:text-indigo-400", bg: "bg-indigo-500", stroke: "#6366f1", icon: resolvedIcon || ShoppingBag };
    }
    if (lowercaseName.includes("transport") || lowercaseName.includes("di chuyển") || lowercaseName.includes("xe") || lowercaseName.includes("grab")) {
      return { color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-500", stroke: "#f59e0b", icon: resolvedIcon || Car };
    }
    if (lowercaseName.includes("housing") || lowercaseName.includes("tiền nhà") || lowercaseName.includes("rent") || lowercaseName.includes("điện nước")) {
      return { color: "text-rose-500 dark:text-rose-400", bg: "bg-rose-500", stroke: "#f43f5e", icon: resolvedIcon || Home };
    }
    
    const fallbackThemes = [
      { color: "text-teal-500 dark:text-teal-400", bg: "bg-teal-500", stroke: "#14b8a6", icon: resolvedIcon || Sliders },
      { color: "text-cyan-500 dark:text-cyan-400", bg: "bg-cyan-500", stroke: "#06b6d4", icon: resolvedIcon || Sliders },
      { color: "text-sky-500 dark:text-sky-400", bg: "bg-sky-500", stroke: "#0ea5e9", icon: resolvedIcon || Sliders },
      { color: "text-purple-500 dark:text-purple-400", bg: "bg-purple-500", stroke: "#a855f7", icon: resolvedIcon || Sliders },
      { color: "text-fuchsia-500 dark:text-fuchsia-400", bg: "bg-fuchsia-500", stroke: "#d946ef", icon: resolvedIcon || Sliders },
      { color: "text-orange-500 dark:text-orange-400", bg: "bg-orange-500", stroke: "#f97316", icon: resolvedIcon || Sliders },
    ];
    
    return fallbackThemes[index % fallbackThemes.length];
  };

  const getTxTimeStr = (dateIso: string) => {
    const date = new Date(dateIso);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", " + date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  // Filter data by selected period
  const { start, end } = getPeriodRange(period);
  const periodTxs = transactions.filter((tx) => {
    const txDate = new Date(tx.created_at);
    return txDate >= start && txDate <= end;
  });

  // Calculate Aggregates
  const totalIncome = periodTxs
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpense = periodTxs
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalForChart = chartType === "EXPENSE" ? totalExpense : totalIncome;

  // Group Transactions by Category based on chartType
  const categoryMap: { [name: string]: { amount: number; icon?: string | null } } = {};
  periodTxs
    .filter((t) => t.type === chartType)
    .forEach((tx) => {
      const catName = tx.categories?.name || "Uncategorized";
      const icon = tx.categories?.icon;
      if (!categoryMap[catName]) {
        categoryMap[catName] = { amount: 0, icon };
      }
      categoryMap[catName].amount += Number(tx.amount);
    });

  // Transform Category Map to Display format
  const categoriesList = Object.keys(categoryMap).map((name, idx) => {
    const { amount, icon } = categoryMap[name];
    const percentage = totalForChart > 0 ? Math.round((amount / totalForChart) * 100) : 0;
    const styles = getCategoryStyles(name, idx, icon);
    return {
      id: `cat-${idx}`,
      name,
      amount,
      percentage,
      ...styles
    };
  }).sort((a, b) => b.amount - a.amount);

  // Filtered transactions for the detail list at bottom
  const rawFilteredTransactions = periodTxs.filter((t) => t.type === chartType);
  const filteredDetailedTransactions = selectedCategoryName
    ? rawFilteredTransactions.filter((t) => (t.categories?.name || "Uncategorized") === selectedCategoryName)
    : rawFilteredTransactions;

  const detailedTransactionsList = filteredDetailedTransactions.map((tx, idx) => {
    const catName = tx.categories?.name || "Uncategorized";
    const styles = getCategoryStyles(catName, idx, tx.categories?.icon);
    return {
      id: tx.id,
      title: tx.description || (chartType === "EXPENSE" ? "Expense" : "Income"),
      amount: Number(tx.amount),
      category: catName,
      time: getTxTimeStr(tx.created_at),
      icon: styles.icon,
      note: tx.note
    };
  });

  // Calculate Bar Chart Data
  const getWeeklyBars = () => {
    const barsList: { label: string; income: number; expense: number }[] = [];
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfCurrentWeek = new Date(now.setDate(diff));
    
    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfCurrentWeek);
      d.setDate(startOfCurrentWeek.getDate() + i);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(d.getDate() + 1);

      const dayTxs = periodTxs.filter(tx => {
        const txDate = new Date(tx.created_at);
        return txDate >= d && txDate < nextD;
      });

      const inc = dayTxs.filter(t => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
      const exp = dayTxs.filter(t => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);

      barsList.push({ label: dayLabels[i], income: inc, expense: exp });
    }
    return barsList;
  };

  const getMonthlyBars = (isLastMonth: boolean) => {
    const barsList: { label: string; income: number; expense: number }[] = [];
    const now = new Date();
    const targetYear = isLastMonth ? (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()) : now.getFullYear();
    const targetMonth = isLastMonth ? (now.getMonth() === 0 ? 11 : now.getMonth() - 1) : now.getMonth();

    const weekRanges = [
      { label: "W1", startDay: 1, endDay: 7 },
      { label: "W2", startDay: 8, endDay: 14 },
      { label: "W3", startDay: 15, endDay: 21 },
      { label: "W4", startDay: 22, endDay: new Date(targetYear, targetMonth + 1, 0).getDate() }
    ];

    weekRanges.forEach(range => {
      const wStart = new Date(targetYear, targetMonth, range.startDay, 0, 0, 0, 0);
      const wEnd = new Date(targetYear, targetMonth, range.endDay, 23, 59, 59, 999);

      const rangeTxs = periodTxs.filter(tx => {
        const txDate = new Date(tx.created_at);
        return txDate >= wStart && txDate <= wEnd;
      });

      const inc = rangeTxs.filter(t => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
      const exp = rangeTxs.filter(t => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);

      barsList.push({ label: range.label, income: inc, expense: exp });
    });

    return barsList;
  };

  const bars = period === "this_week" ? getWeeklyBars() : getMonthlyBars(period === "last_month");
  
  const maxBarValue = Math.max(
    ...bars.map(b => b.income),
    ...bars.map(b => b.expense),
    1
  );

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-xs text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500 mb-2" />
        <span>Loading analytics information...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 relative text-foreground">
      
      {/* 1. REPORT PERIOD SELECTOR USING PREMIUM SELECT */}
      <div className="flex items-center justify-between">
        <div className="w-48">
          <Select
            value={period}
            onValueChange={(val) => {
              setPeriod(val as any);
              setSelectedCategoryName(null);
            }}
            options={[
              { value: "this_week", label: "This Week" },
              { value: "this_month", label: "This Month" },
              { value: "last_month", label: "Last Month" }
            ]}
          />
        </div>

        <button 
          onClick={fetchAnalyticsData}
          className="p-2.5 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
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

      {/* 3. CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PIE DONUT CHART CARD */}
        <div className="rounded-3xl bg-card border border-border p-5 space-y-4 shadow-sm relative">
          
          {/* Header & Toggle Switch */}
          <div className="flex justify-between items-center border-b border-border pb-3.5">
            <div className="text-left">
              <h4 className="text-xs font-bold uppercase tracking-wider">Breakdown structure</h4>
              <p className="text-[9px] text-muted-foreground mt-0.5">Click segments to filter details</p>
            </div>
            
            <div className="flex p-0.5 bg-accent border border-border rounded-xl text-[9px] font-bold select-none">
              <button 
                type="button"
                onClick={() => {
                  setChartType("EXPENSE");
                  setSelectedCategoryName(null);
                }}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  chartType === "EXPENSE" ? "bg-card text-rose-500 shadow-sm font-extrabold" : "text-muted-foreground"
                }`}
              >
                Expense
              </button>
              <button 
                type="button"
                onClick={() => {
                  setChartType("INCOME");
                  setSelectedCategoryName(null);
                }}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  chartType === "INCOME" ? "bg-card text-emerald-500 shadow-sm font-extrabold" : "text-muted-foreground"
                }`}
              >
                Income
              </button>
            </div>
          </div>

          <div className="flex justify-center items-center py-2 relative">
            <svg width="160" height="160" viewBox="0 0 42 42" className="transform -rotate-90 select-none">
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="currentColor" strokeWidth="4.5" className="text-slate-100 dark:text-slate-800/80" />
              
              {(() => {
                let cumulativePercentage = 0;
                return categoriesList.map((cat) => {
                  if (cat.percentage <= 0) return null;
                  const offset = 100 - cumulativePercentage;
                  cumulativePercentage += cat.percentage;
                  
                  return (
                    <circle
                      key={cat.id}
                      cx="21"
                      cy="21"
                      r="15.915"
                      fill="transparent"
                      stroke={cat.stroke}
                      strokeWidth="4.8"
                      strokeDasharray={`${cat.percentage} ${100 - cat.percentage}`}
                      strokeDashoffset={offset}
                      className="cursor-pointer transition-all duration-300 hover:stroke-[5.5]"
                      onClick={() => setSelectedCategoryName(selectedCategoryName === cat.name ? null : cat.name)}
                      opacity={selectedCategoryName && selectedCategoryName !== cat.name ? 0.3 : 1}
                    />
                  );
                });
              })()}

              {totalForChart === 0 && (
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="currentColor" strokeWidth="4.5" className="text-slate-200 dark:text-slate-800" />
              )}
            </svg>

            {/* Total value displayed inside donut center */}
            <div className="absolute text-center flex flex-col items-center">
              <span className="text-[9px] text-muted-foreground uppercase font-semibold">
                {chartType === "EXPENSE" ? "Spent" : "Earned"}
              </span>
              <span className={`text-xs font-bold font-heading ${chartType === "EXPENSE" ? "text-rose-500" : "text-emerald-500"}`}>
                {formatCurrency(totalForChart)}
              </span>
            </div>
          </div>

          {/* Labels legend grid */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-2">
            {categoriesList.map((cat) => {
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
            {categoriesList.length === 0 && (
              <span className="col-span-2 text-center text-[10px] text-muted-foreground py-2">
                No items in this period
              </span>
            )}
          </div>
        </div>

        {/* COMPARISON BAR CHART CARD */}
        <div className="rounded-3xl bg-card border border-border p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="text-center">
            <h4 className="text-xs font-bold uppercase tracking-wider">Income vs Expenses Comparison</h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {period === "this_week" ? "Daily breakdown this week" : "Weekly breakdown this month"}
            </p>
          </div>

          <div className="flex justify-center items-end h-32 gap-4 sm:gap-6 px-4 border-b border-border pb-2 pt-4 select-none">
            {bars.map((bar, idx) => {
              const incomeHeight = `${(bar.income / maxBarValue) * 85}%`;
              const expenseHeight = `${(bar.expense / maxBarValue) * 85}%`;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div className="flex gap-1 items-end h-[85%] w-full justify-center">
                    <div 
                      style={{ height: incomeHeight }}
                      className="w-2.5 bg-emerald-500/80 rounded-t-sm shadow-[0_0_10px_rgba(16,185,129,0.1)] transition-all duration-500" 
                      title={`Income: ${formatCurrency(bar.income)}`} 
                    />
                    <div 
                      style={{ height: expenseHeight }}
                      className="w-2.5 bg-rose-500/80 rounded-t-sm transition-all duration-500" 
                      title={`Expense: ${formatCurrency(bar.expense)}`} 
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground font-medium">{bar.label}</span>
                </div>
              );
            })}
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
            {selectedCategoryName ? `Category details: ${selectedCategoryName}` : `All ${chartType === "EXPENSE" ? "Expenditure" : "Income"} Details`}
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
          {detailedTransactionsList.map((tx) => {
            const TxIcon = tx.icon;
            return (
              <div 
                key={tx.id} 
                className="flex items-center justify-between p-3.5 rounded-2xl bg-card border border-border hover:border-muted-foreground/30 transition-all text-foreground"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl bg-background border border-border ${
                    chartType === "EXPENSE" ? "text-rose-500" : "text-emerald-500"
                  }`}>
                    <TxIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold">{tx.title}</h5>
                    <span className="text-[9px] text-muted-foreground block mt-0.5">{tx.time}</span>
                    
                    {tx.note && (
                      <p className="text-[9px] text-muted-foreground/80 italic mt-1 font-medium bg-accent/40 px-1.5 py-0.5 rounded inline-block">
                        Note: "{tx.note}"
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold font-heading ${
                    chartType === "EXPENSE" ? "text-rose-500" : "text-emerald-500"
                  }`}>
                    {formatCurrency(tx.amount)}
                  </span>
                  <span className="text-[9px] text-muted-foreground block mt-0.5">{tx.category}</span>
                </div>
              </div>
            );
          })}
          {detailedTransactionsList.length === 0 && (
            <div className="col-span-2 text-center text-xs text-muted-foreground py-8">
              No transactions to display
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
