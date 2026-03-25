import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import OnboardingWizard from "@/components/auth/OnboardingWizard";

export const metadata: Metadata = { title: "Configura tu cuenta" };

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">✨</div>
        <h1 className="font-display text-3xl text-slate-900 mb-2">
          ¡Casi listo!
        </h1>
        <p className="font-body text-slate-500">
          Cuéntanos sobre el niño que va a aprender
        </p>
      </div>
      <OnboardingWizard parentId={session.user.id} />
    </div>
  );
}
