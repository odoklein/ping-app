import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[100dvh] flex items-center justify-center bg-[#FCFAFF]">
                <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-primary animate-spin" />
                    <span>Chargement de la console...</span>
                </div>
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
