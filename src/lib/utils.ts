import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatDateFull(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(date));
}

export function pnlClass(value: number): string {
  if (value > 0) return "text-success";
  if (value < 0) return "text-destructive";
  return "text-muted-foreground";
}

export function getBaseAsset(symbol: string): string {
  return symbol.replace(/USD[T]?$/, "");
}

export function getErrorMessage(error: unknown): string {
  if (!error) return "Request failed";
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const errObj = error as {
      error?: { message?: string; code?: string };
      message?: string;
    };
    if (errObj.error?.message && typeof errObj.error.message === "string") {
      return errObj.error.message;
    }
    if (errObj.message && typeof errObj.message === "string") {
      return errObj.message;
    }
  }
  return "Request failed";
}

export function getPriceDecimals(price: number, tickSize?: number | null): number {
  if (tickSize != null && tickSize < 0.0001) return 8;
  if (price < 0.1) return 6;
  if (price < 10) return 4;
  return 2;
}

export function hexToRgba(color: string, alpha: number): string {
  if (!color) return `rgba(41, 98, 255, ${alpha})`;
  if (color.startsWith("rgba(") || color.startsWith("rgb(")) {
    const match = color.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (match) {
      return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
    }
  }
  const clean = color.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
