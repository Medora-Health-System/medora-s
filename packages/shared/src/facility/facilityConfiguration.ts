import { z } from "zod";
import type { MedoraServiceLine } from "../auth/facilityTypeRegistry.js";
import type { FacilityOptionalModules } from "../auth/facilityClinicCareProfileD4c1.js";

/** One canonical facility-owned configuration document (MEDORA Phase 2 console). */
export const FACILITY_CONFIGURATION_SCHEMA_VERSION = 1 as const;

export const FACILITY_MODULE_KEYS = [
  "emergency",
  "urgentCare",
  "clinic",
  "observation",
  "hospital",
  "laboratory",
  "radiology",
  "pharmacy",
  "billing",
  "scheduling",
  "digitalCare",
  "patientPortal",
  "telemedicine",
  "ai",
] as const;

export type FacilityModuleKey = (typeof FACILITY_MODULE_KEYS)[number];

export const FACILITY_MODULE_LIVE_STATUSES = [
  "LIVE",
  "MAINTENANCE",
  "READ_ONLY",
  "HIDDEN",
  "DISABLED",
] as const;
export type FacilityModuleLiveStatus = (typeof FACILITY_MODULE_LIVE_STATUSES)[number];

export type FacilityModuleRuntime = {
  enabled: boolean;
  visible: boolean;
  maintenance: boolean;
  readOnly: boolean;
  hidden: boolean;
};

const moduleRuntimeSchema = z
  .object({
    enabled: z.boolean(),
    visible: z.boolean(),
    maintenance: z.boolean(),
    readOnly: z.boolean(),
    hidden: z.boolean(),
  })
  .strict();

export const defaultFacilityModuleRuntime = (): FacilityModuleRuntime => ({
  enabled: true,
  visible: true,
  maintenance: false,
  readOnly: false,
  hidden: false,
});

export function resolveFacilityModuleLiveStatus(mod: FacilityModuleRuntime): FacilityModuleLiveStatus {
  if (!mod.enabled) return "DISABLED";
  if (mod.hidden) return "HIDDEN";
  if (mod.maintenance) return "MAINTENANCE";
  if (mod.readOnly) return "READ_ONLY";
  if (!mod.visible) return "HIDDEN";
  return "LIVE";
}

export function facilityModuleIsStaffVisible(mod: FacilityModuleRuntime): boolean {
  const status = resolveFacilityModuleLiveStatus(mod);
  return status !== "DISABLED" && status !== "HIDDEN";
}

export function facilityModuleAllowsWrites(mod: FacilityModuleRuntime): boolean {
  const status = resolveFacilityModuleLiveStatus(mod);
  return status === "LIVE";
}

const hexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid color")
  .or(z.literal(""));

const urlOrEmpty = z.string().trim().max(2000);

const modulesSchema = z
  .object({
    emergency: moduleRuntimeSchema,
    urgentCare: moduleRuntimeSchema,
    clinic: moduleRuntimeSchema,
    observation: moduleRuntimeSchema,
    hospital: moduleRuntimeSchema,
    laboratory: moduleRuntimeSchema,
    radiology: moduleRuntimeSchema,
    pharmacy: moduleRuntimeSchema,
    billing: moduleRuntimeSchema,
    scheduling: moduleRuntimeSchema,
    digitalCare: moduleRuntimeSchema,
    patientPortal: moduleRuntimeSchema,
    telemedicine: moduleRuntimeSchema,
    ai: moduleRuntimeSchema,
  })
  .strict();

