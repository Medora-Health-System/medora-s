import { describe, expect, it } from "vitest";
import {
  ARRHYTHMIA_EVENT_CARD_ID,
  CARDIAC_ESCALATION_EVENT_CARD_ID,
  CARDIAC_RHYTHM_OPTIONS,
  CONTINUOUS_CARDIAC_MONITORING_CARD_ID,
  ECG_12_LEAD_DOCUMENTATION_CARD_ID,
  EDOC15_CARDIAC_MONITORING_DOCUMENTATION_CARD_IDS,
  QTC_MONITORING_CARD_ID,
  QTC_PROVIDER_NOTIFICATION_THRESHOLD_MS,
  requiresQtcProviderNotification,
  STEMI_ALERT_EVENT_CARD_ID,
  summarizeCardiacMonitoringDocumentationPayload,
  validateCardiacMonitoringDocumentationPayloadForCard,
} from "./cardiacMonitoringDocumentationPayloads.js";
import { getClinicalDocumentationCardById } from "./clinicalDocumentationRegistry.js";
import { assertRegistryAvailableCardsHavePayloadValidators } from "./clinicalDocumentationPayloadGovernance.js";

const ISO = "2026-05-28T12:00:00.000Z";

describe("cardiacMonitoringDocumentationPayloads (EDOC.15)", () => {
  it("all EDOC.15 cardiac cards are AVAILABLE with validators", () => {
    expect(() => assertRegistryAvailableCardsHavePayloadValidators()).not.toThrow();
    for (const cardId of EDOC15_CARDIAC_MONITORING_DOCUMENTATION_CARD_IDS) {
      const card = getClinicalDocumentationCardById(cardId);
      expect(card?.implementationStatus).toBe("AVAILABLE");
      expect(card?.category).toBe("CARDIAC_MONITORING_DOCUMENTATION");
    }
  });

  it("rhythm options validated", () => {
    expect(CARDIAC_RHYTHM_OPTIONS.some((o) => o.value === "AFIB")).toBe(true);
    expect(
      validateCardiacMonitoringDocumentationPayloadForCard(CONTINUOUS_CARDIAC_MONITORING_CARD_ID, {
        assessmentTime: ISO,
        monitorType: "TELEMETRY",
        rhythm: "AFIB",
        heartRate: 122,
        ectopyPresent: "NO",
        alarmEventsPresent: "YES",
        patientSymptomatic: "YES",
        providerNotified: "YES",
      }).ok
    ).toBe(true);
  });

  it("QTc governance requires provider notification at threshold", () => {
    expect(requiresQtcProviderNotification(QTC_PROVIDER_NOTIFICATION_THRESHOLD_MS)).toBe(true);
    const bad = validateCardiacMonitoringDocumentationPayloadForCard(QTC_MONITORING_CARD_ID, {
      assessmentTime: ISO,
      qtcValue: 520,
      highRiskMedicationPresent: "YES",
      providerNotified: "NO",
    });
    expect(bad.ok).toBe(false);
    const ok = validateCardiacMonitoringDocumentationPayloadForCard(QTC_MONITORING_CARD_ID, {
      assessmentTime: ISO,
      qtcValue: 520,
      highRiskMedicationPresent: "YES",
      providerNotified: "YES",
    });
    expect(ok.ok).toBe(true);
  });

  it("arrhythmia governance requires provider notification", () => {
    const bad = validateCardiacMonitoringDocumentationPayloadForCard(ARRHYTHMIA_EVENT_CARD_ID, {
      eventTime: ISO,
      eventType: "SVT",
      durationMinutes: 12,
      patientSymptomatic: "YES",
      bloodPressureAffected: "NO",
      interventionRequired: "YES",
      providerNotified: "NO",
    });
    expect(bad.ok).toBe(false);
    const ok = validateCardiacMonitoringDocumentationPayloadForCard(ARRHYTHMIA_EVENT_CARD_ID, {
      eventTime: ISO,
      eventType: "SVT",
      durationMinutes: 12,
      patientSymptomatic: "YES",
      bloodPressureAffected: "NO",
      interventionRequired: "YES",
      providerNotified: "YES",
    });
    expect(ok.ok).toBe(true);
  });

  it("ECG critical finding governance", () => {
    const bad = validateCardiacMonitoringDocumentationPayloadForCard(ECG_12_LEAD_DOCUMENTATION_CARD_ID, {
      ecgTime: ISO,
      reason: "CHEST_PAIN",
      performed: "YES",
      transmittedToProvider: "YES",
      providerReviewed: "NO",
      criticalFindingPresent: "YES",
      providerNotified: "NO",
    });
    expect(bad.ok).toBe(false);
  });

  it("STEMI payload validates", () => {
    expect(
      validateCardiacMonitoringDocumentationPayloadForCard(STEMI_ALERT_EVENT_CARD_ID, {
        activationTime: ISO,
        activationReason: "STEMI",
        cathLabActivated: "YES",
        providerAtBedside: "YES",
        cardiologyNotified: "YES",
        transferRequired: "NO",
      }).ok
    ).toBe(true);
  });

  it("EN summaries render", () => {
    const en = summarizeCardiacMonitoringDocumentationPayload(
      CONTINUOUS_CARDIAC_MONITORING_CARD_ID,
      {
        assessmentTime: ISO,
        monitorType: "TELEMETRY",
        rhythm: "AFIB",
        heartRate: 122,
        ectopyPresent: "NO",
        alarmEventsPresent: "NO",
        patientSymptomatic: "YES",
        providerNotified: "YES",
      },
      "en"
    );
    expect(en.some((l) => l.key === "Rhythm" && l.value.includes("fibrillation"))).toBe(true);
    expect(en.some((l) => l.key === "HR" && l.value === "122 bpm")).toBe(true);
  });

  it("FR summaries render", () => {
    const fr = summarizeCardiacMonitoringDocumentationPayload(
      ARRHYTHMIA_EVENT_CARD_ID,
      {
        eventTime: ISO,
        eventType: "SVT",
        durationMinutes: 12,
        patientSymptomatic: "YES",
        bloodPressureAffected: "NO",
        interventionRequired: "YES",
        providerNotified: "YES",
      },
      "fr"
    );
    expect(fr.some((l) => l.key === "Durée" && l.value === "12 min")).toBe(true);
    expect(fr.some((l) => l.key === "Médecin avisé")).toBe(true);
  });

  it("cardiac escalation validates", () => {
    const bad = validateCardiacMonitoringDocumentationPayloadForCard(CARDIAC_ESCALATION_EVENT_CARD_ID, {
      eventTime: ISO,
      escalationReason: "STEMI_ALERT",
      providerNotified: "NO",
      providerNotificationTime: ISO,
      responseReceived: "NO",
    });
    expect(bad.ok).toBe(false);
    const ok = validateCardiacMonitoringDocumentationPayloadForCard(CARDIAC_ESCALATION_EVENT_CARD_ID, {
      eventTime: ISO,
      escalationReason: "STEMI_ALERT",
      providerNotified: "YES",
      providerNotificationTime: ISO,
      responseReceived: "YES",
    });
    expect(ok.ok).toBe(true);
  });
});
