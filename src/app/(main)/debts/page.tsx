"use client";

import React, { useState, useEffect } from "react";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  User, 
  ChevronRight, 
  X, 
  Calendar,
  Wallet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Plus,
  Loader2,
  Search,
  SlidersHorizontal,
  ChevronLeft
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/shared/AuthProvider";
import Portal from "@/components/shared/Portal";
import { Select } from "@/components/ui/select";
import { z } from "zod";

interface DebtItem {
  id: string;
  title: string;
  amount: number;
  type: "LENT" | "BORROWED"; // LENT = You Lent (Receivable), BORROWED = You Owe (Payable)
  status: "PENDING" | "COMPLETED" | "OVERDUE";
  date: string;
  dueDate?: string;
  wallet: string;
  repaidDate?: string;
  repayWallet?: string;
  repaid_by_transaction_id?: string;
  isOrphanRepayment?: boolean;
  rawDate: Date;
}

interface Partner {
  id: string;
  name: string;
  totalLent: number;
  totalBorrowed: number;
  debts: DebtItem[];
}

export default function DebtsPage() {
  const { user } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddPartnerOpen, setIsAddPartnerOpen] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // --- LEDGER FILTER STATES (INSIDE MODAL) ---
  const [debtSearch, setDebtSearch] = useState("");
  const [debtTypeFilter, setDebtTypeFilter] = useState("All");
  const [debtStatusFilter, setDebtStatusFilter] = useState("All");
  const [debtStartDate, setDebtStartDate] = useState("");
  const [debtEndDate, setDebtEndDate] = useState("");
  const [showModalFilters, setShowModalFilters] = useState(false);
  const [modalPage, setModalPage] = useState(1);
  const modalItemsPerPage = 5;

  // Reset filters when opening/changing selected partner
  useEffect(() => {
    setDebtSearch("");
    setDebtTypeFilter("All");
    setDebtStatusFilter("All");
    setDebtStartDate("");
    setDebtEndDate("");
    setShowModalFilters(false);
    setModalPage(1);
  }, [selectedPartner]);

  // Load partners and transactions from DB
  const fetchDebtData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch debt partners
      const { data: partnersData, error: partnersErr } = await supabase
        .from("debt_partners")
        .select("*")
        .order("name", { ascending: true });

      if (partnersErr) throw partnersErr;

      // 2. Fetch debt transactions
      const { data: txsData, error: txsErr } = await supabase
        .from("transactions")
        .select(`
          *,
          wallets (name)
        `)
        .in("type", ["DEBT_LENT", "DEBT_BORROWED", "DEBT_REPAYMENT"])
        .order("created_at", { ascending: false });

      if (txsErr) throw txsErr;

      // 3. Map transactions to partners
      const mappedPartners: Partner[] = (partnersData || []).map((p: any) => {
        const partnerTxs = (txsData || [])
          .filter((tx: any) => tx.debt_partner_id === p.id)
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        const debtsList: DebtItem[] = [];

        partnerTxs.forEach((tx: any) => {
          if (tx.type === "DEBT_LENT" || tx.type === "DEBT_BORROWED") {
            const dateStr = new Date(tx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            const dueDateStr = tx.due_date ? new Date(tx.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : undefined;
            
            let status: "PENDING" | "COMPLETED" | "OVERDUE" = tx.status === "COMPLETED" ? "COMPLETED" : "PENDING";
            if (status === "PENDING" && tx.due_date && new Date(tx.due_date).getTime() < Date.now()) {
              status = "OVERDUE";
            }

            // Find if there is a matching repayment that has linked this debt
            let repaidDate: string | undefined = undefined;
            let repayWallet: string | undefined = undefined;

            if (tx.repaid_by_transaction_id) {
              const repaymentTx = partnerTxs.find((r: any) => r.id === tx.repaid_by_transaction_id);
              if (repaymentTx) {
                repaidDate = new Date(repaymentTx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                repayWallet = repaymentTx.wallets?.name || "Unknown Wallet";
              }
            }

            debtsList.push({
              id: tx.id,
              title: tx.description || (tx.type === "DEBT_LENT" ? "Lent money" : "Borrowed money"),
              amount: Number(tx.amount),
              type: tx.type === "DEBT_LENT" ? "LENT" : "BORROWED",
              status,
              date: dateStr,
              dueDate: dueDateStr,
              wallet: tx.wallets?.name || "Unknown Wallet",
              repaidDate,
              repayWallet,
              repaid_by_transaction_id: tx.repaid_by_transaction_id,
              isOrphanRepayment: false,
              rawDate: new Date(tx.created_at)
            } as any);
          } else if (tx.type === "DEBT_REPAYMENT") {
            const isMatched = partnerTxs.some((d: any) => d.repaid_by_transaction_id === tx.id);
            if (!isMatched) {
              const dateStr = new Date(tx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
              debtsList.push({
                id: tx.id,
                title: tx.description || "Repayment",
                amount: Number(tx.amount),
                type: tx.description?.toLowerCase().includes("repaid me") || 
                      tx.description?.toLowerCase().includes("trả nợ cho mình") || 
                      tx.description?.toLowerCase().includes("trả nợ mình") ? "LENT" : "BORROWED",
                status: "COMPLETED",
                date: dateStr,
                wallet: tx.wallets?.name || "Unknown Wallet",
                isOrphanRepayment: true,
                rawDate: new Date(tx.created_at)
              } as any);
            }
          }
        });

        const totalLent = debtsList
          .filter(d => d.type === "LENT" && d.status !== "COMPLETED" && !d.repaidDate)
          .reduce((sum, d) => sum + d.amount, 0);

        const totalBorrowed = debtsList
          .filter(d => d.type === "BORROWED" && d.status !== "COMPLETED" && !d.repaidDate)
          .reduce((sum, d) => sum + d.amount, 0);

        const sortedDebts = debtsList.sort((a: any, b: any) => b.rawDate.getTime() - a.rawDate.getTime());

        return {
          id: p.id,
          name: p.name,
          totalLent,
          totalBorrowed,
          debts: sortedDebts
        };
      });

      setPartners(mappedPartners);
      
      // Update selected partner if open
      if (selectedPartner) {
        const updated = mappedPartners.find(mp => mp.id === selectedPartner.id);
        if (updated) setSelectedPartner(updated);
      }

    } catch (err) {
      console.error("Error fetching debt data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDebtData();
    }
  }, [user]);

  // Add Partner contact with Zod validation
  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newPartnerName.trim();
    if (!trimmedName || !user || submitting) return;

    const partnerSchema = z.string().min(1, "Contact Name is required").max(30, "Contact Name must be under 30 characters");
    const check = partnerSchema.safeParse(trimmedName);
    if (!check.success) {
      alert(check.error.issues[0].message);
      return;
    }

    setSubmitting(true);
    try {
      const { data: existing, error: checkErr } = await supabase
        .from("debt_partners")
        .select("id")
        .eq("user_id", user.id)
        .ilike("name", trimmedName);

      if (checkErr) throw checkErr;
      if (existing && existing.length > 0) {
        alert("A contact with this name already exists.");
        setSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from("debt_partners")
        .insert({
          user_id: user.id,
          name: trimmedName
        });

      if (error) throw error;
      setNewPartnerName("");
      setIsAddPartnerOpen(false);
      fetchDebtData();
    } catch (err) {
      console.error("Error adding debt partner:", err);
      alert("Failed to add contact: " + (err as any).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Totals
  const grandTotalLent = partners.reduce((sum, p) => sum + p.totalLent, 0);
  const grandTotalBorrowed = partners.reduce((sum, p) => sum + p.totalBorrowed, 0);

  const formatCurrency = (val: number) => {
    return val.toLocaleString("en-US") + " VND";
  };

  const getStatusBadge = (status: "PENDING" | "COMPLETED" | "OVERDUE", repaidDate?: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-2.5 w-2.5" /> Paid {repaidDate ? `on ${repaidDate}` : ""}
          </span>
        );
      case "OVERDUE":
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500">
            <AlertCircle className="h-2.5 w-2.5" /> Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
            <HelpCircle className="h-2.5 w-2.5" /> Unpaid
          </span>
        );
    }
  };

  // --- LEDGER FILTERING & PAGINATION (MODAL) ---
  const filteredDebts = selectedPartner
    ? selectedPartner.debts.filter((debt) => {
        const matchesSearch = 
          debt.title.toLowerCase().includes(debtSearch.toLowerCase()) || 
          debt.wallet.toLowerCase().includes(debtSearch.toLowerCase());
        
        const matchesType = debtTypeFilter === "All" || debt.type === debtTypeFilter;
        const matchesStatus = debtStatusFilter === "All" || debt.status === debtStatusFilter;
        
        let matchesDate = true;
        const dDate = new Date(debt.rawDate);
        if (debtStartDate) {
          const start = new Date(debtStartDate);
          start.setHours(0, 0, 0, 0);
          matchesDate = matchesDate && dDate >= start;
        }
        if (debtEndDate) {
          const end = new Date(debtEndDate);
          end.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && dDate <= end;
        }

        return matchesSearch && matchesType && matchesStatus && matchesDate;
      })
    : [];

  const totalModalItems = filteredDebts.length;
  const totalModalPages = Math.ceil(totalModalItems / modalItemsPerPage) || 1;
  const paginatedDebts = filteredDebts.slice(
    (modalPage - 1) * modalItemsPerPage,
    modalPage * modalItemsPerPage
  );

  return (
    <div className="flex-1 space-y-6 relative text-foreground">
      
      {/* 1. DEBT OVERVIEW STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-card border border-border p-4 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">You Lent (Receivables)</span>
            </div>
            <p className="text-lg font-extrabold font-heading mt-2">
              {formatCurrency(grandTotalLent)}
            </p>
          </div>
          <span className="text-[9px] text-muted-foreground mt-2">Money people owe you</span>
        </div>

        <div className="rounded-2xl bg-card border border-border p-4 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <ArrowDownLeft className="h-4 w-4 text-rose-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">You Owe (Payables)</span>
            </div>
            <p className="text-lg font-extrabold font-heading mt-2">
              {formatCurrency(grandTotalBorrowed)}
            </p>
          </div>
          <span className="text-[9px] text-muted-foreground mt-2">Money you need to repay</span>
        </div>
      </div>

      {/* 2. DEBT PARTNERS CONTACTS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Debt Contacts ({partners.length})</h3>
          <button 
            onClick={() => setIsAddPartnerOpen(true)}
            className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-xl flex items-center gap-1 hover:bg-emerald-500/20 cursor-pointer animate-fade-in"
          >
            <Plus className="h-3 w-3" /> Add Contact
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {partners.map((partner) => {
            const hasLent = partner.totalLent > 0;
            const hasBorrowed = partner.totalBorrowed > 0;

            return (
              <div
                key={partner.id}
                onClick={() => setSelectedPartner(partner)}
                className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border hover:border-muted-foreground/30 hover:shadow-sm transition-all cursor-pointer select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-accent border border-border flex items-center justify-center text-muted-foreground">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">{partner.name}</h4>
                    <span className="text-[9px] text-muted-foreground">
                      {partner.debts.length} debt items
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    {hasLent && (
                      <span className="text-xs font-bold text-emerald-500 block font-heading">
                        +{formatCurrency(partner.totalLent)}
                      </span>
                    )}
                    {hasBorrowed && (
                      <span className="text-xs font-bold text-rose-500 block font-heading">
                        -{formatCurrency(partner.totalBorrowed)}
                      </span>
                    )}
                    <span className="text-[9px] text-muted-foreground">
                      {hasLent ? "Receivable" : "Payable"}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. DETAILS OVERLAY MODAL */}
      {selectedPartner && (
        <Portal>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-xl bg-card border border-border rounded-3xl p-6 max-h-[85%] overflow-y-auto space-y-4 shadow-xl animate-scale-up text-foreground font-sans">
              
              {/* Header Modal */}
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-muted-foreground">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold">{selectedPartner.name}</h3>
                    <span className="text-[9px] text-muted-foreground font-medium">Debt History Details</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPartner(null)}
                  className="h-8 w-8 rounded-full bg-accent border border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Total Balance Breakdown */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-background border border-border rounded-2xl text-xs">
                <div className="text-left">
                  <span className="text-muted-foreground block text-[9px] uppercase">Lent (To Collect)</span>
                  <span className="font-bold text-emerald-500 font-heading block mt-0.5">
                    {formatCurrency(selectedPartner.totalLent)}
                  </span>
                </div>
                <div className="text-left">
                  <span className="text-muted-foreground block text-[9px] uppercase">Borrowed (To Repay)</span>
                  <span className="font-bold text-rose-500 font-heading block mt-0.5">
                    {formatCurrency(selectedPartner.totalBorrowed)}
                  </span>
                </div>
              </div>

              {/* Advanced Filter Section */}
              <div className="space-y-2 bg-background border border-border p-3.5 rounded-2xl">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search ledger..."
                      value={debtSearch}
                      onChange={(e) => {
                        setDebtSearch(e.target.value);
                        setModalPage(1);
                      }}
                      className="w-full bg-card border border-border rounded-xl py-1.5 pl-9 pr-3 text-[11px] text-foreground focus:outline-none focus:border-emerald-500/40"
                    />
                  </div>
                  <button
                    onClick={() => setShowModalFilters(!showModalFilters)}
                    className={`p-2 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                      showModalFilters 
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" 
                        : "bg-card border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                  </button>
                </div>

                {showModalFilters && (
                  <div className="grid grid-cols-2 gap-3 pt-2 animate-fade-in">
                    <div>
                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Ledger Type</label>
                      <Select
                        value={debtTypeFilter}
                        onValueChange={(val) => {
                          setDebtTypeFilter(val);
                          setModalPage(1);
                        }}
                        options={[
                          { value: "All", label: "All Types" },
                          { value: "LENT", label: "Lent" },
                          { value: "BORROWED", label: "Borrowed" }
                        ]}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Ledger Status</label>
                      <Select
                        value={debtStatusFilter}
                        onValueChange={(val) => {
                          setDebtStatusFilter(val);
                          setModalPage(1);
                        }}
                        options={[
                          { value: "All", label: "All Statuses" },
                          { value: "COMPLETED", label: "Paid" },
                          { value: "PENDING", label: "Unpaid" },
                          { value: "OVERDUE", label: "Overdue" }
                        ]}
                      />
                    </div>

                    <div className="col-span-2 grid grid-cols-2 gap-2 pt-2 border-t border-dashed border-border">
                      <div>
                        <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Start Date</label>
                        <input
                          type="date"
                          value={debtStartDate}
                          onChange={(e) => {
                            setDebtStartDate(e.target.value);
                            setModalPage(1);
                          }}
                          className="w-full bg-card border border-border rounded-xl p-2 text-[11px] text-foreground focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">End Date</label>
                        <input
                          type="date"
                          value={debtEndDate}
                          onChange={(e) => {
                            setDebtEndDate(e.target.value);
                            setModalPage(1);
                          }}
                          className="w-full bg-card border border-border rounded-xl p-2 text-[11px] text-foreground focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Debt History ledger */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Debt Ledger History ({filteredDebts.length})</h4>
                <div className="space-y-2">
                  {paginatedDebts.length > 0 ? (
                    paginatedDebts.map((debt) => {
                      const isLent = debt.type === "LENT";
                      return (
                        <div 
                          key={debt.id} 
                          className="p-3.5 rounded-2xl bg-background border border-border space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="text-xs font-bold">{debt.title}</h5>
                              <div className="flex items-center gap-1.5 mt-1 text-[9px] text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{debt.date}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-xs font-extrabold font-heading ${isLent ? "text-emerald-500" : "text-rose-500"}`}>
                                {isLent ? "+" : "-"}{formatCurrency(debt.amount)}
                              </span>
                              <span className="text-[9px] text-muted-foreground block mt-0.5">{isLent ? "Lent" : "Borrowed"}</span>
                            </div>
                          </div>

                          {/* Wallet and Status info footer */}
                          <div className="pt-2.5 border-t border-border flex items-center justify-between text-[10px]">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Wallet className="h-3 w-3" />
                              <span>
                                Wallet: <strong className="text-foreground/80">{debt.wallet}</strong>
                                {debt.repayWallet && (
                                  <span className="text-muted-foreground font-normal">
                                    {" "}→ Repaid: <strong className="text-foreground">{debt.repayWallet}</strong>
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {debt.dueDate && debt.status !== "COMPLETED" && (
                                <span className="text-muted-foreground text-[9px]">Due: {debt.dueDate}</span>
                              )}
                              {getStatusBadge(debt.status, debt.repaidDate)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center text-xs text-muted-foreground py-8 bg-background border border-border border-dashed rounded-2xl">
                      No matching records found.
                    </div>
                  )}
                </div>

                {/* Ledger Pagination */}
                {totalModalPages > 1 && (
                  <div className="flex items-center justify-between pt-2 text-xs">
                    <button
                      onClick={() => setModalPage(prev => Math.max(prev - 1, 1))}
                      disabled={modalPage === 1}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground disabled:opacity-50 cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Prev
                    </button>
                    <span className="text-muted-foreground font-medium">
                      Page {modalPage} of {totalModalPages}
                    </span>
                    <button
                      onClick={() => setModalPage(prev => Math.min(prev + 1, totalModalPages))}
                      disabled={modalPage === totalModalPages}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground disabled:opacity-50 cursor-pointer"
                    >
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* 4. ADD PARTNER OVERLAY MODAL */}
      {isAddPartnerOpen && (
        <Portal>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <form 
              onSubmit={handleAddPartner}
              className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 space-y-4 shadow-xl animate-scale-up text-foreground font-sans"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-sm font-bold font-heading">Add Debt Contact</h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddPartnerOpen(false);
                    setNewPartnerName("");
                  }}
                  className="h-8 w-8 rounded-full bg-accent border border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Contact Name</label>
                <input
                  type="text"
                  required
                  value={newPartnerName}
                  onChange={(e) => setNewPartnerName(e.target.value)}
                  placeholder="e.g. Anh Huy, Nam, Vy"
                  className="w-full bg-background border border-border rounded-xl py-2 px-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-emerald-500/40 font-semibold"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddPartnerOpen(false);
                    setNewPartnerName("");
                  }}
                  className="flex-1 py-2 rounded-xl bg-accent border border-border text-muted-foreground hover:text-foreground font-semibold transition-colors cursor-pointer text-xs text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-400 hover:to-teal-500 font-bold transition-all cursor-pointer text-xs text-center flex items-center justify-center"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Contact"}
                </button>
              </div>
            </form>
          </div>
        </Portal>
      )}

    </div>
  );
}
