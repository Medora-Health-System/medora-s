"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import {
  createIntegration,
  fetchIntegrationFacilities,
  fetchIntegrationPermissions,
  fetchIntegrations,
  setIntegrationEnabled,
  type IntegrationFacilityOption,
  type IntegrationPermissionOption,
  type IntegrationRow,
} from "@/lib/adminIntegrationsApi";

const initial = {
  displayName: "",
  partnerName: "",
  organizationType: "LABORATORY",
  jurisdiction: "US",
  organizationRegistrationId: "",
  website: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  stateProvinceRegion: "",
  postalCode: "",
  country: "US",
  primaryContactFirstName: "",
  primaryContactLastName: "",
  primaryContactJobTitle: "",
  primaryContactDepartment: "",
  primaryContactEmail: "",
  primaryContactPhone: "",
  primaryContactExtension: "",
  primaryContactMobile: "",
  technicalContactSameAsPrimary: true,
  technicalContactName: "",
  technicalContactJobTitle: "",
  technicalContactEmail: "",
  technicalContactPhone: "",
  technicalContactExtension: "",
  environment: "SANDBOX",
  protocol: "FHIR_R4",
  direction: "INBOUND",
  facilityIds: [] as string[],
  permissionCodes: [] as string[],
};

const fieldStyle = { display: "grid", gap: 5, fontWeight: 600 } as const;
const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 16 } as const;
const labels: Record<string, string> = {
  LABORATORY: "Laboratory",
  HOSPITAL: "Hospital",
  CLINIC: "Clinic",
  PHARMACY: "Pharmacy",
  IMAGING_RADIOLOGY: "Imaging / radiology",
  GOVERNMENT: "Government",
  RCM_BILLING: "RCM / billing",
  HIE: "Health information exchange",
  OTHER: "Other",
  INBOUND: "Inbound to Medora",
  OUTBOUND: "Outbound from Medora",
  BIDIRECTIONAL: "Bidirectional",
  SANDBOX: "Sandbox / Test",
  PRODUCTION: "Production",
  read: "Read",
  "search-type": "Search",
};

