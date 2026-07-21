"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { inpatientActiveWorkspacePath } from "@/features/inpatient-workspace/inpatientWorkspacePaths";

/**
 * D3E.6C — Unit-scoped patient workspace route.
 * Resolves to the shared Inpatient encounter workspace (one enterprise chart).
 */
export default function InpatientUnitPatientWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const encounterId = String(params?.encounterId ?? "");

  useEffect(() => {
    if (!encounterId) return;
    router.replace(inpatientActiveWorkspacePath(encounterId));
  }, [encounterId, router]);

  return null;
}
