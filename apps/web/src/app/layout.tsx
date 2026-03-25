import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "NeuralPath — Aprende con IA",
    template: "%s | NeuralPath",
  },
  description:
    "Plataforma educativa para niños de 6 a 14 años con cursos en video y mentores IA personalizados.",
  keywords: ["educación", "niños", "cursos", "inteligencia artificial", "Colombia"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
