import { Card, Button } from "@/components/ui";
import { ShieldX, ArrowLeft, Home } from "lucide-react";
import Link from "next/link";

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--elan-paper)] via-[var(--elan-surface)] to-[var(--elan-eucalyptus)]/40 p-4">
            <Card variant="glass" className="max-w-md w-full text-center shadow-xl shadow-[rgba(12,59,56,0.12)]">
                <div className="w-16 h-16 rounded-2xl bg-[rgba(185,67,62,0.12)] mx-auto mb-6 flex items-center justify-center">
                    <ShieldX className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-[var(--elan-ink)] mb-2">Accès non autorisé</h1>
                <p className="text-[var(--elan-slate)] mb-6">
                    Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
                </p>
                <div className="flex gap-3 justify-center">
                    <Link href="/">
                        <Button variant="secondary" className="gap-2">
                            <Home className="w-4 h-4" />
                            Accueil
                        </Button>
                    </Link>
                    <Link href="/login">
                        <Button variant="primary" className="gap-2">
                            <ArrowLeft className="w-4 h-4" />
                            Connexion
                        </Button>
                    </Link>
                </div>
            </Card>
        </div>
    );
}
