import { Suspense, type ReactNode } from "react";

export default function PharmacyInventoryLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <Suspense fallback={<p>Chargement…</p>}>{children}</Suspense>;
}
