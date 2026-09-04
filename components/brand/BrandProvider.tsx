"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { BrandConfig, DEFAULT_BRAND } from "@/lib/brand/types";
import { buildCssVariables } from "@/lib/brand/color-utils";

interface BrandContextType {
  brand: BrandConfig;
  setBrand: React.Dispatch<React.SetStateAction<BrandConfig>>;
  setLivePrimaryColor: (color: string) => void;
}

const BrandContext = createContext<BrandContextType>({
  brand: DEFAULT_BRAND,
  setBrand: () => {},
  setLivePrimaryColor: () => {},
});

export function BrandProvider({
  initialBrand = DEFAULT_BRAND,
  children,
}: {
  initialBrand?: BrandConfig;
  children: React.ReactNode;
}) {
  const [brand, setBrand] = useState<BrandConfig>(initialBrand);

  // Sync client state if initialBrand changes
  useEffect(() => {
    if (initialBrand) {
      setBrand(initialBrand);
    }
  }, [initialBrand]);

  // Method to apply live color preview directly to document element without page refresh
  const setLivePrimaryColor = (primaryColor: string) => {
    setBrand((prev) => {
      const updated = { ...prev, primaryColor };
      if (typeof document !== "undefined") {
        const vars = buildCssVariables(updated);
        for (const [key, value] of Object.entries(vars)) {
          document.documentElement.style.setProperty(key, value);
        }
      }
      return updated;
    });
  };

  const contextValue = useMemo(
    () => ({ brand, setBrand, setLivePrimaryColor }),
    [brand]
  );

  return (
    <BrandContext.Provider value={contextValue}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand(): BrandContextType {
  return useContext(BrandContext);
}