const Input = ({ label, optional, ...props }: { label: string; optional?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <label style={fieldStyle}>
    {label} {optional && <small style={{ fontWeight: 400 }}>(optional)</small>}
    <input {...props} style={{ padding: 9, border: "1px solid #aaa", borderRadius: 5 }} />
  </label>
);

export default function IntegrationsPage() {
  const {
    ready,
    canCreateFacilities,
    facilityId,
    facilities: sessionFacilities,
  } = useFacilityAndRoles();

  const [rows, setRows] = useState<IntegrationRow[]>([]);
  const [facilities, setFacilities] = useState<IntegrationFacilityOption[]>([]);
  const [permissions, setPermissions] = useState<IntegrationPermissionOption[]>([]);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [facilityOptionsError, setFacilityOptionsError] = useState("");
  const [permissionOptionsError, setPermissionOptionsError] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(false);

  const sessionFallbackFacilities = useMemo<IntegrationFacilityOption[]>(
    () => sessionFacilities.map((facility) => ({
      id: facility.id,
      name: facility.name,
      country: facility.country ?? null,
      code: null,
      billingCity: null,
      billingStateProvince: null,
    })),
    [sessionFacilities]
  );

  const mergeFacilities = useCallback(
    (apiFacilities: IntegrationFacilityOption[]) => {
      const merged = new Map<string, IntegrationFacilityOption>();
      for (const facility of apiFacilities) merged.set(facility.id, facility);
      for (const facility of sessionFallbackFacilities) {
        if (!merged.has(facility.id)) merged.set(facility.id, facility);
      }
      return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
    },
    [sessionFallbackFacilities]
  );

  const load = useCallback(async () => {
    setLoadingOptions(true);
    const [rowsResult, permissionsResult, facilitiesResult] = await Promise.allSettled([
      fetchIntegrations(),
      fetchIntegrationPermissions(),
      fetchIntegrationFacilities(),
    ]);

    if (rowsResult.status === "fulfilled") {
      setRows(rowsResult.value);
    } else {
      setError(rowsResult.reason instanceof Error ? rowsResult.reason.message : "Unable to load integrations.");
    }

    if (permissionsResult.status === "fulfilled") {
      setPermissions(permissionsResult.value);
      setPermissionOptionsError(permissionsResult.value.length ? "" : "No grantable FHIR permissions are enabled in this deployment.");
    } else {
      setPermissions([]);
      setPermissionOptionsError(permissionsResult.reason instanceof Error ? permissionsResult.reason.message : "Unable to load FHIR permissions.");
    }

    const apiFacilities = facilitiesResult.status === "fulfilled" ? facilitiesResult.value : [];
    const mergedFacilities = mergeFacilities(apiFacilities);
    setFacilities(mergedFacilities);
    if (facilitiesResult.status === "rejected") {
      setFacilityOptionsError(
        mergedFacilities.length
          ? "The platform facility directory could not be loaded, so Medora is showing the facilities from your current authenticated session."
          : facilitiesResult.reason instanceof Error
            ? facilitiesResult.reason.message
            : "Unable to load facilities."
      );
    } else if (!apiFacilities.length && mergedFacilities.length) {
      setFacilityOptionsError("No platform facility options were returned; Medora is showing the facilities from your authenticated session.");
    } else {
      setFacilityOptionsError("");
    }

    setForm((current) => {
      if (current.facilityIds.length || !mergedFacilities.length) return current;
      const currentFacility = facilityId && mergedFacilities.find((facility) => facility.id === facilityId);
      if (currentFacility) return { ...current, facilityIds: [currentFacility.id] };
      if (mergedFacilities.length === 1) return { ...current, facilityIds: [mergedFacilities[0]!.id] };
      return current;
    });

    setLoadingOptions(false);
  }, [facilityId, mergeFacilities]);

  useEffect(() => {
    if (ready && canCreateFacilities) void load();
  }, [ready, canCreateFacilities, load]);

  if (!ready) return <main style={{ padding: 24 }}>Loading…</main>;
  if (!canCreateFacilities) return <main style={{ padding: 24 }}><h1>Access denied</h1><p>Platform integration administration is required.</p></main>;

  const set = (key: keyof typeof initial, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const toggle = (key: "facilityIds" | "permissionCodes", value: string) => setForm((current) => ({
    ...current,
    [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value],
  }));

  function validateStep() {
    const required: Record<number, (keyof typeof initial)[]> = {
      1: ["displayName", "partnerName", "organizationType", "jurisdiction", "addressLine1", "city", "country"],
      2: ["primaryContactFirstName", "primaryContactLastName", "primaryContactJobTitle", "primaryContactEmail", "primaryContactPhone"],
      3: ["protocol", "direction", "environment"],
      4: ["facilityIds"],
      5: ["permissionCodes"],
    };
    const missing = (required[step] ?? []).find((key) => Array.isArray(form[key]) ? !(form[key] as string[]).length : !String(form[key]).trim());
    if (missing) {
      setError(`Complete the required ${String(missing).replace(/([A-Z])/g, " $1").toLowerCase()} field.`);
      return false;
    }
    if (step === 2 && !form.technicalContactSameAsPrimary && (!form.technicalContactName || !form.technicalContactEmail || !form.technicalContactPhone)) {
      setError("Complete the required technical contact fields.");
      return false;
    }
    if (step === 4 && !facilities.length) {
      setError("No facility is available to authorize. Reload facility options or confirm that at least one active Medora facility exists.");
      return false;
    }
    if (step === 5 && !permissions.length) {
      setError("No grantable FHIR permissions are available in this deployment. Reload permissions or enable Medora interoperability before continuing.");
      return false;
    }
    setError("");
    return true;
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!validateStep()) return;
    try {
      await createIntegration(form);
      setOpen(false);
      setStep(1);
      setForm(initial);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save integration");
    }
  }

  const facilityName = (id: string) => facilities.find((facility) => facility.id === id)?.name ?? id;
  const permissionName = (code: string) => {
    const permission = permissions.find((item) => item.code === code);
    return permission ? `${permission.resourceType} — ${labels[permission.interaction] ?? permission.interaction}` : code;
  };

  return <main style={{ padding: 24, maxWidth: 1050, margin: "auto" }}>
    <Link href="/app/admin">← Administration</Link>
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div><h1>Integrations</h1><p>Manage external organizations and their non-secret interoperability access.</p></div>
      <button onClick={() => { setOpen(true); setError(""); }}>+ Add Integration</button>
    </header>
    {error && <p role="alert" style={{ color: "#991b1b", background: "#fee2e2", padding: 12, borderRadius: 6 }}>{error}</p>}

    <section>
      <h2>Connected Systems</h2>
      {rows.length === 0 ? <p>No integrations configured.</p> : rows.map((row) => <article key={row.id} style={{ border: "1px solid #ddd", padding: 16, marginBottom: 10, borderRadius: 8, opacity: row.status === "DISABLED" ? .55 : 1 }}>
        <strong>{row.displayName}</strong> — {row.status}
        <div>{row.partnerName} · FHIR R4 · {labels[row.environment] ?? row.environment} · {row.facilities.length} facilities</div>
        <button onClick={async () => { await setIntegrationEnabled(row.id, row.status === "DISABLED"); await load(); }}>{row.status === "DISABLED" ? "Enable" : "Disable"}</button>
      </article>)}
    </section>

    {open && <form onSubmit={save} style={{ border: "1px solid #94a3b8", boxShadow: "0 8px 24px #0001", borderRadius: 10, padding: 24, marginTop: 24 }}>
      <p style={{ color: "#475569" }}>Step {step} of 6</p>
      <h2>{["Organization", "Contacts", "Connection", "Facility Access", "Permissions", "Review"][step - 1]}</h2>

      {step === 1 && <div style={gridStyle}>
        <Input label="Integration display name" required value={form.displayName} onChange={(e) => set("displayName", e.target.value)} />
        <Input label="Legal organization name" required value={form.partnerName} onChange={(e) => set("partnerName", e.target.value)} />
        <label style={fieldStyle}>Organization type<select value={form.organizationType} onChange={(e) => set("organizationType", e.target.value)}>{Object.keys(labels).slice(0, 9).map((value) => <option value={value} key={value}>{labels[value]}</option>)}</select></label>
        <label style={fieldStyle}>Jurisdiction / country<select value={form.jurisdiction} onChange={(e) => { const value = e.target.value; set("jurisdiction", value); if (value !== "OTHER") set("country", value); }}><option value="US">United States</option><option value="DO">Dominican Republic</option><option value="HT">Haiti</option><option value="OTHER">Other</option></select></label>
        <Input label="Registration ID" optional value={form.organizationRegistrationId} onChange={(e) => set("organizationRegistrationId", e.target.value)} />
        <Input label="Website" optional type="url" value={form.website} onChange={(e) => set("website", e.target.value)} />
        <Input label="Address line 1" required value={form.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} />
        <Input label="Address line 2" optional value={form.addressLine2} onChange={(e) => set("addressLine2", e.target.value)} />
        <Input label="City" required value={form.city} onChange={(e) => set("city", e.target.value)} />
        <Input label="State / Province / Region" optional value={form.stateProvinceRegion} onChange={(e) => set("stateProvinceRegion", e.target.value)} />
        <Input label="Postal code" optional value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
        <Input label="Country code" required maxLength={2} value={form.country} onChange={(e) => set("country", e.target.value.toUpperCase())} />
      </div>}

      {step === 2 && <div>
        <h3>Primary responsible contact</h3>
        <div style={gridStyle}>
          <Input label="First name" required value={form.primaryContactFirstName} onChange={(e) => set("primaryContactFirstName", e.target.value)} />
          <Input label="Last name" required value={form.primaryContactLastName} onChange={(e) => set("primaryContactLastName", e.target.value)} />
          <Input label="Job title / role" required value={form.primaryContactJobTitle} onChange={(e) => set("primaryContactJobTitle", e.target.value)} />
          <Input label="Department" optional value={form.primaryContactDepartment} onChange={(e) => set("primaryContactDepartment", e.target.value)} />
          <Input label="Business email" required type="email" value={form.primaryContactEmail} onChange={(e) => set("primaryContactEmail", e.target.value)} />
          <Input label="Business telephone" required type="tel" value={form.primaryContactPhone} onChange={(e) => set("primaryContactPhone", e.target.value)} />
          <Input label="Extension" optional value={form.primaryContactExtension} onChange={(e) => set("primaryContactExtension", e.target.value)} />
          <Input label="Mobile" optional type="tel" value={form.primaryContactMobile} onChange={(e) => set("primaryContactMobile", e.target.value)} />
        </div>
        <h3>Technical contact</h3>
        <label><input type="checkbox" checked={form.technicalContactSameAsPrimary} onChange={(e) => set("technicalContactSameAsPrimary", e.target.checked)} /> Same as primary contact</label>
        {!form.technicalContactSameAsPrimary && <div style={{ ...gridStyle, marginTop: 12 }}>
          <Input label="Name" required value={form.technicalContactName} onChange={(e) => set("technicalContactName", e.target.value)} />
          <Input label="Job title" optional value={form.technicalContactJobTitle} onChange={(e) => set("technicalContactJobTitle", e.target.value)} />
          <Input label="Email" required type="email" value={form.technicalContactEmail} onChange={(e) => set("technicalContactEmail", e.target.value)} />
          <Input label="Telephone" required type="tel" value={form.technicalContactPhone} onChange={(e) => set("technicalContactPhone", e.target.value)} />
          <Input label="Extension" optional value={form.technicalContactExtension} onChange={(e) => set("technicalContactExtension", e.target.value)} />
        </div>}
      </div>}

      {step === 3 && <div style={gridStyle}>
        <fieldset><legend>Protocol</legend><label><input type="radio" checked readOnly /> FHIR R4</label><br /><label style={{ color: "#64748b" }}><input type="radio" disabled /> HL7 v2 — Planned (not available)</label></fieldset>
        <fieldset><legend>Direction</legend>{["INBOUND", "OUTBOUND", "BIDIRECTIONAL"].map((value) => <label key={value}><input type="radio" checked={form.direction === value} onChange={() => set("direction", value)} />{labels[value]}<br /></label>)}</fieldset>
        <fieldset><legend>Environment</legend>{["SANDBOX", "PRODUCTION"].map((value) => <label key={value}><input type="radio" checked={form.environment === value} onChange={() => set("environment", value)} />{labels[value]}<br /></label>)}</fieldset>
      </div>}

      {step === 4 && <div>
        <p>Select one or more Medora facilities. Access is independently verified by the server.</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button type="button" onClick={() => void load()} disabled={loadingOptions}>{loadingOptions ? "Reloading…" : "Reload facility options"}</button>
          {facilityId && facilities.some((facility) => facility.id === facilityId) && !form.facilityIds.includes(facilityId) && <button type="button" onClick={() => toggle("facilityIds", facilityId)}>Select current facility</button>}
        </div>
        {facilityOptionsError && <p role="status" style={{ color: "#92400e", background: "#fffbeb", padding: 10, borderRadius: 6 }}>{facilityOptionsError}</p>}
        {facilities.length === 0 ? <p role="status">No facility options are available yet. Reload the directory. If this remains empty, confirm that at least one active Medora facility exists and that your platform-admin session can see it.</p> : facilities.map((facility) => {
          const location = [facility.billingCity, facility.billingStateProvince, facility.country].filter(Boolean).join(", ");
          return <label key={facility.id} style={{ display: "block", padding: 12, marginBottom: 8, border: form.facilityIds.includes(facility.id) ? "2px solid #2563eb" : "1px solid #e2e8f0", borderRadius: 8 }}>
            <input type="checkbox" checked={form.facilityIds.includes(facility.id)} onChange={() => toggle("facilityIds", facility.id)} /> <strong>{facility.name}</strong>
            <span style={{ color: "#64748b" }}>{location ? ` — ${location}` : ""}{facility.code ? ` · ${facility.code}` : ""}</span>
          </label>;
        })}
        {!!form.facilityIds.length && <p><strong>Selected:</strong> {form.facilityIds.map(facilityName).join(", ")}</p>}
      </div>}

      {step === 5 && <div>
        <p>Only implemented, tested capabilities supplied by Medora&apos;s FHIR capability registry can be granted.</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button type="button" onClick={() => void load()} disabled={loadingOptions}>{loadingOptions ? "Reloading…" : "Reload FHIR permissions"}</button>
          {permissions.length > 0 && <button type="button" onClick={() => setForm((current) => ({ ...current, permissionCodes: permissions.map((permission) => permission.code) }))}>Select all available</button>}
          {form.permissionCodes.length > 0 && <button type="button" onClick={() => setForm((current) => ({ ...current, permissionCodes: [] }))}>Clear</button>}
        </div>
        {permissionOptionsError && <p role="status" style={{ color: "#92400e", background: "#fffbeb", padding: 10, borderRadius: 6 }}>{permissionOptionsError}</p>}
        {permissions.length === 0 ? <p role="status">No grantable FHIR permissions are available. The wizard will not invent permissions; enable the approved Medora interoperability capabilities and reload this step.</p> : permissions.map((permission) => <label key={permission.code} style={{ display: "block", padding: 10, borderBottom: "1px solid #eee" }}>
          <input type="checkbox" checked={form.permissionCodes.includes(permission.code)} onChange={() => toggle("permissionCodes", permission.code)} /> {permission.resourceType} — {labels[permission.interaction] ?? permission.interaction}
        </label>)}
        {!!form.permissionCodes.length && <p><strong>{form.permissionCodes.length}</strong> permission{form.permissionCodes.length === 1 ? "" : "s"} selected.</p>}
      </div>}

      {step === 6 && <div>
        <h3>Organization</h3><p><strong>{form.displayName}</strong><br />{form.partnerName} · {labels[form.organizationType]} · {form.jurisdiction}<br />{form.addressLine1}{form.addressLine2 && `, ${form.addressLine2}`}, {form.city}{form.stateProvinceRegion && `, ${form.stateProvinceRegion}`} {form.postalCode}, {form.country}{form.website && <><br />{form.website}</>}</p>
        <h3>Primary Responsible Contact</h3><p>{form.primaryContactFirstName} {form.primaryContactLastName} · {form.primaryContactJobTitle}{form.primaryContactDepartment && ` · ${form.primaryContactDepartment}`}<br />{form.primaryContactEmail} · {form.primaryContactPhone}{form.primaryContactExtension && ` ext. ${form.primaryContactExtension}`}</p>
        <h3>Technical Contact</h3><p>{form.technicalContactSameAsPrimary ? `${form.primaryContactFirstName} ${form.primaryContactLastName} (same as primary)` : form.technicalContactName}<br />{form.technicalContactSameAsPrimary ? form.primaryContactEmail : form.technicalContactEmail} · {form.technicalContactSameAsPrimary ? form.primaryContactPhone : form.technicalContactPhone}</p>
        <h3>Connection</h3><p>FHIR R4 · {labels[form.direction]} · {labels[form.environment]}</p>
        <h3>Authorized Medora Facilities</h3><ul>{form.facilityIds.map((id) => <li key={id}>{facilityName(id)}</li>)}</ul>
        <h3>Granted Permissions</h3><ul>{form.permissionCodes.map((code) => <li key={code}>{permissionName(code)}</li>)}</ul>
        <h3>Provisioning</h3><p><strong>Pending provisioning</strong></p>
        <details><summary>Technical payload</summary><pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify({ ...form, provisioningState: "PENDING_PROVISIONING" }, null, 2)}</pre></details>
      </div>}

      <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
        <button type="button" onClick={() => setOpen(false)}>Cancel</button>
        {step > 1 && <button type="button" onClick={() => { setError(""); setStep(step - 1); }}>Back</button>}
        {step < 6 ? <button type="button" onClick={() => { if (validateStep()) setStep(step + 1); }}>Next</button> : <button type="submit">Save integration</button>}
      </div>
    </form>}
  </main>;
}
