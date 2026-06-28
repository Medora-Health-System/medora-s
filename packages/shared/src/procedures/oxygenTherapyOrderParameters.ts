/**
 * MEDUI.CARE_PROCEDURES.OXYGEN_ORDER_PARAMETERS.1
 * Structured oxygen therapy parameters for Care / Procedures (oxygen_therapy).
 * Persisted via manualLabel snapshot + OrderItem.notes — no schema migration.
 */

export const OXYGEN_THERAPY_PROCEDURE_CODE = "oxygen_therapy" as const;

export const OXYGEN_THERAPY_DEVICES = [
  "nasal_cannula",
  "simple_face_mask",
  "venturi_mask",
  "non_rebreather",
  "high_flow_nasal_cannula",
  "trach_collar",
  "other",
] as const;

export type OxygenTherapyDevice = (typeof OXYGEN_THERAPY_DEVICES)[number];

export const OXYGEN_THERAPY_FLOW_OPTIONS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "10",
  "15",
  "custom",
] as const;

export type OxygenTherapyFlowOption = (typeof OXYGEN_THERAPY_FLOW_OPTIONS)[number];

export const OXYGEN_THERAPY_FIO2_OPTIONS = ["24", "28", "31", "35", "40", "50", "custom"] as const;

export type OxygenTherapyFio2Option = (typeof OXYGEN_THERAPY_FIO2_OPTIONS)[number];

export const OXYGEN_THERAPY_FREQUENCY_MODES = [
  "continuous",
  "prn",
  "stat",
  "during_transport",
  "while_sleeping",
  "with_exertion",
] as const;

export type OxygenTherapyFrequencyMode = (typeof OXYGEN_THERAPY_FREQUENCY_MODES)[number];

export const OXYGEN_THERAPY_TARGET_OPTIONS = [
  "spo2_ge_92",
  "spo2_88_92_copd",
  "custom",
] as const;

export type OxygenTherapyTargetOption = (typeof OXYGEN_THERAPY_TARGET_OPTIONS)[number];

export const OXYGEN_THERAPY_RT_OPTIONS = [
  "rt_notify",
  "rt_evaluate_treat",
  "nursing_protocol_initiate",
] as const;

export type OxygenTherapyRtOption = (typeof OXYGEN_THERAPY_RT_OPTIONS)[number];

export type OxygenTherapyDraft = {
  device: OxygenTherapyDevice;
  deviceCustom?: string;
  flowSelection: OxygenTherapyFlowOption;
  flowCustomLpm?: string;
  fio2Selection?: OxygenTherapyFio2Option;
  fio2CustomPercent?: string;
  frequencyMode: OxygenTherapyFrequencyMode;
  targetSelection: OxygenTherapyTargetOption;
  targetCustom?: string;
  rtInvolvement: OxygenTherapyRtOption;
};

export type OxygenTherapyLocale = "en" | "fr";

const DEVICE_USES_FIO2 = new Set<OxygenTherapyDevice>(["venturi_mask", "trach_collar"]);
const DEVICE_USES_FLOW = new Set<OxygenTherapyDevice>([
  "nasal_cannula",
  "simple_face_mask",
  "non_rebreather",
  "high_flow_nasal_cannula",
]);

export function deviceUsesFlow(device: OxygenTherapyDevice): boolean {
  return DEVICE_USES_FLOW.has(device);
}

export function deviceUsesFio2(device: OxygenTherapyDevice): boolean {
  return DEVICE_USES_FIO2.has(device);
}

export function defaultOxygenTherapyDraft(): OxygenTherapyDraft {
  return {
    device: "nasal_cannula",
    flowSelection: "2",
    frequencyMode: "continuous",
    targetSelection: "spo2_ge_92",
    rtInvolvement: "nursing_protocol_initiate",
  };
}

function deviceLabel(device: OxygenTherapyDevice, locale: OxygenTherapyLocale, custom?: string): string {
  if (device === "other") return custom?.trim() || (locale === "fr" ? "Autre" : "Other");
  const en: Record<OxygenTherapyDevice, string> = {
    nasal_cannula: "Nasal cannula",
    simple_face_mask: "Simple face mask",
    venturi_mask: "Venturi mask",
    non_rebreather: "Non-rebreather mask",
    high_flow_nasal_cannula: "High-flow nasal cannula",
    trach_collar: "Trach collar",
    other: "Other",
  };
  const fr: Record<OxygenTherapyDevice, string> = {
    nasal_cannula: "Canule nasale",
    simple_face_mask: "Masque simple",
    venturi_mask: "Masque Venturi",
    non_rebreather: "Masque à haute concentration",
    high_flow_nasal_cannula: "Canule nasale haut débit",
    trach_collar: "Collier de trachéotomie",
    other: "Autre",
  };
  return locale === "fr" ? fr[device] : en[device];
}

function frequencyLabel(mode: OxygenTherapyFrequencyMode, locale: OxygenTherapyLocale): string {
  const en: Record<OxygenTherapyFrequencyMode, string> = {
    continuous: "continuous",
    prn: "PRN",
    stat: "STAT",
    during_transport: "during transport",
    while_sleeping: "while sleeping",
    with_exertion: "with exertion",
  };
  const fr: Record<OxygenTherapyFrequencyMode, string> = {
    continuous: "continu",
    prn: "PRN",
    stat: "STAT",
    during_transport: "pendant le transport",
    while_sleeping: "pendant le sommeil",
    with_exertion: "à l'effort",
  };
  return locale === "fr" ? fr[mode] : en[mode];
}

