"use client";

import { useParams } from "next/navigation";
import { InpatientUnitBoardView } from "@/features/inpatient-workspace/InpatientUnitBoardView";

export default function InpatientDedicatedUnitBoardPage() {
  const params = useParams();
  const unitId = String(params?.unitId ?? "");
  return <InpatientUnitBoardView mode={{ kind: "unit", unitSlug: unitId }} />;
}
