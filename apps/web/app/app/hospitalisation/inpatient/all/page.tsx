"use client";

import { InpatientUnitBoardView } from "@/features/inpatient-workspace/InpatientUnitBoardView";

export default function InpatientAllUnitsBoardPage() {
  return <InpatientUnitBoardView mode={{ kind: "all" }} />;
}
