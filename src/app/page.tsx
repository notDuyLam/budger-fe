"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Wallet, Sparkles, Receipt, ArrowRight, ShieldCheck, TrendingUp, HelpCircle, Sun, Moon } from "lucide-react";

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setTheme("light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setTheme("dark");
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground font-sans overflow-hidden transition-colors duration-200">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="font-heading text-xl font-bold tracking-tight bg-clip-text text-foreground">
              Budger
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-emerald-500 transition-colors">Features</a>
          </nav>

          <div className="flex items-center gap-3">
            {/* Theme Toggler */}
            <button 
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-indigo-500" />
              )}
            </button>

            <Link 
              href="/dashboard"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all duration-200"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto max-w-7xl px-6 pt-20 pb-24 text-center lg:pt-32">
        <div className="mx-auto max-w-3xl">
          {/* Tag */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-550/20 dark:border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-8 animate-fade-in">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Smart AI Financial Companion</span>
          </div>

          {/* Heading */}
          <h1 className="font-heading text-4xl font-extrabold tracking-tight sm:text-6xl leading-none">
            Manage your personal finances{" "}
            <span className="bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500 bg-clip-text text-transparent">
              smartly & minimalistically
            </span>
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            No more tedious manual logging. Chat directly with our AI to automatically record transactions, analyze finances, and optimize your balances in a flash.
          </p>

          {/* Actions */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex w-full sm:w-auto h-12 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 text-base font-semibold text-white shadow-xl shadow-emerald-500/10 hover:from-emerald-400 hover:to-teal-500 transition-all duration-200 group"
            >
              Get Started Now
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#features"
              className="inline-flex w-full sm:w-auto h-12 items-center justify-center rounded-xl border border-border bg-card/50 px-6 py-3 text-base font-semibold text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Feature Grid */}
        <section id="features" className="mt-32 scroll-mt-20">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Key Features
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-sm">
              All the tools you need to master your wallet, powered by artificial intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card 1 */}
            <div className="relative group overflow-hidden rounded-2xl border border-border bg-card/40 p-8 text-left transition-all hover:-translate-y-1 hover:border-muted-foreground/30 hover:shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-6">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">AI Transaction Logging</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Just type: &quot;coffee 50k momo wallet&quot;, and the AI will automatically categorize, select the wallet, and update your balance.
              </p>
            </div>

            {/* Card 2 */}
            <div className="relative group overflow-hidden rounded-2xl border border-border bg-card/40 p-8 text-left transition-all hover:-translate-y-1 hover:border-muted-foreground/30 hover:shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-6">
                <Wallet className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Flexible Multi-wallet</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Track cash, bank accounts, and e-wallets all in one place. Always know exactly how much you have.
              </p>
            </div>

            {/* Card 3 */}
            <div className="relative group overflow-hidden rounded-2xl border border-border bg-card/40 p-8 text-left transition-all hover:-translate-y-1 hover:border-muted-foreground/30 hover:shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 mb-6">
                <Receipt className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Debt Ledger Syncing</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Manage borrowings, loans, and payback reminders. Balances update automatically when transactions are paid.
              </p>
            </div>

            {/* Card 4 */}
            <div className="relative group overflow-hidden rounded-2xl border border-border bg-card/40 p-8 text-left transition-all hover:-translate-y-1 hover:border-muted-foreground/30 hover:shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-650 dark:text-purple-400 mb-6">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Visual Reports</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Visual donut charts show your spending structure by category, helping you easily identify unnecessary expenditures.
              </p>
            </div>

            {/* Card 5 */}
            <div className="relative group overflow-hidden rounded-2xl border border-border bg-card/40 p-8 text-left transition-all hover:-translate-y-1 hover:border-muted-foreground/30 hover:shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 mb-6">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Bank-grade Security</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Built on Supabase Authentication. Your data is isolated securely using Row Level Security (RLS) policies.
              </p>
            </div>

            {/* Card 6 */}
            <div className="relative group overflow-hidden rounded-2xl border border-border bg-card/40 p-8 text-left transition-all hover:-translate-y-1 hover:border-muted-foreground/30 hover:shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-605 dark:text-amber-400 mb-6">
                <HelpCircle className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Responsive & Mobile-First</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Optimized for mobile viewports with premium responsive grids, providing a native app experience on all screens.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/40 py-8 mt-24">
        <div className="container mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>
            &copy; {new Date().getFullYear()} Budger App. All rights reserved.
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-foreground">Terms of Service</a>
            <a href="#" className="hover:text-foreground">Privacy Policy</a>
            <a href="#" className="hover:text-foreground">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
