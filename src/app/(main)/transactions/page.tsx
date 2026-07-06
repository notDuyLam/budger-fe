"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
import { toast } from "sonner";

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

  // --- MANUAL TRANSACTION FORM STATES ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formType, setFormType] = useState("EXPENSE");
  const [formWalletId, setFormWalletId] = useState("");
  const [formToWalletId, setFormToWalletId] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formPartnerId, setFormPartnerId] = useState("");
  const [formNewPartnerName, setFormNewPartnerName] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [submitting, setSubmitting] = useState(false);
  const [partnerConfirmData, setPartnerConfirmData] = useState<{
    partnerName: string;
    onConfirm: (createdPartnerId: string) => Promise<void>;
    onCancel: () => void;
  } | null>(null);

  // --- CATEGORY MANAGEMENT STATES ---
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [newCategoryIcon, setNewCategoryIcon] = useState("HelpCircle");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [suggestingIcon, setSuggestingIcon] = useState(false);

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
  const [historyPeriod, setHistoryPeriod] = useState<"today" | "week" | "month" | "older">("today");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showOlderBtn, setShowOlderBtn] = useState(true);

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
        setFormWalletId(visibleWallets[0].id);
        const secondWallet = visibleWallets[1] || visibleWallets[0];
        setFormToWalletId(secondWallet.id);
      }

      // 2. Fetch Categories
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });
      setCategories(categoriesData || []);
      if (categoriesData && categoriesData.length > 0) {
        setFormCategoryId(categoriesData[0].id);
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
    setFormDescription("");
    setFormAmount("");
    setFormType("EXPENSE");
    
    const visibleWallets = wallets.filter(w => !w.is_hidden);
    if (visibleWallets.length > 0) {
      setFormWalletId(visibleWallets[0].id);
      setFormToWalletId(visibleWallets[1]?.id || visibleWallets[0].id);
    }
    
    // Default to first expense category
    const expenseCat = categories.find(c => c.type === "EXPENSE");
    if (expenseCat) setFormCategoryId(expenseCat.id);
    else if (categories.length > 0) setFormCategoryId(categories[0].id);

    setFormNote("");
    setFormPartnerId(debtPartners[0]?.id || "");
    setFormNewPartnerName("");
    setFormDueDate("");
    setErrors({});
    setIsFormOpen(true);
  };

  const openEditForm = (tx: Transaction) => {
    setEditingTx(tx);
    setFormDescription(tx.description);
    setFormAmount(Math.abs(tx.amount).toString());
    setFormType(tx.type);
    setFormWalletId(tx.wallet_id);
    setFormToWalletId(tx.to_wallet_id || "");
    setFormCategoryId(tx.category_id || "");
    setFormNote(tx.note || "");
    setFormDueDate(tx.due_date ? tx.due_date.split("T")[0] : "");
    
    const existingPartnerId = tx.debt_partner_id || "";
    setFormPartnerId(existingPartnerId);
    setFormNewPartnerName("");
    setErrors({});
    setIsFormOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // --- Zod Validation Schema ---
    const isDebt = formType === "DEBT_LENT" || formType === "DEBT_BORROWED";
    const isRepayment = formType === "DEBT_REPAYMENT";
    const isTransfer = formType === "TRANSFER";

    const transactionSchema = z.object({
      description: z.string().min(1, "Description is required").max(100, "Description must be under 100 characters"),
      amount: z.coerce.number().positive("Amount must be greater than 0"),
      walletId: z.string().min(1, "Source Wallet is required"),
      toWalletId: isTransfer ? z.string().min(1, "Destination Wallet is required").refine((val) => val !== formWalletId, "Source and destination wallets must be different") : z.string().optional(),
      categoryId: (!isDebt && !isRepayment && !isTransfer) ? z.string().min(1, "Category is required") : z.string().optional(),
      partnerId: (isDebt || isRepayment) ? z.string().min(1, "Debt Partner is required") : z.string().optional(),
      newPartnerName: (isDebt || isRepayment) && formPartnerId === "NEW" ? z.string().min(1, "Partner name is required") : z.string().optional(),
      dueDate: isDebt ? z.string().optional() : z.string().optional()
    });

    const check = transactionSchema.safeParse({
      description: formDescription.trim(),
      amount: formAmount,
      walletId: formWalletId,
      toWalletId: formToWalletId,
      categoryId: formCategoryId,
      partnerId: formPartnerId,
      newPartnerName: formNewPartnerName.trim(),
      dueDate: formDueDate
    });

    if (!check.success) {
      const errMap: Record<string, string> = {};
      check.error.issues.forEach((issue) => {
        if (issue.path[0]) errMap[issue.path[0] as string] = issue.message;
      });
      setErrors(errMap);
      return;
    }
    setErrors({});

    const amt = parseFloat(formAmount);

    // --- Standard Wallet Negative Balance Prevention ---
    const wallet = wallets.find(w => w.id === formWalletId);
    if (wallet && !wallet.is_credit_card) {
      let isRepaymentLent = false;
      if (isRepayment && formPartnerId) {
        const pendingDebt = transactions.find(t => 
          t.debt_partner_id === formPartnerId && 
          t.status === "PENDING" && 
          (t.type === "DEBT_LENT" || t.type === "DEBT_BORROWED")
        );
        isRepaymentLent = pendingDebt ? pendingDebt.type === "DEBT_LENT" : false;
      }
      
      let delta = 0;
      if (formType === "EXPENSE" || formType === "DEBT_LENT" || formType === "TRANSFER") {
        delta = -amt;
      } else if (formType === "INCOME" || formType === "DEBT_BORROWED") {
        delta = amt;
      } else if (formType === "DEBT_REPAYMENT") {
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
        setErrors({ amount: `Transaction blocked! Standard wallet balance cannot drop below 0. Potential balance: ${(wallet.balance - oldDelta + delta).toLocaleString()} VND.` });
        return;
      }
    }

    setSubmitting(true);
    
    const saveTransactionData = async (partnerId: string | null) => {
      try {
        const status = isDebt ? "PENDING" : "COMPLETED";
        const txData = {
          description: formDescription.trim(),
          amount: amt,
          type: formType,
          wallet_id: formWalletId,
          to_wallet_id: isTransfer ? formToWalletId : null,
          category_id: (!isDebt && !isRepayment && !isTransfer) ? (formCategoryId || null) : null,
          debt_partner_id: partnerId || null,
          note: formNote.trim() || null,
          due_date: (isDebt && formDueDate) ? new Date(formDueDate).toISOString() : null,
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
        alert("Failed to save transaction: " + err.message);
      } finally {
        setSubmitting(false);
      }
    };

    if ((isDebt || isRepayment) && formPartnerId === "NEW") {
      const matched = debtPartners.find(p => p.name.toLowerCase() === formNewPartnerName.trim().toLowerCase());
      if (matched) {
        saveTransactionData(matched.id);
      } else {
        setPartnerConfirmData({
          partnerName: formNewPartnerName.trim(),
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
        await saveTransactionData(formPartnerId || null);
      } catch (err) {
        setSubmitting(false);
      }
    }
  };

  const handleDeleteTx = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setIsFormOpen(false);
      fetchTransactions();
    } catch (err) {
      console.error("Error deleting transaction:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // --- CATEGORY CRUD HANDLERS WITH ZOD & ICON ---
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim() || !user) return;

    const catSchema = z.string().min(1, "Name is required").max(30, "Name must be under 30 characters");
    const check = catSchema.safeParse(newCategoryName.trim());
    if (!check.success) {
      alert(check.error.issues[0].message);
      return;
    }

    try {
      const { error } = await supabase
        .from("categories")
        .insert({
          user_id: user.id,
          name: newCategoryName.trim(),
          type: newCategoryType,
          icon: newCategoryIcon
        });

      if (error) throw error;

      setNewCategoryName("");
      setNewCategoryIcon("HelpCircle");
      // Refetch
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });
      setCategories(categoriesData || []);
    } catch (err) {
      console.error("Error adding category:", err);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !newCategoryName.trim()) return;

    try {
      const { error } = await supabase
        .from("categories")
        .update({
          name: newCategoryName.trim(),
          type: newCategoryType,
          icon: newCategoryIcon
        })
        .eq("id", editingCategory.id);

      if (error) throw error;

      setEditingCategory(null);
      setNewCategoryName("");
      setNewCategoryIcon("HelpCircle");
      // Refetch
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });
      setCategories(categoriesData || []);
    } catch (err) {
      console.error("Error updating category:", err);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm("Deleting this category will set associated transactions' categories to Null. Continue?")) return;

    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);

      if (error) throw error;

      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });
      setCategories(categoriesData || []);
    } catch (err) {
      console.error("Error deleting category:", err);
    }
  };

  // AI suggest category icon based on name
  const suggestCategoryIcon = async () => {
    if (!newCategoryName.trim()) {
      alert("Please enter a category name first!");
      return;
    }
    setSuggestingIcon(true);
    try {
      const res = await fetch("/api/suggest-icon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryName: newCategoryName.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.icon) {
          setNewCategoryIcon(data.icon);
        }
      }
    } catch (err) {
      console.error("Error suggesting icon:", err);
    } finally {
      setSuggestingIcon(false);
    }
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
            toast.error(`Cannot save! Standard wallet "${targetWallet.name}" balance cannot drop below 0. Current: ${targetWallet.balance.toLocaleString()} VND.`);
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
              toast.error(`Cannot transfer! Source wallet "${targetWallet.name}" has insufficient balance. Current: ${targetWallet.balance.toLocaleString()} VND.`);
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

        toast.success(`Transaction "${card.description}" saved!`);
      } catch (err: any) {
        console.error("Error inside saveAICard:", err);
        toast.error("Failed to save transaction: " + (err.message || "Unknown error"));
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

  // Fetch AI Chat messages history on-demand (grouped by period)
  const fetchChatHistory = async (period?: "today" | "week" | "month" | "older") => {
    if (!user) return;
    const targetPeriod = period || "today";
    setHistoryLoading(true);
    setHistoryOpen(true);
    setHistoryPeriod(targetPeriod);
    try {
      let query = supabase.from("chat_messages").select("*").order("created_at", { ascending: true });
      
      const now = new Date();
      if (targetPeriod === "today") {
        const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
        query = query.gte("created_at", todayStart.toISOString());
      } else if (targetPeriod === "week") {
        const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 7);
        query = query.gte("created_at", weekStart.toISOString());
      } else if (targetPeriod === "month") {
        const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
        query = query.gte("created_at", monthStart.toISOString());
      }
      // "older" = no date filter, load everything

      const { data } = await query.limit(200);

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
      toast.error("Failed to load chat history.");
    } finally {
      setHistoryLoading(false);
    }
  };

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
      label: `${c.name} (${c.type === "EXPENSE" ? "Expense" : "Income"})`,
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
        <div className="flex p-1 bg-card border border-border rounded-2xl max-w-md mx-auto shadow-sm">
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === "history" 
                ? "bg-accent text-foreground shadow-sm border border-border" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="h-4 w-4" />
            Transaction History
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
                        <button 
                          onClick={() => setIsManageCategoriesOpen(true)}
                          className="text-[8px] text-emerald-500 hover:underline font-bold"
                        >
                          Manage
                        </button>
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
                        }}
                        options={typeFilterOptions}
                      />
                    </div>

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

            {/* --- TAB 2: AI CHAT --- */}
            {activeTab === "ai" && (
              <div className="flex flex-col h-full space-y-4 max-w-2xl mx-auto px-2 relative min-h-[450px]">
                
                {/* Header Actions */}
                <div className="flex justify-between items-center bg-card/45 border border-border p-3 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">AI Assistant Console</span>
                  </div>
                  <button 
                    onClick={() => fetchChatHistory("today")}
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
                      setFormType(val);
                      setErrors({});
                      if (val === "DEBT_LENT" || val === "DEBT_BORROWED" || val === "DEBT_REPAYMENT") {
                        setFormCategoryId("");
                      } else {
                        setFormPartnerId("");
                        setFormNewPartnerName("");
                        setFormDueDate("");
                      }
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
                    onChange={(raw) => setFormAmount(raw)}
                    placeholder="e.g. 1.000.000"
                    required
                  />
                  {errors.amount && <span className="text-[10px] text-rose-500 block mt-0.5 leading-normal">{errors.amount}</span>}
                </div>
              </div>

              {/* Description Input */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Description / Title</label>
                <input
                  type="text"
                  required
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. Starbucks, Salary, Lent to Huy"
                  className="w-full bg-background border border-border rounded-xl py-2 px-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-emerald-500/40 font-semibold"
                />
                {errors.description && <span className="text-[10px] text-rose-500 block mt-0.5">{errors.description}</span>}
              </div>

              {/* Wallet select (From Wallet if TRANSFER) */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                  {formType === "TRANSFER" ? "From Wallet" : "Account/Wallet"}
                </label>
                <Select
                  value={formWalletId}
                  onValueChange={(val) => setFormWalletId(val)}
                  options={wallets.filter(w => !w.is_hidden).map(w => ({
                    value: w.id,
                    label: w.is_balance_masked ? `${w.name} (•••••• VND)` : `${w.name} (${w.balance.toLocaleString()} VND)`
                  }))}
                />
                {errors.walletId && <span className="text-[10px] text-rose-500 block mt-0.5">{errors.walletId}</span>}
              </div>

              {/* Destination Wallet select (Only for TRANSFER) */}
              {formType === "TRANSFER" && (
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">To Wallet</label>
                  <Select
                    value={formToWalletId}
                    onValueChange={(val) => setFormToWalletId(val)}
                    options={wallets.filter(w => !w.is_hidden).map(w => ({
                      value: w.id,
                      label: w.is_balance_masked ? `${w.name} (•••••• VND)` : `${w.name} (${w.balance.toLocaleString()} VND)`
                    }))}
                  />
                  {errors.toWalletId && <span className="text-[10px] text-rose-500 block mt-0.5">{errors.toWalletId}</span>}
                </div>
              )}

              {/* Category selector for expense/income */}
              {(formType === "EXPENSE" || formType === "INCOME") && (
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Category</label>
                  <Select
                    value={formCategoryId}
                    onValueChange={(val) => setFormCategoryId(val)}
                    options={categories.filter(c => c.type === formType).map(c => ({
                      value: c.id,
                      label: c.name,
                      icon: getCategoryIconComponent(c.icon)
                    }))}
                  />
                  {errors.categoryId && <span className="text-[10px] text-rose-500 block mt-0.5">{errors.categoryId}</span>}
                </div>
              )}

              {/* Partner selection for loans/debts */}
              {(isDebt || isRepayment) && (
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Debt Partner</label>
                  <div className="relative">
                    <select
                      required
                      value={formPartnerId}
                      onChange={(e) => {
                        setFormPartnerId(e.target.value);
                        if (e.target.value !== "NEW") {
                          setFormNewPartnerName("");
                        }
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
                  {errors.partnerId && <span className="text-[10px] text-rose-500 block mt-0.5">{errors.partnerId}</span>}
                </div>
              )}

              {/* Add New Partner input */}
              {(isDebt || isRepayment) && formPartnerId === "NEW" && (
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">New Partner Name</label>
                  <input
                    type="text"
                    required
                    value={formNewPartnerName}
                    onChange={(e) => setFormNewPartnerName(e.target.value)}
                    placeholder="e.g. Anh Huy"
                    className="w-full bg-background border border-border rounded-xl py-2 px-3 text-xs text-foreground focus:outline-none focus:border-emerald-500/40 font-semibold"
                  />
                  {errors.newPartnerName && <span className="text-[10px] text-rose-500 block mt-0.5">{errors.newPartnerName}</span>}
                </div>
              )}

              {/* Due Date picker for debts */}
              {isDebt && (
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Due Date (Optional)</label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-2 px-3 text-xs text-foreground focus:outline-none focus:border-emerald-500/40 font-semibold"
                  />
                </div>
              )}

              {/* Note Input */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Note / Ghi chú (Optional)</label>
                <textarea
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
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

      {/* --- CATEGORY MANAGEMENT MODAL --- */}
      {isManageCategoriesOpen && (
        <Portal>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-lg bg-card border border-border rounded-3xl p-6 max-h-[85%] overflow-y-auto space-y-4 shadow-xl animate-scale-up text-foreground font-sans">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-sm font-bold font-heading">Manage Categories</h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsManageCategoriesOpen(false);
                    setEditingCategory(null);
                    setNewCategoryName("");
                    setNewCategoryIcon("HelpCircle");
                  }}
                  className="h-8 w-8 rounded-full bg-accent border border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form Category Add/Edit */}
              <form 
                onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory}
                className="p-4 bg-background border border-border rounded-2xl grid grid-cols-1 gap-3 text-foreground"
              >
                <h4 className="text-xs font-bold border-b border-border pb-1">
                  {editingCategory ? "Edit Category Details" : "Create New Category"}
                </h4>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Category Name</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g. Cosmetics, Books, Rent"
                      className="flex-1 bg-card border border-border rounded-xl py-2 px-3 text-xs text-foreground focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={suggestCategoryIcon}
                      disabled={suggestingIcon}
                      className="px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {suggestingIcon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      Suggest Icon
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Type</label>
                  <Select
                    value={newCategoryType}
                    onValueChange={(val) => setNewCategoryType(val as "INCOME" | "EXPENSE")}
                    options={[
                      { value: "EXPENSE", label: "Expense (Chi tiêu)" },
                      { value: "INCOME", label: "Income (Thu nhập)" }
                    ]}
                  />
                </div>

                {/* Icon Grid Choice */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Select Custom Icon</label>
                  <div className="grid grid-cols-6 gap-2">
                    {[
                      "Coffee", "ShoppingBag", "Home", "Car", "Activity", "BookOpen", "Gamepad2", "DollarSign", "TrendingUp", "Gift", "HelpCircle"
                    ].map((name) => {
                      const IconComp = getCategoryIconComponent(name);
                      const isSelected = newCategoryIcon === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setNewCategoryIcon(name)}
                          className={`p-2 rounded-lg border flex items-center justify-center cursor-pointer transition-colors ${
                            isSelected 
                              ? "border-emerald-500 bg-emerald-500/15 text-emerald-500" 
                              : "border-border bg-card hover:bg-accent/40 text-muted-foreground"
                          }`}
                        >
                          <IconComp className="h-4 w-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  className="py-2.5 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold text-xs cursor-pointer flex items-center justify-center mt-1"
                >
                  {editingCategory ? "Update Category" : "Create Category"}
                </button>
              </form>

              {/* List Categories */}
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {categories.map((c) => {
                  const CatIcon = getCategoryIconComponent(c.icon);
                  return (
                    <div 
                      key={c.id} 
                      className="flex items-center justify-between p-3 rounded-xl bg-background border border-border"
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-card text-muted-foreground border border-border">
                          <CatIcon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-semibold">{c.name}</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                          c.type === "EXPENSE" ? "bg-rose-500/10 text-rose-550" : "bg-emerald-500/10 text-emerald-500"
                        }`}>
                          {c.type === "EXPENSE" ? "Expense" : "Income"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingCategory(c);
                            setNewCategoryName(c.name);
                            setNewCategoryType(c.type);
                            setNewCategoryIcon(c.icon || "HelpCircle");
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(c.id)}
                          className="p-1.5 rounded-lg text-rose-550 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-border flex justify-end">
                <button
                  onClick={() => {
                    setIsManageCategoriesOpen(false);
                    setEditingCategory(null);
                    setNewCategoryName("");
                    setNewCategoryIcon("HelpCircle");
                  }}
                  className="px-4 py-2 rounded-xl bg-accent text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
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
                        alert("A contact with this name already exists.");
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
                      alert("Failed to create partner: " + err.message);
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

              {/* Period filter tabs */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: "today" as const, label: "Today" },
                  { key: "week" as const, label: "This Week" },
                  { key: "month" as const, label: "This Month" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => fetchChatHistory(item.key)}
                    className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                      historyPeriod === item.key 
                        ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-500" 
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
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

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <button
                  onClick={() => fetchChatHistory("older")}
                  className="text-[10px] text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1 cursor-pointer"
                >
                  {historyLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronDown className="h-3 w-3" />}
                  Load older messages
                </button>
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
