import { Suspense } from "react";
import type { Metadata } from "next";
import InviteActivationForm from "./InviteActivationForm";

export const metadata: Metadata = {
    title: "Activation de votre compte | Ping",
    robots: { index: false, follow: false },
};

export default async function InvitePage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;

    return (
        <Suspense
            fallback={
                <div className="min-h-[100dvh] flex items-center justify-center bg-[#FCFAFF]">
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                        <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-primary animate-spin" />
                        <span>Vérification de votre invitation…</span>
                    </div>
                </div>
            }
        >
            <InviteActivationForm token={token} />
        </Suspense>
    );
}
