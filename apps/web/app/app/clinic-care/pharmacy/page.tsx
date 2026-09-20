"use client";

import { Suspense } from "react";
import PharmacyPage from "@/app/app/pharmacy/page";

/** Render the connected module inside the persistent, access-guarded Clinic Care shell. */
export default function ClinicCarePharmacyPage() {
  return <Suspense fallback={<p role="status">Loading…</p>}><PharmacyPage /></Suspense>;
}
