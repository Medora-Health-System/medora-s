"use client";

import { Suspense } from "react";
import BillingPage from "@/app/app/billing/page";

/** Render the connected module inside the persistent, access-guarded Clinic Care shell. */
export default function ClinicCareBillingPage() {
  return <Suspense fallback={<p role="status">Loading…</p>}><BillingPage /></Suspense>;
}
