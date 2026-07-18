"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  fetchSafetyValidationAnalytics,
  fetchSafetyValidationBatches,
  fetchSafetyValidationCases,
  fetchSafetyValidationDashboard,
  fetchSafetyValidationFamilies,
  fetchSafetyValidationGaps,
  fetchSafetyValidationReadiness,
  recalculateSafetyValidationCoverage,
  type SafetyValidationDashboard,
} from "@/lib/medicationSafetyValidationApi";

function cardStyle(): CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "10px 12px",
    background: "#fff",
  };
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} style={{ ...cardStyle(), display: "grid", gap: 8 }}>
      <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
      {children}
    </section>
  );
}

export default function SafetyValidationWorkspacePage() {
  const { t, language } = useI18n();
  const { ready, facilityId, roles } = useFacilityAndRoles();

  const canAccess =
    roles.includes("ADMIN") ||
    roles.includes("MEDORA_SUPER_ADMIN") ||
    roles.includes("MEDICATION_ADMIN") ||
    roles.includes("MEDICATION_REVIEWER") ||
    roles.includes("PHARMACY");

  const canAdmin =
    roles.includes("MEDICATION_ADMIN") ||
    roles.includes("MEDORA_SUPER_ADMIN") ||
    roles.includes("ADMIN");

  const [dashboard, setDashboard] = useState<SafetyValidationDashboard | null>(
    null
  );
  const [families, setFamilies] = useState<Array<Record<string, unknown>>>([]);
  const [cases, setCases] = useState<Array<Record<string, unknown>>>([]);
  const [batches, setBatches] = useState<Array<Record<string, unknown>>>([]);
  const [accuracy, setAccuracy] = useState<Record<string, unknown> | null>(null);
  const [severity, setSeverity] = useState<Record<string, unknown> | null>(null);
  const [burden, setBurden] = useState<Record<string, unknown> | null>(null);
  const [emergency, setEmergency] = useState<Record<string, unknown> | null>(
    null
  );
  const [reliability, setReliability] = useState<Record<string, unknown> | null>(
    null
  );
  const [suppressions, setSuppressions] = useState<Record<string, unknown> | null>(
    null
  );
  const [gaps, setGaps] = useState<Record<string, unknown> | null>(null);
  const [readiness, setReadiness] = useState<{
    policies: Array<Record<string, unknown>>;
    assessments: Array<Record<string, unknown>>;
    candidates: Array<Record<string, unknown>>;
    attestations: Array<Record<string, unknown>>;
  } | null>(null);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const [
        metrics,
        fams,
        caseRows,
        batchRows,
        acc,
        sev,
        bur,
        em,
        rel,
        sup,
        gapRows,
        readyRows,
      ] = await Promise.all([
        fetchSafetyValidationDashboard(facilityId),
        fetchSafetyValidationFamilies(facilityId),
        fetchSafetyValidationCases(facilityId),
        fetchSafetyValidationBatches(facilityId),
        fetchSafetyValidationAnalytics(facilityId, "accuracy"),
        fetchSafetyValidationAnalytics(facilityId, "severity"),
        fetchSafetyValidationAnalytics(facilityId, "burden"),
        fetchSafetyValidationAnalytics(facilityId, "emergency-contexts"),
        fetchSafetyValidationAnalytics(facilityId, "reliability"),
        fetchSafetyValidationAnalytics(facilityId, "suppressions"),
        fetchSafetyValidationGaps(facilityId),
        fetchSafetyValidationReadiness(facilityId),
      ]);
      setDashboard(metrics);
      setFamilies(fams);
      setCases(caseRows);
      setBatches(batchRows);
      setAccuracy(acc);
      setSeverity(sev);
      setBurden(bur);
      setEmergency(em);
      setReliability(rel);
      setSuppressions(sup);
      setGaps(gapRows);
      setReadiness(readyRows);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setError(
        normalizeUserFacingError(raw, language) ||
          t("medicationSafetyValidation.errorLoad")
      );
    } finally {
      setLoading(false);
    }
  }, [facilityId, language, t]);

  useEffect(() => {
    if (ready && facilityId && canAccess) void load();
  }, [ready, facilityId, canAccess, load]);

  if (!ready) {
    return <p style={{ padding: 16 }}>{t("medicationSafetyValidation.loading")}</p>;
  }
  if (!canAccess) {
    return (
      <p style={{ padding: 16 }}>{t("medicationSafetyValidation.accessDenied")}</p>
    );
  }

  const myCases = cases.filter((c) => {
    const assignments = (c.assignments as Array<{ reviewerUserId?: string }>) ?? [];
    return assignments.length > 0;
  });
  const dualQueue = cases.filter((c) => c.validationStatus === "AWAITING_SECOND_REVIEW");
  const adjQueue = cases.filter((c) => c.validationStatus === "AWAITING_ADJUDICATION");
  const selectedFamily = families.find((f) => f.id === selectedFamilyId) ?? null;
  const selectedCase = cases.find((c) => c.id === selectedCaseId) ?? null;

  return (
    <div style={{ padding: 16, display: "grid", gap: 12, maxWidth: 1200 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>
          {t("medicationSafetyValidation.title")}
        </h1>
        <Link href="/app/admin/medication-governance" style={{ fontSize: 14 }}>
          {t("medicationSafetyValidation.backAdmin")}
        </Link>
        <button type="button" onClick={() => void load()} disabled={loading}>
          {t("medicationSafetyValidation.refresh")}
        </button>
        {canAdmin ? (
          <button
            type="button"
            onClick={() => {
              if (!facilityId) return;
              void recalculateSafetyValidationCoverage(facilityId)
                .then(() => load())
                .catch((e: unknown) => {
                  const raw = e instanceof Error ? e.message : "";
                  setError(
                    normalizeUserFacingError(raw, language) ||
                      t("medicationSafetyValidation.errorLoad")
                  );
                });
            }}
            disabled={loading}
          >
            {t("medicationSafetyValidation.recalculate")}
          </button>
        ) : null}
      </div>

      <p style={{ margin: 0, color: "#475569", fontSize: 14 }}>
        {t("medicationSafetyValidation.intro")}
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          fontSize: 12,
          fontWeight: 700,
          color: "#9a3412",
        }}
      >
        <span>{t("medicationSafetyValidation.badgeShadow")}</span>
        <span>{t("medicationSafetyValidation.badgeNoAlerts")}</span>
        <span>{t("medicationSafetyValidation.badgeNoBlocking")}</span>
        <span>{t("medicationSafetyValidation.badgeNoActivation")}</span>
      </div>

      {error ? <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p> : null}

      <Section id="command-center" title={t("medicationSafetyValidation.commandCenter")}>
        {dashboard ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 8,
              fontSize: 13,
            }}
          >
            <div>
              {t("medicationSafetyValidation.metricFamilies")}:{" "}
              {dashboard.MedicationFamiliesPresent}
            </div>
            <div>
              {t("medicationSafetyValidation.metricShadowEvaluable")}:{" "}
              {dashboard.MedicationFamiliesShadowEvaluable}
            </div>
            <div>
              {t("medicationSafetyValidation.metricValidated")}:{" "}
              {dashboard.MedicationFamiliesValidated}
            </div>
            <div>
              {t("medicationSafetyValidation.metricBlocked")}:{" "}
              {dashboard.MedicationFamiliesBlocked}
            </div>
            <div>
              {t("medicationSafetyValidation.metricClinicalCoverage")}:{" "}
              {dashboard.ClinicalKnowledgeCoverage}
            </div>
            <div>
              {t("medicationSafetyValidation.metricSafetyCoverage")}:{" "}
              {dashboard.SafetyKnowledgeCoverage}
            </div>
            <div>
              {t("medicationSafetyValidation.metricIdentityCoverage")}:{" "}
              {dashboard.IdentityCoverage}
            </div>
            <div>
              {t("medicationSafetyValidation.metricReviewed")}:{" "}
              {dashboard.ReviewedFindings}
            </div>
            <div>
              {t("medicationSafetyValidation.metricAdjudicated")}:{" "}
              {dashboard.AdjudicatedFindings}
            </div>
            <div>
              {t("medicationSafetyValidation.metricKnowledgeGaps")}:{" "}
              {dashboard.KnowledgeGapCount}
            </div>
            <div>
              {t("medicationSafetyValidation.metricCandidates")}:{" "}
              {dashboard.ReadinessCandidates}
            </div>
            <div>
              {t("medicationSafetyValidation.metricActivations")}:{" "}
              {dashboard.ClinicalActivations}
            </div>
            <div>
              {t("medicationSafetyValidation.metricConcepts")}:{" "}
              {dashboard.TotalMedicationConcepts}
            </div>
            <div>
              {t("medicationSafetyValidation.metricProducts")}:{" "}
              {dashboard.TotalMedicationProducts}
            </div>
            <div>
              {t("medicationSafetyValidation.metricPackages")}:{" "}
              {dashboard.TotalMedicationPackages}
            </div>
            <div>
              {t("medicationSafetyValidation.metricEmFamilies")}:{" "}
              {dashboard.EmergencyMedicineMedicationFamilies}
            </div>
          </div>
        ) : (
          <p style={{ margin: 0, color: "#64748b" }}>
            {loading ? t("medicationSafetyValidation.loading") : t("medicationSafetyValidation.empty")}
          </p>
        )}
      </Section>

      <Section id="coverage-dashboard" title={t("medicationSafetyValidation.coverageDashboard")}>
        <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
          {t("medicationSafetyValidation.coverageHint")}
        </p>
      </Section>

      <Section id="family-inventory" title={t("medicationSafetyValidation.familyInventory")}>
        <div style={{ display: "grid", gap: 6, maxHeight: 220, overflow: "auto" }}>
          {families.length === 0 ? (
            <p style={{ margin: 0, color: "#64748b" }}>
              {t("medicationSafetyValidation.emptyFamilies")}
            </p>
          ) : (
            families.slice(0, 80).map((f) => (
              <button
                key={String(f.id)}
                type="button"
                onClick={() => setSelectedFamilyId(String(f.id))}
                style={{
                  textAlign: "left",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: "6px 8px",
                  background: selectedFamilyId === f.id ? "#f1f5f9" : "#fff",
                  fontSize: 13,
                }}
              >
                {String(f.displayName)} — {String(f.coverageStatus)} — score{" "}
                {String(f.coverageScore ?? "—")}
              </button>
            ))
          )}
        </div>
        {dashboard?.EmergencyMedicineMedicationFamilyNames?.length ? (
          <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
            {t("medicationSafetyValidation.emNames")}:{" "}
            {dashboard.EmergencyMedicineMedicationFamilyNames.slice(0, 20).join(", ")}
            {dashboard.EmergencyMedicineMedicationFamilyNames.length > 20 ? "…" : ""}
          </p>
        ) : null}
      </Section>

      <Section id="family-detail" title={t("medicationSafetyValidation.familyDetail")}>
        {selectedFamily ? (
          <pre style={{ margin: 0, fontSize: 11, overflow: "auto", maxHeight: 240 }}>
            {JSON.stringify(selectedFamily, null, 2)}
          </pre>
        ) : (
          <p style={{ margin: 0, color: "#64748b" }}>
            {t("medicationSafetyValidation.selectFamily")}
          </p>
        )}
      </Section>

      <Section id="validation-queue" title={t("medicationSafetyValidation.validationQueue")}>
        <div style={{ display: "grid", gap: 6, maxHeight: 200, overflow: "auto" }}>
          {cases.length === 0 ? (
            <p style={{ margin: 0, color: "#64748b" }}>
              {t("medicationSafetyValidation.emptyCases")}
            </p>
          ) : (
            cases.map((c) => (
              <button
                key={String(c.id)}
                type="button"
                onClick={() => setSelectedCaseId(String(c.id))}
                style={{
                  textAlign: "left",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: "6px 8px",
                  background: selectedCaseId === c.id ? "#f1f5f9" : "#fff",
                  fontSize: 13,
                }}
              >
                {String(c.findingType)} / {String(c.severity ?? "—")} —{" "}
                {String(c.validationStatus)}
              </button>
            ))
          )}
        </div>
      </Section>

      <Section id="my-assignments" title={t("medicationSafetyValidation.myAssignments")}>
        <p style={{ margin: 0, fontSize: 13 }}>
          {t("medicationSafetyValidation.assignmentCount")}: {myCases.length}
        </p>
      </Section>

      <Section id="case-detail" title={t("medicationSafetyValidation.caseDetail")}>
        {selectedCase ? (
          <pre style={{ margin: 0, fontSize: 11, overflow: "auto", maxHeight: 240 }}>
            {JSON.stringify(selectedCase, null, 2)}
          </pre>
        ) : (
          <p style={{ margin: 0, color: "#64748b" }}>
            {t("medicationSafetyValidation.selectCase")}
          </p>
        )}
      </Section>

      <Section id="dual-review" title={t("medicationSafetyValidation.dualReviewQueue")}>
        <p style={{ margin: 0, fontSize: 13 }}>
          {t("medicationSafetyValidation.queueCount")}: {dualQueue.length}
        </p>
      </Section>

      <Section id="adjudication" title={t("medicationSafetyValidation.adjudicationQueue")}>
        <p style={{ margin: 0, fontSize: 13 }}>
          {t("medicationSafetyValidation.queueCount")}: {adjQueue.length}
        </p>
      </Section>

      <Section id="batches" title={t("medicationSafetyValidation.batches")}>
        <p style={{ margin: 0, fontSize: 13 }}>
          {t("medicationSafetyValidation.batchCount")}: {batches.length}
        </p>
      </Section>

      <Section id="reference-sets" title={t("medicationSafetyValidation.referenceSets")}>
        <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
          {t("medicationSafetyValidation.referenceHint")}
        </p>
      </Section>

      <Section id="fp" title={t("medicationSafetyValidation.falsePositive")}>
        <pre style={{ margin: 0, fontSize: 11, overflow: "auto", maxHeight: 160 }}>
          {JSON.stringify(accuracy, null, 2)}
        </pre>
      </Section>

      <Section id="fn" title={t("medicationSafetyValidation.falseNegative")}>
        <pre style={{ margin: 0, fontSize: 11, overflow: "auto", maxHeight: 160 }}>
          {JSON.stringify(
            accuracy && typeof accuracy === "object" && "falseNegative" in accuracy
              ? (accuracy as { falseNegative: unknown }).falseNegative
              : accuracy,
            null,
            2
          )}
        </pre>
      </Section>

      <Section id="severity" title={t("medicationSafetyValidation.severityCalibration")}>
        <pre style={{ margin: 0, fontSize: 11, overflow: "auto", maxHeight: 160 }}>
          {JSON.stringify(severity, null, 2)}
        </pre>
      </Section>

      <Section id="burden" title={t("medicationSafetyValidation.alertBurden")}>
        <pre style={{ margin: 0, fontSize: 11, overflow: "auto", maxHeight: 160 }}>
          {JSON.stringify(burden, null, 2)}
        </pre>
      </Section>

      <Section id="em-analytics" title={t("medicationSafetyValidation.emergencyAnalytics")}>
        <pre style={{ margin: 0, fontSize: 11, overflow: "auto", maxHeight: 160 }}>
          {JSON.stringify(emergency, null, 2)}
        </pre>
      </Section>

      <Section id="knowledge-gaps" title={t("medicationSafetyValidation.knowledgeGaps")}>
        <pre style={{ margin: 0, fontSize: 11, overflow: "auto", maxHeight: 160 }}>
          {JSON.stringify((gaps as { knowledge?: unknown })?.knowledge ?? gaps, null, 2)}
        </pre>
      </Section>

      <Section id="identity-gaps" title={t("medicationSafetyValidation.identityGaps")}>
        <pre style={{ margin: 0, fontSize: 11, overflow: "auto", maxHeight: 160 }}>
          {JSON.stringify((gaps as { identity?: unknown })?.identity ?? [], null, 2)}
        </pre>
      </Section>

      <Section id="context-gaps" title={t("medicationSafetyValidation.contextGaps")}>
        <pre style={{ margin: 0, fontSize: 11, overflow: "auto", maxHeight: 160 }}>
          {JSON.stringify((gaps as { context?: unknown })?.context ?? [], null, 2)}
        </pre>
      </Section>

      <Section id="suppressions" title={t("medicationSafetyValidation.suppressionEffectiveness")}>
        <pre style={{ margin: 0, fontSize: 11, overflow: "auto", maxHeight: 160 }}>
          {JSON.stringify(suppressions, null, 2)}
        </pre>
      </Section>

      <Section id="reliability" title={t("medicationSafetyValidation.engineReliability")}>
        <pre style={{ margin: 0, fontSize: 11, overflow: "auto", maxHeight: 160 }}>
          {JSON.stringify(reliability, null, 2)}
        </pre>
      </Section>

      <Section id="policies" title={t("medicationSafetyValidation.readinessPolicies")}>
        <p style={{ margin: 0, fontSize: 13 }}>
          {t("medicationSafetyValidation.policyCount")}:{" "}
          {readiness?.policies.length ?? 0}
        </p>
      </Section>

      <Section id="assessments" title={t("medicationSafetyValidation.readinessAssessments")}>
        <p style={{ margin: 0, fontSize: 13 }}>
          {t("medicationSafetyValidation.assessmentCount")}:{" "}
          {readiness?.assessments.length ?? 0}
        </p>
      </Section>

      <Section id="candidates" title={t("medicationSafetyValidation.activationCandidates")}>
        <p style={{ margin: 0, fontSize: 13 }}>
          {t("medicationSafetyValidation.candidateCount")}:{" "}
          {readiness?.candidates.length ?? 0}
        </p>
      </Section>

      <Section id="attestations" title={t("medicationSafetyValidation.readinessAttestations")}>
        <p style={{ margin: 0, fontSize: 13 }}>
          {t("medicationSafetyValidation.attestationCount")}:{" "}
          {readiness?.attestations.length ?? 0}
        </p>
      </Section>

      <p style={{ margin: 0, fontSize: 12, color: "#9a3412", fontWeight: 600 }}>
        {t("medicationSafetyValidation.safetyFooter")}
      </p>
    </div>
  );
}
