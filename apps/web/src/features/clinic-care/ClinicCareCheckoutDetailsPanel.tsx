"use client";

import React from "react";
import type { ClinicAmbulatoryCheckoutState } from "@medora/shared";
import type { ProviderDischargeDocumentationForm } from "@/features/emergency/providerDischargeDocumentationModel";

export type ClinicAmbulatoryCheckoutDetails = {
  referral: { destination: string; reason: string; notes: string };
  transferEd: {
    destination: string;
    reason: string;
    transferMethod: string;
    receivingContact: string;
    notes: string;
    confirmedAt?: string;
    confirmedByDisplayName?: string;
  };
  ama: {
    reason: string;
    risksDiscussed: boolean;
    alternativesDiscussed: boolean;
    notes: string;
    confirmedAt?: string;
    confirmedByDisplayName?: string;
  };
  other: { explanation: string };
};

export type ClinicCheckoutDiagnosisSuggestions = {
  referralDestinations: string[];
  referralReason: string;
  referralNotes: string;
  transferDestinations: string[];
  transferReason: string;
  transferMethods: string[];
  receivingContacts: string[];
  transferNotes: string;
  amaReasons: string[];
  otherExplanations: string[];
};

export function emptyClinicAmbulatoryCheckoutDetails(): ClinicAmbulatoryCheckoutDetails {
  return {
    referral: { destination: "", reason: "", notes: "" },
    transferEd: { destination: "", reason: "", transferMethod: "", receivingContact: "", notes: "" },
    ama: { reason: "", risksDiscussed: false, alternativesDiscussed: false, notes: "" },
    other: { explanation: "" },
  };
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function readClinicAmbulatoryCheckoutDetails(raw: unknown): ClinicAmbulatoryCheckoutDetails {
  const root = readObject(raw);
  const details = readObject(root.clinicAmbulatoryCheckoutDetails);
  const referral = readObject(details.referral);
  const transferEd = readObject(details.transferEd);
  const ama = readObject(details.ama);
  const other = readObject(details.other);
  return {
    referral: {
      destination: readString(referral.destination),
      reason: readString(referral.reason),
      notes: readString(referral.notes),
    },
    transferEd: {
      destination: readString(transferEd.destination),
      reason: readString(transferEd.reason),
      transferMethod: readString(transferEd.transferMethod),
      receivingContact: readString(transferEd.receivingContact),
      notes: readString(transferEd.notes),
      ...(readString(transferEd.confirmedAt) ? { confirmedAt: readString(transferEd.confirmedAt) } : {}),
      ...(readString(transferEd.confirmedByDisplayName) ? { confirmedByDisplayName: readString(transferEd.confirmedByDisplayName) } : {}),
    },
    ama: {
      reason: readString(ama.reason),
      risksDiscussed: ama.risksDiscussed === true,
      alternativesDiscussed: ama.alternativesDiscussed === true,
      notes: readString(ama.notes),
      ...(readString(ama.confirmedAt) ? { confirmedAt: readString(ama.confirmedAt) } : {}),
      ...(readString(ama.confirmedByDisplayName) ? { confirmedByDisplayName: readString(ama.confirmedByDisplayName) } : {}),
    },
    other: { explanation: readString(other.explanation) },
  };
}

function normalizedLocale(language: string): "en" | "fr" | "es" {
  return language === "fr" ? "fr" : language === "es" ? "es" : "en";
}
function uniq(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((v) => v?.trim()).filter((v): v is string => Boolean(v)))];
}

