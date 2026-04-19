import { vitalsSchema } from "@medora/shared";
import type { FhirObservation } from "./fhir-resource.types";
import { LOINC, UCUM } from "./fhir-systems";

export interface VitalsObservationContext {
  /** Used in Observation.id (deterministic suffix). */
  idBase: string;
  patientReference: `Patient/${string}`;
  encounterReference?: `Encounter/${string}`;
  /** ISO-8601 instant; defaults omitted if not provided */
  effectiveDateTime?: string;
}

function obs(
  partial: Omit<FhirObservation, "resourceType" | "status"> & { id: string }
): FhirObservation {
  return {
    resourceType: "Observation",
    status: "final",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "vital-signs",
            display: "Vital Signs",
          },
        ],
      },
    ],
    ...partial,
  };
}

/**
 * Converts Medora vitals JSON (same shape as encounter/patient vitals) into FHIR R4 Observation resources.
 * Blood pressure is one Observation with two components when both systolic and diastolic are present.
 */
export function mapVitalsJsonToObservations(
  vitalsJson: unknown,
  ctx: VitalsObservationContext
): FhirObservation[] {
  const parsed = vitalsSchema.safeParse(vitalsJson);
  if (!parsed.success || parsed.data == null) {
    return [];
  }
  const v = parsed.data;
  const out: FhirObservation[] = [];
  const { idBase, patientReference, encounterReference, effectiveDateTime } = ctx;
  const subject = { reference: patientReference };
  const encounter = encounterReference ? { reference: encounterReference } : undefined;
  const eff = effectiveDateTime;

  if (v.tempC != null) {
    out.push(
      obs({
        id: `${idBase}-8310-5`,
        code: {
          coding: [{ system: "http://loinc.org", code: LOINC.bodyTemp, display: "Body temperature" }],
        },
        subject,
        encounter,
        effectiveDateTime: eff,
        valueQuantity: { value: v.tempC, unit: "Cel", system: "http://unitsofmeasure.org", code: UCUM.degC },
      })
    );
  }

  if (v.hr != null) {
    out.push(
      obs({
        id: `${idBase}-8867-4`,
        code: {
          coding: [{ system: "http://loinc.org", code: LOINC.heartRate, display: "Heart rate" }],
        },
        subject,
        encounter,
        effectiveDateTime: eff,
        valueQuantity: {
          value: v.hr,
          unit: "/min",
          system: "http://unitsofmeasure.org",
          code: UCUM.perMin,
        },
      })
    );
  }

  if (v.rr != null) {
    out.push(
      obs({
        id: `${idBase}-9279-1`,
        code: {
          coding: [{ system: "http://loinc.org", code: LOINC.respiratoryRate, display: "Respiratory rate" }],
        },
        subject,
        encounter,
        effectiveDateTime: eff,
        valueQuantity: {
          value: v.rr,
          unit: "/min",
          system: "http://unitsofmeasure.org",
          code: UCUM.perMin,
        },
      })
    );
  }

  if (v.bpSys != null && v.bpDia != null) {
    out.push(
      obs({
        id: `${idBase}-85354-9`,
        code: {
          coding: [{ system: "http://loinc.org", code: LOINC.bpPanel, display: "Blood pressure panel" }],
        },
        subject,
        encounter,
        effectiveDateTime: eff,
        component: [
          {
            code: {
              coding: [{ system: "http://loinc.org", code: LOINC.bpSystolic, display: "Systolic blood pressure" }],
            },
            valueQuantity: {
              value: v.bpSys,
              unit: "mm[Hg]",
              system: "http://unitsofmeasure.org",
              code: UCUM.mmHg,
            },
          },
          {
            code: {
              coding: [{ system: "http://loinc.org", code: LOINC.bpDiastolic, display: "Diastolic blood pressure" }],
            },
            valueQuantity: {
              value: v.bpDia,
              unit: "mm[Hg]",
              system: "http://unitsofmeasure.org",
              code: UCUM.mmHg,
            },
          },
        ],
      })
    );
  } else if (v.bpSys != null) {
    out.push(
      obs({
        id: `${idBase}-8480-6`,
        code: {
          coding: [{ system: "http://loinc.org", code: LOINC.bpSystolic, display: "Systolic blood pressure" }],
        },
        subject,
        encounter,
        effectiveDateTime: eff,
        valueQuantity: {
          value: v.bpSys,
          unit: "mm[Hg]",
          system: "http://unitsofmeasure.org",
          code: UCUM.mmHg,
        },
      })
    );
  } else if (v.bpDia != null) {
    out.push(
      obs({
        id: `${idBase}-8462-4`,
        code: {
          coding: [{ system: "http://loinc.org", code: LOINC.bpDiastolic, display: "Diastolic blood pressure" }],
        },
        subject,
        encounter,
        effectiveDateTime: eff,
        valueQuantity: {
          value: v.bpDia,
          unit: "mm[Hg]",
          system: "http://unitsofmeasure.org",
          code: UCUM.mmHg,
        },
      })
    );
  }

  if (v.spo2 != null) {
    out.push(
      obs({
        id: `${idBase}-2708-6`,
        code: {
          coding: [{ system: "http://loinc.org", code: LOINC.spo2, display: "Oxygen saturation" }],
        },
        subject,
        encounter,
        effectiveDateTime: eff,
        valueQuantity: {
          value: v.spo2,
          unit: "%",
          system: "http://unitsofmeasure.org",
          code: UCUM.percent,
        },
      })
    );
  }

  if (v.weightKg != null) {
    out.push(
      obs({
        id: `${idBase}-29463-7`,
        code: {
          coding: [{ system: "http://loinc.org", code: LOINC.bodyWeight, display: "Body weight" }],
        },
        subject,
        encounter,
        effectiveDateTime: eff,
        valueQuantity: {
          value: v.weightKg,
          unit: "kg",
          system: "http://unitsofmeasure.org",
          code: UCUM.kg,
        },
      })
    );
  }

  if (v.heightCm != null) {
    out.push(
      obs({
        id: `${idBase}-8302-2`,
        code: {
          coding: [{ system: "http://loinc.org", code: LOINC.bodyHeight, display: "Body height" }],
        },
        subject,
        encounter,
        effectiveDateTime: eff,
        valueQuantity: {
          value: v.heightCm,
          unit: "cm",
          system: "http://unitsofmeasure.org",
          code: UCUM.cm,
        },
      })
    );
  }

  return out;
}
