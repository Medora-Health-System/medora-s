"use client";

import { useParams } from "next/navigation";
import { EnterpriseDentalEncounterWorkspace } from "@/features/dental-care/EnterpriseDentalEncounterWorkspace";

/** MEDUI.D5A.3 — Canonical Dental active workspace by encounterId. */
export default function DentalEncounterWorkspacePage() {
  const params = useParams();
  const encounterId = String(params?.encounterId ?? "").trim();
  if (!encounterId) return null;
  return <EnterpriseDentalEncounterWorkspace encounterId={encounterId} />;
}
