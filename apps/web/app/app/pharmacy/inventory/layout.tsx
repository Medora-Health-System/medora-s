import { Suspense, type ReactNode } from "react";
import { CommonSuspenseFallback } from "@/components/i18n/CommonSuspenseFallback";

export default function PharmacyInventoryLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <Suspense fallback={<CommonSuspenseFallback />}>{children}</Suspense>;
}