const digitalCareSchema = z
  .object({
    secureMessaging: z.boolean(),
    resultRelease: z.boolean(),
    autoRelease: z.boolean(),
    manualRelease: z.boolean(),
    criticalResultWorkflow: z.boolean(),
    documents: z.boolean(),
    carePlans: z.boolean(),
    education: z.boolean(),
    medicationSharing: z.boolean(),
    dischargeSharing: z.boolean(),
    questionnaires: z.boolean(),
    remoteMonitoring: z.boolean(),
    videoVisits: z.boolean(),
    providerChat: z.boolean(),
    patientChat: z.boolean(),
    readReceipts: z.boolean(),
    attachments: z.boolean(),
    pushNotifications: z.boolean(),
    emailNotifications: z.boolean(),
    smsNotifications: z.boolean(),
  })
  .strict();

const patientPortalSchema = z
  .object({
    enabled: z.boolean(),
    registration: z.boolean(),
    appointments: z.boolean(),
    visits: z.boolean(),
    documents: z.boolean(),
    messages: z.boolean(),
    invoices: z.boolean(),
    medications: z.boolean(),
    labResults: z.boolean(),
    radiology: z.boolean(),
    carePlans: z.boolean(),
    telehealth: z.boolean(),
    notifications: z.boolean(),
    language: z.enum(["fr", "en", "es"]),
    portalHome: z.boolean(),
  })
  .strict();

const brandingSchema = z
  .object({
    hospitalName: z.string().trim().max(200),
    hospitalLogoUrl: urlOrEmpty,
    portalLogoUrl: urlOrEmpty,
    faviconUrl: urlOrEmpty,
    primaryColor: hexColorSchema,
    secondaryColor: hexColorSchema,
    accentColor: hexColorSchema,
    patientAppName: z.string().trim().max(80),
    welcomeScreen: z.string().trim().max(2000),
    footer: z.string().trim().max(500),
  })
  .strict();

const notificationsSchema = z
  .object({
    sms: z.boolean(),
    email: z.boolean(),
    push: z.boolean(),
    appointmentReminder: z.boolean(),
    resultReady: z.boolean(),
    messageReceived: z.boolean(),
    medicationReminder: z.boolean(),
    followUpReminder: z.boolean(),
    dischargeReminder: z.boolean(),
  })
  .strict();

const clinicalRulesSchema = z
  .object({
    medicationReconciliation: z.boolean(),
    requiredSignatures: z.boolean(),
    dischargeApproval: z.boolean(),
    criticalLabWorkflow: z.boolean(),
    criticalImagingWorkflow: z.boolean(),
    autoResultReleaseDelayMinutes: z.number().int().min(0).max(7 * 24 * 60),
    providerVerification: z.boolean(),
    nurseVerification: z.boolean(),
  })
  .strict();

const workflowSchema = z
  .object({
    requireChiefComplaint: z.boolean(),
    requireDispositionOnDischarge: z.boolean(),
    allowWalkInWithoutAppointment: z.boolean(),
  })
  .strict();

const schedulingSchema = z
  .object({
    onlineBooking: z.boolean(),
    queue: z.boolean(),
    walkIn: z.boolean(),
    telemedicine: z.boolean(),
    appointmentTypes: z.array(z.string().trim().min(1).max(80)).max(40),
    defaultVisitDurationMinutes: z.number().int().min(5).max(240),
    providerCalendar: z.boolean(),
    reminderLeadMinutes: z.number().int().min(0).max(7 * 24 * 60),
  })
  .strict();

const telehealthSchema = z
  .object({
    enabled: z.boolean(),
    videoVisits: z.boolean(),
    waitingRoom: z.boolean(),
  })
  .strict();

const billingSchema = z
  .object({
    enabled: z.boolean(),
    patientInvoices: z.boolean(),
    insuranceClaims: z.boolean(),
  })
  .strict();

const laboratorySchema = z
  .object({
    enabled: z.boolean(),
    patientResults: z.boolean(),
    criticalCallRequired: z.boolean(),
  })
  .strict();

const radiologySchema = z
  .object({
    enabled: z.boolean(),
    patientResults: z.boolean(),
    criticalCallRequired: z.boolean(),
  })
  .strict();

