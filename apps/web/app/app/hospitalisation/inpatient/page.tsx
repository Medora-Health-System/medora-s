"use client";

import { HospitalCareCensusLaneView } from "@/features/hospital-care/HospitalCareCensusLaneView";

export default function HospitalCareInpatientPage() {
  return <HospitalCareCensusLaneView lane="inpatient" requestedType="INPATIENT" />;
}
