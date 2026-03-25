import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCop(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getPlanLabel(plan: string): string {
  const labels: Record<string, string> = {
    free: "Plan Gratis",
    premium: "Plan Premium",
    pro: "Plan Pro",
  };
  return labels[plan] ?? "Plan Gratis";
}

export function getPlanColor(plan: string): string {
  const colors: Record<string, string> = {
    free: "bg-gray-100 text-gray-700",
    premium: "bg-violet-100 text-violet-700",
    pro: "bg-brand-100 text-brand-700",
  };
  return colors[plan] ?? "bg-gray-100 text-gray-700";
}
