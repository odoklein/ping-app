"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/ui";
import { createQueryClient } from "@/lib/query-client";
import { OnboardingController } from "@/components/onboarding/OnboardingController";

interface ProvidersProps {
    children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
    const [client] = useState(createQueryClient);
    return (
        <QueryClientProvider client={client}>
            <SessionProvider>
                <ToastProvider position="top-right">
                    {children}
                    {/* Role onboarding wizard: renders only on the first login
                        of an account that has not completed it yet. */}
                    <OnboardingController />
                </ToastProvider>
            </SessionProvider>
        </QueryClientProvider>
    );
}
