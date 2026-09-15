"use client";

import FollowUpsPage from "../../follow-ups/page";

/**
 * Clinic Care keeps the shared enterprise Follow-ups engine mounted inside the persistent
 * Clinic Care layout instead of redirecting to the standalone /app/follow-ups route.
 * Query-string filters are preserved automatically because the shared page reads the
 * current route's search params.
 */
export default function ClinicCareFollowUpPage() {
  return <FollowUpsPage />;
}