const pharmacySchema = z
  .object({
    enabled: z.boolean(),
    patientMedicationList: z.boolean(),
  })
  .strict();

const medicationSchema = z
  .object({
    reconciliationRequired: z.boolean(),
    shareHomeMedications: z.boolean(),
  })
  .strict();

const aiSchema = z
  .object({
    notes: z.boolean(),
    coding: z.boolean(),
    summaries: z.boolean(),
    discharge: z.boolean(),
    suggestions: z.boolean(),
    ambientScribe: z.boolean(),
  })
  .strict();

const featureFlagsSchema = z
  .object({
    experimentalWorkspace: z.boolean(),
  })
  .strict();

const securitySchema = z
  .object({
    minPasswordLength: z.number().int().min(12).max(64),
    requireMfa: z.boolean(),
    sessionTimeoutMinutes: z.number().int().min(5).max(24 * 60),
    allowedDevices: z.enum(["ALL", "MANAGED"]),
    auditRetentionDays: z.number().int().min(30).max(3650),
    roleOverridesJson: z.string().max(4000),
  })
  .strict();

const documentsSchema = z
  .object({
    patientSharing: z.boolean(),
    requireConsentBeforeShare: z.boolean(),
  })
  .strict();

const consentSchema = z
  .object({
    requireTreatmentConsent: z.boolean(),
    requirePortalTerms: z.boolean(),
  })
  .strict();

const dischargeSchema = z
  .object({
    requireApproval: z.boolean(),
    shareInstructions: z.boolean(),
  })
  .strict();

const resultReleaseSchema = z
  .object({
    mode: z.enum(["AUTO", "MANUAL"]),
    delayMinutes: z.number().int().min(0).max(7 * 24 * 60),
    holdCritical: z.boolean(),
  })
  .strict();

const messagingSchema = z
  .object({
    enabled: z.boolean(),
    staffToPatient: z.boolean(),
    patientToStaff: z.boolean(),
    attachments: z.boolean(),
    readReceipts: z.boolean(),
  })
  .strict();

const integrationChannelSchema = z
  .object({
    enabled: z.boolean(),
    endpoint: z.string().trim().max(500),
    configured: z.boolean(),
  })
  .strict();

const integrationsSchema = z
  .object({
    laboratory: integrationChannelSchema,
    radiology: integrationChannelSchema,
    pacs: integrationChannelSchema,
    fhir: integrationChannelSchema,
    hl7: integrationChannelSchema,
    stripe: integrationChannelSchema,
    twilio: integrationChannelSchema,
    smtp: integrationChannelSchema,
    sendgrid: integrationChannelSchema,
    pharmacy: integrationChannelSchema,
  })
  .strict();

export const facilityConfigurationSettingsSchema = z
  .object({
    schemaVersion: z.literal(FACILITY_CONFIGURATION_SCHEMA_VERSION),
    modules: modulesSchema,
    digitalCare: digitalCareSchema,
    patientPortal: patientPortalSchema,
    branding: brandingSchema,
    notifications: notificationsSchema,
    clinicalRules: clinicalRulesSchema,
    workflow: workflowSchema,
    scheduling: schedulingSchema,
    telehealth: telehealthSchema,
    billing: billingSchema,
    laboratory: laboratorySchema,
    radiology: radiologySchema,
    pharmacy: pharmacySchema,
    medication: medicationSchema,
    ai: aiSchema,
    featureFlags: featureFlagsSchema,
    security: securitySchema,
    documents: documentsSchema,
    consent: consentSchema,
    discharge: dischargeSchema,
    resultRelease: resultReleaseSchema,
    messaging: messagingSchema,
    integrations: integrationsSchema,
  })
  .strict();

export type FacilityConfigurationSettings = z.infer<typeof facilityConfigurationSettingsSchema>;

function liveModule(): FacilityModuleRuntime {
  return defaultFacilityModuleRuntime();
}

