export interface BrandConfig {
  name: string;
  tagline?: string;
  primaryColor: string;     // e.g. "#2890F8"
  accentColor: string;      // e.g. "#080808"
  logoUrl?: string | null;  // Light theme logo or default
  logoDarkUrl?: string | null;
  faviconUrl?: string | null;
}

export const DEFAULT_BRAND: BrandConfig = {
  name: "Ping",
  tagline: "Plateforme d'exécution commerciale",
  primaryColor: "#2890F8",
  accentColor: "#080808",
  logoUrl: "/brand/ping-logo-blue.png",
  logoDarkUrl: "/brand/ping-logo-white.png",
  faviconUrl: "/brand/ping-logo-blue.png",
};

export const BRAND_COLOR_PRESETS: { name: string; hex: string; description: string }[] = [
  { name: "Ping Blue", hex: "#2890F8", description: "Bleu électrique moderne par défaut" },
  { name: "Émeraude FinTech", hex: "#059669", description: "Vert dynamique axé finance & performance" },
  { name: "Améthyste SaaS", hex: "#7C3AED", description: "Violet tech premium & digital" },
  { name: "Saphir Corporate", hex: "#2563EB", description: "Bleu roi classique pour grands comptes" },
  { name: "Rubis Closing", hex: "#E11D48", description: "Framboise vif orienté conversion" },
  { name: "Ébène & Ambre", hex: "#D97706", description: "Tonalités dorées & chaleureuses" },
];
