import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Mono, DM_Sans } from "next/font/google";
import "./globals.css";
import "./elan-theme.css";
import Providers from "@/components/providers/Providers";
import { BrandProvider } from "@/components/brand/BrandProvider";
import { resolveCurrentBrand } from "@/lib/brand/server-resolver";
import { buildCssVariables } from "@/lib/brand/color-utils";
import { Analytics } from "@vercel/analytics/next";
import { UmamiScript } from "@/components/providers/UmamiScript";
import { MobilePushHandler } from "@/components/mobile/MobilePushHandler";

const vercelAnalyticsEnabled = process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ENABLED === "true";

const displayFont = Bricolage_Grotesque({
  variable: "--font-elan-display",
  subsets: ["latin"],
});

const sansFont = DM_Sans({
  variable: "--font-elan-sans",
  subsets: ["latin"],
});

const monoFont = DM_Mono({
  variable: "--font-elan-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0B132B",
};

export const metadata: Metadata = {
  title: "Ping | Plateforme d'exécution commerciale",
  description: "La plateforme d'exécution commerciale qui transforme l'activité en résultats.",
  icons: {
    icon: [
      { url: "/brand/ping-logo-blue.png", type: "image/png" },
    ],
    apple: "/brand/ping-logo-blue.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const brand = await resolveCurrentBrand();
  const cssVars = buildCssVariables(brand);

  return (
    <html lang="fr" style={cssVars as React.CSSProperties} suppressHydrationWarning>
      <body
        className={`${displayFont.variable} ${sansFont.variable} ${monoFont.variable} elan-app antialiased`}
        suppressHydrationWarning
      >
        <BrandProvider initialBrand={brand}>
          <Providers>
            {children}
            <MobilePushHandler />
          </Providers>
        </BrandProvider>
        {vercelAnalyticsEnabled ? <Analytics /> : null}
        <UmamiScript />
      </body>
    </html>
  );
}