export function buildClinicCheckoutDiagnosisSuggestions(
  form: ProviderDischargeDocumentationForm,
  language: string
): ClinicCheckoutDiagnosisSuggestions {
  const locale = normalizedLocale(language);
  const docs = [...form.diagnosisDocs].sort((a, b) => Number(b.isPrimaryDiagnosis) - Number(a.isPrimaryDiagnosis) || a.displayOrder - b.displayOrder);
  const primary = docs[0];
  const followUps = [...form.followUps, ...docs.flatMap((d) => d.followUps ?? [])];
  const diagnosisLabel = primary?.displayName?.trim() || primary?.code?.trim() || "";
  const diagnosisInstructions = primary?.diagnosisInstructions?.trim() || primary?.description?.trim() || "";
  const precautions = primary?.returnPrecautions?.trim() || form.returnPrecautions?.trim() || "";
  const referralDestinations = uniq([
    ...followUps.map((f) => f.specialty),
    ...followUps.map((f) => f.providerOrFacility),
  ]);
  const receivingContacts = uniq(followUps.map((f) => f.providerOrFacility));

  const localized = locale === "es" ? {
    ed: ["Servicio de urgencias", "Servicio de urgencias más cercano"],
    methods: ["EMS / ambulancia", "Vehículo privado", "Transporte médico", "Silla de ruedas", "Otro"],
    ama: ["El paciente rechaza el tratamiento recomendado", "El paciente necesita retirarse por motivos personales", "El paciente prefiere recibir atención en otro lugar", "Otro"],
    other: ["Seguimiento fuera de la clínica", "Atención completada sin egreso estándar", "Otro"],
  } : locale === "fr" ? {
    ed: ["Service des urgences", "Service des urgences le plus proche"],
    methods: ["SMU / ambulance", "Véhicule privé", "Transport médical", "Fauteuil roulant", "Autre"],
    ama: ["Le patient refuse le traitement recommandé", "Le patient doit partir pour des raisons personnelles", "Le patient préfère recevoir des soins ailleurs", "Autre"],
    other: ["Suivi hors clinique", "Soins terminés sans sortie standard", "Autre"],
  } : {
    ed: ["Emergency Department", "Nearest Emergency Department"],
    methods: ["EMS / ambulance", "Private vehicle", "Medical transport", "Wheelchair", "Other"],
    ama: ["Patient declines recommended treatment", "Patient needs to leave for personal reasons", "Patient prefers care elsewhere", "Other"],
    other: ["Follow-up outside clinic", "Care completed without standard discharge", "Other"],
  };

  return {
    referralDestinations,
    referralReason: diagnosisLabel,
    referralNotes: diagnosisInstructions,
    transferDestinations: localized.ed,
    transferReason: diagnosisLabel,
    transferMethods: localized.methods,
    receivingContacts,
    transferNotes: precautions,
    amaReasons: localized.ama,
    otherExplanations: localized.other,
  };
}

type Copy = {
  referralTitle: string; referralDestination: string; referralReason: string; notes: string;
  transferTitle: string; transferHint: string; transferDestination: string; transferReason: string;
  transferMethod: string; receivingContact: string; amaTitle: string; amaReason: string;
  risksDiscussed: string; alternativesDiscussed: string; otherTitle: string; otherExplanation: string;
  followUpHint: string; applyDiagnosisSuggestion: string; editableHint: string;
};
const COPY: Record<"en" | "fr" | "es", Copy> = {
  en: {
    referralTitle: "Referral details", referralDestination: "Specialty / service / destination", referralReason: "Reason for referral", notes: "Notes / instructions",
    transferTitle: "Transfer to Emergency Department", transferHint: "Document the transfer plan here. Selecting Transfer to ED alone does not create an ED encounter or close this clinic visit.", transferDestination: "ED / destination", transferReason: "Reason for transfer", transferMethod: "Transfer method", receivingContact: "Receiving clinician / facility contact",
    amaTitle: "Against medical advice documentation", amaReason: "Patient reason / narrative", risksDiscussed: "Risks of leaving were discussed", alternativesDiscussed: "Alternatives and recommended care were discussed",
    otherTitle: "Other checkout outcome", otherExplanation: "Explanation", followUpHint: "Use the Follow-up section below to document the planned clinic follow-up.",
    applyDiagnosisSuggestion: "Apply diagnosis suggestion", editableHint: "Suggestions are editable; type any custom value.",
  },
  fr: {
    referralTitle: "Détails de l’orientation", referralDestination: "Spécialité / service / destination", referralReason: "Motif de l’orientation", notes: "Notes / consignes",
    transferTitle: "Transfert vers les urgences", transferHint: "Documentez ici le plan de transfert. La sélection seule ne crée pas de visite aux urgences et ne ferme pas cette consultation.", transferDestination: "Urgences / destination", transferReason: "Motif du transfert", transferMethod: "Mode de transfert", receivingContact: "Clinicien / établissement receveur",
    amaTitle: "Documentation du départ contre avis médical", amaReason: "Motif / récit du patient", risksDiscussed: "Les risques du départ ont été expliqués", alternativesDiscussed: "Les alternatives et les soins recommandés ont été expliqués",
    otherTitle: "Autre issue de consultation", otherExplanation: "Explication", followUpHint: "Utilisez la section Suivi ci-dessous pour documenter le suivi clinique prévu.",
    applyDiagnosisSuggestion: "Appliquer la suggestion du diagnostic", editableHint: "Les suggestions restent modifiables; vous pouvez saisir une autre valeur.",
  },
  es: {
    referralTitle: "Detalles de la referencia", referralDestination: "Especialidad / servicio / destino", referralReason: "Motivo de la referencia", notes: "Notas / indicaciones",
    transferTitle: "Traslado a urgencias", transferHint: "Documente aquí el plan de traslado. Seleccionar Traslado a urgencias por sí solo no crea un encuentro de urgencias ni cierra esta visita de clínica.", transferDestination: "Urgencias / destino", transferReason: "Motivo del traslado", transferMethod: "Método de traslado", receivingContact: "Profesional / establecimiento receptor",
    amaTitle: "Documentación de salida contra consejo médico", amaReason: "Motivo / narrativa del paciente", risksDiscussed: "Se explicaron los riesgos de retirarse", alternativesDiscussed: "Se explicaron las alternativas y la atención recomendada",
    otherTitle: "Otro resultado del egreso", otherExplanation: "Explicación", followUpHint: "Use la sección Seguimiento a continuación para documentar el seguimiento de clínica planificado.",
    applyDiagnosisSuggestion: "Aplicar sugerencia del diagnóstico", editableHint: "Las sugerencias siempre se pueden modificar; también puede escribir otro valor.",
  },
};

