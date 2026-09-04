import { BrandConfig, DEFAULT_BRAND } from "./types";

/**
 * Normalizes 3-char or 6-char hex strings into { r, g, b }
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleanHex = hex.replace(/^#/, "").trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (cleanHex.length !== 6) {
    // Fallback on Ping Blue if invalid
    return { r: 40, g: 144, b: 248 };
  }
  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Converts Hex to "r, g, b" string for Tailwind / rgba() usage
 */
export function hexToRgbString(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `${r}, ${g}, ${b}`;
}

/**
 * Generates a darkened shade for hover states (-15% lightness)
 */
export function getHoverShade(hex: string, factor: number = 0.85): string {
  const { r, g, b } = hexToRgb(hex);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * factor)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generates a subtle light tint for badges/pastilles (+85% mixed with white)
 */
export function getLightTint(hex: string, tintRatio: number = 0.88): string {
  const { r, g, b } = hexToRgb(hex);
  const mix = (channel: number) => Math.round(channel * (1 - tintRatio) + 255 * tintRatio);
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

/**
 * Builds the CSS variables dictionary to be injected on <html style="...">
 */
export function buildCssVariables(brand: BrandConfig): Record<string, string> {
  const primary = brand.primaryColor || DEFAULT_BRAND.primaryColor;
  const accent = brand.accentColor || DEFAULT_BRAND.accentColor;

  return {
    "--brand-primary": primary,
    "--brand-primary-hover": getHoverShade(primary, 0.84),
    "--brand-primary-dark": getHoverShade(primary, 0.72),
    "--brand-primary-light": getLightTint(primary, 0.88),
    "--brand-primary-rgb": hexToRgbString(primary),

    "--brand-accent": accent,
    "--brand-accent-hover": getHoverShade(accent, 1.2),

    // Backward compatibility aliases for legacy stylesheets during transition
    "--elan-amber": primary,
    "--elan-amber-deep": getHoverShade(primary, 0.84),
    "--elan-petrol": accent,
  };
}
