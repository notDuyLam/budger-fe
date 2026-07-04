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
  Edit2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/shared/AuthProvider";

interface Wallet {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
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
  dateStr?: string;
}

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  time: string;
  confirmationCard?: {
    type: string; // INCOME | EXPENSE
    amount: number;
    wallet: string; // Wallet name
    category: string; // Category name
    description: string;
    note?: string;
    status: "pending" | "saved" | "cancelled";
  };
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center p-8 text-xs text-muted-foreground">
        <span className="animate-pulse">Loading AI Assistant...</span>
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
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterWalletId, setFilterWalletId] = useState("All");
  const [filterCategoryId, setFilterCategoryId] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // --- MANUAL TRANSACTION FORM STATES ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formType, setFormType] = useState("EXPENSE");
  const [formWalletId, setFormWalletId] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formNote, setFormNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // --- CATEGORY MANAGEMENT STATES ---
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // --- AI ASSISTANT STATES ---
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m1",
      sender: "ai",
      text: "Hello! I am your AI Finance Assistant. 🧠\nYou can type your expenditures or income, and I will automatically parse them. For example:\n* \"Dinner cost 120k techcombank for birthday party\"\n* \"Received salary of 15 million in Techcombank\"",
      time: "21:07",
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load Initial Data
  useEffect(() => {
    if (user) {
      fetchInitialData();
    }
  }, [user]);

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
        .select("id, name")
        .order("created_at", { ascending: true });
      setWallets(walletsData || []);
      if (walletsData && walletsData.length > 0) {
        setFormWalletId(walletsData[0].id);
      }

      // 2. Fetch Categories
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name, type")
        .order("name", { ascending: true });
      setCategories(categoriesData || []);
      if (categoriesData && categoriesData.length > 0) {
        setFormCategoryId(categoriesData[0].id);
      }

      // 3. Fetch Transactions
      await fetchTransactions();
    } catch (err) {
      console.error("Error loading initial data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data: txsData } = await supabase
        .from("transactions")
        .select(`
          *,
          wallets (name),
          categories (name)
        `)
        .order("created_at", { ascending: false });

      const formattedTxs = (txsData || []).map((tx: any) => ({
        ...tx,
        wallet_name: tx.wallets?.name || "Unknown Wallet",
        category_name: tx.categories?.name || "Uncategorized",
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
    if (wallets.length > 0) setFormWalletId(wallets[0].id);
    
    // Default to first expense category
    const expenseCat = categories.find(c => c.type === "EXPENSE");
    if (expenseCat) setFormCategoryId(expenseCat.id);
    else if (categories.length > 0) setFormCategoryId(categories[0].id);

    setFormNote("");
    setIsFormOpen(true);
  };

  const openEditForm = (tx: Transaction) => {
    setEditingTx(tx);
    setFormDescription(tx.description);
    setFormAmount(Math.abs(tx.amount).toString());
    setFormType(tx.type);
    setFormWalletId(tx.wallet_id);
    setFormCategoryId(tx.category_id);
    setFormNote(tx.note || "");
    setIsFormOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescription.trim() || !formAmount.trim() || !user) return;

    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt < 0) return;

    setSubmitting(true);
    try {
      const txData = {
        description: formDescription.trim(),
        amount: amt,
        type: formType,
        wallet_id: formWalletId,
        category_id: formCategoryId || null,
        note: formNote.trim() || null,
        user_id: user.id,
        status: "COMPLETED"
      };

      if (editingTx) {
        // UPDATE
        const { error } = await supabase
          .from("transactions")
          .update(txData)
          .eq("id", editingTx.id);

        if (error) throw error;
      } else {
        // INSERT
        const { error } = await supabase
          .from("transactions")
          .insert(txData);

        if (error) throw error;
      }

      setIsFormOpen(false);
      fetchTransactions();
    } catch (err) {
      console.error("Error saving transaction:", err);
    } finally {
      setSubmitting(false);
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

  // --- CATEGORY CRUD HANDLERS ---
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim() || !user) return;

    try {
      const { data, error } = await supabase
        .from("categories")
        .insert({
          user_id: user.id,
          name: newCategoryName.trim(),
          type: newCategoryType
        })
        .select();

      if (error) throw error;

      setNewCategoryName("");
      // Refetch categories
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name, type")
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
          type: newCategoryType
        })
        .eq("id", editingCategory.id);

      if (error) throw error;

      setEditingCategory(null);
      setNewCategoryName("");
      // Refetch
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name, type")
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

      // Refetch
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name, type")
        .order("name", { ascending: true });
      setCategories(categoriesData || []);
    } catch (err) {
      console.error("Error deleting category:", err);
    }
  };

  // --- MOCK CHAT AI PARSING (Same logic, maps to DB on save) ---
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    const userMsg: Message = {
      id: `msg-user-${Date.now()}`,
      sender: "user",
      text: chatInput,
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    const currentInput = chatInput.toLowerCase();
    setChatInput("");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      let aiText = "I have analyzed your statement. Please confirm the transaction card details below to save it:";
      let amount = 50000;
      let walletName = wallets.length > 0 ? wallets[0].name : "Ví tiền mặt";
      let categoryName = "Ăn uống";
      let type = "EXPENSE";
      let description = "Dining expenditure";
      let note = "";

      if (currentInput.includes("for ")) {
        const parts = currentInput.split("for ");
        if (parts.length > 1) note = parts[1].trim();
      } else if (currentInput.includes("with ")) {
        const parts = currentInput.split("with ");
        if (parts.length > 1) note = "With " + parts[1].trim();
      }

      if (currentInput.includes("salary") || currentInput.includes("earned") || currentInput.includes("received") || currentInput.includes("income")) {
        type = "INCOME";
        categoryName = "Lương";
        description = "Salary Inflow";
        amount = 10000000;
      }
      
      const numberMatches = currentInput.match(/\d+(\s*(k|m|million|triệu|tr))?/g);
      if (numberMatches) {
        const rawNumStr = numberMatches[0];
        const numVal = parseInt(rawNumStr.replace(/\D/g, ""));
        if (rawNumStr.includes("k")) {
          amount = numVal * 1000;
        } else if (rawNumStr.includes("m") || rawNumStr.includes("million") || rawNumStr.includes("triệu") || rawNumStr.includes("tr")) {
          amount = numVal * 1000000;
        } else {
          amount = numVal;
        }
      }

      // Check against current user wallets
      const foundWallet = wallets.find(w => currentInput.includes(w.name.toLowerCase()));
      if (foundWallet) {
        walletName = foundWallet.name;
      }

      // Check against categories
      const foundCategory = categories.find(c => currentInput.includes(c.name.toLowerCase()));
      if (foundCategory) {
        categoryName = foundCategory.name;
      }

      if (note) {
        note = note.charAt(0).toUpperCase() + note.slice(1);
      }

      const aiMsg: Message = {
        id: `msg-ai-${Date.now()}`,
        sender: "ai",
        text: aiText,
        time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        confirmationCard: {
          type,
          amount,
          wallet: walletName,
          category: categoryName,
          description,
          note: note || undefined,
          status: "pending"
        }
      };

      setMessages((prev) => [...prev, aiMsg]);
    }, 1000);
  };

  const handleConfirmCard = async (msgId: string, action: "save" | "cancel") => {
    if (!user) return;
    
    setMessages((prev) => 
      prev.map((msg) => {
        if (msg.id === msgId && msg.confirmationCard) {
          const card = msg.confirmationCard;
          if (action === "save") {
            // Find wallet id by name
            const wId = wallets.find(w => w.name.toLowerCase() === card.wallet.toLowerCase())?.id || wallets[0]?.id;
            // Find category id by name
            const cId = categories.find(c => c.name.toLowerCase() === card.category.toLowerCase())?.id || categories[0]?.id;

            // Trigger DB Save
            supabase.from("transactions").insert({
              user_id: user.id,
              wallet_id: wId,
              category_id: cId || null,
              amount: card.amount,
              type: card.type,
              description: card.description,
              note: card.note || null,
              status: "COMPLETED"
            }).then(({ error }) => {
              if (error) console.error("Error saving AI transaction:", error);
              else fetchTransactions();
            });
            
            return {
              ...msg,
              text: `✅ Saved transaction **${card.description}** successfully!\nAmount: ${formatCurrency(card.amount)} in **${card.wallet}** wallet (Category: ${card.category}).${card.note ? `\nNote: *"${card.note}"*` : ""}`,
              confirmationCard: { ...card, status: "saved" }
            };
          } else {
            return {
              ...msg,
              text: `❌ Transaction cancelled. Feel free to type another request.`,
              confirmationCard: { ...card, status: "cancelled" }
            };
          }
        }
        return msg;
      })
    );
  };

  // Markdown Parser
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
              <div key={idx} className="flex items-start gap-2 ml-4 my-0.5">
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

  // --- FILTERS LOGIC ---
  const filteredTransactions = transactions.filter((tx) => {
    const matchesWallet = filterWalletId === "All" || tx.wallet_id === filterWalletId;
    const matchesCategory = filterCategoryId === "All" || tx.category_id === filterCategoryId;
    const matchesSearch = 
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (tx.category_name && tx.category_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.note && tx.note.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesWallet && matchesCategory && matchesSearch;
  });

  // Group by Date string
  const groupedTransactions: { [key: string]: Transaction[] } = {};
  filteredTransactions.forEach((tx) => {
    const groupKey = tx.dateStr || "Unknown Date";
    if (!groupedTransactions[groupKey]) {
      groupedTransactions[groupKey] = [];
    }
    groupedTransactions[groupKey].push(tx);
  });

  const getTxIconComponent = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes("dining") || cat.includes("ăn uống") || cat.includes("coffee") || cat.includes("cafe")) return Coffee;
    if (cat.includes("income") || cat.includes("lương")) return DollarSign;
    if (cat.includes("loans") || cat.includes("nợ")) return TrendingUp;
    if (cat.includes("shopping") || cat.includes("mua sắm")) return ShoppingBag;
    if (cat.includes("repayments") || cat.includes("trả nợ")) return UserCheck;
    return Coffee;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground relative">
      
      {/* 1. TAB CONTROLLER */}
      <div className="pt-3 shrink-0">
        <div className="flex p-1 bg-card border border-border rounded-2xl max-w-md mx-auto">
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
            <span>Loading transaction histories...</span>
          </div>
        ) : (
          <>
            {/* --- TAB 1: HISTORY --- */}
            {activeTab === "history" && (
              <div className="space-y-4 max-w-2xl mx-auto">
                
                {/* Search Input, Filter Toggle & Manual Add Button */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-card border border-border rounded-xl py-2 pl-10 pr-4 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-emerald-500/40"
                    />
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-2 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                      showFilters 
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" 
                        : "bg-card border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </button>
                  <button
                    onClick={openCreateForm}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/10 transition-all cursor-pointer shrink-0"
                  >
                    <Plus className="h-4 w-4 stroke-[2.5]" />
                    <span className="hidden sm:inline">Add</span>
                  </button>
                </div>

                {/* Expandable Filter Grid */}
                {showFilters && (
                  <div className="p-4 rounded-2xl bg-card border border-border grid grid-cols-2 gap-3 animate-fade-in text-foreground">
                    <div>
                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Wallet Account</label>
                      <div className="relative">
                        <select
                          value={filterWalletId}
                          onChange={(e) => setFilterWalletId(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground appearance-none focus:outline-none"
                        >
                          <option value="All">All Wallets</option>
                          {wallets.map((w) => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Category</label>
                        <button 
                          onClick={() => setIsManageCategoriesOpen(true)}
                          className="text-[8px] text-emerald-500 hover:underline font-bold"
                        >
                          Manage
                        </button>
                      </div>
                      <div className="relative">
                        <select
                          value={filterCategoryId}
                          onChange={(e) => setFilterCategoryId(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground appearance-none focus:outline-none"
                        >
                          <option value="All">All Categories</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
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
                            const Icon = getTxIconComponent(tx.category_name || "");
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
                                    </div>
                                    
                                    {tx.note && (
                                      <p className="text-[9px] text-muted-foreground/80 italic mt-1 font-medium bg-accent/40 px-1.5 py-0.5 rounded inline-block">
                                        Note: "{tx.note}"
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
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-xs text-muted-foreground">No matching transactions found.</p>
                  </div>
                )}
              </div>
            )}

            {/* --- TAB 2: AI CHAT --- */}
            {activeTab === "ai" && (
              <div className="flex flex-col h-full space-y-4 max-w-2xl mx-auto">
                
                {/* Messages display */}
                <div className="flex-1 space-y-4 min-h-[350px]">
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
                          <div className="w-[85%] mt-2 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-emerald-500/40 p-4 shadow-md space-y-4">
                            <div className="flex items-center justify-between border-b border-border pb-2">
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                <Sparkles className="h-3 w-3" /> Confirm Transaction
                              </span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                msg.confirmationCard.type === "EXPENSE" ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
                              }`}>
                                {msg.confirmationCard.type === "EXPENSE" ? "Expense" : "Income"}
                              </span>
                            </div>

                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Description:</span>
                                <span className="font-semibold text-foreground">{msg.confirmationCard.description}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Amount:</span>
                                <span className="font-bold text-foreground font-heading">{formatCurrency(msg.confirmationCard.amount)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Wallet Account:</span>
                                <span className="font-medium text-emerald-600 dark:text-emerald-400">{msg.confirmationCard.wallet}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Category:</span>
                                <span className="font-medium">{msg.confirmationCard.category}</span>
                              </div>
                              
                              {msg.confirmationCard.note && (
                                <div className="flex justify-between border-t border-dashed border-border pt-1.5 mt-1.5">
                                  <span className="text-muted-foreground">Note:</span>
                                  <span className="font-medium italic text-slate-700 dark:text-slate-300">"{msg.confirmationCard.note}"</span>
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                              <button
                                onClick={() => handleConfirmCard(msg.id, "cancel")}
                                className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-card border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-[11px] font-semibold"
                              >
                                <X className="h-3.5 w-3.5" /> Cancel
                              </button>
                              <button
                                onClick={() => handleConfirmCard(msg.id, "save")}
                                className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-400 hover:to-teal-500 font-bold transition-all cursor-pointer text-[11px]"
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
                      <span className="text-[8px] text-muted-foreground font-medium px-2">Analyzing</span>
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

            {/* Description/Merchant Field */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Description / Merchant</label>
              <input
                type="text"
                required
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="e.g. Highlands Coffee, Uber Ride"
                className="w-full bg-background border border-border rounded-xl py-2 px-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-emerald-500/40 font-semibold"
              />
            </div>

            {/* Amount & Type Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Amount (VND)</label>
                <input
                  type="number"
                  required
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full bg-background border border-border rounded-xl py-2 px-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-emerald-500/40 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Type</label>
                <div className="relative">
                  <select
                    value={formType}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setFormType(newType);
                      // Update category recommendation based on type
                      if (newType === "INCOME") {
                        const firstInc = categories.find(c => c.type === "INCOME");
                        if (firstInc) setFormCategoryId(firstInc.id);
                      } else {
                        const firstExp = categories.find(c => c.type === "EXPENSE");
                        if (firstExp) setFormCategoryId(firstExp.id);
                      }
                    }}
                    className="w-full bg-background border border-border rounded-xl p-2 pr-8 text-xs text-foreground appearance-none focus:outline-none"
                  >
                    <option value="EXPENSE">Expense</option>
                    <option value="INCOME">Income</option>
                    <option value="DEBT_BORROWED">Borrowed (Debt)</option>
                    <option value="DEBT_LENT">Lent (Loan)</option>
                    <option value="DEBT_REPAYMENT">Repayment</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Wallet & Category Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Wallet Account</label>
                <div className="relative">
                  <select
                    value={formWalletId}
                    onChange={(e) => setFormWalletId(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-2 pr-8 text-xs text-foreground appearance-none focus:outline-none"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center mb-0.5">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Category</label>
                  <button
                    type="button"
                    onClick={() => setIsManageCategoriesOpen(true)}
                    className="text-[8px] text-emerald-500 hover:underline font-bold"
                  >
                    Manage
                  </button>
                </div>
                <div className="relative">
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-2 pr-8 text-xs text-foreground appearance-none focus:outline-none"
                  >
                    {categories
                      .filter((c) => {
                        // Filter categories by matching type
                        if (formType === "INCOME") return c.type === "INCOME";
                        return c.type === "EXPENSE"; // debts and others maps to expense by default for sorting
                      })
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    <option value="">None / Uncategorized</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Note Input */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Note / Memo (Optional)</label>
              <textarea
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                placeholder="e.g. Lunch with developers, client meeting"
                rows={2}
                className="w-full bg-background border border-border rounded-xl py-2 px-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-emerald-500/40 resize-none font-medium"
              />
            </div>

            {/* Modal Actions Footer */}
            <div className="flex gap-2 pt-3 border-t border-border">
              {editingTx && (
                <button
                  type="button"
                  onClick={() => handleDeleteTx(editingTx.id)}
                  disabled={submitting}
                  className="flex-1 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold transition-colors cursor-pointer text-xs text-center border border-rose-500/20 flex items-center justify-center"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="flex-1 py-2 rounded-xl bg-accent border border-border text-muted-foreground hover:text-foreground font-semibold transition-colors cursor-pointer text-xs text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-400 hover:to-teal-500 font-bold transition-all cursor-pointer text-xs text-center flex items-center justify-center"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- CATEGORY MANAGEMENT MODAL --- */}
      {isManageCategoriesOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl p-6 max-h-[80%] overflow-y-auto space-y-4 shadow-xl animate-scale-up text-foreground font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold font-heading">Manage Categories</h3>
              <button
                type="button"
                onClick={() => {
                  setIsManageCategoriesOpen(false);
                  setEditingCategory(null);
                  setNewCategoryName("");
                }}
                className="h-8 w-8 rounded-full bg-accent border border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form to Add/Edit Category */}
            <form 
              onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory}
              className="p-4 bg-background border border-border rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
            >
              <div className="space-y-1 sm:col-span-1.5">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Health, Coffee"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl py-2 px-3 text-xs text-foreground focus:outline-none focus:border-emerald-500/40 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Type</label>
                <div className="relative">
                  <select
                    value={newCategoryType}
                    onChange={(e) => setNewCategoryType(e.target.value as "INCOME" | "EXPENSE")}
                    className="w-full bg-card border border-border rounded-xl p-2 pr-8 text-xs text-foreground appearance-none focus:outline-none"
                  >
                    <option value="EXPENSE">Expense</option>
                    <option value="INCOME">Income</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                className="py-2.5 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold text-xs cursor-pointer flex items-center justify-center"
              >
                {editingCategory ? "Update" : "Add Category"}
              </button>
            </form>

            {/* List Categories */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {categories.map((c) => (
                <div 
                  key={c.id} 
                  className="flex items-center justify-between p-3 rounded-xl bg-background border border-border"
                >
                  <div className="flex items-center gap-2">
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
                      }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(c.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <button
                onClick={() => {
                  setIsManageCategoriesOpen(false);
                  setEditingCategory(null);
                  setNewCategoryName("");
                }}
                className="px-4 py-2 rounded-xl bg-accent text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
