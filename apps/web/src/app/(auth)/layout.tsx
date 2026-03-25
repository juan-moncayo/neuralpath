import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-violet-50 flex flex-col">
      {/* Logo */}
      <div className="flex justify-center pt-8">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-3xl group-hover:scale-110 transition-transform">🧠</span>
          <span className="font-display text-2xl text-brand-600">NeuralPath</span>
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">{children}</div>
      </div>

      {/* Footer */}
      <footer className="text-center pb-6 text-sm text-slate-500 font-body">
        © {new Date().getFullYear()} NeuralPath Colombia · Hecho con ❤️ para niños curiosos
      </footer>
    </div>
  );
}
