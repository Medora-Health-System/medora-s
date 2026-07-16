/**
 * Structured documentation foundation only. This is not an ISNCSCI certification tool and
 * intentionally does not calculate an AIS grade.
 */
export const ASIA_ISNCSCI_CERTIFICATION_STATUS = "FOUNDATION_NOT_CERTIFIED" as const;

export type AsiaKeyMotorMuscle = {
  level: "C5" | "C6" | "C7" | "C8" | "T1" | "L2" | "L3" | "L4" | "L5" | "S1";
  action: string;
};
export type AsiaSensoryPoint = {
  level: string;
  side: "left" | "right";
  modality: "light_touch" | "pin_prick";
};

export const ASIA_KEY_MOTOR_MUSCLES: readonly AsiaKeyMotorMuscle[] = [
  { level: "C5", action: "elbow flexors" }, { level: "C6", action: "wrist extensors" },
  { level: "C7", action: "elbow extensors" }, { level: "C8", action: "finger flexors" },
  { level: "T1", action: "finger abductors" }, { level: "L2", action: "hip flexors" },
  { level: "L3", action: "knee extensors" }, { level: "L4", action: "ankle dorsiflexors" },
  { level: "L5", action: "long toe extensors" }, { level: "S1", action: "ankle plantar flexors" },
];

export function asiaIsncsciFoundationStatus() {
  return { certificationStatus: ASIA_ISNCSCI_CERTIFICATION_STATUS, aisGrade: null as null };
}
