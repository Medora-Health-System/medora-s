import { z } from "zod";

const enumValues = <T extends readonly [string, ...string[]]>(values: T) => z.enum(values);
const CREDENTIAL_KEY_ALIASES = new Set(["clientsecret", "secret", "apikey", "password", "privatekey", "bearertoken", "accesstoken", "refreshtoken", "databaseurl", "connectionstring", "credential", "credentials"]);
const normalizedKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");
function containsCredentialKey(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsCredentialKey);
  return Object.entries(value).some(([key, nested]) => CREDENTIAL_KEY_ALIASES.has(normalizedKey(key)) || containsCredentialKey(nested));
}

const optionalText = (max: number) => z.preprocess((value) => typeof value === "string" && !value.trim() ? undefined : value, z.string().trim().max(max).optional());
const requiredText = (label: string, max: number) => z.string({ required_error: `${label} is required` }).trim().min(1, `${label} is required`).max(max);
const email = (label: string) => z.string({ required_error: `${label} is required` }).trim().email(`${label} must be a valid email address`).max(254);
const phonePattern = /^[+0-9][0-9().\-\s]{5,62}[0-9]$/;
const phone = (label: string, optional = false) => (optional ? optionalText(64) : requiredText(label, 64)).refine((v) => !v || phonePattern.test(v), `${label} must be a valid international telephone number`);

const endpointConfigShape = z.object({ baseUrl: z.string().url().max(2048).optional(), tokenUrl: z.string().url().max(2048).optional(), authMethod: z.enum(["NONE", "PRIVATE_KEY_JWT", "MTLS"]).optional(), publicKeyReference: z.string().max(300).optional(), scopes: z.array(z.string().max(100)).max(30).optional() }).strict();
export const integrationEndpointConfigSchema = z.unknown().superRefine((value, ctx) => {
  if (containsCredentialKey(value)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Credential-bearing endpoint configuration is prohibited" });
}).pipe(endpointConfigShape);

const integrationBaseSchema = z.object({
  displayName: requiredText("Integration display name", 160),
  partnerName: requiredText("Legal organization name", 200),
  organizationType: enumValues(["LABORATORY","HOSPITAL","CLINIC","PHARMACY","IMAGING_RADIOLOGY","GOVERNMENT","RCM_BILLING","HIE","OTHER"]),
  jurisdiction: requiredText("Jurisdiction", 32),
  organizationRegistrationId: optionalText(160), website: z.preprocess((v) => typeof v === "string" && !v.trim() ? undefined : v, z.string().url("Website must be a valid URL").max(2048).optional()),
  addressLine1: requiredText("Address line 1", 200), addressLine2: optionalText(200), city: requiredText("City", 120), stateProvinceRegion: optionalText(120), postalCode: optionalText(32), country: requiredText("Country", 2).regex(/^[A-Za-z]{2}$/, "Country must be a two-letter code").transform((v) => v.toUpperCase()),
  primaryContactFirstName: requiredText("Primary contact first name", 100), primaryContactLastName: requiredText("Primary contact last name", 100), primaryContactJobTitle: requiredText("Primary contact job title", 160), primaryContactDepartment: optionalText(160), primaryContactEmail: email("Primary contact email"), primaryContactPhone: phone("Primary contact phone"), primaryContactExtension: optionalText(20), primaryContactMobile: phone("Primary contact mobile", true),
  technicalContactSameAsPrimary: z.boolean().default(false), technicalContactName: optionalText(160), technicalContactJobTitle: optionalText(160), technicalContactEmail: z.preprocess((v) => typeof v === "string" && !v.trim() ? undefined : v, z.string().email("Technical contact email must be valid").max(254).optional()), technicalContactPhone: phone("Technical contact phone", true), technicalContactExtension: optionalText(20),
  protocol: enumValues(["FHIR_R4","HL7_V2"]), direction: enumValues(["INBOUND","OUTBOUND","BIDIRECTIONAL"]), environment: enumValues(["SANDBOX","PRODUCTION"]),
  sourceSystemIdentifier: optionalText(160), facilityIds: z.array(z.string().uuid()).min(1, "Select at least one authorized facility").max(100), permissionCodes: z.array(z.string().max(100)).max(50), endpointConfig: integrationEndpointConfigSchema.optional(),
}).strict().superRefine((v, ctx) => {
  if (v.protocol === "HL7_V2") ctx.addIssue({ code: z.ZodIssueCode.custom, message: "HL7 v2 is planned and cannot be selected", path: ["protocol"] });
  if (v.protocol === "FHIR_R4" && v.permissionCodes.length === 0) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Select at least one FHIR permission", path: ["permissionCodes"] });
  if (!v.technicalContactSameAsPrimary) {
    for (const [field, value, message] of [["technicalContactName", v.technicalContactName, "Technical contact name is required"], ["technicalContactEmail", v.technicalContactEmail, "Technical contact email is required"], ["technicalContactPhone", v.technicalContactPhone, "Technical contact phone is required"]] as const) if (!value) ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: [field] });
  }
});

export const integrationInputSchema = integrationBaseSchema;
// Updates remain backward-compatible with P0.3A rows; service validation applies
// authorization and capability checks whenever grants change.
export const integrationPatchSchema = z.object({
  displayName: optionalText(160), partnerName: optionalText(200), organizationType: enumValues(["LABORATORY","HOSPITAL","CLINIC","PHARMACY","IMAGING_RADIOLOGY","GOVERNMENT","RCM_BILLING","HIE","OTHER"]).optional(), jurisdiction: optionalText(32), environment: enumValues(["SANDBOX","PRODUCTION"]).optional(), direction: enumValues(["INBOUND","OUTBOUND","BIDIRECTIONAL"]).optional(),
  organizationRegistrationId: optionalText(160), website: optionalText(2048), addressLine1: optionalText(200), addressLine2: optionalText(200), city: optionalText(120), stateProvinceRegion: optionalText(120), postalCode: optionalText(32), country: optionalText(2), primaryContactFirstName: optionalText(100), primaryContactLastName: optionalText(100), primaryContactJobTitle: optionalText(160), primaryContactDepartment: optionalText(160), primaryContactEmail: optionalText(254), primaryContactPhone: optionalText(64), primaryContactExtension: optionalText(20), primaryContactMobile: optionalText(64), technicalContactSameAsPrimary: z.boolean().optional(), technicalContactName: optionalText(160), technicalContactJobTitle: optionalText(160), technicalContactEmail: optionalText(254), technicalContactPhone: optionalText(64), technicalContactExtension: optionalText(20), sourceSystemIdentifier: optionalText(160), facilityIds: z.array(z.string().uuid()).min(1).max(100).optional(), permissionCodes: z.array(z.string().max(100)).min(1).max(50).optional(), endpointConfig: integrationEndpointConfigSchema.optional(),
}).strict();
