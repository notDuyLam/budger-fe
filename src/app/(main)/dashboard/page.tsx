"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  Wallet as WalletIcon,
  CreditCard,
  Smartphone,
  PiggyBank,
  EyeOff,
  Eye,
  ChevronRight,
  Coffee,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  UserCheck,
  X,
  Loader2,
  Trash2,
  Edit2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/shared/AuthProvider";
import Portal from "@/components/shared/Portal";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { z } from "zod";
import { customToast } from "@/components/ui/custom-toast";

interface Wallet {
  id: string;
  name: string;
  balance: number;
  is_credit_card?: boolean;
  is_hidden?: boolean;
  is_balance_masked?: boolean;
  color?: string | null;
  icon?: string | null;
  created_at: string;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  created_at: string;
  wallet_id: string;
  category_id: string;
  note?: string;
  wallet_name?: string;
  category_name?: string;
}

const COLOR_PALETTES = [
  { name: "Slate/Charcoal", value: "from-slate-700 to-slate-900" },
  { name: "Emerald/Teal", value: "from-emerald-500 to-teal-600" },
  { name: "Blue/Indigo", value: "from-blue-500 to-indigo-600" },
  { name: "Pink/Rose", value: "from-pink-500 to-rose-600" },
  { name: "Purple/Violet", value: "from-purple-600 to-indigo-700" },
  { name: "Orange/Amber", value: "from-orange-500 to-amber-600" },
  { name: "Rose/Red", value: "from-rose-500 to-red-600" },
  { name: "Cyan/Teal", value: "from-cyan-500 to-teal-600" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();

  // Data States
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modals / Form States
  const [isAddWalletOpen, setIsAddWalletOpen] = useState(false);
  const [isManageWalletsOpen, setIsManageWalletsOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);

  // Form values & Validation Errors
  const [walletName, setWalletName] = useState("");
  const [startingBalance, setStartingBalance] = useState("");
  const [isCreditCard, setIsCreditCard] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isBalanceMasked, setIsBalanceMasked] = useState(false);
  const [selectedColor, setSelectedColor] = useState("from-emerald-500 to-teal-600");
  const [selectedIcon, setSelectedIcon] = useState("Wallet");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Wallets
      const { data: walletsData, error: walletsErr } = await supabase
        .from("wallets")
        .select("*")
        .order("created_at", { ascending: true });

      if (walletsErr) throw walletsErr;
      setWallets(walletsData || []);

      // 2. Fetch Recent 5 Transactions (joining wallet & category name)
      const { data: txsData, error: txsErr } = await supabase
        .from("transactions")
        .select(`
          *,
          wallets!transactions_wallet_id_fkey (name),
          categories (name)
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      if (txsErr) throw txsErr;

      const formattedTxs = (txsData || []).map((tx: any) => ({
        ...tx,
        wallet_name: tx.wallets?.name || "Unknown Wallet",
        category_name: tx.categories?.name || "Uncategorized"
      }));
      setRecentTransactions(formattedTxs);

      // 3. Fetch Monthly Income & Expenses
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthTxs, error: monthErr } = await supabase
        .from("transactions")
        .select("amount, type")
        .gte("created_at", startOfMonth.toISOString());

      if (monthErr) throw monthErr;

      let incomeSum = 0;
      let expenseSum = 0;
      (monthTxs || []).forEach((t) => {
        const amt = Number(t.amount);
        if (t.type === "INCOME") {
          incomeSum += amt;
        } else if (t.type === "EXPENSE" || t.type === "DEBT_LENT" || t.type === "TRANSFER") {
          expenseSum += amt;
        }
      });
      setMonthlyIncome(incomeSum);
      setMonthlyExpense(expenseSum);

    } catch (err) {
      console.error("Error loading dashboard data:", err);
      customToast.error("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  // Helper styles based on color/name
  const getWalletStyles = (wallet: Wallet) => {
    if (wallet.color) {
      return { type: wallet.is_credit_card ? "credit" : "cash", color: wallet.color };
    }
    const name = wallet.name.toLowerCase();
    if (name.includes("credit") || name.includes("tín dụng") || name.includes("card")) {
      return { type: "credit", color: "from-slate-700 to-slate-900" };
    }
    if (name.includes("momo") || name.includes("zalo") || name.includes("shopee") || name.includes("e-wallet") || name.includes("ví")) {
      return { type: "e-wallet", color: "from-pink-500 to-rose-600" };
    }
    if (name.includes("bank") || name.includes("techcombank") || name.includes("vcb") || name.includes("vietcombank") || name.includes("acb") || name.includes("mbbank") || name.includes("ngân hàng")) {
      return { type: "bank", color: "from-blue-500 to-indigo-600" };
    }
    return { type: "cash", color: "from-emerald-500 to-teal-600" };
  };

  const getWalletIcon = (iconName: string | null | undefined, wallet: Wallet) => {
    if (iconName === "Wallet" || iconName === "WalletIcon") return WalletIcon;
    if (iconName === "CreditCard") return CreditCard;
    if (iconName === "Smartphone") return Smartphone;
    if (iconName === "PiggyBank") return PiggyBank;

    // Fallback based on name/styles
    const { type } = getWalletStyles(wallet);
    switch (type) {
      case "cash": return WalletIcon;
      case "bank": return CreditCard;
      case "e-wallet": return Smartphone;
      default: return CreditCard;
    }
  };

  const getTxIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes("ăn uống") || cat.includes("dining") || cat.includes("coffee") || cat.includes("cafe")) return Coffee;
    if (cat.includes("lương") || cat.includes("income")) return DollarSign;
    if (cat.includes("nợ") || cat.includes("loans") || cat.includes("vay")) return TrendingUp;
    if (cat.includes("mua sắm") || cat.includes("shopping")) return ShoppingBag;
    if (cat.includes("trả nợ") || cat.includes("repayments")) return UserCheck;
    return Coffee;
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-US") + " VND";
  };

  // CRUD: Add Wallet with Zod Validation
  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const balanceVal = startingBalance ? parseFloat(startingBalance) : 0;

    // Validation Schema
    const validationSchema = z.object({
      name: z.string().min(1, "Wallet name is required").max(50, "Wallet name must be under 50 characters"),
      balance: isCreditCard
        ? z.coerce.number()
        : z.coerce.number().min(0, "Starting balance must be non-negative for standard wallets")
    });

    const check = validationSchema.safeParse({ name: walletName.trim(), balance: balanceVal });
    if (!check.success) {
      const errMap: Record<string, string> = {};
      check.error.issues.forEach((issue) => {
        if (issue.path[0]) errMap[issue.path[0] as string] = issue.message;
      });
      setErrors(errMap);
      return;
    }
    setErrors({});

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("wallets")
        .insert({
          user_id: user.id,
          name: walletName.trim(),
          balance: isCreditCard ? 0 : balanceVal,
          is_credit_card: isCreditCard,
          is_hidden: isHidden,
          color: selectedColor,
          icon: selectedIcon
        });

      if (error) throw error;

      setIsAddWalletOpen(false);
      setWalletName("");
      setStartingBalance("");
      setIsCreditCard(false);
      setIsHidden(false);
      setIsBalanceMasked(false);
      setSelectedColor("from-emerald-500 to-teal-600");
      setSelectedIcon("Wallet");
      fetchDashboardData();
      customToast.success("Wallet created successfully!");
    } catch (error: any) {
      console.error("Error adding wallet:", error);
      customToast.error(error.message || "Failed to add wallet");
    } finally {
      setSubmitting(false);
    }
  };

  // CRUD: Save/Update Wallet with Zod Validation
  const handleUpdateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWallet || !user) return;

    const balanceVal = startingBalance ? parseFloat(startingBalance) : 0;

    // Validation Schema
    const validationSchema = z.object({
      name: z.string().min(1, "Wallet name is required").max(50, "Wallet name must be under 50 characters"),
      balance: isCreditCard
        ? z.coerce.number()
        : z.coerce.number().min(0, "Balance must be non-negative for standard wallets")
    });

    const check = validationSchema.safeParse({ name: walletName.trim(), balance: balanceVal });
    if (!check.success) {
      const errMap: Record<string, string> = {};
      check.error.issues.forEach((issue) => {
        if (issue.path[0]) errMap[issue.path[0] as string] = issue.message;
      });
      setErrors(errMap);
      return;
    }
    setErrors({});

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("wallets")
        .update({
          name: walletName.trim(),
          balance: balanceVal,
          is_credit_card: isCreditCard,
          is_hidden: isHidden,
          is_balance_masked: isBalanceMasked,
          color: selectedColor,
          icon: selectedIcon
        })
        .eq("id", editingWallet.id);

      if (error) throw error;

      setEditingWallet(null);
      setWalletName("");
      setStartingBalance("");
      setIsCreditCard(false);
      setIsHidden(false);
      setIsBalanceMasked(false);
      setSelectedColor("from-emerald-500 to-teal-600");
      setSelectedIcon("Wallet");
      fetchDashboardData();
      customToast.success("Wallet updated successfully!");
    } catch (error: any) {
      console.error("Error updating wallet:", error);
      customToast.error(error.message || "Failed to update wallet");
    } finally {
      setSubmitting(false);
    }
  };

  // CRUD: Delete Wallet
  const handleDeleteWallet = async (id: string) => {
    customToast.confirm(
      "Are you sure you want to delete this wallet? All associated transactions will be deleted!",
      async () => {
        try {
          const { error } = await supabase
            .from("wallets")
            .delete()
            .eq("id", id);

          if (error) throw error;
          fetchDashboardData();
          customToast.success("Wallet deleted successfully!");
        } catch (error: any) {
          console.error("Error deleting wallet:", error);
          customToast.error(error.message || "Failed to delete wallet");
        }
      },
      { confirmLabel: "Delete", variant: "danger" }
    );
  };

  // SEED DATA UTILITY
  const seedDemoData = async () => {
    if (!user) return;
    setSeeding(true);
    try {
      // 1. Create Wallets
      const walletsToCreate = [
        { name: "Techcombank", balance: 0.00, user_id: user.id, is_credit_card: false, color: "from-blue-500 to-indigo-600", icon: "CreditCard" },
        { name: "MoMo Wallet", balance: 0.00, user_id: user.id, is_credit_card: false, color: "from-pink-500 to-rose-600", icon: "Smartphone" },
        { name: "Credit Card", balance: 0.00, user_id: user.id, is_credit_card: true, color: "from-slate-700 to-slate-900", icon: "CreditCard" }
      ];

      const { data: createdWallets, error: walletErr } = await supabase
        .from("wallets")
        .insert(walletsToCreate)
        .select();

      if (walletErr) throw walletErr;

      // Find "Ví tiền mặt" (Default wallet)
      const cashWallet = wallets.find(w => w.name === "Ví tiền mặt");
      const cashWalletId = cashWallet?.id;

      const tcbWalletId = createdWallets.find(w => w.name === "Techcombank")?.id;
      const momoWalletId = createdWallets.find(w => w.name === "MoMo Wallet")?.id;
      const creditWalletId = createdWallets.find(w => w.name === "Credit Card")?.id;

      // 2. Fetch User Categories
      const { data: categories } = await supabase
        .from("categories")
        .select("*");

      const getCatId = (nameKeyword: string, type: "INCOME" | "EXPENSE") => {
        return categories?.find(c => c.name.toLowerCase().includes(nameKeyword.toLowerCase()) && c.type === type)?.id;
      };

      const incomeCatId = getCatId("Lương", "INCOME") || getCatId("Khác", "INCOME");
      const diningCatId = getCatId("Ăn uống", "EXPENSE") || getCatId("Khác", "EXPENSE");
      const shoppingCatId = getCatId("Mua sắm", "EXPENSE") || getCatId("Khác", "EXPENSE");

      // 3. Create Transactions
      const txsToCreate = [];

      // Start Balance Entries
      if (tcbWalletId) {
        txsToCreate.push({
          user_id: user.id,
          wallet_id: tcbWalletId,
          amount: 15200000,
          type: "INCOME",
          category_id: incomeCatId,
          description: "Techcombank Starting Balance",
          status: "COMPLETED"
        });
      }
      if (cashWalletId) {
        txsToCreate.push({
          user_id: user.id,
          wallet_id: cashWalletId,
          amount: 1500000,
          type: "INCOME",
          category_id: incomeCatId,
          description: "Cash Starting Balance",
          status: "COMPLETED"
        });
      }
      if (momoWalletId) {
        txsToCreate.push({
          user_id: user.id,
          wallet_id: momoWalletId,
          amount: 3800000,
          type: "INCOME",
          category_id: incomeCatId,
          description: "MoMo Starting Balance",
          status: "COMPLETED"
        });
      }

      // Demo Expenses
      if (momoWalletId) {
        txsToCreate.push({
          user_id: user.id,
          wallet_id: momoWalletId,
          amount: 55000,
          type: "EXPENSE",
          category_id: diningCatId,
          description: "Highlands Coffee",
          note: "Meeting with client Nam",
          status: "COMPLETED"
        });
      }
      if (creditWalletId) {
        txsToCreate.push({
          user_id: user.id,
          wallet_id: creditWalletId,
          amount: 450000,
          type: "EXPENSE",
          category_id: shoppingCatId,
          description: "Uniqlo Clothing Shop",
          note: "Summer t-shirts and jeans",
          status: "COMPLETED"
        });
      }

      const { error: txsErr } = await supabase
        .from("transactions")
        .insert(txsToCreate);

      if (txsErr) throw txsErr;

      fetchDashboardData();
    } catch (err) {
      console.error("Error seeding data:", err);
    } finally {
      setSeeding(false);
    }
  };

  // Exclude hidden wallets from Net Worth calculation
  const totalAssets = wallets
    .filter(w => !w.is_hidden)
    .reduce((sum, w) => sum + Number(w.balance), 0);

  return (
    <div className="flex-1 space-y-6 relative pb-20 text-foreground">
      {loading && wallets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-xs text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500 mb-2" />
          <span>Loading financial dashboard...</span>
        </div>
      ) : (
        <>
          {/* 1. NET WORTH SUMMARY CARD */}
          <div className="rounded-3xl bg-card border border-border p-6 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 dark:bg-emerald-500/10 blur-[40px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/5 dark:bg-blue-500/10 blur-[35px] rounded-full pointer-events-none" />

            <p className="text-xs font-bold text-muted-foreground tracking-wide uppercase">Net Worth</p>
            <div className="mt-2 flex items-baseline gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight font-heading">
                {formatCurrency(totalAssets)}
              </h1>
            </div>

            <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">This Month's Income</span>
                <span className="text-sm font-bold text-emerald-500">{formatCurrency(monthlyIncome)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">This Month's Expense</span>
                <span className="text-sm font-bold text-rose-500">{formatCurrency(monthlyExpense)}</span>
              </div>
            </div>
          </div>

          {/* 2. RESPONSIVE GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

            {/* WALLETS SECTION */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Accounts & Wallets ({wallets.length})
                </h3>
              </div>

              {/* Responsive Container */}
              <div className="flex md:grid flex-row md:grid-cols-2 gap-4 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-none snap-x snap-mandatory md:snap-none px-1">
                {wallets.map((wallet) => {
                  const { color } = getWalletStyles(wallet);
                  const WalletIconComponent = getWalletIcon(wallet.icon, wallet);

                  return (
                    <div
                      key={wallet.id}
                      onClick={() => {
                        setEditingWallet(wallet);
                        setWalletName(wallet.name);
                        setStartingBalance(wallet.balance.toString());
                        setIsCreditCard(wallet.is_credit_card || false);
                        setIsHidden(wallet.is_hidden || false);
                        setIsBalanceMasked(wallet.is_balance_masked || false);
                        setSelectedColor(wallet.color || "from-emerald-500 to-teal-600");
                        setSelectedIcon(wallet.icon || "Wallet");
                        setErrors({});
                        setIsManageWalletsOpen(true);
                      }}
                      className={`snap-start shrink-0 w-44 md:w-auto md:shrink rounded-2xl p-4 bg-gradient-to-br ${color} border transition-all duration-300 cursor-pointer select-none flex flex-col justify-between h-28 relative overflow-hidden border-transparent hover:scale-[1.01]`}
                    >
                      <div className="absolute top-[-10%] right-[-10%] w-20 h-20 bg-white/5 rounded-full pointer-events-none" />

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-white/95 tracking-wide bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1">
                          {wallet.name}
                          {wallet.is_hidden && <EyeOff className="h-2.5 w-2.5 text-white/80" />}
                          {wallet.is_credit_card && !wallet.is_hidden && <CreditCard className="h-2.5 w-2.5 text-white/70" />}
                        </span>
                        <WalletIconComponent className="h-4 w-4 text-white/80" />
                      </div>

                      <div className="mt-auto">
                        <span className="text-[9px] text-white/60 block uppercase font-medium">Balance</span>
                        {(wallet.is_hidden || wallet.is_balance_masked) ? (
                          <span className="text-base font-extrabold text-white/50 leading-none font-heading block mt-0.5 tracking-[0.2em]">••••••</span>
                        ) : (
                          <span className="text-base font-extrabold text-white leading-none font-heading block mt-0.5">
                            {formatCurrency(Number(wallet.balance))}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Quick Add Card */}
                <div
                  onClick={() => {
                    setEditingWallet(null);
                    setWalletName("");
                    setStartingBalance("");
                    setIsCreditCard(false);
                    setIsHidden(false);
                    setSelectedColor("from-emerald-500 to-teal-600");
                    setSelectedIcon("Wallet");
                    setErrors({});
                    setIsAddWalletOpen(true);
                  }}
                  className="snap-start shrink-0 w-32 md:w-auto md:shrink rounded-2xl p-4 border border-dashed border-border bg-card/40 hover:bg-card hover:border-muted-foreground/40 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer h-28 select-none"
                >
                  <div className="p-2 rounded-full bg-accent text-muted-foreground">
                    <Plus className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground">Add Wallet</span>
                </div>
              </div>

              {/* Seed Demo Data Banner */}
              {wallets.length <= 1 && recentTransactions.length === 0 && (
                <div className="p-4 rounded-2xl bg-card border border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
                  <div>
                    <h4 className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                      <Sparkles className="h-4 w-4 text-emerald-500" /> Need test data?
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Populate your dashboard with mock bank, cash, and e-wallets.
                    </p>
                  </div>
                  <button
                    onClick={seedDemoData}
                    disabled={seeding}
                    className="h-8 shrink-0 px-3 bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold rounded-xl text-[10px] flex items-center justify-center gap-1 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {seeding ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" />
                        Seed Demo Data
                      </>
                    )}
                  </button>
                </div>
              )}
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
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((tx) => {
                    const TxIcon = getTxIcon(tx.category_name || "");
                    const amountVal = Number(tx.amount);
                    const isExpense = tx.type === "EXPENSE" || tx.type === "DEBT_LENT" || tx.type === "TRANSFER";

                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-card border border-border hover:border-muted-foreground/30 hover:shadow-sm transition-all duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${isExpense
                            ? "bg-rose-500/10 text-rose-500"
                            : "bg-emerald-500/10 text-emerald-500"
                            }`}>
                            <TxIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold">{tx.description}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[9px] text-muted-foreground font-medium">
                                {new Date(tx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-border" />
                              <span className="text-[9px] text-muted-foreground">{tx.wallet_name}</span>
                            </div>

                            {tx.note && (
                              <p className="text-[9px] text-muted-foreground/80 italic mt-1 font-medium bg-accent/40 px-1.5 py-0.5 rounded inline-block">
                                Note: "{tx.note}"
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`text-xs font-bold font-heading ${isExpense
                            ? "text-rose-500"
                            : "text-emerald-500"
                            }`}>
                            {isExpense ? "-" : "+"}{formatCurrency(amountVal)}
                          </span>
                          <span className="text-[9px] text-muted-foreground block mt-0.5">{tx.category_name}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center bg-card border border-border border-dashed rounded-2xl">
                    <p className="text-xs text-muted-foreground">No recent transactions found.</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* 3. FLOATING ACTION BUTTON (FAB) */}
          <Link
            href="/transactions?tab=ai"
            className="fixed bottom-24 right-6 md:absolute md:bottom-8 md:right-8 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-500 hover:scale-105 active:scale-95 transition-all duration-200 z-30 animate-fade-in"
          >
            <Sparkles className="h-6 w-6 stroke-[2]" />
          </Link>
        </>
      )}

      {/* --- ADD WALLET MODAL --- */}
      {isAddWalletOpen && (
        <Portal>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <form
              onSubmit={handleAddWallet}
              className="w-full max-w-md bg-card border border-border rounded-3xl p-6 space-y-4 shadow-xl animate-scale-up text-foreground font-sans"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-sm font-bold font-heading">Add New Account/Wallet</h3>
                <button
                  type="button"
                  onClick={() => setIsAddWalletOpen(false)}
                  className="h-8 w-8 rounded-full bg-accent border border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 bg-background border border-border p-3 rounded-xl cursor-pointer hover:bg-accent/30 transition-all select-none">
                  <input
                    type="checkbox"
                    checked={isCreditCard}
                    onChange={(e) => {
                      setIsCreditCard(e.target.checked);
                      if (e.target.checked) setStartingBalance("0");
                    }}
                    className="accent-emerald-500 h-4 w-4 rounded border-border focus:ring-emerald-500"
                  />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold">Credit Card</span>
                    <span className="text-[8px] text-muted-foreground">Allows negative balance</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 bg-background border border-border p-3 rounded-xl cursor-pointer hover:bg-accent/30 transition-all select-none">
                  <input
                    type="checkbox"
                    checked={isHidden}
                    onChange={(e) => setIsHidden(e.target.checked)}
                    className="accent-emerald-500 h-4 w-4 rounded border-border focus:ring-emerald-500"
                  />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold">Hide Wallet</span>
                    <span className="text-[8px] text-muted-foreground">Exclude from Net Worth</span>
                  </div>
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Wallet Name</label>
                <input
                  type="text"
                  required
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  placeholder="e.g. Cash, Techcombank, Momo"
                  className="w-full bg-background border border-border rounded-xl py-2 px-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-emerald-500/40 font-semibold"
                />
                {errors.name && <span className="text-[10px] text-rose-500 block mt-0.5">{errors.name}</span>}
              </div>

              {!isCreditCard && (
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Starting Balance (VND)</label>
                  <MoneyInput
                    value={startingBalance}
                    onChange={(raw) => setStartingBalance(raw)}
                    placeholder="e.g. 1.000.000"
                  />
                  {errors.balance && <span className="text-[10px] text-rose-500 block mt-0.5">{errors.balance}</span>}
                </div>
              )}

              {/* Wallet Icon Selection */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Wallet Icon</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { name: "Wallet", icon: WalletIcon },
                    { name: "CreditCard", icon: CreditCard },
                    { name: "Smartphone", icon: Smartphone },
                    { name: "PiggyBank", icon: PiggyBank }
                  ].map((item) => {
                    const IconComp = item.icon;
                    const isSelected = selectedIcon === item.name;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setSelectedIcon(item.name)}
                        className={`p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${isSelected
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                          : "border-border bg-background hover:bg-accent/40 text-muted-foreground"
                          }`}
                      >
                        <IconComp className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Wallet Theme Color Selection */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Color Theme</label>
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_PALETTES.map((color) => {
                    const isSelected = selectedColor === color.value;
                    return (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setSelectedColor(color.value)}
                        className={`h-8 rounded-xl bg-gradient-to-br ${color.value} border-2 transition-all cursor-pointer ${isSelected ? "border-emerald-500 scale-105 shadow-md shadow-black/10" : "border-transparent opacity-85 hover:opacity-100"
                          }`}
                        title={color.name}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddWalletOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-accent border border-border text-muted-foreground hover:text-foreground font-semibold transition-colors cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold transition-all disabled:opacity-50 cursor-pointer text-xs flex items-center justify-center"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </button>
              </div>
            </form>
          </div>
        </Portal>
      )}

      {/* --- EDIT WALLET MODAL (RESPONSIVE BOTTOM SHEET / POPUP) --- */}
      {isManageWalletsOpen && editingWallet && (
        <Portal>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in">
            <div className="w-full md:max-w-lg bg-card border border-border md:rounded-3xl rounded-t-3xl rounded-b-none p-6 md:max-h-[85%] max-h-[90%] overflow-y-auto space-y-4 shadow-xl md:animate-scale-up animate-slide-up text-foreground font-sans fixed md:relative bottom-0 md:bottom-auto">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-sm font-bold font-heading">Edit Account/Wallet</h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsManageWalletsOpen(false);
                    setEditingWallet(null);
                    setWalletName("");
                    setErrors({});
                  }}
                  className="h-8 w-8 rounded-full bg-accent border border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Top Wallet Selector */}
              {wallets.length > 1 && (
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Switch Wallet to Edit</label>
                  <Select
                    value={editingWallet.id}
                    onValueChange={(val) => {
                      const selected = wallets.find(w => w.id === val);
                      if (selected) {
                        setEditingWallet(selected);
                        setWalletName(selected.name);
                        setStartingBalance(selected.balance.toString());
                        setIsCreditCard(selected.is_credit_card || false);
                        setIsHidden(selected.is_hidden || false);
                        setIsBalanceMasked(selected.is_balance_masked || false);
                        setSelectedColor(selected.color || "from-emerald-500 to-teal-600");
                        setSelectedIcon(selected.icon || "Wallet");
                        setErrors({});
                      }
                    }}
                    options={wallets.map(w => ({ value: w.id, label: w.name }))}
                  />
                </div>
              )}

              <form onSubmit={handleUpdateWallet} className="space-y-4">
                {/* Toggles */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 bg-background border border-border p-2 rounded-xl cursor-pointer hover:bg-accent/30 transition-all select-none">
                    <input
                      type="checkbox"
                      checked={isCreditCard}
                      onChange={(e) => setIsCreditCard(e.target.checked)}
                      className="accent-emerald-500 h-4 w-4 rounded border-border"
                    />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold">Credit Card</span>
                      <span className="text-[7px] text-muted-foreground">Allows negative balance</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 bg-background border border-border p-2 rounded-xl cursor-pointer hover:bg-accent/30 transition-all select-none">
                    <input
                      type="checkbox"
                      checked={isHidden}
                      onChange={(e) => setIsHidden(e.target.checked)}
                      className="accent-emerald-500 h-4 w-4 rounded border-border"
                    />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold">Hide Wallet</span>
                      <span className="text-[7px] text-muted-foreground">Exclude from Net Worth</span>
                    </div>
                  </label>
                </div>

                {/* Mask Balance Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border">
                  <label className="flex items-center gap-3 cursor-pointer w-full">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={isBalanceMasked}
                        onChange={(e) => setIsBalanceMasked(e.target.checked)}
                      />
                      <div className="w-8 h-4.5 rounded-full border border-border bg-muted peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all" />
                      <div className="absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-3.5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold flex items-center gap-1">
                        <EyeOff className="h-3 w-3" /> Mask Balance
                      </span>
                      <span className="text-[7px] text-muted-foreground">Hide balance amount with ••••••</span>
                    </div>
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Wallet Name</label>
                  <input
                    type="text"
                    value={walletName}
                    onChange={(e) => setWalletName(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl py-2 px-3 text-xs text-foreground focus:outline-none focus:border-emerald-500/40 font-semibold"
                  />
                  {errors.name && <span className="text-[10px] text-rose-500 block mt-0.5">{errors.name}</span>}
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Current Balance (VND)</label>
                  <MoneyInput
                    value={startingBalance}
                    onChange={(raw) => setStartingBalance(raw)}
                    placeholder="e.g. 1.000.000"
                    allowNegative={isCreditCard}
                  />
                  {errors.balance && <span className="text-[10px] text-rose-500 block mt-0.5">{errors.balance}</span>}
                </div>

                {/* Icon Select */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Wallet Icon</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { name: "Wallet", icon: WalletIcon },
                      { name: "CreditCard", icon: CreditCard },
                      { name: "Smartphone", icon: Smartphone },
                      { name: "PiggyBank", icon: PiggyBank }
                    ].map((item) => {
                      const IconComp = item.icon;
                      const isSelected = selectedIcon === item.name;
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => setSelectedIcon(item.name)}
                          className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${isSelected
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                            : "border-border bg-background hover:bg-accent/40 text-muted-foreground"
                            }`}
                        >
                          <IconComp className="h-3.5 w-3.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Theme Select */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Color Theme</label>
                  <div className="grid grid-cols-4 gap-2">
                    {COLOR_PALETTES.map((color) => {
                      const isSelected = selectedColor === color.value;
                      return (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setSelectedColor(color.value)}
                          className={`h-7 rounded-xl bg-gradient-to-br ${color.value} border-2 transition-all cursor-pointer ${isSelected ? "border-emerald-500 scale-105 shadow-md shadow-black/10" : "border-transparent opacity-85 hover:opacity-100"
                            }`}
                          title={color.name}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2 text-xs border-t border-border pt-3">
                  {editingWallet.name !== "Ví tiền mặt" && (
                    <button
                      type="button"
                      onClick={() => {
                        customToast.confirm(
                          "Are you sure you want to delete this wallet? All associated transactions will be deleted!",
                          async () => {
                            setSubmitting(true);
                            try {
                              const { error } = await supabase
                                .from("wallets")
                                .delete()
                                .eq("id", editingWallet.id);

                              if (error) throw error;
                              setIsManageWalletsOpen(false);
                              setEditingWallet(null);
                              fetchDashboardData();
                              customToast.success("Wallet deleted successfully!");
                            } catch (error: any) {
                              console.error("Error deleting wallet:", error);
                              customToast.error(error.message || "Failed to delete wallet");
                            } finally {
                              setSubmitting(false);
                            }
                          },
                          { confirmLabel: "Delete", variant: "danger" }
                        );
                      }}
                      className="px-3.5 py-2 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-550 hover:bg-rose-500/25 transition-colors cursor-pointer text-xs flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsManageWalletsOpen(false);
                      setEditingWallet(null);
                      setWalletName("");
                      setErrors({});
                    }}
                    className="flex-1 py-2 rounded-xl bg-accent border border-border text-muted-foreground hover:text-foreground font-semibold transition-colors cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}

    </div>
  );
}
