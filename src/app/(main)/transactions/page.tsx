"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Search, 
  Sparkles, 
  History, 
  Send, 
  Check, 
  X, 
  SlidersHorizontal,
  Coffee,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  UserCheck,
  ChevronDown,
  Plus,
  Loader2,
  Trash2,
  Edit2,
  Calendar,
  Wallet as WalletIcon,
  Tag,
  Users,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Sparkle,
  Home,
  Car,
  Activity,
  BookOpen,
  Gamepad2,
  Gift,
  HelpCircle,
  CreditCard,
  ArrowLeftRight
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/shared/AuthProvider";
import Portal from "@/components/shared/Portal";
import { Select } from "@/components/ui/select";
import { MoneyInput } from "@/components/ui/money-input";
import { z } from "zod";
import { customToast } from "@/components/ui/custom-toast";

interface Wallet {
  id: string;
  name: string;
  balance: number;
  is_hidden?: boolean;
  is_credit_card?: boolean;
  is_balance_masked?: boolean;
}

interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  icon?: string | null;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  created_at: string;
  wallet_id: string;
  to_wallet_id?: string | null;
  debt_partner_id?: string | null;
  category_id?: string | null;
  note?: string;
  wallet_name?: string;
  to_wallet_name?: string;
  category_name?: string;
  debt_partner_name?: string;
  status?: string;
  due_date?: string | null;
  repaid_by_transaction_id?: string | null;
  dateStr?: string;
}

interface Message {
  id: string;
  dbId?: string; // supabase ID
  sender: "user" | "ai";
  text: string;
  time: string;
  confirmationCard?: {
    type: string;
    amount: number;
    wallet: string;
    to_wallet?: string | null;
    category?: string | null;
    description: string;
    note?: string;
    partner?: string;
    due_date?: string | null;
    status: "pending" | "saved" | "cancelled";
  };
}

const transactionSchema = z.object({
  description: z.string().min(1, "Description is required").max(100, "Description must be under 100 characters"),
  amount: z.string().min(1, "Amount is required").refine(val => {
    const num = parseFloat(val.replace(/\./g, ''));
    return !isNaN(num) && num > 0;
  }, "Amount must be greater than 0"),
  type: z.string(),
  walletId: z.string().min(1, "Source Wallet is required"),
  toWalletId: z.string().optional(),
  categoryId: z.string().optional(),
  partnerId: z.string().optional(),
  newPartnerName: z.string().optional(),
  dueDate: z.string().optional(),
  note: z.string().optional()
}).superRefine((data, ctx) => {
  const isTransfer = data.type === "TRANSFER";
  const isDebt = data.type === "DEBT_LENT" || data.type === "DEBT_BORROWED";
  const isRepayment = data.type === "DEBT_REPAYMENT";

  if (isTransfer) {
    if (!data.toWalletId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["toWalletId"],
        message: "Destination Wallet is required"
      });
    } else if (data.toWalletId === data.walletId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["toWalletId"],
        message: "Source and destination wallets must be different"
      });
    }
  }

  if (!isDebt && !isRepayment && !isTransfer && !data.categoryId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["categoryId"],
      message: "Category is required"
    });
  }

  if ((isDebt || isRepayment) && !data.partnerId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["partnerId"],
      message: "Debt Partner is required"
    });
  }

  if ((isDebt || isRepayment) && data.partnerId === "NEW" && (!data.newPartnerName || !data.newPartnerName.trim())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["newPartnerName"],
      message: "Partner name is required"
    });
  }
});

const getWeekDateRange = (weekStr: string) => {
  const [yearStr, weekNumStr] = weekStr.split("-W");
  const year = parseInt(yearStr);
  const week = parseInt(weekNumStr);
  
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay();
  const dayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const firstMonday = new Date(jan4.setDate(jan4.getDate() + dayOffset));
  
  const targetMonday = new Date(firstMonday.setDate(firstMonday.getDate() + (week - 1) * 7));
  targetMonday.setHours(0,0,0,0);
  
  const targetSunday = new Date(targetMonday);
  targetSunday.setDate(targetSunday.getDate() + 6);
  targetSunday.setHours(23,59,59,999);
  
  return { start: targetMonday, end: targetSunday };
};

const getMonthDateRange = (monthStr: string) => {
  const [year, month] = monthStr.split("-").map(Number);
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
};

const getYearDateRange = (yearVal: number) => {
  const start = new Date(yearVal, 0, 1, 0, 0, 0, 0);
  const end = new Date(yearVal, 11, 31, 23, 59, 59, 999);
  return { start, end };
};

export default function TransactionsPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center p-8 text-xs text-muted-foreground">
        <span className="animate-pulse">Loading Transaction Manager...</span>
      </div>
    }>
      <TransactionsContent />
    </Suspense>
  );
}

function TransactionsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  
  const initialTab = searchParams.get("tab") === "ai" ? "ai" : "history";
  const [activeTab, setActiveTab] = useState<"history" | "ai">(initialTab);

  // Data States from DB
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [debtPartners, setDebtPartners] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // --- FILTER STATES ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filterWalletId, setFilterWalletId] = useState("All");
  const [filterCategoryId, setFilterCategoryId] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterPartnerId, setFilterPartnerId] = useState("All");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- MANUAL TRANSACTION FORM STATES & HOOK-FORM ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [partnerConfirmData, setPartnerConfirmData] = useState<{
    partnerName: string;
    onConfirm: (createdPartnerId: string) => Promise<void>;
    onCancel: () => void;
  } | null>(null);

  const { register, handleSubmit, setValue, watch, trigger, reset, setError, formState: { errors: formErrors } } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: "",
      amount: "",
      type: "EXPENSE",
      walletId: "",
      toWalletId: "",
      categoryId: "",
      partnerId: "",
      newPartnerName: "",
      dueDate: "",
      note: ""
    }
  });

  const formType = watch("type") || "EXPENSE";
  const formWalletId = watch("walletId") || "";
  const formToWalletId = watch("toWalletId") || "";
  const formCategoryId = watch("categoryId") || "";
  const formPartnerId = watch("partnerId") || "";
  const formNewPartnerName = watch("newPartnerName") || "";
  const formDueDate = watch("dueDate") || "";
  const formDescription = watch("description") || "";
  const formAmount = watch("amount") || "";
  const formNote = watch("note") || "";

  const isDebt = formType === "DEBT_LENT" || formType === "DEBT_BORROWED";
  const isRepayment = formType === "DEBT_REPAYMENT";



  // --- AI ASSISTANT STATES ---
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m1",
      sender: "ai",
      text: "Hello! I am your AI Finance Assistant. 🧠\nYou can type your expenditures or income, and I will automatically parse them. For example:\n* \"Dinner cost 120k techcombank for birthday party\"\n* \"Received salary of 15 million in Techcombank\"\n* \"Borrowed 5m from Nam due next Friday\"",
      time: "21:07",
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // --- PAST CHATS HISTORY STATES ---
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyMessages, setHistoryMessages] = useState<Message[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilterMode, setHistoryFilterMode] = useState<"day" | "week" | "month" | "year" | "all">("day");

  const getInitialWeekStr = () => {
    const d = new Date();
    const dayNum = d.getDay();
    const diff = d.getDate() - dayNum + (dayNum === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    
    const target = new Date(monday.valueOf());
    const dayNumber = (monday.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNumber + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
    return `${monday.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
  };

  const [selectedHistoryDay, setSelectedHistoryDay] = useState(new Date().toISOString().split("T")[0]);
  const [selectedHistoryWeek, setSelectedHistoryWeek] = useState(getInitialWeekStr());
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedHistoryYear, setSelectedHistoryYear] = useState(new Date().getFullYear());

  // Load URL Filter Redirects & Initial Data
  const urlWalletId = searchParams.get("walletId");
  const urlTab = searchParams.get("tab");

  useEffect(() => {
    if (user) {
      fetchInitialData();
    }
  }, [user]);

  useEffect(() => {
    if (urlWalletId && wallets.length > 0) {
      setFilterWalletId(urlWalletId);
      setShowFilters(true);
    }
    if (urlTab === "ai") {
      setActiveTab("ai");
    }
  }, [urlWalletId, urlTab, wallets]);

  // Auto-scroll on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Wallets
      const { data: walletsData } = await supabase
        .from("wallets")
        .select("*")
        .order("created_at", { ascending: true });
      const wl = walletsData || [];
      setWallets(wl);
      
      const visibleWallets = wl.filter(w => !w.is_hidden);
      if (visibleWallets.length > 0) {
        setValue("walletId", visibleWallets[0].id);
        const secondWallet = visibleWallets[1] || visibleWallets[0];
        setValue("toWalletId", secondWallet.id);
      }

      // 2. Fetch Categories
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });
      setCategories(categoriesData || []);
      if (categoriesData && categoriesData.length > 0) {
        setValue("categoryId", categoriesData[0].id);
      }

      // 3. Fetch Debt Partners
      const { data: partnersData } = await supabase
        .from("debt_partners")
        .select("id, name")
        .order("name", { ascending: true });
      setDebtPartners(partnersData || []);

      // 4. Fetch Transactions
      await fetchTransactions(wl);
    } catch (err) {
      console.error("Error loading initial data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (walletsList?: Wallet[]) => {
    try {
      const activeWallets = walletsList || wallets;
      const { data: txsData } = await supabase
        .from("transactions")
        .select(`
          *,
          categories (name, icon),
          debt_partners (name)
        `)
        .order("created_at", { ascending: false });

      const formattedTxs = (txsData || []).map((tx: any) => ({
        ...tx,
        wallet_name: activeWallets.find(w => w.id === tx.wallet_id)?.name || "Unknown Wallet",
        to_wallet_name: tx.to_wallet_id ? (activeWallets.find(w => w.id === tx.to_wallet_id)?.name || "Unknown Wallet") : undefined,
        category_name: tx.type === "TRANSFER" 
          ? `Transfer to: ${activeWallets.find(w => w.id === tx.to_wallet_id)?.name || "Unknown"}`
          : (tx.categories?.name || (tx.debt_partners?.name ? `Contact: ${tx.debt_partner_name || tx.debt_partners.name}` : "Uncategorized")),
        dateStr: getGroupDateStr(tx.created_at)
      }));
      setTransactions(formattedTxs);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    }
  };

  const getGroupDateStr = (dateIso: string) => {
    const date = new Date(dateIso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today, " + date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday, " + date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString("en-US") + " VND";
  };

  // --- MANUAL CRUD HANDLERS ---
  const openCreateForm = () => {
    setEditingTx(null);
    const visibleWallets = wallets.filter(w => !w.is_hidden);
    const firstWalletId = visibleWallets[0]?.id || "";
    const secondWalletId = visibleWallets[1]?.id || firstWalletId;
    const firstCatId = categories[0]?.id || "";

    reset({
      description: "",
      amount: "",
      type: "EXPENSE",
      walletId: firstWalletId,
      toWalletId: secondWalletId,
      categoryId: firstCatId,
      partnerId: debtPartners[0]?.id || "",
      newPartnerName: "",
      dueDate: "",
      note: ""
    });
    setIsFormOpen(true);
  };

  const openEditForm = (tx: Transaction) => {
    setEditingTx(tx);
    reset({
      description: tx.description,
      amount: Math.abs(tx.amount).toString(),
      type: tx.type,
      walletId: tx.wallet_id,
      toWalletId: tx.to_wallet_id || "",
      categoryId: tx.category_id || "",
      note: tx.note || "",
      dueDate: tx.due_date ? tx.due_date.split("T")[0] : "",
      partnerId: tx.debt_partner_id || "",
      newPartnerName: ""
    });
    setIsFormOpen(true);
  };

  const handleSaveForm = handleSubmit(async (data) => {
    if (!user) return;

    const isDebt = data.type === "DEBT_LENT" || data.type === "DEBT_BORROWED";
    const isRepayment = data.type === "DEBT_REPAYMENT";
    const isTransfer = data.type === "TRANSFER";
    const amt = parseFloat(data.amount.replace(/\./g, ''));

    // --- Standard Wallet Negative Balance Prevention ---
    const wallet = wallets.find(w => w.id === data.walletId);
    if (wallet && !wallet.is_credit_card) {
      let isRepaymentLent = false;
      if (isRepayment && data.partnerId) {
        const pendingDebt = transactions.find(t => 
          t.debt_partner_id === data.partnerId && 
          t.status === "PENDING" && 
          (t.type === "DEBT_LENT" || t.type === "DEBT_BORROWED")
        );
        isRepaymentLent = pendingDebt ? pendingDebt.type === "DEBT_LENT" : false;
      }
      
      let delta = 0;
      if (data.type === "EXPENSE" || data.type === "DEBT_LENT" || data.type === "TRANSFER") {
        delta = -amt;
      } else if (data.type === "INCOME" || data.type === "DEBT_BORROWED") {
        delta = amt;
      } else if (data.type === "DEBT_REPAYMENT") {
        delta = isRepaymentLent ? amt : -amt;
      }

      let oldDelta = 0;
      if (editingTx) {
        let isOldRepaymentLent = false;
        if (editingTx.type === "DEBT_REPAYMENT" && editingTx.debt_partner_id) {
          const originalDebt = transactions.find(t => t.repaid_by_transaction_id === editingTx.id);
          isOldRepaymentLent = originalDebt ? originalDebt.type === "DEBT_LENT" : false;
        }
        
        if (editingTx.type === "EXPENSE" || editingTx.type === "DEBT_LENT" || editingTx.type === "TRANSFER") {
          oldDelta = -editingTx.amount;
        } else if (editingTx.type === "INCOME" || editingTx.type === "DEBT_BORROWED") {
          oldDelta = editingTx.amount;
        } else if (editingTx.type === "DEBT_REPAYMENT") {
          oldDelta = isOldRepaymentLent ? editingTx.amount : -editingTx.amount;
        }
      }

      if (wallet.balance - oldDelta + delta < 0) {
        setError("amount", { message: `Transaction blocked! Standard wallet balance cannot drop below 0. Potential balance: ${(wallet.balance - oldDelta + delta).toLocaleString()} VND.` });
        return;
      }
    }

    setSubmitting(true);
    
    const saveTransactionData = async (partnerId: string | null) => {
      try {
        const status = isDebt ? "PENDING" : "COMPLETED";
        const txData = {
          description: data.description.trim(),
          amount: amt,
          type: data.type,
          wallet_id: data.walletId,
          to_wallet_id: isTransfer ? data.toWalletId : null,
          category_id: (!isDebt && !isRepayment && !isTransfer) ? (data.categoryId || null) : null,
          debt_partner_id: partnerId || null,
          note: data.note?.trim() || null,
          due_date: (isDebt && data.dueDate) ? new Date(data.dueDate).toISOString() : null,
          user_id: user.id,
          status: status
        };

        if (editingTx) {
          const { error } = await supabase
            .from("transactions")
            .update(txData)
            .eq("id", editingTx.id);

          if (error) throw error;
        } else {
          const { data: newTx, error: insertErr } = await supabase
            .from("transactions")
            .insert(txData)
            .select()
            .single();

          if (insertErr) throw insertErr;

          // Repayment Sync
          if (isRepayment && partnerId && newTx) {
            const { data: originalDebt } = await supabase
              .from("transactions")
              .select("id")
              .eq("debt_partner_id", partnerId)
              .eq("status", "PENDING")
              .in("type", ["DEBT_BORROWED", "DEBT_LENT"])
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (originalDebt) {
              await supabase
                .from("transactions")
                .update({ 
                  status: "COMPLETED",
                  repaid_by_transaction_id: newTx.id
                })
                .eq("id", originalDebt.id);
            }
          }
        }

        setIsFormOpen(false);
        fetchTransactions();

        // Refetch partners
        const { data: partnersData } = await supabase
          .from("debt_partners")
          .select("id, name")
          .order("name", { ascending: true });
        setDebtPartners(partnersData || []);
      } catch (err: any) {
        console.error("Error saving transaction:", err);
        customToast.error("Failed to save transaction: " + err.message);
      } finally {
        setSubmitting(false);
      }
    };

    if ((isDebt || isRepayment) && data.partnerId === "NEW") {
      const matched = debtPartners.find(p => p.name.toLowerCase() === data.newPartnerName?.trim().toLowerCase());
      if (matched) {
        saveTransactionData(matched.id);
      } else {
        setPartnerConfirmData({
          partnerName: data.newPartnerName?.trim() || "",
          onConfirm: async (createdPartnerId: string) => {
            await saveTransactionData(createdPartnerId);
            setPartnerConfirmData(null);
          },
          onCancel: () => {
            setSubmitting(false);
            setPartnerConfirmData(null);
          }
        });
      }
    } else {
      try {
        await saveTransactionData(data.partnerId || null);
      } catch (err) {
        setSubmitting(false);
      }
    }
  });

  const handleDeleteTx = async (id: string) => {
    customToast.confirm(
      "Are you sure you want to delete this transaction?",
      async () => {
        setSubmitting(true);
        try {
          const { error } = await supabase
            .from("transactions")
            .delete()
            .eq("id", id);

          if (error) throw error;
          setIsFormOpen(false);
          fetchTransactions();
          customToast.success("Transaction deleted successfully!");
        } catch (err: any) {
          console.error("Error deleting transaction:", err);
          customToast.error("Failed to delete transaction");
        } finally {
          setSubmitting(false);
        }
      },
      { confirmLabel: "Delete", variant: "danger" }
    );
  };



  // --- CHAT AI PARSING WITH PERSISTED MESSAGES LOGGING ---
  const handleSendMessage = async () => {
    if (!chatInput.trim() || !user) return;

    const userText = chatInput;
    const userTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    
    // Save user message to client state & DB
    setChatInput("");
    setIsTyping(true);

    try {
      // Log User message in Supabase
      const { data: userMsgData } = await supabase.from("chat_messages").insert({
        user_id: user.id,
        sender: "user",
        text: userText
      }).select().single();

      const userMsgId = userMsgData?.id || `msg-user-${Date.now()}`;
      setMessages((prev) => [...prev, {
        id: userMsgId,
        sender: "user",
        text: userText,
        time: userTime
      }]);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userText,
          wallets: wallets.filter(w => !w.is_hidden).map((w) => w.name),
          categories: categories.map((c) => ({ name: c.name, type: c.type })),
          partners: debtPartners.map((p) => p.name),
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to analyze your transaction.");
      }

      const result = await response.json();
      const aiTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

      const confirmationCardData = {
        type: result.type,
        amount: result.amount,
        wallet: result.wallet,
        to_wallet: result.to_wallet || undefined,
        category: result.category,
        description: result.description,
        partner: result.partner || undefined,
        due_date: result.due_date || undefined,
        note: (result.note && result.note.toLowerCase() !== "null" && result.note.toLowerCase() !== "none" && result.note !== ".") ? result.note : undefined,
        status: "pending" as const,
      };

      // Save AI message and confirmation card to DB
      const { data: aiMsgData } = await supabase.from("chat_messages").insert({
        user_id: user.id,
        sender: "ai",
        text: "I have analyzed your statement. Please confirm the transaction card details below to save it:",
        confirmation_card: confirmationCardData
      }).select().single();

      const aiMsgId = aiMsgData?.id || `msg-ai-${Date.now()}`;
      
      setMessages((prev) => [...prev, {
        id: aiMsgId,
        dbId: aiMsgData?.id,
        sender: "ai",
        text: "I have analyzed your statement. Please confirm the transaction card details below to save it:",
        time: aiTime,
        confirmationCard: confirmationCardData
      }]);
    } catch (err: any) {
      console.error("AI Assistant Error:", err);
      const errText = `❌ Error: ${err.message || "Something went wrong while talking to the AI. Please verify your API keys or try again."}`;
      
      // Save AI error log in Supabase
      const { data: aiErrData } = await supabase.from("chat_messages").insert({
        user_id: user.id,
        sender: "ai",
        text: errText
      }).select().single();

      setMessages((prev) => [...prev, {
        id: aiErrData?.id || `msg-ai-err-${Date.now()}`,
        sender: "ai",
        text: errText,
        time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleConfirmCard = async (msgId: string, action: "save" | "cancel") => {
    if (!user) return;
    
    const targetMsg = messages.find(m => m.id === msgId);
    if (!targetMsg || !targetMsg.confirmationCard) return;
    const card = targetMsg.confirmationCard;

    if (action === "cancel") {
      const updatedCard = { ...card, status: "cancelled" as const };
      
      // Update DB record
      if (targetMsg.dbId) {
        await supabase.from("chat_messages")
          .update({ confirmation_card: updatedCard })
          .eq("id", targetMsg.dbId);
      }

      setMessages((prev) => 
        prev.map((msg) => {
          if (msg.id === msgId && msg.confirmationCard) {
            return {
              ...msg,
              text: `❌ Transaction cancelled. Feel free to type another request.`,
              confirmationCard: updatedCard
            };
          }
          return msg;
        })
      );
      return;
    }

    // "save" action
    const isDebt = card.type === "DEBT_LENT" || card.type === "DEBT_BORROWED" || card.type === "DEBT_REPAYMENT";
    let partnerId = null;
    let matchedPartner = null;

    if (isDebt && card.partner) {
      matchedPartner = debtPartners.find(p => p.name.toLowerCase() === card.partner!.toLowerCase());
      if (matchedPartner) {
        partnerId = matchedPartner.id;
      }
    }

    const saveAICard = async (pId: string | null) => {
      try {
        // Resolve Wallet
        const wId = wallets.find(w => w.name.toLowerCase() === card.wallet.toLowerCase())?.id || wallets[0]?.id;
        
        // Resolve Category
        const isActualDebt = card.type === "DEBT_LENT" || card.type === "DEBT_BORROWED";
        let cId = null;
        if (!isActualDebt && card.type !== "TRANSFER" && card.category) {
          cId = categories.find(c => c.name.toLowerCase() === card.category!.toLowerCase())?.id || categories[0]?.id;
        }

        // Standard Wallet Negative Balance Prevention (skip for credit card and TRANSFER destination)
        const targetWallet = wallets.find(w => w.id === wId);
        if (targetWallet && !targetWallet.is_credit_card && card.type !== "TRANSFER") {
          let isRepaymentLent = false;
          if (card.type === "DEBT_REPAYMENT" && pId) {
            const pendingDebt = transactions.find(t => 
              t.debt_partner_id === pId && 
              t.status === "PENDING" && 
              (t.type === "DEBT_LENT" || t.type === "DEBT_BORROWED")
            );
            isRepaymentLent = pendingDebt ? pendingDebt.type === "DEBT_LENT" : false;
          }
          
          let delta = 0;
          if (card.type === "EXPENSE" || card.type === "DEBT_LENT") {
            delta = -card.amount;
          } else if (card.type === "INCOME" || card.type === "DEBT_BORROWED") {
            delta = card.amount;
          } else if (card.type === "DEBT_REPAYMENT") {
            delta = isRepaymentLent ? card.amount : -card.amount;
          }

          if (targetWallet.balance + delta < 0) {
            customToast.error(`Cannot save! Standard wallet "${targetWallet.name}" balance cannot drop below 0. Current: ${targetWallet.balance.toLocaleString()} VND.`);
            return;
          }
        }

        // For TRANSFER: also check source wallet balance
        let toWalletId: string | null = null;
        if (card.type === "TRANSFER" && card.to_wallet) {
          toWalletId = wallets.find(w => w.name.toLowerCase() === card.to_wallet!.toLowerCase())?.id || null;
          // Check source wallet has enough
          if (targetWallet && !targetWallet.is_credit_card) {
            if (targetWallet.balance - card.amount < 0) {
              customToast.error(`Cannot transfer! Source wallet "${targetWallet.name}" has insufficient balance. Current: ${targetWallet.balance.toLocaleString()} VND.`);
              return;
            }
          }
        }

        // Save Transaction to Supabase
        const status = isActualDebt ? "PENDING" : "COMPLETED";
        const { data: newTx, error: txErr } = await supabase.from("transactions").insert({
          user_id: user.id,
          wallet_id: wId,
          to_wallet_id: toWalletId || null,
          category_id: cId || null,
          debt_partner_id: pId || null,
          amount: card.amount,
          type: card.type,
          description: card.description,
          note: card.note || null,
          due_date: (isActualDebt && card.due_date) ? new Date(card.due_date).toISOString() : null,
          status: status
        }).select().single();

        if (txErr) throw txErr;

        // Repayment Sync
        if (card.type === "DEBT_REPAYMENT" && pId && newTx) {
          const { data: originalDebt } = await supabase
            .from("transactions")
            .select("id")
            .eq("debt_partner_id", pId)
            .eq("status", "PENDING")
            .in("type", ["DEBT_BORROWED", "DEBT_LENT"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (originalDebt) {
            await supabase
              .from("transactions")
              .update({ 
                status: "COMPLETED",
                repaid_by_transaction_id: newTx.id
              })
              .eq("id", originalDebt.id);
          }
        }

        fetchTransactions();

        // Update DB AI Message status to saved
        const updatedCard = { ...card, status: "saved" as const };
        if (targetMsg.dbId) {
          await supabase.from("chat_messages")
            .update({ confirmation_card: updatedCard })
            .eq("id", targetMsg.dbId);
        }

        // Update message state in client
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === msgId && msg.confirmationCard) {
              let successText = `✅ Saved transaction **${card.description}** successfully!\nAmount: ${formatCurrency(card.amount)} in **${card.wallet}** wallet.`;
              if (card.type === "TRANSFER" && card.to_wallet) {
                successText = `✅ Transfer recorded successfully!\nAmount: ${formatCurrency(card.amount)} from **${card.wallet}** → **${card.to_wallet}**.`;
              } else if (isDebt && card.partner) {
                const actionLabel = card.type === "DEBT_LENT" ? "lent to" : card.type === "DEBT_BORROWED" ? "borrowed from" : "repaid with";
                successText = `✅ Recorded debt action successfully!\nAmount: ${formatCurrency(card.amount)} in **${card.wallet}** wallet ${card.type === "DEBT_REPAYMENT" ? "repayment for" : actionLabel} **${card.partner}** (Status: ${status}).`;
              } else if (card.category) {
                successText += ` (Category: ${card.category}).`;
              }
              if (card.note) {
                successText += `\nNote: *"${card.note}"*`;
              }
              if (card.due_date) {
                successText += `\nDue Date: *"${new Date(card.due_date).toLocaleDateString()}"*`;
              }
              return {
                ...msg,
                text: successText,
                confirmationCard: updatedCard
              };
            }
            return msg;
          })
        );

        customToast.success(`Transaction "${card.description}" saved!`);
      } catch (err: any) {
        console.error("Error inside saveAICard:", err);
        customToast.error("Failed to save transaction: " + (err.message || "Unknown error"));
      }
    };

    if (isDebt && card.partner && !matchedPartner) {
      setPartnerConfirmData({
        partnerName: card.partner.trim(),
        onConfirm: async (createdPartnerId: string) => {
          await saveAICard(createdPartnerId);
        },
        onCancel: () => {}
      });
    } else {
      try {
        await saveAICard(partnerId);
      } catch (err) {}
    }
  };

  // Fetch AI Chat messages history on-demand
  const fetchChatHistory = async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      let query = supabase.from("chat_messages").select("*").order("created_at", { ascending: true });
      
      if (historyFilterMode !== "all") {
        let start: Date;
        let end: Date;

        if (historyFilterMode === "day") {
          const dateParts = selectedHistoryDay.split("-").map(Number);
          start = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 0, 0, 0, 0);
          end = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 23, 59, 59, 999);
        } else if (historyFilterMode === "week") {
          const range = getWeekDateRange(selectedHistoryWeek);
          start = range.start;
          end = range.end;
        } else if (historyFilterMode === "month") {
          const range = getMonthDateRange(selectedHistoryMonth);
          start = range.start;
          end = range.end;
        } else { // "year"
          const range = getYearDateRange(Number(selectedHistoryYear));
          start = range.start;
          end = range.end;
        }

        query = query.gte("created_at", start.toISOString()).lte("created_at", end.toISOString());
      }

      const { data } = await query.limit(250);

      const formatted = (data || []).map((msg: any) => ({
        id: msg.id,
        sender: msg.sender,
        text: msg.text,
        time: new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        confirmationCard: msg.confirmation_card ? {
          type: msg.confirmation_card.type,
          amount: Number(msg.confirmation_card.amount),
          wallet: msg.confirmation_card.wallet,
          to_wallet: msg.confirmation_card.to_wallet,
          category: msg.confirmation_card.category,
          description: msg.confirmation_card.description,
          partner: msg.confirmation_card.partner,
          due_date: msg.confirmation_card.due_date,
          note: msg.confirmation_card.note,
          status: msg.confirmation_card.status
        } : undefined
      }));

      setHistoryMessages(formatted);
    } catch (err) {
      console.error("Error loading chat history:", err);
      customToast.error("Failed to load chat history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (historyOpen) {
      fetchChatHistory();
    }
  }, [historyOpen, historyFilterMode, selectedHistoryDay, selectedHistoryWeek, selectedHistoryMonth, selectedHistoryYear]);

  // Markdown Render
  const renderMessageText = (text: string) => {
    const lines = text.split("\n");
    return (
      <div className="space-y-1">
        {lines.map((line, idx) => {
          let content: React.ReactNode = line;
          const isBullet = line.startsWith("* ") || line.startsWith("- ");
          const cleanLine = isBullet ? line.substring(2) : line;

          const boldParts = cleanLine.split(/\*\*([^*]+)\*\*/g);
          if (boldParts.length > 1) {
            content = boldParts.map((part, pIdx) => {
              if (pIdx % 2 === 1) {
                return <strong key={pIdx} className="font-extrabold text-slate-900 dark:text-white">{part}</strong>;
              }
              return parseItalic(part);
            });
          } else {
            content = parseItalic(cleanLine);
          }

          if (isBullet) {
            return (
              <div key={idx} className="flex items-start gap-2 ml-4 my-0.5 animate-fade-in">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span className="flex-1">{content}</span>
              </div>
            );
          }

          return (
            <p key={idx} className="min-h-[1em]">
              {content}
            </p>
          );
        })}
      </div>
    );
  };

  const parseItalic = (text: string): React.ReactNode => {
    const parts = text.split(/\*([^*]+)\*/g);
    if (parts.length > 1) {
      return parts.map((part, idx) => {
        if (idx % 2 === 1) {
          return (
            <span key={idx} className="font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded mx-0.5">
              {part}
            </span>
          );
        }
        return part;
      });
    }
    return text;
  };

  // --- FILTERS & SEARCH PROCESS ---
  const filteredTransactions = transactions.filter((tx) => {
    const matchesWallet = filterWalletId === "All" || tx.wallet_id === filterWalletId || tx.to_wallet_id === filterWalletId;
    const matchesCategory = filterCategoryId === "All" || tx.category_id === filterCategoryId;
    const matchesType = filterType === "All" || tx.type === filterType;
    const matchesPartner = filterPartnerId === "All" || tx.debt_partner_id === filterPartnerId;
    
    let matchesDate = true;
    const txDate = new Date(tx.created_at);
    if (filterStartDate) {
      const start = new Date(filterStartDate);
      start.setHours(0, 0, 0, 0);
      matchesDate = matchesDate && txDate >= start;
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate);
      end.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && txDate <= end;
    }

    const matchesSearch = 
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (tx.category_name && tx.category_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.note && tx.note.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesWallet && matchesCategory && matchesType && matchesPartner && matchesDate && matchesSearch;
  });

  // Calculate Pagination slices
  const totalItems = filteredTransactions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Group Paginated Transactions by Date string
  const groupedTransactions: { [key: string]: Transaction[] } = {};
  paginatedTransactions.forEach((tx) => {
    const groupKey = tx.dateStr || "Unknown Date";
    if (!groupedTransactions[groupKey]) {
      groupedTransactions[groupKey] = [];
    }
    groupedTransactions[groupKey].push(tx);
  });

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
      default: return Tag;
    }
  };

  const getTxIconComponent = (tx: Transaction) => {
    if (tx.type === "TRANSFER") return ArrowRight;
    if (tx.type === "DEBT_LENT" || tx.type === "DEBT_BORROWED") return TrendingUp;
    if (tx.type === "DEBT_REPAYMENT") return UserCheck;
    
    const cat = categories.find(c => c.id === tx.category_id);
    return getCategoryIconComponent(cat?.icon);
  };

  // Convert categories list to select choices
  const categoryFilterOptions = [
    { value: "All", label: "All Categories" },
    ...categories.map((c) => ({
      value: c.id,
      label: c.name,
      icon: getCategoryIconComponent(c.icon)
    }))
  ];

  const walletFilterOptions = [
    { value: "All", label: "All Wallets", icon: WalletIcon },
    ...wallets.map((w) => ({
      value: w.id,
      label: `${w.name} ${w.is_hidden ? "[Hidden]" : ""}`,
      icon: w.is_credit_card ? CreditCard : w.is_hidden ? EyeOff : WalletIcon
    }))
  ];

  const typeFilterOptions = [
    { value: "All", label: "All Types" },
    { value: "EXPENSE", label: "Expense" },
    { value: "INCOME", label: "Income" },
    { value: "TRANSFER", label: "Transfer" },
    { value: "DEBT_LENT", label: "Lent" },
    { value: "DEBT_BORROWED", label: "Borrowed" },
    { value: "DEBT_REPAYMENT", label: "Repayment" }
  ];

  const partnerFilterOptions = [
    { value: "All", label: "All Partners" },
    ...debtPartners.map((dp) => ({
      value: dp.id,
      label: dp.name
    }))
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground relative">
      
      {/* 1. TAB CONTROLLER */}
      <div className="pt-3 shrink-0">
        <div className="flex p-1 bg-card border border-border rounded-2xl max-w-sm mx-auto shadow-sm">
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === "history" 
                ? "bg-accent text-foreground shadow-sm border border-border" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="h-4 w-4" />
            History
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === "ai" 
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            AI Assistant
          </button>
        </div>
      </div>

      {/* 2. TAB CONTENT PANES */}
      <div className="flex-1 overflow-y-auto min-h-0 py-5">
        {loading && transactions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-xs text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-500 mb-2" />
            <span>Loading transactions database...</span>
          </div>
        ) : (
          <>
            {/* --- TAB 1: HISTORY --- */}
            {activeTab === "history" && (
              <div className="space-y-4 max-w-2xl mx-auto px-2">
                
                {/* Search Input, Filter Toggle & Manual Add Button */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full bg-card border border-border rounded-xl py-2.5 pl-10 pr-4 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-emerald-500/40"
                    />
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-2.5 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                      showFilters 
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" 
                        : "bg-card border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </button>
                  <button
                    onClick={openCreateForm}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/10 transition-all cursor-pointer shrink-0"
                  >
                    <Plus className="h-4 w-4 stroke-[2.5]" />
                    <span className="hidden sm:inline">Add</span>
                  </button>
                </div>

                {/* Expandable Advanced Filter Grid */}
                {showFilters && (
                  <div className="p-4 rounded-2xl bg-card border border-border grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fade-in text-foreground">
                    <div>
                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Wallet Account</label>
                      <Select
                        value={filterWalletId}
                        onValueChange={(val) => {
                          setFilterWalletId(val);
                          setCurrentPage(1);
                        }}
                        options={walletFilterOptions}
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Category</label>
                        <Link 
                          href="/categories"
                          className="text-[8px] text-emerald-500 hover:underline font-bold"
                        >
                          Manage
                        </Link>
                      </div>
                      <Select
                        value={filterCategoryId}
                        onValueChange={(val) => {
                          setFilterCategoryId(val);
                          setCurrentPage(1);
                        }}
                        options={categoryFilterOptions}
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Transaction Type</label>
                      <Select
                        value={filterType}
                        onValueChange={(val) => {
                          setFilterType(val);
                          setCurrentPage(1);
                          if (val !== "DEBT_LENT" && val !== "DEBT_BORROWED" && val !== "DEBT_REPAYMENT") {
                            setFilterPartnerId("All");
                          }
                        }}
                        options={typeFilterOptions}
                      />
                    </div>

                    {(filterType === "DEBT_LENT" || filterType === "DEBT_BORROWED" || filterType === "DEBT_REPAYMENT") && (
                      <div>
                        <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Debt Partner</label>
                        <Select
                          value={filterPartnerId}
                          onValueChange={(val) => {
                            setFilterPartnerId(val);
                            setCurrentPage(1);
                          }}
                          options={partnerFilterOptions}
                        />
                      </div>
                    )}

                    <div className="sm:col-span-2 grid grid-cols-2 gap-2 pt-1.5 border-t border-dashed border-border">
                      <div>
                        <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Start Date</label>
                        <input
                          type="date"
                          value={filterStartDate}
                          onChange={(e) => {
                            setFilterStartDate(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:border-emerald-500/40"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">End Date</label>
                        <input
                          type="date"
                          value={filterEndDate}
                          onChange={(e) => {
                            setFilterEndDate(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:border-emerald-500/40"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* List grouped by date */}
                {Object.keys(groupedTransactions).length > 0 ? (
                  <div className="space-y-5">
                    {Object.keys(groupedTransactions).map((date) => (
                      <div key={date} className="space-y-2">
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">{date}</h4>
                        <div className="space-y-2">
                          {groupedTransactions[date].map((tx) => {
                            const Icon = getTxIconComponent(tx);
                            const isExpense = tx.type === "EXPENSE" || tx.type === "DEBT_LENT" || tx.type === "TRANSFER";
                            const amtVal = Number(tx.amount);

                            return (
                              <div 
                                key={tx.id}
                                onClick={() => openEditForm(tx)}
                                className="flex items-center justify-between p-3.5 rounded-2xl bg-card border border-border hover:border-muted-foreground/35 hover:shadow-sm hover:scale-[1.005] active:scale-[0.995] transition-all cursor-pointer text-foreground"
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`p-2.5 rounded-xl ${
                                    isExpense 
                                      ? "bg-rose-500/10 text-rose-550" 
                                      : "bg-emerald-500/10 text-emerald-500"
                                  }`}>
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <h5 className="text-xs font-semibold">{tx.description}</h5>
                                    <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-muted-foreground">
                                      <span>{new Date(tx.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                                      <span>•</span>
                                      <span>{tx.wallet_name}</span>
                                      {tx.to_wallet_name && (
                                        <>
                                          <ArrowRight className="h-2 w-2 mx-0.5 inline" />
                                          <span>{tx.to_wallet_name}</span>
                                        </>
                                      )}
                                    </div>
                                    
                                    {tx.note && (
                                      <p className="text-[9px] text-muted-foreground/80 italic mt-1 font-medium bg-accent/40 px-1.5 py-0.5 rounded inline-block">
                                        Note: "{tx.note}"
                                      </p>
                                    )}

                                    {tx.due_date && tx.status !== "COMPLETED" && (
                                      <p className="text-[9px] text-yellow-600 dark:text-yellow-400 font-bold bg-yellow-500/10 px-1.5 py-0.5 rounded inline-block mt-1">
                                        Due: {new Date(tx.due_date).toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className={`text-xs font-bold font-heading ${
                                    isExpense ? "text-rose-500" : "text-emerald-500"
                                  }`}>
                                    {isExpense ? "-" : "+"}{formatCurrency(amtVal)}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground block mt-0.5">{tx.category_name}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between border-t border-border pt-4 text-xs">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-50 cursor-pointer"
                        >
                          <ChevronLeft className="h-4 w-4" /> Previous
                        </button>
                        <span className="text-muted-foreground font-medium">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-50 cursor-pointer"
                        >
                          Next <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-12 text-center bg-card border border-border border-dashed rounded-2xl">
                    <p className="text-xs text-muted-foreground">No matching transactions found.</p>
                  </div>
                )}
              </div>
            )}



            {/* --- TAB 2: AI ASSISTANT --- */}
            {activeTab === "ai" && (
              <div className="flex flex-col h-full space-y-4 max-w-2xl mx-auto px-2 relative min-h-[450px]">
                
                {/* Header Actions */}
                <div className="flex justify-between items-center bg-card/45 border border-border p-3 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">AI Assistant Console</span>
                  </div>
                  <button 
                    onClick={() => setHistoryOpen(true)}
                    className="text-[10px] text-emerald-500 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    🕒 Review past chats
                  </button>
                </div>

                {/* Messages display */}
                <div className="flex-1 space-y-4 min-h-[300px]">
                  {messages.map((msg) => {
                    const isAI = msg.sender === "ai";
                    return (
                      <div 
                        key={msg.id} 
                        className={`flex flex-col ${isAI ? "items-start" : "items-end"} space-y-1`}
                      >
                        <span className="text-[8px] text-muted-foreground font-medium px-2">{msg.time}</span>
                        <div 
                          className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                            isAI 
                              ? "bg-card border border-border text-foreground rounded-tl-sm" 
                              : "bg-emerald-500 text-slate-950 font-semibold rounded-tr-sm shadow-sm"
                          }`}
                        >
                          {isAI ? renderMessageText(msg.text) : msg.text}
                        </div>

                        {/* CONFIRMATION CARD */}
                        {isAI && msg.confirmationCard && msg.confirmationCard.status === "pending" && (
                          <div className="w-[85%] mt-2 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-emerald-500/40 p-4 shadow-md space-y-4 text-white">
                            <div className="flex items-center justify-between border-b border-border/20 pb-2">
                              <span className="text-[10px] font-bold text-emerald-450 uppercase tracking-wider flex items-center gap-1">
                                <Sparkle className="h-3 w-3 text-emerald-500 animate-spin" /> Confirm AI Extraction
                              </span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                msg.confirmationCard.type === "EXPENSE" || msg.confirmationCard.type === "DEBT_LENT"
                                  ? "bg-rose-500/20 text-rose-450" 
                                  : msg.confirmationCard.type === "TRANSFER"
                                  ? "bg-blue-500/20 text-blue-400"
                                  : "bg-emerald-500/20 text-emerald-450"
                              }`}>
                                {msg.confirmationCard.type === "EXPENSE" && "Expense"}
                                {msg.confirmationCard.type === "INCOME" && "Income"}
                                {msg.confirmationCard.type === "TRANSFER" && "Transfer"}
                                {msg.confirmationCard.type === "DEBT_LENT" && "Lent (Loan)"}
                                {msg.confirmationCard.type === "DEBT_BORROWED" && "Borrowed (Debt)"}
                                {msg.confirmationCard.type === "DEBT_REPAYMENT" && "Repayment"}
                              </span>
                            </div>

                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between">
                                <span className="text-slate-400">Description:</span>
                                <span className="font-semibold">{msg.confirmationCard.description}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Amount:</span>
                                <span className="font-bold text-emerald-400 font-heading">{formatCurrency(msg.confirmationCard.amount)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">{msg.confirmationCard.type === "TRANSFER" ? "From Wallet:" : "Wallet:"}</span>
                                <span className="font-medium text-emerald-400">{msg.confirmationCard.wallet}</span>
                              </div>
                              {msg.confirmationCard.type === "TRANSFER" && msg.confirmationCard.to_wallet && (
                                <div className="flex justify-between">
                                  <span className="text-slate-400">To Wallet:</span>
                                  <span className="font-medium text-blue-400 flex items-center gap-1">
                                    <ArrowLeftRight className="h-3 w-3" />
                                    {msg.confirmationCard.to_wallet}
                                  </span>
                                </div>
                              )}
                              {msg.confirmationCard.partner && (
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Partner:</span>
                                  <span className="font-semibold text-amber-500">{msg.confirmationCard.partner}</span>
                                </div>
                              )}
                              {msg.confirmationCard.category && (
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Category:</span>
                                  <span className="font-medium">{msg.confirmationCard.category}</span>
                                </div>
                              )}
                              {msg.confirmationCard.due_date && (
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Due Date:</span>
                                  <span className="font-semibold text-yellow-500">{new Date(msg.confirmationCard.due_date).toLocaleDateString()}</span>
                                </div>
                              )}
                              {msg.confirmationCard.note && (
                                <div className="flex justify-between border-t border-dashed border-border/20 pt-1.5 mt-1.5">
                                  <span className="text-slate-400">Note:</span>
                                  <span className="font-medium italic text-slate-300">"{msg.confirmationCard.note}"</span>
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/20">
                              <button
                                onClick={() => handleConfirmCard(msg.id, "cancel")}
                                className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-card border border-border/20 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-[11px] font-semibold"
                              >
                                <X className="h-3.5 w-3.5" /> Cancel
                              </button>
                              <button
                                onClick={() => handleConfirmCard(msg.id, "save")}
                                className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition-all cursor-pointer text-[11px]"
                              >
                                <Check className="h-3.5 w-3.5" /> Save
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* AI Typing Indicator */}
                  {isTyping && (
                    <div className="flex flex-col items-start space-y-1">
                      <span className="text-[8px] text-muted-foreground font-medium px-2">Analyzing...</span>
                      <div className="bg-card border border-border py-2.5 px-4 rounded-2xl rounded-tl-sm text-xs flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  )}

                  <div ref={chatBottomRef} />
                </div>

                {/* Chat Input Box */}
                <div className="border-t border-border pt-3 flex gap-2 items-center bg-background sticky bottom-0 z-20">
                  <input
                    type="text"
                    placeholder="Type a transaction... (e.g. coffee 55k momo for client meeting)"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    className="flex-1 bg-card border border-border rounded-2xl py-3 px-4 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-emerald-500/40"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="h-10 w-10 shrink-0 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 flex items-center justify-center transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                  >
                    <Send className="h-4 w-4 stroke-[2.5]" />
                  </button>
                </div>

              </div>
            )}
          </>
        )}
      </div>

      {/* --- 3. INTERACTIVE TRANSACTION MODAL FORM (CREATE / EDIT) --- */}
      {isFormOpen && (
        <Portal>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <form 
              onSubmit={handleSaveForm}
              className="w-full max-w-md bg-card border border-border rounded-3xl p-6 space-y-4 shadow-xl animate-scale-up text-foreground font-sans"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-sm font-bold font-heading">
                  {editingTx ? "Edit Transaction" : "Add Transaction"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="h-8 w-8 rounded-full bg-accent border border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Amount & Type Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Type Select */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Type</label>
                  <Select
                    value={formType}
                    onValueChange={(val) => {
                      setValue("type", val);
                      if (val === "DEBT_LENT" || val === "DEBT_BORROWED" || val === "DEBT_REPAYMENT") {
                        setValue("categoryId", "");
                      } else {
                        setValue("partnerId", "");
                        setValue("newPartnerName", "");
                        setValue("dueDate", "");
                      }
                      trigger();
                    }}
                    options={[
                      { value: "EXPENSE", label: "Expense" },
                      { value: "INCOME", label: "Income" },
                      { value: "TRANSFER", label: "Transfer" },
                      { value: "DEBT_LENT", label: "Lent" },
                      { value: "DEBT_BORROWED", label: "Borrowed" },
                      { value: "DEBT_REPAYMENT", label: "Repayment" }
                    ]}
                  />
                </div>

                {/* Amount Input */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Amount (VND)</label>
                  <MoneyInput
                    value={formAmount}
                    onChange={(raw) => {
                      setValue("amount", raw);
                      trigger("amount");
                    }}
                    placeholder="e.g. 1.000.000"
                  />
                  {formErrors.amount && <span className="text-[10px] text-rose-500 block mt-0.5 leading-normal">{formErrors.amount.message}</span>}
                </div>
              </div>

              {/* Description Input */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Description / Title</label>
                <input
                  type="text"
                  {...register("description")}
                  placeholder="e.g. Starbucks, Salary, Lent to Huy"
                  className="w-full bg-background border border-border rounded-xl py-2 px-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-emerald-500/40 font-semibold"
                />
                {formErrors.description && <span className="text-[10px] text-rose-500 block mt-0.5">{formErrors.description.message}</span>}
              </div>

              {/* Wallet select (From Wallet if TRANSFER) */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                  {formType === "TRANSFER" ? "From Wallet" : "Account/Wallet"}
                </label>
                <Select
                  value={formWalletId}
                  onValueChange={(val) => {
                    setValue("walletId", val);
                    trigger("walletId");
                  }}
                  options={wallets.filter(w => !w.is_hidden).map(w => ({
                    value: w.id,
                    label: w.is_balance_masked ? `${w.name} (•••••• VND)` : `${w.name} (${w.balance.toLocaleString()} VND)`
                  }))}
                />
                {formErrors.walletId && <span className="text-[10px] text-rose-500 block mt-0.5">{formErrors.walletId.message}</span>}
              </div>

              {/* Destination Wallet select (Only for TRANSFER) */}
              {formType === "TRANSFER" && (
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">To Wallet</label>
                  <Select
                    value={formToWalletId}
                    onValueChange={(val) => {
                      setValue("toWalletId", val);
                      trigger("toWalletId");
                    }}
                    options={wallets.filter(w => !w.is_hidden).map(w => ({
                      value: w.id,
                      label: w.is_balance_masked ? `${w.name} (•••••• VND)` : `${w.name} (${w.balance.toLocaleString()} VND)`
                    }))}
                  />
                  {formErrors.toWalletId && <span className="text-[10px] text-rose-500 block mt-0.5">{formErrors.toWalletId.message}</span>}
                </div>
              )}

              {/* Category selector for expense/income */}
              {(formType === "EXPENSE" || formType === "INCOME") && (
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Category</label>
                  <Select
                    value={formCategoryId}
                    onValueChange={(val) => {
                      setValue("categoryId", val);
                      trigger("categoryId");
                    }}
                    options={categories.map(c => ({
                      value: c.id,
                      label: c.name,
                      icon: getCategoryIconComponent(c.icon)
                    }))}
                  />
                  {formErrors.categoryId && <span className="text-[10px] text-rose-500 block mt-0.5">{formErrors.categoryId.message}</span>}
                </div>
              )}

              {/* Partner selection for loans/debts */}
              {(isDebt || isRepayment) && (
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Debt Partner</label>
                  <div className="relative">
                    <select
                      value={formPartnerId}
                      onChange={(e) => {
                        setValue("partnerId", e.target.value);
                        if (e.target.value !== "NEW") {
                          setValue("newPartnerName", "");
                        }
                        trigger("partnerId");
                      }}
                      className="w-full bg-background border border-border rounded-xl p-2 pr-8 text-xs text-foreground appearance-none focus:outline-none focus:border-emerald-500/40 font-semibold"
                    >
                      <option value="" disabled>Select Partner</option>
                      {debtPartners.map((dp) => (
                        <option key={dp.id} value={dp.id}>{dp.name}</option>
                      ))}
                      <option value="NEW" className="text-emerald-500 font-bold">+ Add New Partner...</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                  {formErrors.partnerId && <span className="text-[10px] text-rose-500 block mt-0.5">{formErrors.partnerId.message}</span>}
                </div>
              )}

              {/* Add New Partner input */}
              {(isDebt || isRepayment) && formPartnerId === "NEW" && (
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">New Partner Name</label>
                  <input
                    type="text"
                    {...register("newPartnerName")}
                    placeholder="e.g. Anh Huy"
                    className="w-full bg-background border border-border rounded-xl py-2 px-3 text-xs text-foreground focus:outline-none focus:border-emerald-500/40 font-semibold"
                  />
                  {formErrors.newPartnerName && <span className="text-[10px] text-rose-500 block mt-0.5">{formErrors.newPartnerName.message}</span>}
                </div>
              )}

              {/* Due Date picker for debts */}
              {isDebt && (
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Due Date (Optional)</label>
                  <input
                    type="date"
                    {...register("dueDate")}
                    className="w-full bg-background border border-border rounded-xl p-2 px-3 text-xs text-foreground focus:outline-none focus:border-emerald-500/40 font-semibold"
                  />
                </div>
              )}

              {/* Note Input */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Note / Ghi chú (Optional)</label>
                <textarea
                  {...register("note")}
                  placeholder="Additional memo..."
                  className="w-full bg-background border border-border rounded-xl py-2 px-3 text-xs text-foreground focus:outline-none focus:border-emerald-500/40 font-semibold h-16 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3 border-t border-border">
                {editingTx && (
                  <button
                    type="button"
                    onClick={() => handleDeleteTx(editingTx.id)}
                    className="px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-500 transition-colors cursor-pointer text-xs flex items-center justify-center"
                    title="Delete Transaction"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-accent border border-border text-muted-foreground hover:text-foreground font-semibold transition-colors cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold transition-all disabled:opacity-50 cursor-pointer text-xs flex items-center justify-center"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </button>
              </div>
            </form>
          </div>
        </Portal>
      )}

      {/* --- 4. NEW PARTNER CONFIRMATION DIALOG MODAL --- */}
      {partnerConfirmData && (
        <Portal>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 space-y-4 shadow-xl animate-scale-up text-foreground font-sans">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-sm font-bold font-heading text-amber-500 flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4" /> Create Contact?
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    partnerConfirmData.onCancel();
                    setPartnerConfirmData(null);
                  }}
                  className="h-8 w-8 rounded-full bg-accent border border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground">
                Do you want to create a new debt contact for <strong className="text-foreground">"{partnerConfirmData.partnerName}"</strong>?
              </p>

              <div className="flex gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    partnerConfirmData.onCancel();
                    setPartnerConfirmData(null);
                  }}
                  className="flex-1 py-2 rounded-xl bg-accent border border-border text-muted-foreground hover:text-foreground font-semibold transition-colors cursor-pointer text-xs text-center"
                >
                  No, Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const { data: existing, error: checkErr } = await supabase
                        .from("debt_partners")
                        .select("id")
                        .eq("user_id", user?.id)
                        .ilike("name", partnerConfirmData.partnerName.trim());

                      if (checkErr) throw checkErr;
                      if (existing && existing.length > 0) {
                        customToast.error("A contact with this name already exists.");
                        setPartnerConfirmData(null);
                        return;
                      }

                      const { data: newPartner, error: partnerErr } = await supabase
                        .from("debt_partners")
                        .insert({ user_id: user?.id, name: partnerConfirmData.partnerName.trim() })
                        .select()
                        .single();

                      if (partnerErr) throw partnerErr;
                      
                      setDebtPartners(prev => [...prev, { id: newPartner.id, name: newPartner.name }]);
                      
                      const onConfirmCb = partnerConfirmData.onConfirm;
                      setPartnerConfirmData(null);
                      await onConfirmCb(newPartner.id);
                    } catch (err: any) {
                      console.error("Error creating partner in confirmation modal:", err);
                      customToast.error("Failed to create partner: " + err.message);
                    }
                  }}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-400 hover:to-teal-500 font-bold transition-all cursor-pointer text-xs text-center"
                >
                  Yes, Create
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* --- 5. PAST CHATS HISTORY DIALOG MODAL --- */}
      {historyOpen && (
        <Portal>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-2xl bg-card border border-border rounded-3xl p-6 max-h-[85%] overflow-y-auto space-y-4 shadow-xl animate-scale-up text-foreground font-sans">
              
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-sm font-bold font-heading">AI Chat logs history</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setHistoryOpen(false);
                    setHistoryMessages([]);
                  }}
                  className="h-8 w-8 rounded-full bg-accent border border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Granular Date Filters */}
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end justify-between p-4 rounded-2xl bg-background border border-border">
                <div className="space-y-1 min-w-[120px]">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Filter Mode</label>
                  <Select
                    value={historyFilterMode}
                    onValueChange={(val) => setHistoryFilterMode(val as any)}
                    options={[
                      { value: "day", label: "Day" },
                      { value: "week", label: "Week" },
                      { value: "month", label: "Month" },
                      { value: "year", label: "Year" },
                      { value: "all", label: "All Logs" }
                    ]}
                  />
                </div>

                {historyFilterMode === "day" && (
                  <div className="flex-1 space-y-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Select Day</label>
                    <input
                      type="date"
                      value={selectedHistoryDay}
                      onChange={(e) => setSelectedHistoryDay(e.target.value)}
                      className="w-full bg-card border border-border rounded-xl p-2 px-3 text-xs text-foreground focus:outline-none focus:border-emerald-500/40 font-semibold h-[38px]"
                    />
                  </div>
                )}

                {historyFilterMode === "week" && (
                  <div className="flex-1 space-y-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Select Week</label>
                    <input
                      type="week"
                      value={selectedHistoryWeek}
                      onChange={(e) => setSelectedHistoryWeek(e.target.value)}
                      className="w-full bg-card border border-border rounded-xl p-2 px-3 text-xs text-foreground focus:outline-none focus:border-emerald-500/40 font-semibold h-[38px]"
                    />
                  </div>
                )}

                {historyFilterMode === "month" && (
                  <div className="flex-1 space-y-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Select Month</label>
                    <input
                      type="month"
                      value={selectedHistoryMonth}
                      onChange={(e) => setSelectedHistoryMonth(e.target.value)}
                      className="w-full bg-card border border-border rounded-xl p-2 px-3 text-xs text-foreground focus:outline-none focus:border-emerald-500/40 font-semibold h-[38px]"
                    />
                  </div>
                )}

                {historyFilterMode === "year" && (
                  <div className="flex-1 space-y-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Select Year</label>
                    <input
                      type="number"
                      min="2000"
                      max="2099"
                      value={selectedHistoryYear}
                      onChange={(e) => setSelectedHistoryYear(Number(e.target.value))}
                      className="w-full bg-card border border-border rounded-xl p-2 px-3 text-xs text-foreground focus:outline-none focus:border-emerald-500/40 font-semibold h-[38px]"
                    />
                  </div>
                )}

                {historyFilterMode === "all" && (
                  <div className="flex-1 text-center py-2 text-xs text-muted-foreground font-semibold">
                    Displaying all chats logs history (no date boundary filter)
                  </div>
                )}
              </div>

              {/* Message log items */}
              <div className="space-y-4 bg-background border border-border p-4 rounded-2xl min-h-[250px] max-h-96 overflow-y-auto">
                {historyLoading ? (
                  <div className="flex flex-col items-center justify-center h-48 text-xs text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-500 mb-2" />
                    <span>Fetching chat history...</span>
                  </div>
                ) : historyMessages.length > 0 ? (
                  historyMessages.map((msg) => {
                    const isAI = msg.sender === "ai";
                    return (
                      <div 
                        key={msg.id} 
                        className={`flex flex-col ${isAI ? "items-start" : "items-end"} space-y-1`}
                      >
                        <span className="text-[8px] text-muted-foreground font-semibold px-1">{msg.time}</span>
                        <div 
                          className={`max-w-[85%] p-3 rounded-xl text-xs ${
                            isAI 
                              ? "bg-card border border-border text-foreground rounded-tl-none" 
                              : "bg-emerald-500 text-slate-950 font-semibold rounded-tr-none"
                          }`}
                        >
                          {isAI ? renderMessageText(msg.text) : msg.text}
                        </div>

                        {/* Confirmation Card (Read-only status in history) */}
                        {isAI && msg.confirmationCard && (
                          <div className="w-[85%] mt-1 rounded-xl bg-gradient-to-b from-slate-900 to-slate-950 border border-border p-3 space-y-2 text-white text-[11px]">
                            <div className="flex justify-between border-b border-border/10 pb-1">
                              <span className="font-bold text-emerald-450 uppercase text-[9px]">{msg.confirmationCard.type}</span>
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                                msg.confirmationCard.status === "saved" 
                                  ? "bg-emerald-500/20 text-emerald-400" 
                                  : msg.confirmationCard.status === "cancelled"
                                  ? "bg-rose-500/20 text-rose-450"
                                  : "bg-yellow-500/20 text-yellow-450"
                              }`}>
                                {msg.confirmationCard.status.toUpperCase()}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                              <span>Description: {msg.confirmationCard.description}</span>
                              <span>Amount: {formatCurrency(msg.confirmationCard.amount)}</span>
                              <span>{msg.confirmationCard.type === "TRANSFER" ? "From:" : "Wallet:"} {msg.confirmationCard.wallet}</span>
                              {msg.confirmationCard.type === "TRANSFER" && msg.confirmationCard.to_wallet && (
                                <span className="text-blue-400">To: {msg.confirmationCard.to_wallet}</span>
                              )}
                              {msg.confirmationCard.category && <span>Category: {msg.confirmationCard.category}</span>}
                              {msg.confirmationCard.partner && <span>Partner: {msg.confirmationCard.partner}</span>}
                              {msg.confirmationCard.due_date && <span>Due: {new Date(msg.confirmationCard.due_date).toLocaleDateString()}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center justify-center h-48 text-xs text-muted-foreground">
                    No chat conversations found in this period.
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border flex justify-end">
                <button
                  onClick={() => {
                    setHistoryOpen(false);
                    setHistoryMessages([]);
                  }}
                  className="px-4 py-2 rounded-xl bg-accent text-xs font-semibold cursor-pointer"
                >
                  Close History
                </button>
              </div>

            </div>
          </div>
        </Portal>
      )}

    </div>
  );
}
