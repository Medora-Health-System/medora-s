"use client";

import { Suspense } from "react";
import { EnterpriseOperationsPlatformView } from "@/features/hospital-care/EnterpriseOperationsPlatformView";

export default function EnterpriseOperationsPlatformPage() {
  return (
    <Suspense fallback={null}>
      <EnterpriseOperationsPlatformView />
    </Suspense>
  );
}
