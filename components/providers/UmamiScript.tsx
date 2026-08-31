"use client";

import Script from "next/script";
import { config } from "@/lib/config";

export function UmamiScript() {
  if (!config.integrations.umami.enabled) return null;

  return (
    <Script
      src={`${config.integrations.umami.url}/script.js`}
      data-website-id={config.integrations.umami.websiteId}
      data-do-not-track="true"
      strategy="lazyOnload"
      id="umami-analytics"
    />
  );
}
