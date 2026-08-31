import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Phase 1 — Inbox unification. Permanent redirects from the deprecated
// /manager/emails Hub to the canonical /manager/email surface. Safe to keep
// for ~90 days; remove after analytics confirm no traffic.
const MANAGER_EMAIL_REDIRECTS: Record<string, string> = {
    "/manager/emails": "/manager/email/overview",
    "/manager/emails/sent": "/manager/email/sent",
    "/manager/emails/contacts": "/manager/email/contacts",
    "/manager/emails/mailboxes": "/manager/email/mailboxes",
    "/manager/emails/analytics": "/manager/email/analytics",
    "/manager/emails/sequences": "/manager/email/sequences",
};

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const path = req.nextUrl.pathname;
        const apiKey = req.headers.get("x-api-key");

        // 0. Phase 1 IA redirects (Hub → canonical Inbox). Run before role
        //    gating so even pre-auth navigations land on the new URL.
        const exactRedirect = MANAGER_EMAIL_REDIRECTS[path];
        if (exactRedirect) {
            const url = req.nextUrl.clone();
            url.pathname = exactRedirect;
            return NextResponse.redirect(url, 308);
        }
        // Prefix-match for /manager/emails/sequences/<id>, /sequences/new, etc.
        if (path.startsWith("/manager/emails/")) {
            const url = req.nextUrl.clone();
            url.pathname = path.replace("/manager/emails/", "/manager/email/");
            return NextResponse.redirect(url, 308);
        }

        // 1. Autoriser l'accès si une API Key est présente
        // On laisse la route API finale valider si la clé est correcte dans Supabase
        if (apiKey) {
            return NextResponse.next();
        }

        // 2. Vérification du compte actif pour les sessions normales
        if (token?.isActive === false) {
            return NextResponse.redirect(new URL("/blocked", req.url));
        }

        // 3. Protection des routes par rôle (Sessions uniquement)
        if (path.startsWith("/sdr") && 
            token?.role !== "SDR" && 
            token?.role !== "BUSINESS_DEVELOPER" && 
            token?.role !== "BOOKER") {
            return NextResponse.redirect(new URL("/unauthorized", req.url));
        }

        if (path.startsWith("/manager") && token?.role !== "MANAGER") {
            return NextResponse.redirect(new URL("/unauthorized", req.url));
        }

        // Technical Intake & Triage cockpit — MANAGER only (top role in this org).
        if (path.startsWith("/admin/intake") && token?.role !== "MANAGER") {
            return NextResponse.redirect(new URL("/unauthorized", req.url));
        }

        if (path.startsWith("/client") && token?.role !== "CLIENT") {
            return NextResponse.redirect(new URL("/unauthorized", req.url));
        }

        if (path.startsWith("/developer") && token?.role !== "DEVELOPER") {
            return NextResponse.redirect(new URL("/unauthorized", req.url));
        }

        if (path.startsWith("/bd") && token?.role !== "BUSINESS_DEVELOPER") {
            return NextResponse.redirect(new URL("/unauthorized", req.url));
        }

        if (path.startsWith("/commercial") && token?.role !== "COMMERCIAL") {
            return NextResponse.redirect(new URL("/unauthorized", req.url));
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            // Autorise l'accès si un token de session existe OU si une API Key est fournie
            authorized: ({ token, req }) => {
                const apiKey = req.headers.get("x-api-key");
                return !!token || !!apiKey;
            },
        },
    }
);

export const config = {
    matcher: [
        "/sdr/:path*",
        "/manager/:path*",
        "/client/:path*",
        "/developer/:path*",
        "/bd/:path*",
        "/commercial/:path*",
        "/admin/intake/:path*",
        "/calendar",
        "/dashboard",
        // All /api routes except /api/auth/* (NextAuth handles its own routes)
        "/api/((?!auth/).*)",
    ],
};
