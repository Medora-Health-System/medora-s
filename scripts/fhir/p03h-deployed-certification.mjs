#!/usr/bin/env node

/**
 * MEDORA.RD.P0.3H deployed certification harness.
 *
 * This script intentionally performs only non-destructive deployed checks. It never
 * prints client secrets or bearer tokens. Credential rotation/revocation and
 * whole-client revocation remain explicit administrator-controlled acceptance
 * steps documented in MEDORA_RD_P0_3H_FHIR_M2M_CERTIFICATION.md.
 */

import { randomUUID } from "node:crypto";

const required = [
  "FHIR_CERT_BASE_URL",
  "FHIR_CERT_CLIENT_ID",
  "FHIR_CERT_KEY_ID",
  "FHIR_CERT_CLIENT_SECRET",
  "FHIR_CERT_FACILITY_ID",
];

for (const name of required) {
  if (!process.env[name]?.trim()) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(2);
  }
}

const baseUrl = process.env.FHIR_CERT_BASE_URL.trim().replace(/\/$/, "");
const tokenUrl = `${baseUrl}/auth/token`;
const clientId = process.env.FHIR_CERT_CLIENT_ID.trim();
const keyId = process.env.FHIR_CERT_KEY_ID.trim();
const clientSecret = process.env.FHIR_CERT_CLIENT_SECRET;
const facilityId = process.env.FHIR_CERT_FACILITY_ID.trim();
const wrongFacilityId = process.env.FHIR_CERT_WRONG_FACILITY_ID?.trim() || randomUUID();
const allowedScope = (process.env.FHIR_CERT_ALLOWED_SCOPE || "patient.search").trim();
const resourceType = (process.env.FHIR_CERT_RESOURCE_TYPE || "Patient").trim();
const deniedResourceType = (process.env.FHIR_CERT_DENIED_RESOURCE_TYPE || "Observation").trim();
const ungrantedScope = (process.env.FHIR_CERT_UNGRANTED_SCOPE || "__medora.certification.denied__").trim();

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
for (const [name, value] of [
  ["FHIR_CERT_CLIENT_ID", clientId],
  ["FHIR_CERT_FACILITY_ID", facilityId],
  ["FHIR_CERT_WRONG_FACILITY_ID", wrongFacilityId],
]) {
  if (!uuid.test(value)) {
    console.error(`${name} must be a UUID`);
    process.exit(2);
  }
}
if (facilityId === wrongFacilityId) {
  console.error("FHIR_CERT_WRONG_FACILITY_ID must differ from FHIR_CERT_FACILITY_ID");
  process.exit(2);
}

const evidence = [];

function pass(name, detail) {
  evidence.push({ check: name, result: "PASS", detail });
  console.log(`PASS — ${name}: ${detail}`);
}

function fail(name, detail) {
  evidence.push({ check: name, result: "FAIL", detail });
  console.error(`FAIL — ${name}: ${detail}`);
  throw new Error(`${name}: ${detail}`);
}

async function readBody(response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

async function requestToken({ facility = facilityId, scope = allowedScope } = {}) {
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      key_id: keyId,
      client_secret: clientSecret,
      facility_id: facility,
      scope,
    }),
  });
  const body = await readBody(response);
  return { response, body };
}

function assertRejected(name, response, body, expectedStatuses = [400, 401, 403]) {
  if (!expectedStatuses.includes(response.status)) {
    fail(name, `expected rejection status ${expectedStatuses.join("/")}, received ${response.status}`);
  }
  const outcome = body && typeof body === "object" ? body.resourceType : undefined;
  pass(name, `rejected with HTTP ${response.status}${outcome ? ` (${outcome})` : ""}`);
}

async function fhirGet(resource, token, extraHeaders = {}) {
  const response = await fetch(`${baseUrl}/${encodeURIComponent(resource)}`, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/fhir+json",
      ...extraHeaders,
    },
  });
  const body = await readBody(response);
  return { response, body };
}

async function main() {
  console.log("MEDORA.RD.P0.3H deployed certification — non-destructive suite");
  console.log(`Target: ${baseUrl}`);
  console.log(`Positive resource: ${resourceType}; requested scope: ${allowedScope}`);

  const issued = await requestToken();
  if (!issued.response.ok || !issued.body || typeof issued.body !== "object") {
    fail("token issuance", `HTTP ${issued.response.status}`);
  }
  const accessToken = issued.body.access_token;
  if (typeof accessToken !== "string" || accessToken.length < 20) {
    fail("token issuance", "response did not contain a usable access_token");
  }
  if (String(issued.body.token_type || "").toLowerCase() !== "bearer") {
    fail("token issuance", "token_type was not Bearer");
  }
  if (!Number.isFinite(Number(issued.body.expires_in)) || Number(issued.body.expires_in) <= 0) {
    fail("token issuance", "expires_in was missing or invalid");
  }
  pass("token issuance", `Bearer token issued; TTL ${issued.body.expires_in}s`);

  const positive = await fhirGet(resourceType, accessToken);
  if (!positive.response.ok) {
    fail("authorized FHIR search", `HTTP ${positive.response.status}`);
  }
  if (!positive.body || typeof positive.body !== "object" || positive.body.resourceType !== "Bundle") {
    fail("authorized FHIR search", `expected FHIR Bundle, received ${positive.body?.resourceType || typeof positive.body}`);
  }
  if (positive.body.type !== "searchset") {
    fail("authorized FHIR search", `expected Bundle.type=searchset, received ${positive.body.type || "missing"}`);
  }
  pass("authorized FHIR search", `${resourceType} returned a FHIR searchset`);

  const wrongFacilityToken = await requestToken({ facility: wrongFacilityId });
  assertRejected("wrong facility token rejection", wrongFacilityToken.response, wrongFacilityToken.body, [401, 403]);

  const wrongScopeToken = await requestToken({ scope: ungrantedScope });
  assertRejected("ungranted scope token rejection", wrongScopeToken.response, wrongScopeToken.body, [403]);

  const conflictingFacility = await fhirGet(resourceType, accessToken, { "x-facility-id": wrongFacilityId });
  assertRejected("conflicting facility header rejection", conflictingFacility.response, conflictingFacility.body, [401, 403]);

  if (deniedResourceType.toLowerCase() !== resourceType.toLowerCase()) {
    const missingTokenScope = await fhirGet(deniedResourceType, accessToken);
    assertRejected("missing token scope resource rejection", missingTokenScope.response, missingTokenScope.body, [403]);
  } else {
    console.log("SKIP — missing token scope resource rejection: denied resource matches positive resource");
  }

  const report = {
    certification: "MEDORA.RD.P0.3H",
    mode: "deployed-non-destructive",
    target: baseUrl,
    executedAt: new Date().toISOString(),
    evidence,
    destructiveLifecycleEvidenceRequired: true,
  };

  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFile } = await import("node:fs/promises");
    const rows = evidence.map((item) => `| ${item.check} | ${item.result} | ${item.detail.replaceAll("|", "\\|")} |`).join("\n");
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `\n## MEDORA.RD.P0.3H deployed certification\n\n| Check | Result | Evidence |\n|---|---|---|\n${rows}\n\n**Note:** Rotation, per-key revocation, whole-client revocation, and audit-record inspection remain required before final internal certification.\n`);
  }

  console.log(JSON.stringify(report, null, 2));
  console.log("PASS — deployed non-destructive P0.3H suite completed.");
}

main().catch((error) => {
  console.error(`Certification failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