function targetLabel(target: OxygenTherapyTargetOption, locale: OxygenTherapyLocale, custom?: string): string {
  if (target === "custom") return custom?.trim() || "";
  if (target === "spo2_ge_92") {
    return locale === "fr" ? "maintenir SpO₂ ≥ 92 %" : "maintain SpO₂ ≥ 92%";
  }
  return locale === "fr"
    ? "maintenir SpO₂ 88–92 % si risque de rétention de CO₂"
    : "maintain SpO₂ 88–92% if CO₂ retention risk";
}

function rtLabel(rt: OxygenTherapyRtOption, locale: OxygenTherapyLocale): string {
  const en: Record<OxygenTherapyRtOption, string> = {
    rt_notify: "RT notify",
    rt_evaluate_treat: "RT evaluate and treat",
    nursing_protocol_initiate: "nursing may initiate per protocol",
  };
  const fr: Record<OxygenTherapyRtOption, string> = {
    rt_notify: "Aviser RT",
    rt_evaluate_treat: "RT évaluer et traiter",
    nursing_protocol_initiate: "infirmier(ère) peut initier selon protocole",
  };
  return locale === "fr" ? fr[rt] : en[rt];
}

function resolveFlowLpm(draft: OxygenTherapyDraft): string | null {
  if (!deviceUsesFlow(draft.device)) return null;
  if (draft.flowSelection === "custom") return draft.flowCustomLpm?.trim() || null;
  return draft.flowSelection;
}

function resolveFio2(draft: OxygenTherapyDraft): string | null {
  if (!deviceUsesFio2(draft.device)) return null;
  if (draft.fio2Selection === "custom") return draft.fio2CustomPercent?.trim() || null;
  return draft.fio2Selection ?? null;
}

export function validateOxygenTherapyDraft(
  draft: OxygenTherapyDraft
): { ok: true } | { ok: false; message: string } {
  if (draft.device === "other" && !draft.deviceCustom?.trim()) {
    return { ok: false, message: "Custom oxygen device is required." };
  }
  if (deviceUsesFlow(draft.device)) {
    const flow = resolveFlowLpm(draft);
    if (!flow) return { ok: false, message: "Oxygen flow rate is required." };
    const n = Number(flow);
    if (!Number.isFinite(n) || n <= 0 || n > 60) {
      return { ok: false, message: "Oxygen flow must be between 0.1 and 60 L/min." };
    }
  }
  if (deviceUsesFio2(draft.device)) {
    const fio2 = resolveFio2(draft);
    if (!fio2) return { ok: false, message: "FiO₂ is required for this device." };
    const n = Number(fio2);
    if (!Number.isFinite(n) || n < 21 || n > 100) {
      return { ok: false, message: "FiO₂ must be between 21 and 100%." };
    }
  }
  if (draft.targetSelection === "custom" && !draft.targetCustom?.trim()) {
    return { ok: false, message: "Custom SpO₂ target is required." };
  }
  return { ok: true };
}

export function buildOxygenTherapyManualLabel(draft: OxygenTherapyDraft, locale: OxygenTherapyLocale): string {
  const prefix = locale === "fr" ? "Oxygénothérapie" : "Oxygen therapy";
  const device = deviceLabel(draft.device, locale, draft.deviceCustom);
  const parts: string[] = [device];

  const flow = resolveFlowLpm(draft);
  if (flow) {
    parts.push(`${flow} L/min`);
  }
  const fio2 = resolveFio2(draft);
  if (fio2) {
    parts.push(locale === "fr" ? `FiO₂ ${fio2} %` : `FiO₂ ${fio2}%`);
  }

  const freq = frequencyLabel(draft.frequencyMode, locale);
  const target = targetLabel(draft.targetSelection, locale, draft.targetCustom);

  return `${prefix}: ${parts.join(" ")} ${freq}, ${target}`;
}

export function buildOxygenTherapyOrderNotes(draft: OxygenTherapyDraft, locale: OxygenTherapyLocale): string {
  const instruction = buildOxygenTherapyManualLabel(draft, locale);
  const rt = rtLabel(draft.rtInvolvement, locale);
  const fullInstruction = `${instruction}; ${rt}`;
  const payload = JSON.stringify({
    v: 1,
    device: draft.device,
    flowSelection: draft.flowSelection,
    fio2Selection: draft.fio2Selection ?? null,
    frequencyMode: draft.frequencyMode,
    targetSelection: draft.targetSelection,
    rtInvolvement: draft.rtInvolvement,
  });
  return `[O2_PARAMS:${payload}]\n${fullInstruction}`;
}

export function oxygenTherapyOrderPriority(
  draft: OxygenTherapyDraft
): "ROUTINE" | "URGENT" | "STAT" | undefined {
  if (draft.frequencyMode === "stat") return "STAT";
  if (draft.frequencyMode === "prn") return "ROUTINE";
  return undefined;
}
