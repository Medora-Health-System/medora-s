"use client";

import FollowUpsPage from "../../follow-ups/page";

/**
 * Clinic Care follow-up view stays inside the nested Clinic Care layout.
 * Reuse the enterprise Follow-ups page directly rather than redirecting out to
 * `/app/follow-ups`, so the Clinic Care header and workspace context remain mounted.
 */
export default function ClinicCareFollowUpPage() {
  return <FollowUpsPage />;
}
