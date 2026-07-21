"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { findServiceLineBySlug } from "@medora/shared";
import { InpatientUnitBoardView } from "@/features/inpatient-workspace/InpatientUnitBoardView";
import { INPATIENT_UNIT_TREE_PATH } from "@/features/inpatient-workspace/inpatientUnitBoardPaths";

export default function InpatientServiceLineBoardPage() {
  const params = useParams();
  const router = useRouter();
  const slug = String(params?.serviceLine ?? "");
  const def = findServiceLineBySlug(slug);

  useEffect(() => {
    if (!def) router.replace(INPATIENT_UNIT_TREE_PATH);
  }, [def, router]);

  if (!def) return null;
  return <InpatientUnitBoardView mode={{ kind: "serviceLine", slug }} />;
}
