"use client";

import { LogOut, ChevronDown } from "lucide-react";
import { useState } from "react";
import { logoutAction } from "@/actions/auth";
import { getPlanLabel, getPlanColor } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Props {
  user: {
    name?: string | null;
    email?: string | null;
    id: string;
    role: string;
    plan: string;
  };
}

export default function DashboardHeader({ user }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 lg:px-8 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Title (empty on mobile for hamburger space) */}
        <div className="w-10 lg:w-auto" />

        {/* Right side */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-3 px-3 py-2 rounded-2xl hover:bg-gray-100 transition-colors"
          >
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-violet-500 flex items-center justify-center text-white font-display text-sm font-semibold shadow-sm">
              {user.name?.[0]?.toUpperCase() ?? "U"}
            </div>

            <div className="hidden sm:block text-left">
              <p className="font-body font-semibold text-slate-800 text-sm leading-tight">
                {user.name ?? "Usuario"}
              </p>
              <span
                className={cn(
                  "text-xs font-body font-semibold px-2 py-0.5 rounded-full",
                  getPlanColor(user.plan)
                )}
              >
                {getPlanLabel(user.plan)}
              </span>
            </div>

            <ChevronDown
              className={cn(
                "w-4 h-4 text-slate-400 transition-transform",
                menuOpen && "rotate-180"
              )}
            />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="font-body text-xs text-slate-500">Conectado como</p>
                <p className="font-body font-semibold text-slate-800 text-sm truncate">
                  {user.email}
                </p>
              </div>

              <form
                action={async () => {
                  await logoutAction();
                }}
              >
                <button
                  type="submit"
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-body text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
