"use client";

import { HospitalCareCensusLaneView } from "@/features/hospital-care/HospitalCareCensusLaneView";

export default function HospitalCareObservationPage() {
  return <HospitalCareCensusLaneView lane="observation" requestedType="OBSERVATION" />;
}
