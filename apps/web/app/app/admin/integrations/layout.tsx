import Link from "next/link";
import type { ReactNode } from "react";

export default function IntegrationsLayout({ children }: { children: ReactNode }) {
  return <>
    <div style={{ maxWidth: 1100, margin: "18px auto 0", padding: "0 24px", display: "flex", justifyContent: "flex-end" }}>
      <Link href="/app/admin/integrations/manage" style={{ fontWeight: 700 }}>FHIR Connection Manager →</Link>
    </div>
    {children}
  </>;
}
