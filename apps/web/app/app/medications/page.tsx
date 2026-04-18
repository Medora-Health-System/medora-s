"use client";

import { useI18n } from "@/lib/i18n";

export default function MedicationsPage() {
  const { t } = useI18n();
  return (
    <>
      <h1>{t("medicationsPage.title")}</h1>
      <p>{t("medicationsPage.subtitle")}</p>
    </>
  );
}