const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 10px", background: "#fff", color: "#0f172a", fontSize: 13 };

function EditableSuggestionField({ label, value, disabled, required, options = [], onChange }: { label: string; value: string; disabled: boolean; required?: boolean; options?: string[]; onChange: (value: string) => void }) {
  const listId = React.useId();
  return <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#334155" }}>
    <span style={{ fontWeight: 600 }}>{label}{required ? " *" : ""}</span>
    <input list={options.length ? listId : undefined} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, background: disabled ? "#f1f5f9" : "#fff" }} />
    {options.length ? <datalist id={listId}>{options.map((o) => <option key={o} value={o} />)}</datalist> : null}
  </label>;
}
function TextAreaField({ label, value, disabled, required, onChange }: { label: string; value: string; disabled: boolean; required?: boolean; onChange: (value: string) => void }) {
  return <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#334155" }}>
    <span style={{ fontWeight: 600 }}>{label}{required ? " *" : ""}</span>
    <textarea value={value} disabled={disabled} rows={3} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, resize: "vertical", background: disabled ? "#f1f5f9" : "#fff" }} />
  </label>;
}
function SuggestionButton({ disabled, label, onClick }: { disabled: boolean; label: string; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick} style={{ alignSelf: "flex-start", border: "1px solid #0f766e", borderRadius: 8, background: "#f0fdfa", color: "#115e59", padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer" }}>{label}</button>;
}

export function validateClinicAmbulatoryCheckoutDetails(state: ClinicAmbulatoryCheckoutState, details: ClinicAmbulatoryCheckoutDetails, language: string): string | null {
  const locale = normalizedLocale(language);
  const required = locale === "es" ? "Complete los campos obligatorios antes de guardar." : locale === "fr" ? "Complétez les champs obligatoires avant d’enregistrer." : "Complete the required fields before saving.";
  if (state === "REFERRAL" && (!details.referral.destination.trim() || !details.referral.reason.trim())) return required;
  if (state === "TRANSFER_ED" && (!details.transferEd.destination.trim() || !details.transferEd.reason.trim())) return required;
  if (state === "AMA" && (!details.ama.reason.trim() || !details.ama.risksDiscussed || !details.ama.alternativesDiscussed)) return required;
  if (state === "OTHER" && !details.other.explanation.trim()) return required;
  return null;
}

export function markClinicCheckoutActionConfirmed(state: ClinicAmbulatoryCheckoutState, details: ClinicAmbulatoryCheckoutDetails, actor: string, nowIso: string): ClinicAmbulatoryCheckoutDetails {
  if (state === "TRANSFER_ED") return { ...details, transferEd: { ...details.transferEd, confirmedAt: nowIso, confirmedByDisplayName: actor } };
  if (state === "AMA") return { ...details, ama: { ...details.ama, confirmedAt: nowIso, confirmedByDisplayName: actor } };
  return details;
}

export function ClinicCareCheckoutDetailsPanel({ state, details, language, disabled, suggestions, onChange }: {
  state: ClinicAmbulatoryCheckoutState;
  details: ClinicAmbulatoryCheckoutDetails;
  language: string;
  disabled: boolean;
  suggestions?: ClinicCheckoutDiagnosisSuggestions;
  onChange: (next: ClinicAmbulatoryCheckoutDetails) => void;
}) {
  const c = COPY[normalizedLocale(language)];
  const panelStyle: React.CSSProperties = { marginTop: 12, border: "1px solid #cbd5e1", borderRadius: 10, padding: "12px 14px", background: "#f8fafc", display: "flex", flexDirection: "column", gap: 10 };
  const editableHint = <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>{c.editableHint}</p>;

  if (state === "HOME") return null;
  if (state === "CLINIC_FOLLOW_UP") return <div style={panelStyle}><p style={{ margin: 0, fontSize: 12, color: "#475569" }}>{c.followUpHint}</p></div>;

  if (state === "REFERRAL") {
    const apply = () => onChange({ ...details, referral: {
      destination: details.referral.destination.trim() || suggestions?.referralDestinations[0] || "",
      reason: suggestions?.referralReason || details.referral.reason,
      notes: suggestions?.referralNotes || details.referral.notes,
    }});
    return <div style={panelStyle} data-testid="clinic-checkout-referral-details">
      <strong style={{ fontSize: 13 }}>{c.referralTitle}</strong>
      {suggestions?.referralReason ? <SuggestionButton disabled={disabled} label={c.applyDiagnosisSuggestion} onClick={apply} /> : null}
      {editableHint}
      <EditableSuggestionField label={c.referralDestination} value={details.referral.destination} disabled={disabled} required options={suggestions?.referralDestinations} onChange={(destination) => onChange({ ...details, referral: { ...details.referral, destination } })} />
      <TextAreaField label={c.referralReason} value={details.referral.reason} disabled={disabled} required onChange={(reason) => onChange({ ...details, referral: { ...details.referral, reason } })} />
      <TextAreaField label={c.notes} value={details.referral.notes} disabled={disabled} onChange={(notes) => onChange({ ...details, referral: { ...details.referral, notes } })} />
    </div>;
  }

  if (state === "TRANSFER_ED") {
    const apply = () => onChange({ ...details, transferEd: {
      ...details.transferEd,
      destination: details.transferEd.destination.trim() || suggestions?.transferDestinations[0] || "",
      reason: suggestions?.transferReason || details.transferEd.reason,
      notes: suggestions?.transferNotes || details.transferEd.notes,
    }});
    return <div style={panelStyle} data-testid="clinic-checkout-transfer-ed-details">
      <strong style={{ fontSize: 13 }}>{c.transferTitle}</strong>
      <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>{c.transferHint}</p>
      {suggestions?.transferReason ? <SuggestionButton disabled={disabled} label={c.applyDiagnosisSuggestion} onClick={apply} /> : null}
      {editableHint}
      <EditableSuggestionField label={c.transferDestination} value={details.transferEd.destination} disabled={disabled} required options={suggestions?.transferDestinations} onChange={(destination) => onChange({ ...details, transferEd: { ...details.transferEd, destination } })} />
      <TextAreaField label={c.transferReason} value={details.transferEd.reason} disabled={disabled} required onChange={(reason) => onChange({ ...details, transferEd: { ...details.transferEd, reason } })} />
      <EditableSuggestionField label={c.transferMethod} value={details.transferEd.transferMethod} disabled={disabled} options={suggestions?.transferMethods} onChange={(transferMethod) => onChange({ ...details, transferEd: { ...details.transferEd, transferMethod } })} />
      <EditableSuggestionField label={c.receivingContact} value={details.transferEd.receivingContact} disabled={disabled} options={suggestions?.receivingContacts} onChange={(receivingContact) => onChange({ ...details, transferEd: { ...details.transferEd, receivingContact } })} />
      <TextAreaField label={c.notes} value={details.transferEd.notes} disabled={disabled} onChange={(notes) => onChange({ ...details, transferEd: { ...details.transferEd, notes } })} />
    </div>;
  }

  if (state === "AMA") return <div style={panelStyle} data-testid="clinic-checkout-ama-details">
    <strong style={{ fontSize: 13 }}>{c.amaTitle}</strong>
    {editableHint}
    <EditableSuggestionField label={c.amaReason} value={details.ama.reason} disabled={disabled} required options={suggestions?.amaReasons} onChange={(reason) => onChange({ ...details, ama: { ...details.ama, reason } })} />
    <label style={{ display: "flex", gap: 8, fontSize: 12, alignItems: "center" }}><input type="checkbox" checked={details.ama.risksDiscussed} disabled={disabled} onChange={(e) => onChange({ ...details, ama: { ...details.ama, risksDiscussed: e.target.checked } })} />{c.risksDiscussed}</label>
    <label style={{ display: "flex", gap: 8, fontSize: 12, alignItems: "center" }}><input type="checkbox" checked={details.ama.alternativesDiscussed} disabled={disabled} onChange={(e) => onChange({ ...details, ama: { ...details.ama, alternativesDiscussed: e.target.checked } })} />{c.alternativesDiscussed}</label>
    <TextAreaField label={c.notes} value={details.ama.notes} disabled={disabled} onChange={(notes) => onChange({ ...details, ama: { ...details.ama, notes } })} />
  </div>;

  return <div style={panelStyle} data-testid="clinic-checkout-other-details">
    <strong style={{ fontSize: 13 }}>{c.otherTitle}</strong>
    {editableHint}
    <EditableSuggestionField label={c.otherExplanation} value={details.other.explanation} disabled={disabled} required options={suggestions?.otherExplanations} onChange={(explanation) => onChange({ ...details, other: { explanation } })} />
  </div>;
}
