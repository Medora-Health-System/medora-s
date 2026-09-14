#!/usr/bin/env node

/**
 * FHIR Phase 2B deployed certification harness.
 *
 * Non-destructive acceptance suite for MedicationRequest and MedicationAdministration.
 * It never prints client secrets, bearer tokens, patient names, medication names, or
 * resource bodies. The certification facility must contain at least two resources of
 * each type so read and cursor pagination can be proven from deployed data.
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
const ungrantedScope = (process.env.FHIR_CERT_UNGRANTED_SCOPE || "__medora.phase2b.denied__").trim();

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

const resources = [
  {
    type: "MedicationRequest",
    readScope: "medicationRequest.read",
    searchScope: "medicationRequest.search",
  },
  {
    type: "MedicationAdministration",
    readScope: "medicationAdministration.read",
    searchScope: "medicationAdministration.search",
  },
];

const evidence = [];

function pass(check, detail) {
  evidence.push({ check, result: "PASS", detail });
  console.log(`PASS — ${check}: ${detail}`);
}

function fail(check, detail) {
  evidence.push({ check, result: "FAIL", detail });
  console.error(`FAIL — ${check}: ${detail}`);
  throw new Error(`${check}: ${detail}`);
}

async function readBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function requestToken(scope, facility = facilityId) {
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
  return { response, body: await readBody(response) };
}

function accessTokenFrom(check, result) {
  if (!result.response.ok || !result.body || typeof result.body !== "object") {
    fail(check, `token endpoint returned HTTP ${result.response.status}`);
  }
  const token = result.body.access_token;
  if (typeof token !== "string" || token.length < 20) {
    fail(check, "token endpoint did not return a usable access token");
  }
  if (String(result.body.token_type || "").toLowerCase() !== "bearer") {
    fail(check, "token_type was not Bearer");
  }
  pass(check, `Bearer token issued; TTL ${result.body.expires_in ?? "unknown"}s`);
  return token;
}

function assertRejected(check, result, expectedStatuses) {
  if (!expectedStatuses.includes(result.response.status)) {
    fail(check, `expected HTTP ${expectedStatuses.join("/")}, received ${result.response.status}`);
  }
  const type = result.body && typeof result.body === "object" ? result.body.resourceType : undefined;
  pass(check, `rejected with HTTP ${result.response.status}${type ? ` (${type})` : ""}`);
}

async function fhirGet(path, token, extraHeaders = {}) {
  const target = path.startsWith("http") ? path : `${baseUrl}/${path.replace(/^\//, "")}`;
  if (!target.startsWith(`${baseUrl}/`)) {
    fail("pagination link safety", "server returned a next link outside the configured FHIR base URL");
  }
  const response = await fetch(target, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/fhir+json",
      ...extraHeaders,
    },
  });
  return { response, body: await readBody(response) };
}

function assertSearchBundle(check, result, resourceType) {
  if (!result.response.ok) fail(check, `FHIR endpoint returned HTTP ${result.response.status}`);
  if (!result.body || typeof result.body !== "object" || result.body.resourceType !== "Bundle") {
    fail(check, "expected a FHIR Bundle");
  }
  if (result.body.type !== "searchset") fail(check, "expected Bundle.type=searchset");
  const entries = Array.isArray(result.body.entry) ? result.body.entry : [];
  for (const entry of entries) {
    if (entry?.resource?.resourceType !== resourceType) {
      fail(check, `bundle contained a non-${resourceType} resource`);
    }
  }
  return entries;
}

function nextLink(bundle) {
  if (!bundle || typeof bundle !== "object" || !Array.isArray(bundle.link)) return null;
  const next = bundle.link.find((link) => link?.relation === "next");
  return typeof next?.url === "string" ? next.url : null;
}

async function certifyResource(config) {
  const searchToken = accessTokenFrom(
    `${config.type} search token issuance`,
    await requestToken(config.searchScope),
  );

  const firstPage = await fhirGet(`${config.type}?_count=1`, searchToken);
  const firstEntries = assertSearchBundle(`${config.type} authorized search`, firstPage, config.type);
  if (firstEntries.length !== 1 || typeof firstEntries[0]?.resource?.id !== "string") {
    fail(`${config.type} deployed fixture`, "certification requires at least two deployed test resources; first page was empty");
  }
  pass(`${config.type} authorized search`, "FHIR searchset returned one governed resource");

  const next = nextLink(firstPage.body);
  if (!next) {
    fail(`${config.type} pagination`, "_count=1 returned no next link; add at least two test resources to the certification facility");
  }
  const secondPage = await fhirGet(next, searchToken);
  const secondEntries = assertSearchBundle(`${config.type} pagination`, secondPage, config.type);
  if (secondEntries.length < 1 || typeof secondEntries[0]?.resource?.id !== "string") {
    fail(`${config.type} pagination`, "next page did not contain a resource");
  }
  if (secondEntries[0].resource.id === firstEntries[0].resource.id) {
    fail(`${config.type} pagination`, "next page repeated the first resource id");
  }
  pass(`${config.type} pagination`, "cursor next link advanced to a different resource");

  const readToken = accessTokenFrom(
    `${config.type} read token issuance`,
    await requestToken(config.readScope),
  );
  const logicalId = firstEntries[0].resource.id;
  const read = await fhirGet(`${config.type}/${encodeURIComponent(logicalId)}`, readToken);
  if (!read.response.ok) fail(`${config.type} authorized read`, `FHIR endpoint returned HTTP ${read.response.status}`);
  if (!read.body || typeof read.body !== "object" || read.body.resourceType !== config.type || read.body.id !== logicalId) {
    fail(`${config.type} authorized read`, "read response did not match requested resource identity");
  }
  pass(`${config.type} authorized read`, "direct read returned the requested facility-scoped resource");

  const conflict = await fhirGet(`${config.type}?_count=1`, searchToken, { "x-facility-id": wrongFacilityId });
  assertRejected(`${config.type} conflicting facility header rejection`, conflict, [401, 403]);

  return { searchToken };
}

async function main() {
  console.log("FHIR Phase 2B deployed medication certification — non-destructive suite");
  console.log(`Target: ${baseUrl}`);

  const wrongFacility = await requestToken(resources[0].searchScope, wrongFacilityId);
  assertRejected("wrong facility token rejection", wrongFacility, [401, 403]);

  const ungranted = await requestToken(ungrantedScope);
  assertRejected("ungranted scope token rejection", ungranted, [403]);

  const certified = {};
  for (const config of resources) {
    certified[config.type] = await certifyResource(config);
  }

  const requestOnly = certified.MedicationRequest.searchToken;
  const adminOnly = certified.MedicationAdministration.searchToken;

  assertRejected(
    "MedicationRequest token cannot search MedicationAdministration",
    await fhirGet("MedicationAdministration?_count=1", requestOnly),
    [403],
  );
  assertRejected(
    "MedicationAdministration token cannot search MedicationRequest",
    await fhirGet("MedicationRequest?_count=1", adminOnly),
    [403],
  );

  const report = {
    certification: "FHIR-PHASE-2B-MEDICATIONS",
    mode: "deployed-non-destructive",
    target: baseUrl,
    executedAt: new Date().toISOString(),
    resources: resources.map(({ type, readScope, searchScope }) => ({ type, readScope, searchScope })),
    evidence,
    auditInspectionRequired: true,
  };

  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFile } = await import("node:fs/promises");
    const rows = evidence
      .map((item) => `| ${item.check} | ${item.result} | ${item.detail.replaceAll("|", "\\|")} |`)
      .join("\n");
    await appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      `\n## FHIR Phase 2B deployed medication certification\n\n| Check | Result | Evidence |\n|---|---|---|\n${rows}\n\n**Final acceptance still requires inspection of facility-scoped machine audit evidence for the token and resource accesses.**\n`,
    );
  }

  console.log(JSON.stringify(report, null, 2));
  console.log("PASS — FHIR Phase 2B deployed medication suite completed.");
}

main().catch((error) => {
  console.error(`Certification failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
