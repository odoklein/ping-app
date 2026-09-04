"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useBrand } from "./BrandProvider";

export interface BrandLogoProps {
  className?: string;
  compact?: boolean;
  tone?: "paper" | "ink" | "petrol";
}

export function BrandLogo({
  className,
  compact = false,
  tone = "paper",
}: BrandLogoProps) {
  const { brand } = useBrand();

  const isDark = tone !== "petrol";
  const defaultAsset = isDark
    ? "/brand/ping-logo-white.png"
    : "/brand/ping-logo-blue.png";
  const customLogoUrl = isDark
    ? brand?.logoDarkUrl || brand?.logoUrl
    : brand?.logoUrl || brand?.logoDarkUrl;

  const logoSrc = customLogoUrl || defaultAsset;

  return (
    <span
      className={cn(
        "elan-logo",
        `elan-logo-${tone}`,
        compact && "elan-logo-compact",
        className
      )}
      role="img"
      aria-label={brand?.name || "Ping"}
    >
      <Image
        aria-hidden="true"
        alt={`${brand?.name || "Ping"} Logo`}
        className="elan-logo-image"
        height={40}
        src={logoSrc}
        unoptimized
        width={120}
      />
    </span>
  );
}

export default BrandLogo;
