"use client";

import { Suspense } from "react";
import AppointmentsPage from "@/app/app/appointments/page";

/** Keep the Clinic Care header and top tabs mounted while showing the connected calendar. */
export default function ClinicCareFollowUpPage() {
  return <Suspense fallback={<p role="status">Loading…</p>}><AppointmentsPage /></Suspense>;
}
