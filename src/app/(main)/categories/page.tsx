"use client";

import React, { useState, useEffect } from "react";
import { 
  Coffee,
  ShoppingBag,
  Home,
  Car,
  Activity,
  BookOpen,
  Gamepad2,
  DollarSign,
  TrendingUp,
  Gift,
  HelpCircle,
  Tag,
  Loader2,
  Sparkles,
  Edit2,
  Trash2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/shared/AuthProvider";
import { Select } from "@/components/ui/select";
import { customToast } from "@/components/ui/custom-toast";
import { z } from "zod";

interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  icon: string;
}

export default function CategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("HelpCircle");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [suggestingIcon, setSuggestingIcon] = useState(false);
  const [newCategoryError, setNewCategoryError] = useState("");

  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [user]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error("Error loading categories:", err);
      customToast.error("Failed to load categories.");
    } finally {
      setLoading(false);
    }
  };

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

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const catSchema = z.string().min(1, "Name is required").max(30, "Name must be under 30 characters");
    const check = catSchema.safeParse(newCategoryName.trim());
    if (!check.success) {
      setNewCategoryError(check.error.issues[0].message);
      return;
    }
    setNewCategoryError("");

    try {
      const { error } = await supabase
        .from("categories")
        .insert({
          user_id: user.id,
          name: newCategoryName.trim(),
          type: "EXPENSE",
          icon: newCategoryIcon
        });

      if (error) throw error;

      setNewCategoryName("");
      setNewCategoryIcon("HelpCircle");
      customToast.success("Category created successfully!");
      fetchCategories();
    } catch (err) {
      console.error("Error adding category:", err);
      customToast.error("Failed to create category");
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    const catSchema = z.string().min(1, "Name is required").max(30, "Name must be under 30 characters");
    const check = catSchema.safeParse(newCategoryName.trim());
    if (!check.success) {
      setNewCategoryError(check.error.issues[0].message);
      return;
    }
    setNewCategoryError("");

    try {
      const { error } = await supabase
        .from("categories")
        .update({
          name: newCategoryName.trim(),
          icon: newCategoryIcon
        })
        .eq("id", editingCategory.id);

      if (error) throw error;

      setEditingCategory(null);
      setNewCategoryName("");
      setNewCategoryIcon("HelpCircle");
      customToast.success("Category updated successfully!");
      fetchCategories();
    } catch (err) {
      console.error("Error updating category:", err);
      customToast.error("Failed to update category");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    customToast.confirm(
      "Deleting this category will set associated transactions' categories to Null. Continue?",
      async () => {
        try {
          const { error } = await supabase
            .from("categories")
            .delete()
            .eq("id", id);

          if (error) throw error;
          customToast.success("Category deleted successfully!");
          fetchCategories();
        } catch (err) {
          console.error("Error deleting category:", err);
          customToast.error("Failed to delete category");
        }
      },
      { confirmLabel: "Continue", variant: "danger" }
    );
  };

  const suggestCategoryIcon = async () => {
    if (!newCategoryName.trim()) {
      customToast.error("Please enter a category name first!");
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
          customToast.success(`AI suggested: ${data.icon}`);
        }
      }
    } catch (err) {
      console.error("Error suggesting icon:", err);
    } finally {
      setSuggestingIcon(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 relative text-foreground font-sans">
      {/* 1. Header Banner */}
      <div className="rounded-3xl bg-card border border-border p-6 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 dark:bg-emerald-500/10 blur-[40px] rounded-full pointer-events-none" />
        <p className="text-xs font-bold text-muted-foreground tracking-wide uppercase">Settings & Preferences</p>
        <h1 className="text-2xl font-extrabold tracking-tight font-heading mt-2">
          Category Management
        </h1>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          Create, edit, or delete categories used for mapping your income and expense transactions.
        </p>
      </div>

      {loading && categories.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-xs text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500 mb-2" />
          <span>Loading categories...</span>
        </div>
      ) : (
        /* 2. Responsive Content Grid */
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Left Column: Form (2/5) */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
              <h3 className="text-sm font-bold font-heading border-b border-border pb-3 mb-4">
                {editingCategory ? "Edit Category Details" : "Create New Category"}
              </h3>
              
              <form 
                onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory}
                className="grid grid-cols-1 gap-3"
              >
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Category Name</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => {
                        setNewCategoryName(e.target.value);
                        setNewCategoryError("");
                      }}
                      placeholder="e.g. Cosmetics, Books, Rent"
                      className="flex-1 bg-background border border-border rounded-xl py-2 px-3 text-xs text-foreground focus:outline-none placeholder-muted-foreground font-semibold"
                    />
                    <button
                      type="button"
                      onClick={suggestCategoryIcon}
                      disabled={suggestingIcon}
                      className="px-3 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-500 border border-emerald-500/20 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {suggestingIcon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      Suggest Icon
                    </button>
                  </div>
                  {newCategoryError && <span className="text-[10px] text-rose-500 block mt-0.5">{newCategoryError}</span>}
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
                              : "border-border bg-background hover:bg-accent/40 text-muted-foreground"
                          }`}
                        >
                          <IconComp className="h-4 w-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2 mt-2">
                  {editingCategory && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(null);
                        setNewCategoryName("");
                        setNewCategoryIcon("HelpCircle");
                        setNewCategoryError("");
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-accent border border-border text-muted-foreground font-semibold hover:text-foreground transition-colors cursor-pointer text-xs"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold text-xs cursor-pointer flex items-center justify-center"
                  >
                    {editingCategory ? "Update Category" : "Create Category"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: List (3/5) */}
          <div className="md:col-span-3 space-y-4">
            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm flex flex-col h-full">
              <h3 className="text-sm font-bold font-heading border-b border-border pb-3 mb-4">
                Existing Categories ({categories.length})
              </h3>
              <div className="space-y-2 overflow-y-auto max-h-[480px] pr-1">
                {categories.map((c) => {
                  const CatIcon = getCategoryIconComponent(c.icon);
                  return (
                    <div 
                      key={c.id} 
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-background border border-border hover:border-emerald-500/20 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-card text-muted-foreground border border-border">
                          <CatIcon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-semibold">{c.name}</span>

                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingCategory(c);
                            setNewCategoryName(c.name);
                            setNewCategoryIcon(c.icon || "HelpCircle");
                            setNewCategoryError("");
                          }}
                          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(c.id)}
                          className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
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
