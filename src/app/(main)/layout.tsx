"use client";

import React from "react";
import Sidebar from "@/components/shared/Sidebar";
import BottomNav from "@/components/shared/BottomNav";
import Header from "@/components/shared/Header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background font-sans text-foreground antialiased transition-colors duration-200">
      {/* 1. Sidebar Navigation (Visible on PC >= md) */}
      <Sidebar />

      {/* 2. Main Content Container */}
      <div className="flex-1 flex flex-col min-h-0 bg-background relative overflow-hidden">
        {/* Glow decorative background elements */}
        <div className="absolute top-[20%] left-[30%] w-[350px] h-[350px] rounded-full bg-emerald-500/5 dark:bg-emerald-500/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[30%] w-[350px] h-[350px] rounded-full bg-indigo-500/5 dark:bg-indigo-500/5 blur-[120px] pointer-events-none" />

        {/* Header */}
        <Header />

        {/* Scrollable Page Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 flex flex-col p-4 md:p-8">
          <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col">
            {children}
          </div>
        </div>

        {/* Bottom Navigation (Visible on Mobile < md) */}
        <div className="md:hidden shrink-0">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
