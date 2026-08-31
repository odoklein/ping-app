"use client";

import { memo } from "react";
import { hashColor } from "../../_lib/formatters";

export const Avatar = memo(function Avatar({
  name,
  size = 32,
}: {
  name: string;
  size?: number;
}) {
  const color = hashColor(name);
  const first = name
    .split(" ")
    .map((w) => w[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";
  return (
    <div
      className="rdv-avatar"
      role="img"
      aria-label={name ? `Avatar de ${name}` : "Avatar sans nom"}
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: size * 0.36,
      }}
    >
      {first}
    </div>
  );
});
