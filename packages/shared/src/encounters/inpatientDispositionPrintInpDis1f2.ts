/**
 * INP.DIS.1F.2 — Compact disposition-specific facts for print / historical record.
 * Skips empty values; no readiness / engineering chrome.
 */

import {
  hydrateInpatientNursingDischarge,
  type InpatientNursingDischargeV1D,
} from "./inpatientNursingDischargeInpDis1d.js";
import {
  hydrateInpatientProviderDischarge1C,
  type InpatientProviderDischargeV1C,
} from "./inpatientProviderDischargeInpDis1c.js";

export type InpatientDispositionPrintFact = {
  /** Stable key for i18n: printOutput.inpatientDisposition.<key> */
  key: string;
  value: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length ? t : null;
}

function yesNo(value: boolean | null | undefined): string | null {
  if (value === true) return "YES";
  if (value === false) return "NO";
  return null;
}

function push(
  out: InpatientDispositionPrintFact[],
  key: string,
  value: string | null | undefined
): void {
  const v = trimOrNull(value);
  if (!v) return;
  out.push({ key, value: v });
}

function pushFlag(
  out: InpatientDispositionPrintFact[],
  key: string,
  value: boolean | null | undefined
): void {
  const yn = yesNo(value);
  if (!yn) return;
  out.push({ key, value: yn });
}

function collectProviderFacts(
  provider: InpatientProviderDischargeV1C
): InpatientDispositionPrintFact[] {
  const out: InpatientDispositionPrintFact[] = [];
  const fd = provider.finalDisposition;
  if (!fd) return out;
  const code = trimOrNull(fd.code)?.toUpperCase() ?? "";
  push(out, "clinicalDispositionCode", code);
  push(out, "destinationDetails", fd.destinationDetails);

  const t = fd.transfer;
  if (t) {
    push(out, "receivingHospital", t.receivingHospital);
    push(out, "receivingService", t.receivingService);
    push(out, "receivingPhysician", t.receivingPhysician);
    push(out, "transferReason", t.reasonCode);
    push(out, "reasonNarrative", t.reasonNarrative);
    push(out, "acceptedBy", t.acceptedBy);
    push(out, "acceptedAt", t.acceptedAt);
    push(out, "transportMode", t.transportMode);
    push(out, "conditionAtTransfer", t.conditionAtTransfer);
    push(out, "documentsSent", t.documentsSent);
    push(out, "pendingResultsCommunicated", t.pendingResultsCommunicated);
  }

  const snf = fd.snf;
  if (snf) {
    push(out, "facilityName", snf.facilityName);
    push(out, "facilityAddress", snf.facilityAddress);
    push(out, "facilityPhone", snf.facilityPhone);
    push(out, "acceptingProvider", snf.acceptingProvider);
    push(out, "transferAt", snf.transferAt);
    push(out, "snfTransportMode", snf.transportMode);
    push(out, "snfDocumentsSent", snf.documentsSent);
  }

  const hh = fd.homeHealth;
  if (hh) {
    push(out, "agencyName", hh.agencyName);
    if (hh.services?.length) push(out, "homeHealthServices", hh.services.join(", "));
    push(out, "startOfCareNotes", hh.startOfCareNotes);
  }

  const corr = fd.correctional;
  if (corr) {
    push(out, "correctionalFacility", corr.facilityName);
    push(out, "correctionalAgency", corr.agencyName);
    push(out, "officerName", corr.officerName);
    push(out, "badgeId", corr.badgeId);
    push(out, "custodyTransferredAt", corr.custodyTransferredAt);
    pushFlag(out, "transportByLawEnforcement", corr.transportByLawEnforcement);
  }

  const ama = fd.ama;
  if (ama) {
    pushFlag(out, "ama.capacityDocumented", ama.capacityDocumented);
    pushFlag(out, "ama.risksDiscussed", ama.risksDiscussed);
    pushFlag(out, "ama.alternativesDiscussed", ama.alternativesDiscussed);
    pushFlag(out, "ama.treatmentOffered", ama.treatmentOffered);
    pushFlag(out, "ama.returnPrecautionsReviewed", ama.returnPrecautionsReviewed);
    push(out, "ama.notes", ama.notes);
  }

  const el = fd.eloped;
  if (el) {
    push(out, "eloped.lastKnownAt", el.lastKnownAt);
    push(out, "eloped.lastKnownLocation", el.lastKnownLocation);
    push(out, "eloped.conditionWhenLastObserved", el.conditionWhenLastObserved);
    push(out, "eloped.ivOrLinesPresent", el.ivOrLinesPresent);
    pushFlag(out, "eloped.providerNotified", el.providerNotified);
    pushFlag(out, "eloped.nursingSupervisorNotified", el.nursingSupervisorNotified);
    pushFlag(out, "eloped.securityNotified", el.securityNotified);
    pushFlag(out, "eloped.lawEnforcementNotified", el.lawEnforcementNotified);
    pushFlag(out, "eloped.emergencyContactAttempted", el.emergencyContactAttempted);
    push(out, "eloped.notes", el.notes);
  }

  const dec = fd.deceased;
  if (dec) {
    push(out, "deceased.pronouncedAt", dec.pronouncedAt);
    push(out, "deceased.pronouncedBy", dec.pronouncedBy);
    push(out, "deceased.preliminaryContext", dec.preliminaryContext);
    pushFlag(out, "deceased.nextOfKinNotified", dec.nextOfKinNotified);
    push(out, "deceased.notifiedBy", dec.notifiedBy);
    push(out, "deceased.medicalExaminerStatus", dec.medicalExaminerStatus);
    push(out, "deceased.organDonationReferralStatus", dec.organDonationReferralStatus);
    push(out, "deceased.bodyDisposition", dec.bodyDisposition);
    push(out, "deceased.bodyDispositionOther", dec.bodyDispositionOther);
  }

  return out;
}

