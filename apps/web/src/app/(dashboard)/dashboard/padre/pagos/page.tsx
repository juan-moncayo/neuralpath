import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@neuralpath/database";
import { formatCop } from "@/lib/utils";

export const metadata: Metadata = { title: "Mis Pagos — NeuralPath" };

const STATUS_LABELS: Record<string, { label: string; classes: string }> = {
  approved: { label: "Aprobado", classes: "bg-emerald-100 text-emerald-700" },
  pending:  { label: "Pendiente", classes: "bg-amber-100 text-amber-700" },
  declined: { label: "Rechazado", classes: "bg-red-100 text-red-700" },
  voided:   { label: "Anulado",   classes: "bg-gray-100 text-gray-600" },
};

export default async function PagosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const payments = await prisma.paymentCop.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl text-slate-900">💳 Mis Pagos</h1>
        <p className="font-body text-slate-500 mt-1">
          Historial de transacciones
        </p>
      </div>

      {payments.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100">
          <div className="text-5xl mb-4">💸</div>
          <h3 className="font-display text-xl text-slate-900 mb-2">
            Sin pagos todavía
          </h3>
          <p className="font-body text-slate-500">
            Aquí aparecerán tus transacciones con Wompi.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="hidden sm:grid grid-cols-5 px-5 py-3 border-b border-gray-100 text-xs font-body font-semibold text-slate-400 uppercase tracking-wide">
            <span>Fecha</span>
            <span>Concepto</span>
            <span>Monto</span>
            <span>Método</span>
            <span>Estado</span>
          </div>

          <div className="divide-y divide-gray-50">
            {payments.map((p) => {
              const statusInfo = STATUS_LABELS[p.status] ?? STATUS_LABELS["pending"]!;
              const date = new Date(p.createdAt).toLocaleDateString("es-CO", {
                day: "numeric", month: "short", year: "numeric",
              });

              return (
                <div
                  key={p.id}
                  className="grid grid-cols-2 sm:grid-cols-5 gap-2 px-5 py-4 items-center"
                >
                  <p className="font-body text-sm text-slate-500">{date}</p>
                  <p className="font-body text-sm text-slate-800 capitalize font-semibold">
                    {p.plan ? `Plan ${p.plan}` : "Curso"}
                  </p>
                  <p className="font-body text-sm text-slate-800 font-semibold">
                    {formatCop(p.amountCop)}
                  </p>
                  <p className="font-body text-sm text-slate-500 capitalize">
                    {p.method}
                  </p>
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-body font-bold ${statusInfo.classes}`}
                  >
                    {statusInfo.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
