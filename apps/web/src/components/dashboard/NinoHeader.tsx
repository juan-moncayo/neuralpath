"use client";

import { exitChildProfileAction } from "@/actions/children";
import { LogOut } from "lucide-react";

interface Props {
  childName: string;
  childEmoji: string;
}

export default function NinoHeader({ childName, childEmoji }: Props) {
  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-violet-100 px-4 lg:px-8 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="w-10 lg:w-auto flex items-center gap-2">
          <span className="text-2xl hidden sm:block">{childEmoji}</span>
          <p className="font-body font-semibold text-slate-800 text-sm hidden sm:block">
            ¡Hola, {childName}! 👋
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await exitChildProfileAction();
          }}
        >
          <button
            type="submit"
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-body font-semibold text-slate-500 hover:bg-gray-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Salir del perfil</span>
          </button>
        </form>
      </div>
    </header>
  );
}
