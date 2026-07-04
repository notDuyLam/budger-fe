"use client";

import React, { useState } from "react";
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
  Plus
} from "lucide-react";

interface DebtItem {
  id: string;
  title: string;
  amount: number;
  type: "LENT" | "BORROWED"; // LENT = You Lent (Receivable), BORROWED = You Owe (Payable)
  status: "PENDING" | "COMPLETED" | "OVERDUE";
  date: string;
  dueDate?: string;
  wallet: string;
}

interface Partner {
  id: string;
  name: string;
  totalLent: number;
  totalBorrowed: number;
  debts: DebtItem[];
}

const MOCK_PARTNERS: Partner[] = [
  {
    id: "p1",
    name: "Nam",
    totalLent: 0,
    totalBorrowed: 2000000,
    debts: [
      { id: "d1", title: "Borrowed for Mechanical Keyboard", amount: 2000000, type: "BORROWED", status: "PENDING", date: "Jul 01, 2026", dueDate: "Jul 15, 2026", wallet: "Cash" },
      { id: "d2", title: "Borrowed for drinks", amount: 150000, type: "BORROWED", status: "COMPLETED", date: "Jun 15, 2026", wallet: "MoMo Wallet" },
    ]
  },
  {
    id: "p2",
    name: "Lan",
    totalLent: 1200000,
    totalBorrowed: 0,
    debts: [
      { id: "d3", title: "Lent for class funds", amount: 1200000, type: "LENT", status: "PENDING", date: "Jun 28, 2026", dueDate: "Jul 05, 2026", wallet: "Techcombank" },
    ]
  },
  {
    id: "p3",
    name: "Vy",
    totalLent: 3000000,
    totalBorrowed: 0,
    debts: [
      { id: "d4", title: "Lent for home rent", amount: 3000000, type: "LENT", status: "OVERDUE", date: "May 10, 2026", dueDate: "Jun 10, 2026", wallet: "Techcombank" },
      { id: "d5", title: "Lent for milk tea", amount: 65000, type: "LENT", status: "COMPLETED", date: "May 08, 2026", wallet: "MoMo Wallet" }
    ]
  }
];

export default function DebtsPage() {
  const [partners] = useState<Partner[]>(MOCK_PARTNERS);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

  // Totals
  const grandTotalLent = partners.reduce((sum, p) => sum + p.totalLent, 0);
  const grandTotalBorrowed = partners.reduce((sum, p) => sum + p.totalBorrowed, 0);

  const formatCurrency = (val: number) => {
    return val.toLocaleString("en-US") + " VND";
  };

  const getStatusBadge = (status: "PENDING" | "COMPLETED" | "OVERDUE") => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-2.5 w-2.5" /> Paid
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
          <button className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-xl flex items-center gap-1 hover:bg-emerald-500/20 cursor-pointer">
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
                className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border hover:border-muted-foreground/30 hover:shadow-sm transition-all cursor-pointer"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl p-6 max-h-[85%] overflow-y-auto space-y-5 animate-scale-up">
            
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
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-background border border-border rounded-2xl text-xs">
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

            {/* Debt History ledger */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Debt Ledger History</h4>
              <div className="space-y-2">
                {selectedPartner.debts.map((debt) => {
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
                          <span>Wallet: {debt.wallet}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {debt.dueDate && debt.status !== "COMPLETED" && (
                            <span className="text-muted-foreground text-[9px]">Due: {debt.dueDate}</span>
                          )}
                          {getStatusBadge(debt.status)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