function offModule(): FacilityModuleRuntime {
  return { enabled: false, visible: false, maintenance: false, readOnly: false, hidden: true };
}

function channel(enabled = false): { enabled: boolean; endpoint: string; configured: boolean } {
  return { enabled, endpoint: "", configured: false };
}

export function defaultFacilityConfigurationSettings(): FacilityConfigurationSettings {
  return {
    schemaVersion: FACILITY_CONFIGURATION_SCHEMA_VERSION,
    modules: {
      emergency: liveModule(),
      urgentCare: liveModule(),
      clinic: liveModule(),
      observation: liveModule(),
      hospital: liveModule(),
      laboratory: liveModule(),
      radiology: liveModule(),
      pharmacy: liveModule(),
      billing: liveModule(),
      scheduling: liveModule(),
      digitalCare: liveModule(),
      patientPortal: liveModule(),
      telemedicine: offModule(),
      ai: offModule(),
    },
    digitalCare: {
      secureMessaging: true,
      resultRelease: true,
      autoRelease: false,
      manualRelease: true,
      criticalResultWorkflow: true,
      documents: true,
      carePlans: true,
      education: true,
      medicationSharing: true,
      dischargeSharing: true,
      questionnaires: false,
      remoteMonitoring: false,
      videoVisits: false,
      providerChat: true,
      patientChat: true,
      readReceipts: false,
      attachments: false,
      pushNotifications: false,
      emailNotifications: true,
      smsNotifications: false,
    },
    patientPortal: {
      enabled: true,
      registration: true,
      appointments: true,
      visits: true,
      documents: true,
      messages: true,
      invoices: false,
      medications: true,
      labResults: true,
      radiology: true,
      carePlans: true,
      telehealth: false,
      notifications: true,
      language: "fr",
      portalHome: true,
    },
    branding: {
      hospitalName: "",
      hospitalLogoUrl: "",
      portalLogoUrl: "",
      faviconUrl: "",
      primaryColor: "#0f766e",
      secondaryColor: "#1d4ed8",
      accentColor: "#d97706",
      patientAppName: "Medora",
      welcomeScreen: "",
      footer: "",
    },
    notifications: {
      sms: false,
      email: true,
      push: false,
      appointmentReminder: true,
      resultReady: true,
      messageReceived: true,
      medicationReminder: false,
      followUpReminder: true,
      dischargeReminder: true,
    },
    clinicalRules: {
      medicationReconciliation: true,
      requiredSignatures: true,
      dischargeApproval: false,
      criticalLabWorkflow: true,
      criticalImagingWorkflow: true,
      autoResultReleaseDelayMinutes: 0,
      providerVerification: true,
      nurseVerification: false,
    },
    workflow: {
      requireChiefComplaint: false,
      requireDispositionOnDischarge: true,
      allowWalkInWithoutAppointment: true,
    },
    scheduling: {
      onlineBooking: false,
      queue: true,
      walkIn: true,
      telemedicine: false,
      appointmentTypes: ["CLINIC", "FOLLOW_UP", "TELEMEDICINE"],
      defaultVisitDurationMinutes: 20,
      providerCalendar: true,
      reminderLeadMinutes: 1440,
    },
    telehealth: { enabled: false, videoVisits: false, waitingRoom: false },
    billing: { enabled: true, patientInvoices: false, insuranceClaims: true },
    laboratory: { enabled: true, patientResults: true, criticalCallRequired: true },
    radiology: { enabled: true, patientResults: true, criticalCallRequired: true },
    pharmacy: { enabled: true, patientMedicationList: true },
    medication: { reconciliationRequired: true, shareHomeMedications: true },
    ai: {
      notes: false,
      coding: false,
      summaries: false,
      discharge: false,
      suggestions: false,
      ambientScribe: false,
    },
    featureFlags: { experimentalWorkspace: false },
    security: {
      minPasswordLength: 12,
      requireMfa: false,
      sessionTimeoutMinutes: 30,
      allowedDevices: "ALL",
      auditRetentionDays: 365,
      roleOverridesJson: "{}",
    },
    documents: { patientSharing: true, requireConsentBeforeShare: true },
    consent: { requireTreatmentConsent: true, requirePortalTerms: true },
    discharge: { requireApproval: false, shareInstructions: true },
    resultRelease: { mode: "MANUAL", delayMinutes: 0, holdCritical: true },
    messaging: {
      enabled: true,
      staffToPatient: true,
      patientToStaff: true,
      attachments: false,
      readReceipts: false,
    },
    integrations: {
      laboratory: channel(),
      radiology: channel(),
      pacs: channel(),
      fhir: channel(),
      hl7: channel(),
      stripe: channel(),
      twilio: channel(),
      smtp: channel(),
      sendgrid: channel(),
      pharmacy: channel(),
    },
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(base: unknown, overlay: unknown): unknown {
  if (!isPlainObject(base) || !isPlainObject(overlay)) return overlay === undefined ? base : overlay;
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    if (value === undefined) continue;
    out[key] = deepMerge(base[key], value);
  }
  return out;
}

export type FacilityConfigurationSeed = {
  hospitalName?: string;
  language?: "fr" | "en" | "es";
  serviceLines?: readonly MedoraServiceLine[] | null;
  optionalModules?: FacilityOptionalModules | null;
  facilityType?: string | null;
};

function moduleFromEnabled(enabled: boolean): FacilityModuleRuntime {
  return enabled ? liveModule() : offModule();
}

export function seedFacilityConfigurationSettings(seed: FacilityConfigurationSeed = {}): FacilityConfigurationSettings {
  const defaults = defaultFacilityConfigurationSettings();
  const lines = new Set(seed.serviceLines ?? []);
  const optional = seed.optionalModules;
  const inpatient = ["MEDSURG", "ICU", "OBGYN", "PEDIATRICS", "TELEMETRY", "BEHAVIORAL_HEALTH"] as const;
  const hospitalOn =
    seed.facilityType === "HOSPITAL" || inpatient.some((line) => lines.has(line as MedoraServiceLine));
  defaults.branding.hospitalName = seed.hospitalName?.trim() || defaults.branding.hospitalName;
  defaults.patientPortal.language = seed.language ?? defaults.patientPortal.language;
  defaults.modules.emergency = moduleFromEnabled(lines.has("EMERGENCY"));
  defaults.modules.urgentCare = moduleFromEnabled(lines.has("URGENT_CARE"));
  defaults.modules.clinic = moduleFromEnabled(lines.has("CLINIC"));
  defaults.modules.observation = moduleFromEnabled(lines.has("OBSERVATION"));
  defaults.modules.hospital = moduleFromEnabled(hospitalOn);
  defaults.modules.laboratory = moduleFromEnabled(optional?.laboratory ?? lines.has("LABORATORY"));
  defaults.modules.radiology = moduleFromEnabled(optional?.radiology ?? lines.has("RADIOLOGY"));
  defaults.modules.pharmacy = moduleFromEnabled(optional?.pharmacy ?? lines.has("PHARMACY"));
  defaults.modules.billing = moduleFromEnabled(optional?.billing ?? true);
  defaults.billing.enabled = defaults.modules.billing.enabled;
  defaults.laboratory.enabled = defaults.modules.laboratory.enabled;
  defaults.radiology.enabled = defaults.modules.radiology.enabled;
  defaults.pharmacy.enabled = defaults.modules.pharmacy.enabled;
  defaults.patientPortal.invoices = defaults.modules.billing.enabled && defaults.patientPortal.invoices;
  return defaults;
}

export function parseFacilityConfigurationSettings(
  stored: unknown,
  seed: FacilityConfigurationSeed = {},
): FacilityConfigurationSettings {
  const seeded = seedFacilityConfigurationSettings(seed);
  const merged = deepMerge(seeded, stored);
  const parsed = facilityConfigurationSettingsSchema.safeParse(merged);
  if (parsed.success) return synchronizeDerivedSettings(parsed.data);
  return synchronizeDerivedSettings(seeded);
}

export function synchronizeDerivedSettings(settings: FacilityConfigurationSettings): FacilityConfigurationSettings {
  const next = structuredClone(settings);
  next.resultRelease.mode = next.digitalCare.autoRelease ? "AUTO" : "MANUAL";
  next.digitalCare.manualRelease = !next.digitalCare.autoRelease;
  next.resultRelease.delayMinutes = next.clinicalRules.autoResultReleaseDelayMinutes;
  next.resultRelease.holdCritical = next.digitalCare.criticalResultWorkflow;
  next.messaging.enabled = next.digitalCare.secureMessaging && next.modules.digitalCare.enabled;
  next.messaging.staffToPatient = next.digitalCare.providerChat;
  next.messaging.patientToStaff = next.digitalCare.patientChat;
  next.messaging.attachments = next.digitalCare.attachments;
  next.messaging.readReceipts = next.digitalCare.readReceipts;
  next.telehealth.enabled = next.modules.telemedicine.enabled && next.digitalCare.videoVisits;
  next.telehealth.videoVisits = next.digitalCare.videoVisits;
  next.billing.enabled = next.modules.billing.enabled;
  next.laboratory.enabled = next.modules.laboratory.enabled;
  next.radiology.enabled = next.modules.radiology.enabled;
  next.pharmacy.enabled = next.modules.pharmacy.enabled;
  return next;
}

export const facilityConfigurationPatchDtoSchema = z
  .object({
    revision: z.number().int().positive(),
    reason: z.string().trim().min(1).max(500).optional(),
    settings: facilityConfigurationSettingsSchema,
  })
  .strict();

export type FacilityConfigurationPatchDto = z.infer<typeof facilityConfigurationPatchDtoSchema>;

export type FacilityConfigurationChange = {
  path: string;
  oldValue: unknown;
  newValue: unknown;
};

export function diffFacilityConfiguration(
  before: FacilityConfigurationSettings,
  after: FacilityConfigurationSettings,
  prefix = "",
): FacilityConfigurationChange[] {
  const changes: FacilityConfigurationChange[] = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const left = (before as Record<string, unknown>)[key];
    const right = (after as Record<string, unknown>)[key];
    if (isPlainObject(left) && isPlainObject(right)) {
      changes.push(
        ...diffFacilityConfiguration(
          left as FacilityConfigurationSettings,
          right as FacilityConfigurationSettings,
          path,
        ),
      );
      continue;
    }
    if (JSON.stringify(left) !== JSON.stringify(right)) {
      changes.push({ path, oldValue: left, newValue: right });
    }
  }
  return changes;
}

