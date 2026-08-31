import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-[100dvh] flex items-center justify-center bg-[var(--elan-paper)]">
            <div className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--elan-slate)] animate-pulse">Préparation de votre espace...</div>
        </div>}>
            <LoginForm />
        </Suspense>
    );
}