function collectNursingFacts(
  nursing: InpatientNursingDischargeV1D
): InpatientDispositionPrintFact[] {
  const out: InpatientDispositionPrintFact[] = [];
  const handoff = nursing.handoff;
  if (handoff) {
    pushFlag(out, "nursing.reportCalled", handoff.reportCalled);
    push(out, "nursing.reportGivenTo", handoff.reportGivenTo);
    push(out, "nursing.reportAt", handoff.reportAt);
    const docs = handoff.documentsSent;
    if (docs) {
      pushFlag(out, "nursing.docs.dischargeSummary", docs.dischargeSummary);
      pushFlag(out, "nursing.docs.marOrMedList", docs.marOrMedList);
      pushFlag(out, "nursing.docs.medicationReconciliation", docs.medicationReconciliation);
      pushFlag(out, "nursing.docs.relevantResults", docs.relevantResults);
      pushFlag(out, "nursing.docs.imaging", docs.imaging);
      pushFlag(out, "nursing.docs.pendingStudies", docs.pendingStudies);
      pushFlag(out, "nursing.docs.other", docs.other);
      push(out, "nursing.docs.otherDetails", docs.otherDetails);
    }
  }

  const dep = nursing.departure;
  if (dep) {
    push(out, "nursing.departedAt", dep.departedAt);
    push(out, "nursing.departureMode", dep.mode);
    push(out, "nursing.accompaniedBy", dep.accompaniedBy);
    push(out, "nursing.conditionAtDeparture", dep.conditionAtDeparture);
  }

  const transport = nursing.transport;
  if (transport) {
    push(out, "nursing.transportMode", transport.mode);
    push(out, "nursing.transportCompany", transport.company);
  }

  const hh = nursing.homeHealth;
  if (hh) {
    pushFlag(out, "nursing.homeHealth.agencyConfirmed", hh.agencyConfirmed);
    pushFlag(out, "nursing.homeHealth.documentsSent", hh.documentsSent);
  }

  const corr = nursing.correctional;
  if (corr) {
    push(out, "nursing.correctional.facility", corr.facilityName);
    push(out, "nursing.correctional.agency", corr.agencyName);
    push(out, "nursing.correctional.officer", corr.officerName);
    push(out, "nursing.correctional.badgeId", corr.badgeId);
    push(out, "nursing.correctional.custodyAt", corr.custodyTransferredAt);
    pushFlag(out, "nursing.correctional.instructionsProvided", corr.instructionsProvided);
  }

  const el = nursing.eloped;
  if (el) {
    push(out, "nursing.eloped.discoveredAt", el.discoveredAt);
    push(out, "nursing.eloped.lastKnownAt", el.lastKnownAt);
    push(out, "nursing.eloped.lastKnownLocation", el.lastKnownLocation);
    push(out, "nursing.eloped.conditionWhenLastObserved", el.conditionWhenLastObserved);
    push(out, "nursing.eloped.ivOrLinesPresent", el.ivOrLinesPresent);
    push(out, "nursing.eloped.belongingsStatus", el.belongingsStatus);
    pushFlag(out, "nursing.eloped.providerNotified", el.providerNotified);
    pushFlag(out, "nursing.eloped.chargeNurseNotified", el.chargeNurseNotified);
    pushFlag(out, "nursing.eloped.securityNotified", el.securityNotified);
    pushFlag(out, "nursing.eloped.emergencyContactAttempted", el.emergencyContactAttempted);
    pushFlag(out, "nursing.eloped.lawEnforcementNotified", el.lawEnforcementNotified);
    push(out, "nursing.eloped.notes", el.notes);
  }

  const dec = nursing.deceased;
  if (dec) {
    pushFlag(out, "nursing.deceased.identificationCompleted", dec.identificationCompleted);
    pushFlag(out, "nursing.deceased.nextOfKinNotified", dec.nextOfKinNotified);
    push(out, "nursing.deceased.postmortemCare", dec.postmortemCare);
    push(out, "nursing.deceased.linesTubesDisposition", dec.linesTubesDisposition);
    push(out, "nursing.deceased.bodyDestination", dec.bodyDestination);
    push(out, "nursing.deceased.transferredTo", dec.transferredTo);
    push(out, "nursing.deceased.transferredAt", dec.transferredAt);
    push(out, "nursing.deceased.notes", dec.notes);
  }

  const edu = nursing.education;
  if (edu) {
    pushFlag(out, "nursing.education.leftBeforeComplete", edu.leftBeforeInstructionsComplete);
    pushFlag(out, "nursing.education.interpreterUsed", edu.interpreterUsed);
    push(out, "nursing.education.interpreterDetails", edu.interpreterDetails);
    push(out, "nursing.education.recipientName", edu.recipientName);
  }

  return out;
}

/** Collect non-empty disposition-specific print facts from dischargeSummaryJson namespaces. */
export function collectInpatientDispositionPrintFacts(
  dischargeSummaryJson: unknown
): InpatientDispositionPrintFact[] {
  if (!isRecord(dischargeSummaryJson)) return [];
  const provider = hydrateInpatientProviderDischarge1C(
    dischargeSummaryJson.inpatientProviderDischarge
  );
  const nursing = hydrateInpatientNursingDischarge(
    dischargeSummaryJson.inpatientNursingDischarge
  );
  const facts: InpatientDispositionPrintFact[] = [];
  if (provider) facts.push(...collectProviderFacts(provider));
  if (nursing) facts.push(...collectNursingFacts(nursing));
  // Deduplicate identical key+value pairs (provider/nursing overlap is rare but possible)
  const seen = new Set<string>();
  return facts.filter((f) => {
    const id = `${f.key}|${f.value}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
