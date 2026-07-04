"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Wallet, Sparkles, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center text-xs text-muted-foreground">
        <span className="animate-pulse">Loading login screen...</span>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Clear messages when mode changes
  useEffect(() => {
    setErrorMsg("");
    setSuccessMsg("");
  }, [mode]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    if (mode === "register" && password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) {
          setErrorMsg(error.message);
        } else {
          router.push(redirectPath);
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
        });

        if (error) {
          setErrorMsg(error.message);
        } else {
          // If auto-confirm is enabled, it logs in, else it needs email confirmation.
          // By default on Supabase Cloud, email confirmation is enabled.
          if (data.session) {
            setSuccessMsg("Account created and logged in!");
            router.push(redirectPath);
          } else {
            setSuccessMsg(
              "Account registered successfully! Please check your email inbox to confirm your registration."
            );
            setEmail("");
            setPassword("");
            setConfirmPassword("");
            setMode("login");
          }
        }
      }
    } catch (err: any) {
      setErrorMsg("An unexpected error occurred. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground font-sans overflow-hidden flex flex-col justify-center items-center px-4 py-12 transition-colors duration-200">
      {/* Decorative Blur Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md z-10 space-y-6">
        
        {/* Brand / Logo */}
        <Link href="/" className="flex flex-col items-center justify-center gap-2 group text-center mb-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-500/25 transition-transform group-hover:scale-105">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-extrabold tracking-tight leading-none bg-clip-text text-foreground">
              Budger
            </h1>
            <span className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase mt-1 block">
              AI Financial Companion
            </span>
          </div>
        </Link>

        {/* Auth Glassmorphic Card */}
        <div className="bg-card/50 dark:bg-card/40 backdrop-blur-md border border-border/80 rounded-3xl p-8 shadow-xl space-y-6">
          
          {/* Form Header / Tabs */}
          <div className="flex p-1 bg-background/50 border border-border rounded-xl">
            <button
              onClick={() => setMode("login")}
              disabled={loading}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                mode === "login"
                  ? "bg-card text-foreground border border-border shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode("register")}
              disabled={loading}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                mode === "register"
                  ? "bg-card text-foreground border border-border shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="text-center">
            <h2 className="text-lg font-bold font-heading">
              {mode === "login" ? "Welcome back" : "Get started with Budger"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1.5">
              {mode === "login"
                ? "Enter your credentials to access your financial dashboard."
                : "Register a new account to manage your money with AI."}
            </p>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium animate-fade-in">
              {errorMsg}
            </div>
          )}
          
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-medium animate-fade-in">
              {successMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-background/50 border border-border rounded-xl py-2.5 pl-11 pr-4 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-emerald-500/40 font-medium"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Password
                </label>
                {mode === "login" && (
                  <a href="#" className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
                    Forgot password?
                  </a>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-background/50 border border-border rounded-xl py-2.5 pl-11 pr-11 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-emerald-500/40 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field (Register Only) */}
            {mode === "register" && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-background/50 border border-border rounded-xl py-2.5 pl-11 pr-4 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-emerald-500/40 font-medium"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold shadow-lg shadow-emerald-500/10 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer text-xs mt-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <>
                  {mode === "login" ? "Sign In" : "Register Now"}
                  <ArrowRight className="h-3.5 w-3.5 ml-2" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground hover:underline inline-flex items-center gap-1 transition-colors">
            ← Back to home
          </Link>
        </div>

      </div>
    </div>
  );
}
