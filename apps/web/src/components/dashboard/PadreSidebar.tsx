"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, CreditCard, Rocket, MessageSquare, Settings, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard/padre", icon: Users, label: "Mis Hijos", emoji: "👨‍👩‍👧" },
  { href: "/dashboard/padre/pagos", icon: CreditCard, label: "Pagos", emoji: "💳" },
  { href: "/dashboard/padre/plan", icon: Rocket, label: "Mi Plan", emoji: "🚀" },
  { href: "/dashboard/padre/feedback", icon: MessageSquare, label: "Feedback", emoji: "📩" },
  { href: "/dashboard/padre/cuenta", icon: Settings, label: "Cuenta", emoji: "⚙️" },
];

export default function PadreSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const content = (
    <nav className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-6 py-6 border-b border-white/20">
        <span className="text-3xl">🧠</span>
        <div>
          <span className="font-display text-xl text-white block">NeuralPath</span>
          <span className="text-xs text-white/60 font-body">Portal del Padre</span>
        </div>
      </div>

      <div className="flex-1 px-4 py-6 space-y-1">
        {navItems.map(({ href, label, emoji }) => {
          const isActive =
            href === "/dashboard/padre"
              ? pathname === "/dashboard/padre"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl font-body font-semibold text-sm transition-all",
                isActive
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <span className="text-xl">{emoji}</span>
              {label}
            </Link>
          );
        })}
      </div>

      <div className="px-6 py-4 border-t border-white/20">
        <p className="text-xs text-white/50 font-body text-center">
          NeuralPath © 2025 🇨🇴
        </p>
      </div>
    </nav>
  );

  return (
    <>
      <aside className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-slate-700 to-slate-900 shadow-xl z-30">
        {content}
      </aside>

      <button
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-slate-700 text-white rounded-2xl flex items-center justify-center shadow-md"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Abrir menú"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-slate-700 to-slate-900 shadow-xl z-50">
            {content}
          </aside>
        </>
      )}
    </>
  );
}
