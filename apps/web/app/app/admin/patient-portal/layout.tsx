"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const tabs = [
  { href: "/app/admin/patient-portal", label: "Patient Access" },
  { href: "/app/admin/patient-portal/requests", label: "Patient Requests" },
];

export default function PatientPortalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <>
      <nav aria-label="Patient Portal workspace" style={{ maxWidth: 1280, margin: "18px auto 0", padding: "0 24px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
          {tabs.map((tab) => {
            const active = tab.href === "/app/admin/patient-portal"
              ? pathname === tab.href
              : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                style={{
                  padding: "9px 13px",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontWeight: 700,
                  background: active ? "#087E8B" : "#f1f5f9",
                  color: active ? "white" : "#334155",
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
      {children}
    </>
  );
}