export type FacilityRuntimeConfiguration = {
  facilityId: string;
  branding: FacilityConfigurationSettings["branding"];
  modules: FacilityConfigurationSettings["modules"];
  digitalCare: FacilityConfigurationSettings["digitalCare"];
  patientPortal: FacilityConfigurationSettings["patientPortal"];
  notifications: FacilityConfigurationSettings["notifications"];
  resultRelease: FacilityConfigurationSettings["resultRelease"];
  messaging: FacilityConfigurationSettings["messaging"];
  ai: FacilityConfigurationSettings["ai"];
  scheduling: FacilityConfigurationSettings["scheduling"];
};

export function projectFacilityRuntimeConfiguration(
  facilityId: string,
  settings: FacilityConfigurationSettings,
): FacilityRuntimeConfiguration {
  return {
    facilityId,
    branding: settings.branding,
    modules: settings.modules,
    digitalCare: settings.digitalCare,
    patientPortal: settings.patientPortal,
    notifications: settings.notifications,
    resultRelease: settings.resultRelease,
    messaging: settings.messaging,
    ai: settings.ai,
    scheduling: settings.scheduling,
  };
}

const SERVICE_LINE_BY_MODULE: Partial<Record<FacilityModuleKey, MedoraServiceLine>> = {
  emergency: "EMERGENCY",
  urgentCare: "URGENT_CARE",
  clinic: "CLINIC",
  observation: "OBSERVATION",
  laboratory: "LABORATORY",
  radiology: "RADIOLOGY",
  pharmacy: "PHARMACY",
};

