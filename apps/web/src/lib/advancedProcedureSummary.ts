import type { ProcedurePayload } from "@/lib/lacerationProcedurePayloadDisplay";
import { formatProcedureEnumField, readPayloadStr } from "@/lib/lacerationProcedurePayloadDisplay";

type SummaryFieldDef =
  | { kind: "enum"; labelKey: string; field: string; other?: string; group: string }
  | { kind: "bool"; labelKey: string; field: string }
  | { kind: "text"; labelKey: string; field: string };

export const ADVANCED_PROCEDURE_SUMMARY_FIELDS: Record<string, SummaryFieldDef[]> = {
  CHEST_TUBE: [
    { kind: "enum", labelKey: "summaryDetailSide", field: "side", other: "sideOther", group: "laterality" },
    { kind: "enum", labelKey: "summaryDetailChestTubeIndication", field: "indication", other: "indicationOther", group: "chestTubeIndication" },
    { kind: "enum", labelKey: "summaryDetailUrgency", field: "urgency", group: "urgency" },
    { kind: "enum", labelKey: "summaryDetailConsent", field: "consent", other: "consentOther", group: "consent" },
    { kind: "bool", labelKey: "summaryDetailSterilePrep", field: "sterilePrep" },
    { kind: "enum", labelKey: "summaryDetailAnesthesia", field: "anesthesia", other: "anesthesiaOther", group: "anesthesia" },
    { kind: "enum", labelKey: "summaryDetailChestTubeSize", field: "tubeSize", other: "tubeSizeOther", group: "chestTubeSize" },
    { kind: "enum", labelKey: "summaryDetailConfirmationMethod", field: "confirmationMethod", other: "confirmationMethodOther", group: "chestTubeConfirmation" },
    { kind: "bool", labelKey: "summaryDetailTolerated", field: "toleratedWell" },
    { kind: "bool", labelKey: "summaryDetailFollowUpImaging", field: "followUpImagingOrdered" },
  ],
  INTUBATION: [
    { kind: "enum", labelKey: "summaryDetailIntubationIndication", field: "indication", other: "indicationOther", group: "intubationIndication" },
    { kind: "enum", labelKey: "summaryDetailIntubationApproach", field: "approach", other: "approachOther", group: "intubationApproach" },
    { kind: "enum", labelKey: "summaryDetailIntubationTubeSize", field: "tubeSize", other: "tubeSizeOther", group: "intubationTubeSize" },
    { kind: "enum", labelKey: "summaryDetailConfirmationMethod", field: "confirmationMethod", other: "confirmationMethodOther", group: "intubationConfirmation" },
    { kind: "bool", labelKey: "summaryDetailVentilatorInitiated", field: "ventilatorInitiated" },
  ],
  CENTRAL_LINE: [
    { kind: "enum", labelKey: "summaryDetailCentralLineType", field: "lineType", other: "lineTypeOther", group: "centralLineType" },
    { kind: "enum", labelKey: "summaryDetailCentralLineSite", field: "site", other: "siteOther", group: "centralLineSite" },
    { kind: "bool", labelKey: "summaryDetailUltrasoundGuidance", field: "ultrasoundGuidance" },
    { kind: "bool", labelKey: "summaryDetailSuccessfulPlacement", field: "successfulPlacement" },
  ],
  PROCEDURAL_SEDATION: [
    { kind: "enum", labelKey: "summaryDetailSedationIndication", field: "indication", other: "indicationOther", group: "sedationIndication" },
    { kind: "enum", labelKey: "summaryDetailAsaClass", field: "asaClass", group: "asaClass" },
    { kind: "bool", labelKey: "summaryDetailContinuousMonitoring", field: "continuousMonitoring" },
    { kind: "enum", labelKey: "summaryDetailRecoveryStatus", field: "recoveryStatus", other: "recoveryStatusOther", group: "sedationRecoveryStatus" },
  ],
  REDUCTION: [
    { kind: "enum", labelKey: "summaryDetailBodyPart", field: "bodyPart", other: "bodyPartOther", group: "reductionBodyPart" },
    { kind: "enum", labelKey: "summaryDetailReductionSuccess", field: "reductionSuccess", group: "reductionSuccess" },
    { kind: "bool", labelKey: "summaryDetailSplintApplied", field: "splintApplied" },
  ],
  THORACENTESIS_PARACENTESIS: [
    { kind: "enum", labelKey: "summaryDetailFluidProcedureType", field: "fluidProcedureType", group: "fluidProcedureType" },
    { kind: "enum", labelKey: "summaryDetailFluidSite", field: "site", other: "siteOther", group: "fluidProcedureSite" },
    { kind: "bool", labelKey: "summaryDetailTolerated", field: "toleratedWell" },
  ],
  PELVIC_EXAM: [
    { kind: "bool", labelKey: "summaryDetailChaperonePresent", field: "chaperonePresent" },
    { kind: "enum", labelKey: "summaryDetailPelvicExamIndication", field: "indication", other: "indicationOther", group: "pelvicExamIndication" },
    { kind: "enum", labelKey: "summaryDetailSpecimensCollected", field: "specimensCollected", other: "specimensCollectedOther", group: "pelvicSpecimen" },
  ],
  LUMBAR_PUNCTURE: [
    { kind: "enum", labelKey: "summaryDetailLpIndication", field: "indication", other: "indicationOther", group: "lpIndication" },
    { kind: "enum", labelKey: "summaryDetailLpLevel", field: "level", other: "levelOther", group: "lpLevel" },
    { kind: "enum", labelKey: "summaryDetailCsfAppearance", field: "csfAppearance", other: "csfAppearanceOther", group: "lpCsfAppearance" },
    { kind: "bool", labelKey: "summaryDetailTolerated", field: "toleratedWell" },
  ],
};

export function buildAdvancedProcedureSummaryRows(
  pt: string,
  p: ProcedurePayload,
  t: (k: string) => string,
  boolLabel: (v: unknown, t: (k: string) => string) => string
): Array<{ k: string; v: string }> {
  const defs = ADVANCED_PROCEDURE_SUMMARY_FIELDS[pt];
  if (!defs) return [];
  const rows: Array<{ k: string; v: string }> = [];
  for (const def of defs) {
    if (def.kind === "enum") {
      rows.push({
        k: def.labelKey,
        v: formatProcedureEnumField(p, def.field, def.other ?? `${def.field}Other`, def.group, t) || "—",
      });
    } else if (def.kind === "bool") {
      rows.push({ k: def.labelKey, v: boolLabel(p[def.field], t) });
    } else {
      rows.push({ k: def.labelKey, v: readPayloadStr(p, def.field) || "—" });
    }
  }
  return rows;
}
