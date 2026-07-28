"use client";

import { useSearchParams } from "next/navigation";
import { ClinicCareDirectCanonicalRedirect } from "@/features/clinic-care/ClinicCareDirectCanonicalRedirect";

/** MEDUI.D4C.5B.1 — preserve typed drill-down query when opening enterprise Follow-ups. */
export default function ClinicCareFollowUpPage() {
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const href = qs ? `/app/follow-ups?${qs}` : "/app/follow-ups";
  return (
    <ClinicCareDirectCanonicalRedirect
      href={href}
      labelKey="clinicCareD4c4.redirectingFollowUp"
    />
  );
}