export function applyFacilityConsoleModulesToServiceLines(
  current: readonly MedoraServiceLine[],
  modules: FacilityConfigurationSettings["modules"],
): MedoraServiceLine[] {
  const next = new Set(current);
  for (const [moduleKey, line] of Object.entries(SERVICE_LINE_BY_MODULE) as Array<[FacilityModuleKey, MedoraServiceLine]>) {
    if (modules[moduleKey].enabled && !modules[moduleKey].hidden) next.add(line);
    else next.delete(line);
  }
  return [...next];
}

export function optionalModulesFromFacilityConsole(
  modules: FacilityConfigurationSettings["modules"],
  existing?: Partial<FacilityOptionalModules> | null,
): FacilityOptionalModules {
  return {
    laboratory: modules.laboratory.enabled && !modules.laboratory.hidden,
    radiology: modules.radiology.enabled && !modules.radiology.hidden,
    pharmacy: modules.pharmacy.enabled && !modules.pharmacy.hidden,
    publicHealth: existing?.publicHealth ?? true,
    billing: modules.billing.enabled && !modules.billing.hidden,
  };
}

export function shouldAutoReleaseDiagnosticResult(input: {
  settings: FacilityConfigurationSettings;
  kind: "LAB_TEST" | "IMAGING_STUDY";
  critical: boolean;
  verifiedAt: Date;
  now?: Date;
}): boolean {
  const { settings, kind, critical, verifiedAt } = input;
  const now = input.now ?? new Date();
  if (!settings.modules.digitalCare.enabled || settings.modules.digitalCare.hidden) return false;
  if (!settings.digitalCare.resultRelease) return false;
  if (!settings.digitalCare.autoRelease || settings.resultRelease.mode !== "AUTO") return false;
  if (critical && (settings.digitalCare.criticalResultWorkflow || settings.resultRelease.holdCritical)) {
    return false;
  }
  if (kind === "LAB_TEST" && critical && settings.clinicalRules.criticalLabWorkflow) return false;
  if (kind === "IMAGING_STUDY" && critical && settings.clinicalRules.criticalImagingWorkflow) return false;
  const delayMs = (settings.clinicalRules.autoResultReleaseDelayMinutes || settings.resultRelease.delayMinutes) * 60_000;
  return now.getTime() >= verifiedAt.getTime() + delayMs;
}

export const FACILITY_MODULE_NAV_PREFIXES: Partial<Record<FacilityModuleKey, readonly string[]>> = {
  emergency: ["/app/emergency"],
  clinic: ["/app/clinic-care"],
  hospital: ["/app/hospitalisation"],
  laboratory: ["/app/lab-worklist"],
  radiology: ["/app/rad-worklist"],
  pharmacy: ["/app/pharmacy", "/app/pharmacy-worklist"],
  billing: ["/app/billing"],
  digitalCare: ["/app/digital-care"],
  scheduling: ["/app/appointments"],
};

export function facilityModuleHidesHref(href: string, modules: FacilityConfigurationSettings["modules"]): boolean {
  const path = href.split("?")[0] || href;
  for (const key of FACILITY_MODULE_KEYS) {
    const prefixes = FACILITY_MODULE_NAV_PREFIXES[key];
    if (!prefixes) continue;
    if (!prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) continue;
    if (!facilityModuleIsStaffVisible(modules[key])) return true;
  }
  return false;
}
