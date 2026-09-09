import { z } from "zod";

const enumValues = <T extends readonly [string, ...string[]]>(values: T) => z.enum(values);
const CREDENTIAL_KEY_ALIASES = new Set(["clientsecret", "secret", "apikey", "password", "privatekey", "bearertoken", "accesstoken", "refreshtoken", "databaseurl", "connectionstring", "credential", "credentials"]);
const normalizedKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");
function containsCredentialKey(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsCredentialKey);
  return Object.entries(value).some(([key, nested]) => CREDENTIAL_KEY_ALIASES.has(normalizedKey(key)) || containsCredentialKey(nested));
}
const endpointConfigShape = z.object({ baseUrl: z.string().url().max(2048).optional(), tokenUrl: z.string().url().max(2048).optional(), authMethod: z.enum(["NONE", "PRIVATE_KEY_JWT", "MTLS"]).optional(), publicKeyReference: z.string().max(300).optional(), scopes: z.array(z.string().max(100)).max(30).optional() }).strict();
export const integrationEndpointConfigSchema = z.unknown().superRefine((value, ctx) => {
  if (containsCredentialKey(value)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Credential-bearing endpoint configuration is prohibited" });
}).pipe(endpointConfigShape);
const endpointConfig = integrationEndpointConfigSchema.optional();
const integrationBaseSchema = z.object({
  displayName: z.string().trim().min(2).max(160), partnerName: z.string().trim().min(2).max(200),
  organizationType: enumValues(["LABORATORY","HOSPITAL","CLINIC","PHARMACY","IMAGING_RADIOLOGY","GOVERNMENT","RCM_BILLING","HIE","OTHER"]),
  protocol: enumValues(["FHIR_R4","HL7_V2"]), direction: enumValues(["INBOUND","OUTBOUND","BIDIRECTIONAL"]), environment: enumValues(["SANDBOX","PRODUCTION"]),
  jurisdiction: enumValues(["US","DO","HT","OTHER"]), sourceSystemIdentifier: z.string().trim().max(160).optional(), technicalContactName: z.string().trim().max(160).optional(), technicalContactEmail: z.string().email().max(254).optional(), technicalContactPhone: z.string().trim().max(64).optional(),
  facilityIds: z.array(z.string().uuid()).max(100).default([]), permissionCodes: z.array(z.string().max(100)).max(50).default([]), endpointConfig,
}).strict();
export const integrationInputSchema = integrationBaseSchema.superRefine((v, ctx) => { if (v.protocol === "HL7_V2") ctx.addIssue({ code: z.ZodIssueCode.custom, message: "HL7 v2 provisioning is planned for P0.4", path: ["protocol"] }); });
export const integrationPatchSchema = integrationBaseSchema.omit({ protocol: true }).partial().strict();
