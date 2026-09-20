"use client";

import { Suspense } from "react";
import LabPage from "@/app/app/lab/page";

/** Render the connected module inside the persistent, access-guarded Clinic Care shell. */
export default function ClinicCareLaboratoryPage() {
  return <Suspense fallback={<p role="status">Loading…</p>}><LabPage /></Suspense>;
}
