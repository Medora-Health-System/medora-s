"use client";

import { DigitalCarePatientActivationPanel } from "@/features/digital-care/DigitalCarePatientActivationPanel";
import { DigitalCareProviderWorkspace } from "@/features/digital-care/DigitalCareProviderWorkspace";

export default function DigitalCarePage() {
  return (
    <>
      <DigitalCareProviderWorkspace />
      <DigitalCarePatientActivationPanel />
    </>
  );
}
