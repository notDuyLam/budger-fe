"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
  icon?: React.ComponentType<any>;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

export function Select({ value, onValueChange, options, placeholder = "Select...", className = "" }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-background border border-border rounded-xl p-2.5 text-xs text-foreground font-semibold focus:outline-none focus:border-emerald-500/40 hover:bg-accent/30 transition-colors cursor-pointer text-left"
      >
        <span className="truncate flex items-center gap-1.5">
          {selectedOption?.icon && <selectedOption.icon className="h-3.5 w-3.5 text-muted-foreground" />}
          {selectedOption ? selectedOption.label : <span className="text-muted-foreground/60">{placeholder}</span>}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200" style={{ transform: open ? "rotate(180deg)" : "none" }} />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1.5 bg-card border border-border rounded-2xl shadow-xl max-h-60 overflow-y-auto animate-scale-up p-1.5 text-foreground">
          {options.length === 0 ? (
            <div className="text-center text-[10px] text-muted-foreground py-2">No options available</div>
          ) : (
            options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onValueChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-accent hover:text-foreground transition-colors cursor-pointer text-left ${
                    isSelected ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold" : "text-muted-foreground"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {opt.icon && <opt.icon className="h-3.5 w-3.5 text-muted-foreground" />}
                    {opt.label}
                  </span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
