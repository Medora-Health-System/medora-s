"use client";

/**
 * Document de sortie imprimable (patient) — données issues de encounter + dischargeSummaryJson.
 * Pas de requête réseau : le parent fournit les objets déjà chargés.
 */

import { calculateAge } from "@/lib/patientDisplay";
import { getPatientSexLabelFr } from "@/lib/uiLabels";
import { formatEncounterPhysicianAssignedFr } from "@/lib/encounterDisplay";
import { nirMrnDisplay, parseDischargeSummaryForChart } from "@/components/patient-chart/patientChartHelpers";

export type DischargePrintPatient = {
  firstName?: string | null;
  lastName?: string | null;
  dob?: string | null;
  mrn?: string | null;
  nationalId?: string | null;
  globalMrn?: string | null;
  sex?: string | null;
  sexAtBirth?: string | null;
};

export type DischargePrintEncounter = {
  createdAt: string;
  dischargeSummaryJson?: unknown;
  physicianAssigned?: { firstName?: string | null; lastName?: string | null } | null;
};

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function line(label: string, value: string | null | undefined): string {
  const v = value?.trim();
  if (!v) return "";
  return `<p style="margin: 6px 0; line-height: 1.45;"><strong>${esc(label)}</strong> ${esc(v)}</p>`;
}

/**
 * HTML complet pour une fenêtre d’impression (document patient — sortie de consultation).
 */
export function getDischargePrintHtml(params: {
  patient: DischargePrintPatient;
  encounter: DischargePrintEncounter;
  facilityName?: string | null;
  /** Premier diagnostic de la consultation si déjà connu côté client */
  primaryDiagnosis?: string | null;
}): string {
  const { patient, encounter, facilityName, primaryDiagnosis } = params;
  const name = [patient.firstName, patient.lastName].filter(Boolean).join(" ").trim() || "—";
  const age =
    patient.dob && !Number.isNaN(new Date(patient.dob).getTime())
      ? `${calculateAge(patient.dob)} ans`
      : "—";
  const sex = getPatientSexLabelFr(patient.sex ?? null, patient.sexAtBirth ?? null);
  const ids = nirMrnDisplay({
    nationalId: patient.nationalId,
    mrn: patient.mrn,
    globalMrn: patient.globalMrn ?? null,
  });
  const consultDate = (() => {
    try {
      return new Date(encounter.createdAt).toLocaleString("fr-FR");
    } catch {
      return "—";
    }
  })();
  const printDate = new Date().toLocaleString("fr-FR");

  const d = parseDischargeSummaryForChart(encounter.dischargeSummaryJson);
  const physicianLine = formatEncounterPhysicianAssignedFr({
    physicianAssigned: encounter.physicianAssigned ?? null,
  });
  const signer =
    encounter.physicianAssigned?.firstName || encounter.physicianAssigned?.lastName
      ? [encounter.physicianAssigned.firstName, encounter.physicianAssigned.lastName].filter(Boolean).join(" ").trim()
      : "";

  const bodySections: string[] = [];

  bodySections.push(`<h1 style="font-size: 18px; margin: 0 0 16px 0; font-weight: 700;">Document de sortie</h1>`);

  bodySections.push(
    `<div style="margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #000;">`
  );
  bodySections.push(line("Nom du patient", name));
  bodySections.push(line("Âge", age));
  bodySections.push(line("Sexe", sex));
  bodySections.push(line("NIR / MRN", ids));
  bodySections.push(line("Date de consultation", consultDate));
  if (facilityName?.trim()) {
    bodySections.push(line("Établissement", facilityName.trim()));
  }
  bodySections.push(line("Médecin / clinicien attribué", physicianLine !== "—" ? physicianLine : null));
  if (primaryDiagnosis?.trim()) {
    bodySections.push(line("Diagnostic principal", primaryDiagnosis.trim()));
  }
  bodySections.push(`</div>`);

  bodySections.push(`<div style="margin-bottom: 16px;">`);
  if (d?.disposition) bodySections.push(line("Disposition", d.disposition));
  if (d?.exitCondition) bodySections.push(line("État à la sortie", d.exitCondition));
  if (d?.dischargeInstructions) bodySections.push(line("Instructions de sortie", d.dischargeInstructions));
  if (d?.medicationsGiven) bodySections.push(line("Médicaments remis / prescrits", d.medicationsGiven));
  if (d?.followUp) bodySections.push(line("Suivi recommandé", d.followUp));
  if (d?.returnIfWorse) bodySections.push(line("Retour si aggravation", d.returnIfWorse));
  if (d?.patientDestination) bodySections.push(line("Destination du patient", d.patientDestination));
  if (d?.dischargeMode) bodySections.push(line("Mode de sortie", d.dischargeMode));
  bodySections.push(`</div>`);

  if (!d) {
    bodySections.push(
      `<p style="margin: 12px 0; font-size: 13px;">Aucun résumé de sortie structuré n’est encore enregistré pour cette consultation.</p>`
    );
  }

  bodySections.push(
    `<div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #000;">`
  );
  bodySections.push(
    `<p style="margin: 8px 0 0 0;"><strong>Signature / nom du professionnel</strong></p>`
  );
  bodySections.push(
    `<p style="margin: 24px 0 8px 0; min-height: 40px; border-bottom: 1px solid #000; width: 100%; max-width: 320px;">${signer ? esc(signer) : ""}</p>`
  );
  bodySections.push(`</div>`);

  bodySections.push(
    `<p style="margin-top: 20px; font-size: 11px;">Document généré le ${esc(printDate)} — Medora-S</p>`
  );

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Document de sortie</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; color: #000; background: #fff; margin: 0; padding: 24px; font-size: 14px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
${bodySections.join("\n")}
</body>
</html>`;
}

export function printDischarge(params: {
  patient: DischargePrintPatient;
  encounter: DischargePrintEncounter;
  facilityName?: string | null;
  primaryDiagnosis?: string | null;
}): void {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(getDischargePrintHtml(params));
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 300);
}
