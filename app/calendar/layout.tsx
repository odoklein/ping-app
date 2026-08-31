"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import "./calendar.css";

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="cal-shell" style={{ alignItems: "center", justifyContent: "center" }}>
        <div className="cal-spinner" />
      </div>
    );
  }

  if (status !== "authenticated") return null;

  return <div className="cal-shell">{children}</div>;
}
