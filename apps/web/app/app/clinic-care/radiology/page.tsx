"use client";

import { Suspense } from "react";
import RadiologyPage from "@/app/app/radiology/page";

/** Render the connected module inside the persistent, access-guarded Clinic Care shell. */
export default function ClinicCareRadiologyPage() {
  return <Suspense fallback={<p role="status">Loading…</p>}><RadiologyPage /></Suspense>;
}
