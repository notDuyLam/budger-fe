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
  Plus
} from "lucide-react";

// Mock Categories & Wallets (English)
const WALLETS = ["All", "Cash", "Techcombank", "MoMo Wallet", "Credit Card"];
const CATEGORIES = ["All", "Dining", "Income", "Loans", "Shopping", "Repayments", "Transport"];

interface Transaction {
  id: string;
  title: string;
  amount: number;
  category: string;
  wallet: string;
  time: string;
  dateStr: string; // Group date
  type: string;
  note?: string; // Optional Note
}

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  time: string;
  confirmationCard?: {
    type: string; // INCOME | EXPENSE
    amount: number;
    wallet: string;
    category: string;
    description: string;
    note?: string; // Optional Note inside confirmation card
    status: "pending" | "saved" | "cancelled";
  };
}

// Wrapper component to provide Suspense context for useSearchParams()
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
  const searchParams = useSearchParams();
  
  // Set initial tab from query params ?tab=ai
  const initialTab = searchParams.get("tab") === "ai" ? "ai" : "history";
  const [activeTab, setActiveTab] = useState<"history" | "ai">(initialTab);

  // --- HISTORY STATES (English with Notes) ---
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: "t1", title: "Highlands Coffee", amount: -55000, category: "Dining", wallet: "MoMo Wallet", time: "14:32", dateStr: "Today, Jul 03", type: "EXPENSE", note: "Meeting with client Nam" },
    { id: "t2", title: "June Salary Inflow", amount: 18000000, category: "Income", wallet: "Techcombank", time: "09:00", dateStr: "Yesterday, Jul 02", type: "INCOME", note: "Base salary + performance bonus" },
    { id: "t3", title: "Loan from Nam", amount: 2000000, category: "Loans", wallet: "Cash", time: "18:15", dateStr: "Jul 01", type: "DEBT_BORROWED", note: "For mechanical keyboard purchase" },
    { id: "t4", title: "Uniqlo Clothing Shop", amount: -450000, category: "Shopping", wallet: "Credit Card", time: "20:10", dateStr: "Jun 29", type: "EXPENSE", note: "Summer t-shirts and jeans" },
    { id: "t5", title: "Repaid Vy", amount: -500000, category: "Repayments", wallet: "MoMo Wallet", time: "11:30", dateStr: "Jun 28", type: "DEBT_REPAYMENT", note: "Settled lunch debt" },
  ]);

  // Filters
  const [filterWallet, setFilterWallet] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // --- MANUAL TRANSACTION FORM STATES ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formType, setFormType] = useState("EXPENSE");
  const [formWallet, setFormWallet] = useState("Cash");
  const [formCategory, setFormCategory] = useState("Dining");
  const [formNote, setFormNote] = useState("");

  const openCreateForm = () => {
    setEditingTx(null);
    setFormTitle("");
    setFormAmount("");
    setFormType("EXPENSE");
    setFormWallet("Cash");
    setFormCategory("Dining");
    setFormNote("");
    setIsFormOpen(true);
  };

  const openEditForm = (tx: Transaction) => {
    setEditingTx(tx);
    setFormTitle(tx.title);
    setFormAmount(Math.abs(tx.amount).toString());
    setFormType(tx.type);
    setFormWallet(tx.wallet);
    setFormCategory(tx.category);
    setFormNote(tx.note || "");
    setIsFormOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formAmount.trim()) return;

    const amt = parseFloat(formAmount);
    if (isNaN(amt)) return;

    const signedAmt = formType === "EXPENSE" || formType === "DEBT_REPAYMENT" ? -amt : amt;

    if (editingTx) {
      // Editing Mode
      setTransactions((prev) => 
        prev.map((t) => 
          t.id === editingTx.id 
            ? { ...t, title: formTitle, amount: signedAmt, type: formType, wallet: formWallet, category: formCategory, note: formNote }
            : t
        )
      );
    } else {
      // Creating Mode
      const newTx: Transaction = {
        id: `t-manual-${Date.now()}`,
        title: formTitle,
        amount: signedAmt,
        category: formCategory,
        wallet: formWallet,
        time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        dateStr: "Today, Jul 03",
        type: formType,
        note: formNote
      };
      setTransactions((prev) => [newTx, ...prev]);
    }
    setIsFormOpen(false);
  };

  const handleDeleteTx = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    setIsFormOpen(false);
  };

  // --- AI ASSISTANT STATES (English) ---
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

  // Auto-scroll on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const formatCurrency = (val: number) => {
    return val.toLocaleString("en-US") + " VND";
  };

  // --- MOCK CHAT AI PARSING MECHANISM ---
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

    // Simulated AI NLP Processing
    setTimeout(() => {
      setIsTyping(false);
      let aiText = "I have analyzed your statement. Please confirm the transaction card details below to save it:";
      let amount = 50000;
      let wallet = "MoMo Wallet";
      let category = "Dining";
      let type = "EXPENSE";
      let title = "Dining expenditure";
      let note = "";

      // Parse Note / Memo
      if (currentInput.includes("for ")) {
        const parts = currentInput.split("for ");
        if (parts.length > 1) {
          note = parts[1].trim();
        }
      } else if (currentInput.includes("with ")) {
        const parts = currentInput.split("with ");
        if (parts.length > 1) {
          note = "With " + parts[1].trim();
        }
      }

      // Parse keywords
      if (currentInput.includes("salary") || currentInput.includes("earned") || currentInput.includes("received") || currentInput.includes("income")) {
        type = "INCOME";
        category = "Income";
        title = "Salary Inflow";
        amount = 10000000;
        if (!note) note = ""; // default note to blank
      }
      
      // Parse numbers (like 120k, 15m)
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

      // Parse wallets
      if (currentInput.includes("techcombank") || currentInput.includes("tcb") || currentInput.includes("bank")) {
        wallet = "Techcombank";
      } else if (currentInput.includes("cash") || currentInput.includes("wallet")) {
        wallet = "Cash";
      } else if (currentInput.includes("credit") || currentInput.includes("card")) {
        wallet = "Credit Card";
      }

      // Parse categories
      if (currentInput.includes("coffee") || currentInput.includes("cafe") || currentInput.includes("drink") || currentInput.includes("starbucks")) {
        category = "Dining";
        title = "Starbucks Coffee";
      } else if (currentInput.includes("dinner") || currentInput.includes("lunch") || currentInput.includes("food") || currentInput.includes("eat")) {
        category = "Dining";
        title = "Food & Dining";
      } else if (currentInput.includes("clothes") || currentInput.includes("shopping") || currentInput.includes("uniqlo") || currentInput.includes("bought")) {
        category = "Shopping";
        title = "Shopping Expense";
      } else if (currentInput.includes("grab") || currentInput.includes("taxi") || currentInput.includes("uber") || currentInput.includes("ride")) {
        category = "Transport";
        title = "Grab Ride";
      }

      if (note) {
        // Capitalize first letter of note
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
          wallet,
          category,
          description: title,
          note: note || undefined, // note is omitted if empty
          status: "pending"
        }
      };

      setMessages((prev) => [...prev, aiMsg]);
    }, 1000);
  };

  // --- SAVE OR DISMISS CONFIRMATION CARD ---
  const handleConfirmCard = (msgId: string, action: "save" | "cancel") => {
    setMessages((prev) => 
      prev.map((msg) => {
        if (msg.id === msgId && msg.confirmationCard) {
          const card = msg.confirmationCard;
          if (action === "save") {
            const amt = card.type === "EXPENSE" ? -card.amount : card.amount;
            const newTx: Transaction = {
              id: `t-new-${Date.now()}`,
              title: card.description,
              amount: amt,
              category: card.category,
              wallet: card.wallet,
              time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
              dateStr: "Today, Jul 03",
              type: card.type,
              note: card.note
            };

            setTransactions((oldTxs) => [newTx, ...oldTxs]);
            
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

  // --- CUSTOM MARKDOWN PARSER FOR MESSAGES ---
  const renderMessageText = (text: string) => {
    const lines = text.split("\n");
    return (
      <div className="space-y-1">
        {lines.map((line, idx) => {
          let content: React.ReactNode = line;
          
          // Check if line is a bullet point
          const isBullet = line.startsWith("* ") || line.startsWith("- ");
          const cleanLine = isBullet ? line.substring(2) : line;

          // Parse bold text **bold**
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

  // --- FILTER TRANSACTION LIST ---
  const filteredTransactions = transactions.filter((tx) => {
    const matchesWallet = filterWallet === "All" || tx.wallet === filterWallet;
    const matchesCategory = filterCategory === "All" || tx.category === filterCategory;
    const matchesSearch = tx.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (tx.note && tx.note.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesWallet && matchesCategory && matchesSearch;
  });

  // Group by Date string
  const groupedTransactions: { [key: string]: Transaction[] } = {};
  filteredTransactions.forEach((tx) => {
    if (!groupedTransactions[tx.dateStr]) {
      groupedTransactions[tx.dateStr] = [];
    }
    groupedTransactions[tx.dateStr].push(tx);
  });

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
              <div className="p-4 rounded-2xl bg-card border border-border grid grid-cols-2 gap-3 animate-fade-in">
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Wallet Account</label>
                  <div className="relative">
                    <select
                      value={filterWallet}
                      onChange={(e) => setFilterWallet(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground appearance-none focus:outline-none"
                    >
                      {WALLETS.map((w) => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Category</label>
                  <div className="relative">
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground appearance-none focus:outline-none"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
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
                        const Icon = getTxIcon(tx.category);
                        const isExpense = tx.amount < 0 && tx.type !== "DEBT_REPAYMENT";
                        const isRepayment = tx.type === "DEBT_REPAYMENT";

                        return (
                          <div 
                            key={tx.id}
                            onClick={() => openEditForm(tx)}
                            className="flex items-center justify-between p-3.5 rounded-2xl bg-card border border-border hover:border-muted-foreground/35 hover:shadow-sm hover:scale-[1.005] active:scale-[0.995] transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-xl ${
                                isExpense 
                                  ? "bg-rose-500/10 text-rose-505" 
                                  : isRepayment 
                                    ? "bg-indigo-500/10 text-indigo-500"
                                    : "bg-emerald-500/10 text-emerald-500"
                              }`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <h5 className="text-xs font-semibold">{tx.title}</h5>
                                <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-muted-foreground">
                                  <span>{tx.time}</span>
                                  <span>•</span>
                                  <span>{tx.wallet}</span>
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
                                tx.amount < 0 ? "text-rose-500" : "text-emerald-500"
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
                          
                          {/* DYNAMIC NOTE FIELD INSIDE CARD */}
                          {msg.confirmationCard.note && (
                            <div className="flex justify-between border-t border-dashed border-border pt-1.5 mt-1.5">
                              <span className="text-muted-foreground">Note:</span>
                              <span className="font-medium italic text-slate-700 dark:text-slate-350">"{msg.confirmationCard.note}"</span>
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
      </div>

      {/* --- 3. INTERACTIVE TRANSACTION MODAL FORM (CREATE / EDIT) --- */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <form 
            onSubmit={handleSaveForm}
            className="w-full max-w-md bg-card border border-border rounded-3xl p-6 space-y-4 shadow-xl animate-scale-up text-foreground"
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
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
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
                      setFormType(e.target.value);
                      if (e.target.value === "INCOME") setFormCategory("Income");
                      else if (e.target.value === "DEBT_BORROWED" || e.target.value === "DEBT_LENT") setFormCategory("Loans");
                      else if (e.target.value === "DEBT_REPAYMENT") setFormCategory("Repayments");
                      else setFormCategory("Dining");
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
                    value={formWallet}
                    onChange={(e) => setFormWallet(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-2 pr-8 text-xs text-foreground appearance-none focus:outline-none"
                  >
                    {WALLETS.slice(1).map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Category</label>
                <div className="relative">
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-2 pr-8 text-xs text-foreground appearance-none focus:outline-none"
                  >
                    {formType === "INCOME" ? (
                      <option value="Income">Income</option>
                    ) : formType === "DEBT_BORROWED" || formType === "DEBT_LENT" ? (
                      <option value="Loans">Loans</option>
                    ) : formType === "DEBT_REPAYMENT" ? (
                      <option value="Repayments">Repayments</option>
                    ) : (
                      <>
                        <option value="Dining">Dining</option>
                        <option value="Shopping">Shopping</option>
                        <option value="Transport">Transport</option>
                        <option value="Housing">Housing</option>
                      </>
                    )}
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
                  className="flex-1 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold transition-colors cursor-pointer text-xs text-center border border-rose-500/20"
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
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-400 hover:to-teal-500 font-bold transition-all cursor-pointer text-xs text-center"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
