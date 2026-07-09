"use client";

import React, { useState, useCallback } from "react";

interface MoneyInputProps {
  value: string; // raw numeric string, e.g. "1000000"
  onChange: (rawValue: string) => void; // returns raw digits only
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  allowNegative?: boolean;
}

/**
 * MoneyInputFormatter — Reusable component for VND currency inputs.
 * Displays formatted number with dot separators (e.g. "1.000.000")
 * while keeping raw numeric value in state for form submission.
 */
export function MoneyInput({
  value,
  onChange,
  placeholder = "e.g. 1.000.000",
  className = "",
  required = false,
  disabled = false,
  id,
  allowNegative = false,
}: MoneyInputProps) {
  // Format raw number string to display with dot separators
  const formatDisplay = (raw: string): string => {
    if (!raw) return "";
    const isNegative = allowNegative && raw.startsWith("-");
    const digits = raw.replace(/\D/g, "");
    if (!digits) return isNegative ? "-" : "";
    const formatted = parseInt(digits, 10).toLocaleString("de-DE"); // de-DE uses dots for thousands
    return isNegative ? `-${formatted}` : formatted;
  };

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      const isNegative = allowNegative && val.startsWith("-");
      const digits = val.replace(/\D/g, "");
      const raw = isNegative ? `-${digits}` : digits;
      onChange(raw);
    },
    [onChange, allowNegative]
  );

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      required={required}
      disabled={disabled}
      value={formatDisplay(value)}
      onChange={handleChange}
      placeholder={placeholder}
      className={`w-full bg-background border border-border rounded-xl py-2.5 px-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-emerald-500/40 font-semibold ${className}`}
    />
  );
}

