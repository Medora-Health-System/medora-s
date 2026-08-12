"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  InpatientNursingAssessmentSave,
  InpatientNursingAssessmentV1,
} from "@medora/shared";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";

type Field = {
  id: string;
  options: string[];
  multiple?: boolean;
  numeric?: boolean;
  link?: string;
};
type Section = { id: string; fields: Field[]; wnl?: boolean };
const sections: Section[] = [
  { id: "overview", fields: [] },
  {
    id: "systems",
    wnl: true,
    fields: [
      "neurological",
      "respiratory",
      "cardiovascular",
      "gi",
      "gu",
      "mobility",
      "skin",
      "psychosocial",
      "safety",
    ].map((id) => ({ id: `system_${id}`, options: ["WNL", "ABNORMAL"] })),
  },
  {
    id: "neurological",
    wnl: true,
    fields: [
      {
        id: "levelOfConsciousness",
        options: [
          "ALERT",
          "DROWSY",
          "LETHARGIC",
          "OBTUNDED",
          "STUPOROUS",
          "UNRESPONSIVE",
          "SEDATED",
          "UNABLE_TO_ASSESS",
        ],
      },
      {
        id: "orientationQuick",
        options: [
          "AOX4",
          "PERSON_ONLY",
          "PERSON_PLACE",
          "PERSON_PLACE_TIME",
          "DISORIENTED",
          "UNABLE_TO_ASSESS",
        ],
      },
      {
        id: "orientation",
        multiple: true,
        options: ["PERSON", "PLACE", "TIME", "SITUATION"],
      },
      {
        id: "pupils",
        options: [
          "PERRLA",
          "EQUAL_REACTIVE",
          "UNEQUAL",
          "SLUGGISH",
          "NONREACTIVE",
          "UNABLE_TO_ASSESS",
        ],
      },
      {
        id: "speech",
        options: ["CLEAR", "SLURRED", "APHASIC", "NONVERBAL", "OTHER"],
      },
      {
        id: "motor",
        options: [
          "MOVES_ALL_EXTREMITIES",
          "WEAKNESS",
          "UNILATERAL_WEAKNESS",
          "PARALYSIS",
          "UNABLE_TO_ASSESS",
        ],
      },
      {
        id: "sensation",
        options: [
          "INTACT",
          "NUMBNESS",
          "TINGLING",
          "DECREASED",
          "ABSENT",
          "UNABLE_TO_ASSESS",
        ],
      },
      {
        id: "neuroConcern",
        options: ["NONE", "CHANGE_FROM_BASELINE", "ACUTE_NEUROLOGIC_CHANGE"],
      },
    ],
  },
  {
    id: "respiratory",
    wnl: true,
    fields: [
      {
        id: "respiratoryPattern",
        options: ["REGULAR", "TACHYPNEIC", "BRADYPNEIC", "IRREGULAR", "APNEIC"],
      },
      {
        id: "respiratoryEffort",
        options: [
          "UNLABORED",
          "MILDLY_LABORED",
          "MODERATELY_LABORED",
          "SEVERELY_LABORED",
        ],
      },
      {
        id: "breathSounds",
        multiple: true,
        options: [
          "CLEAR",
          "DIMINISHED",
          "CRACKLES",
          "WHEEZES",
          "RHONCHI",
          "ABSENT",
          "OTHER",
        ],
      },
      {
        id: "oxygen",
        options: [
          "ROOM_AIR",
          "NASAL_CANNULA",
          "SIMPLE_MASK",
          "NON_REBREATHER",
          "HIGH_FLOW",
          "CPAP_BIPAP",
          "VENTILATOR",
          "OTHER",
        ],
      },
      { id: "oxygenFlow", options: [], numeric: true },
      { id: "fio2", options: [], numeric: true },
      { id: "cough", options: ["NONE", "DRY", "PRODUCTIVE", "WEAK", "OTHER"] },
      {
        id: "secretions",
        multiple: true,
        options: [
          "NONE",
          "CLEAR",
          "WHITE",
          "YELLOW",
          "GREEN",
          "BLOODY",
          "THICK",
          "OTHER",
        ],
      },
      {
        id: "respiratoryConcern",
        options: [
          "NONE",
          "NEW_OXYGEN_REQUIREMENT",
          "INCREASING_OXYGEN_REQUIREMENT",
          "RESPIRATORY_DISTRESS",
          "AIRWAY_CONCERN",
          "OTHER",
        ],
      },
    ],
  },
  {
    id: "cardiovascular",
    wnl: true,
    fields: [
      {
        id: "rhythm",
        options: ["REGULAR", "IRREGULAR", "TELEMETRY", "UNABLE_TO_ASSESS"],
      },
      {
        id: "heartSounds",
        options: ["NORMAL", "MURMUR_NOTED", "OTHER", "UNABLE_TO_ASSESS"],
      },
      {
        id: "peripheralPulses",
        options: ["NORMAL", "WEAK", "BOUNDING", "ABSENT", "UNABLE_TO_ASSESS"],
      },
      {
        id: "edema",
        options: [
          "NONE",
          "TRACE",
          "ONE_PLUS",
          "TWO_PLUS",
          "THREE_PLUS",
          "FOUR_PLUS",
        ],
      },
      {
        id: "edemaLocation",
        multiple: true,
        options: [
          "LEFT_ARM",
          "RIGHT_ARM",
          "LEFT_LEG",
          "RIGHT_LEG",
          "GENERALIZED",
          "OTHER",
        ],
      },
      {
        id: "capillaryRefill",
        options: [
          "LT_2_SECONDS",
          "TWO_TO_THREE_SECONDS",
          "GT_3_SECONDS",
          "UNABLE_TO_ASSESS",
        ],
      },
      { id: "skinTemperature", options: ["WARM", "COOL", "COLD", "HOT"] },
      {
        id: "cardiovascularConcern",
        options: [
          "NONE",
          "CHEST_DISCOMFORT",
          "HYPOTENSION",
          "HYPERTENSION",
          "TACHYCARDIA",
          "BRADYCARDIA",
          "PERFUSION_CONCERN",
          "OTHER",
        ],
      },
    ],
  },
  {
    id: "gastrointestinal",
    wnl: true,
    fields: [
      {
        id: "abdomen",
        multiple: true,
        options: [
          "SOFT",
          "FIRM",
          "DISTENDED",
          "TENDER",
          "NONTENDER",
          "RIGID",
          "OTHER",
        ],
      },
      {
        id: "bowelSounds",
        options: [
          "ACTIVE",
          "HYPOACTIVE",
          "HYPERACTIVE",
          "ABSENT",
          "UNABLE_TO_ASSESS",
        ],
      },
      { id: "nausea", options: ["NO", "YES"] },
      { id: "vomiting", options: ["NO", "YES"] },
      {
        id: "dietTolerance",
        options: ["TOLERATING", "POOR_INTAKE", "NPO", "UNABLE_TO_ASSESS"],
      },
      { id: "lastBowelMovement", options: [] },
      {
        id: "stool",
        options: [
          "NORMAL",
          "LOOSE",
          "DIARRHEA",
          "CONSTIPATION",
          "MELENA",
          "BLOODY",
          "OTHER",
        ],
      },
      {
        id: "giConcern",
        options: [
          "NONE",
          "PAIN",
          "NAUSEA_VOMITING",
          "DISTENTION",
          "CONSTIPATION",
          "DIARRHEA",
          "GI_BLEEDING_CONCERN",
          "OTHER",
        ],
      },
    ],
  },
  {
    id: "genitourinary",
    wnl: true,
    fields: [
      {
        id: "voiding",
        options: [
          "SPONTANEOUS",
          "CATHETER",
          "EXTERNAL_DEVICE",
          "INTERMITTENT_CATHETER",
          "DIALYSIS_ANURIC",
          "OTHER",
        ],
      },
      { id: "urine", options: ["CLEAR", "CLOUDY", "DARK", "BLOODY", "OTHER"] },
      {
        id: "urinarySymptoms",
        multiple: true,
        options: [
          "NONE",
          "DYSURIA",
          "URGENCY",
          "FREQUENCY",
          "RETENTION_CONCERN",
          "INCONTINENCE",
          "OTHER",
        ],
      },
      {
        id: "guConcern",
        options: [
          "NONE",
          "LOW_URINE_OUTPUT",
          "RETENTION",
          "HEMATURIA",
          "CATHETER_CONCERN",
          "OTHER",
        ],
      },
    ],
  },
  {
    id: "skinWounds",
    wnl: true,
    fields: [
      {
        id: "skin",
        options: ["INTACT", "NON_INTACT", "UNABLE_TO_FULLY_ASSESS"],
      },
      {
        id: "skinCondition",
        multiple: true,
        options: [
          "WARM_DRY",
          "COOL",
          "MOIST",
          "DIAPHORETIC",
          "FRAGILE",
          "PALE",
          "FLUSHED",
          "MOTTLED",
          "CYANOTIC",
          "JAUNDICED",
        ],
      },
      {
        id: "pressureInjuryConcern",
        options: ["NONE", "PRESENT", "RISK", "UNABLE_TO_ASSESS"],
      },
      { id: "wounds", options: ["NONE", "PRESENT"], link: "wound" },
    ],
  },
  {
    id: "mobilityFallRisk",
    wnl: true,
    fields: [
      {
        id: "mobility",
        options: [
          "INDEPENDENT",
          "STANDBY_ASSIST",
          "ONE_PERSON_ASSIST",
          "TWO_PERSON_ASSIST",
          "MECHANICAL_LIFT",
          "BEDBOUND",
          "UNABLE_TO_ASSESS",
        ],
      },
      { id: "gait", options: ["STEADY", "UNSTEADY", "WEAK", "NOT_OBSERVED"] },
      {
        id: "assistiveDevice",
        options: ["NONE", "CANE", "WALKER", "WHEELCHAIR", "CRUTCHES", "OTHER"],
      },
      {
        id: "fallRisk",
        options: ["LOW", "MODERATE", "HIGH", "UNABLE_TO_DETERMINE"],
      },
      {
        id: "fallPrecautions",
        multiple: true,
        options: [
          "BED_LOW_LOCKED",
          "CALL_LIGHT",
          "NONSKID_FOOTWEAR",
          "ALARM",
          "ASSIST_AMBULATION",
          "FREQUENT_ROUNDING",
          "OTHER",
        ],
      },
    ],
  },
  {
    id: "pain",
    fields: [
      {
        id: "painPresent",
        options: ["NO", "YES", "UNABLE_TO_SELF_REPORT", "UNABLE_TO_ASSESS"],
      },
      { id: "painScore", options: [], numeric: true },
      {
        id: "painScale",
        options: ["ZERO_TO_TEN", "FACES", "CPOT", "FLACC", "OTHER"],
      },
      { id: "painLocation", options: [] },
      {
        id: "painQuality",
        multiple: true,
        options: [
          "ACHING",
          "BURNING",
          "CRAMPING",
          "SHARP",
          "THROBBING",
          "OTHER",
        ],
      },
      { id: "painIntervention", options: [] },
      { id: "painResponse", options: [] },
    ],
  },
  {
    id: "devices",
    fields: [
      {
        id: "deviceSite",
        multiple: true,
        options: [
          "CLEAN_DRY_INTACT",
          "REDNESS",
          "SWELLING",
          "DRAINAGE",
          "BLEEDING",
          "TENDERNESS",
          "OTHER",
        ],
      },
      {
        id: "deviceConcern",
        multiple: true,
        options: [
          "NONE",
          "PATENCY_CONCERN",
          "SITE_CONCERN",
          "POSITION_CONCERN",
          "DRAINAGE_CONCERN",
          "OTHER",
        ],
      },
    ],
  },
  {
    id: "safety",
    wnl: true,
    fields: [
      {
        id: "safetyRisks",
        multiple: true,
        options: [
          "NONE",
          "FALL",
          "ASPIRATION",
          "SEIZURE",
          "ELOPEMENT",
          "BEHAVIORAL",
          "SELF_HARM",
          "BLEEDING",
          "OTHER",
        ],
      },
      {
        id: "precautions",
        multiple: true,
        options: ["FALL", "ASPIRATION", "SEIZURE", "BLEEDING", "OTHER"],
      },
      { id: "callLightAccessible", options: ["YES", "NO"] },
      { id: "bed", options: ["LOW_LOCKED", "OTHER"] },
      {
        id: "alarm",
        options: ["NOT_INDICATED", "BED_ALARM", "CHAIR_ALARM", "OTHER"],
      },
    ],
  },
  {
    id: "intakeOutput",
    fields: [
      {
        id: "ioMonitoring",
        options: ["ROUTINE", "STRICT", "NOT_REQUIRED"],
        link: "io",
      },
    ],
  },
  {
    id: "nutrition",
    fields: [
      {
        id: "appetite",
        options: ["GOOD", "FAIR", "POOR", "NPO", "UNABLE_TO_ASSESS"],
      },
      {
        id: "nutritionDietTolerance",
        options: ["TOLERATING", "POOR_TOLERANCE", "UNABLE_TO_ASSESS"],
      },
      { id: "hydration", options: ["ADEQUATE", "CONCERN", "UNABLE_TO_ASSESS"] },
      {
        id: "swallowingConcern",
        options: ["NO", "YES", "UNABLE_TO_ASSESS"],
        link: "swallow",
      },
    ],
  },
  {
    id: "education",
    fields: [
      {
        id: "educationTopics",
        multiple: true,
        options: [
          "PLAN_OF_CARE",
          "MEDICATIONS",
          "PAIN",
          "FALL_PREVENTION",
          "MOBILITY",
          "DIET",
          "DEVICE_CARE",
          "DISCHARGE_PLANNING",
          "OTHER",
        ],
      },
      {
        id: "learner",
        options: ["PATIENT", "FAMILY", "CAREGIVER", "PATIENT_AND_FAMILY"],
      },
      {
        id: "understanding",
        options: ["UNDERSTANDS", "NEEDS_REINFORCEMENT", "UNABLE_TO_ASSESS"],
      },
      {
        id: "teachBack",
        options: ["SUCCESSFUL", "NEEDS_REINFORCEMENT", "NOT_APPLICABLE"],
      },
    ],
  },
  {
    id: "handoff",
    fields: [
      {
        id: "handoffStatus",
        options: ["NOT_STARTED", "COMPLETED", "UNABLE_TO_COMPLETE"],
      },
      {
        id: "outstandingConcerns",
        multiple: true,
        options: [
          "NONE",
          "PAIN",
          "FALL_RISK",
          "RESPIRATORY",
          "NEURO",
          "SKIN_WOUND",
          "MEDICATION",
          "DEVICE",
          "SAFETY",
          "PENDING_ORDERS_RESULTS",
          "OTHER",
        ],
      },
      { id: "handoffNarrative", options: [] },
    ],
  },
  { id: "history", fields: [] },
];
const empty: InpatientNursingAssessmentSave = {
  status: "DRAFT",
  assessmentType: "INITIAL",
  orientation: [],
  ivAccess: [],
  linesDrainsDevices: [],
  structuredFindings: {},
  sectionStatus: {},
  significantConcerns: [],
};

export function InpatientNursingAssessmentPanel({
  encounterId,
  facilityId,
  patientId: _patientId,
  isLocked,
  onSaved,
}: {
  encounterId: string;
  facilityId: string;
  patientId: string;
  isLocked: boolean;
  onSaved: () => void | Promise<void>;
}) {
  const { t } = useI18n();
  const k = (s: string) => t(`inpatientNursingAssessmentInp1b.${s}`);
  const [draft, setDraft] = useState<InpatientNursingAssessmentSave>(empty);
  const [current, setCurrent] = useState<InpatientNursingAssessmentV1 | null>(
    null,
  );
  const [history, setHistory] = useState<InpatientNursingAssessmentV1[]>([]);
  const [tab, setTab] = useState("overview");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [viewing, setViewing] = useState<InpatientNursingAssessmentV1 | null>(
    null,
  );
  const [copiedFrom, setCopiedFrom] =
    useState<InpatientNursingAssessmentV1 | null>(null);
  const load = useCallback(async () => {
    try {
      const [enc, events] = await Promise.all([
        apiFetch(`/encounters/${encodeURIComponent(encounterId)}`, {
          facilityId,
        }),
        apiFetch(
          `/encounters/${encodeURIComponent(encounterId)}/inpatient-nursing-assessment-events`,
          { facilityId },
        ),
      ]);
      const latest =
        asApiObject<any>(enc)?.nursingAssessment
          ?.inpatientNursingAssessmentV1 ?? null;
      setCurrent(latest);
      setHistory(
        (asApiObject<any>(events)?.entries ?? []).map((x: any) => x.assessment),
      );
      setMessage("");
    } catch {
      setMessage(k("loadError"));
    }
  }, [encounterId, facilityId]);
  useEffect(() => {
    void load();
  }, [load]);
  const finding = (id: string) => draft.structuredFindings?.[id];
  const changed = (id: string) =>
    copiedFrom &&
    JSON.stringify(finding(id)) !==
      JSON.stringify(copiedFrom.structuredFindings?.[id]);
  function setFinding(id: string, value: string | string[] | number) {
    setDraft((d) => {
      const structuredFindings = { ...d.structuredFindings, [id]: value };
      const next = { ...d, structuredFindings };
      if (id === "levelOfConsciousness")
        next.mentalStatus = { code: String(value) };
      if (id === "respiratoryConcern")
        next.respiratory = { code: String(value) };
      if (id === "skin") next.skinWounds = { code: String(value) };
      if (id === "mobility") next.mobility = { code: String(value) };
      if (
        id === "fallRisk" &&
        ["LOW", "MODERATE", "HIGH"].includes(String(value))
      )
        next.fallRisk = { level: value as "LOW" | "MODERATE" | "HIGH" };
      if (id === "painScore" && value !== "")
        next.pain = { ...d.pain, score: Number(value) };
      if (id === "outstandingConcerns")
        next.significantConcerns = value as string[];
      return next;
    });
  }
  function beginReassessment(copy = false) {
    const base = copy && current ? current : empty;
    const {
      version: _v,
      sessionId: _s,
      authoredAt: _a,
      authorUserId: _u,
      authorDisplayName: _n,
      authorRole: _r,
      ...clinical
    } = base as InpatientNursingAssessmentV1;
    setDraft({
      ...empty,
      ...clinical,
      status: "DRAFT",
      assessmentType: "REASSESSMENT",
    });
    setCopiedFrom(copy ? current : null);
    setTab("overview");
    setMessage(copy ? k("copiedNotice") : k("newNotice"));
  }
  async function save(continueAfter = false) {
    setBusy(true);
    try {
      await apiFetch(
        `/encounters/${encodeURIComponent(encounterId)}/inpatient-nursing-assessments`,
        {
          method: "POST",
          facilityId,
          body: JSON.stringify({ ...draft, status: "SAVED" }),
        },
      );
      setMessage(k("saved"));
      await load();
      await onSaved();
      if (continueAfter) setTab(nextTab(tab));
    } finally {
      setBusy(false);
    }
  }
  const active = sections.find((s) => s.id === tab) ?? sections[0];
  const readOnly = isLocked || Boolean(viewing);
  return (
    <section
      data-testid="inpatient-native-nursing-assessment"
      style={{ display: "grid", gap: 14 }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "end",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>{k("title")}</h2>
          <div style={{ fontSize: 13, color: "#475569" }}>
            {k("assessmentTime")}:{" "}
            {current
              ? new Date(current.authoredAt).toLocaleString()
              : k("serverOnSave")}{" "}
            · {k("author")}:{" "}
            {current?.authorDisplayName ?? k("authenticatedNurse")} ·{" "}
            {k("status")}: {current?.status ?? draft.status}
          </div>
        </div>
        <label>
          {k("assessmentType")}
          <select
            disabled={readOnly}
            value={draft.assessmentType ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                assessmentType: e.target
                  .value as InpatientNursingAssessmentSave["assessmentType"],
              }))
            }
          >
            <option value="">{k("select")}</option>
            {["INITIAL", "SHIFT", "REASSESSMENT", "FOCUSED"].map((o) => (
              <option key={o} value={o}>
                {k(`codes.${o}`)}
              </option>
            ))}
          </select>
        </label>
      </header>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {!readOnly && (
          <>
            <button disabled={busy} onClick={() => void save(false)}>
              {k("save")}
            </button>
            <button disabled={busy} onClick={() => void save(true)}>
              {k("saveContinue")}
            </button>
            <button onClick={() => beginReassessment(false)}>
              {k("newReassessment")}
            </button>
            {current && (
              <button onClick={() => beginReassessment(true)}>
                {k("copyPrevious")}
              </button>
            )}
          </>
        )}
        <button onClick={() => setTab("history")}>{k("reviewPrevious")}</button>
      </div>
      {message && (
        <p role="status" style={{ margin: 0 }}>
          {message}
        </p>
      )}
      <nav
        aria-label={k("navigation")}
        style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}
      >
        {sections.map((s) => (
          <button
            key={s.id}
            aria-current={tab === s.id ? "page" : undefined}
            onClick={() => setTab(s.id)}
            style={{
              whiteSpace: "nowrap",
              fontWeight: tab === s.id ? 700 : 400,
            }}
          >
            {k(`sections.${s.id}`)}
          </button>
        ))}
      </nav>
      {tab === "overview" ? (
        <Overview
          current={current}
          draft={draft}
          k={k}
          onContinue={() => setTab("systems")}
          onReassess={() => beginReassessment(false)}
        />
      ) : tab === "history" ? (
        <History
          history={history}
          k={k}
          onView={(a) => {
            setViewing(a);
            const {
              version: _v,
              sessionId: _s,
              authoredAt: _a,
              authorUserId: _u,
              authorDisplayName: _n,
              authorRole: _r,
              ...clinical
            } = a;
            setDraft(clinical);
            setTab("overview");
          }}
        />
      ) : (
        <section data-testid={`assessment-section-${active.id}`}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3>{k(`sections.${active.id}`)}</h3>
            {active.wnl && !readOnly && (
              <button
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    sectionStatus: { ...d.sectionStatus, [active.id]: "WNL" },
                  }))
                }
              >
                {k("withinExpectedLimits")}
              </button>
            )}
          </div>
          {draft.sectionStatus?.[active.id] && (
            <p>
              <strong>{k("sectionStatus")}:</strong>{" "}
              {k(`codes.${draft.sectionStatus[active.id]}`)}
            </p>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
              gap: 12,
            }}
          >
            {active.fields.map((f) => (
              <FieldControl
                key={f.id}
                field={f}
                value={finding(f.id)}
                readOnly={readOnly}
                changed={Boolean(changed(f.id))}
                k={k}
                onChange={(v) => setFinding(f.id, v)}
              />
            ))}
          </div>
          {active.id === "devices" && <p>{k("activeDevicesProjection")}</p>}
          {active.id === "intakeOutput" && <p>{k("ioProjection")}</p>}
          {active.id === "safety" && <p>{k("restraintProjection")}</p>}
        </section>
      )}
      {viewing && (
        <div role="status">
          <strong>{k("readOnlyHistory")}</strong>{" "}
          <button
            onClick={() => {
              setViewing(null);
              setDraft(empty);
            }}
          >
            {k("close")}
          </button>
        </div>
      )}
    </section>
  );
}
function nextTab(id: string) {
  const i = sections.findIndex((s) => s.id === id);
  return sections[Math.min(i + 1, sections.length - 1)].id;
}
function FieldControl({
  field,
  value,
  readOnly,
  changed,
  k,
  onChange,
}: {
  field: Field;
  value: unknown;
  readOnly: boolean;
  changed: boolean;
  k: (s: string) => string;
  onChange: (v: any) => void;
}) {
  const values = Array.isArray(value) ? value : [];
  if (field.multiple)
    return (
      <fieldset
        style={{ border: changed ? "2px solid #d97706" : "1px solid #cbd5e1" }}
      >
        <legend>
          {k(`fields.${field.id}`)}
          {changed ? ` · ${k("changed")}` : ""}
        </legend>
        {field.options.map((o) => (
          <label
            key={o}
            style={{ display: "inline-flex", gap: 4, margin: "4px 8px 4px 0" }}
          >
            <input
              type="checkbox"
              disabled={readOnly}
              checked={values.includes(o)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...values, o]
                    : values.filter((x) => x !== o),
                )
              }
            />
            {k(`codes.${o}`)}
          </label>
        ))}
      </fieldset>
    );
  return (
    <label
      style={{
        display: "grid",
        gap: 4,
        padding: changed ? 6 : 0,
        border: changed ? "2px solid #d97706" : "none",
      }}
    >
      {k(`fields.${field.id}`)}
      {field.numeric ? (
        <input
          type="number"
          disabled={readOnly}
          value={typeof value === "number" ? value : ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? "" : Number(e.target.value))
          }
        />
      ) : field.options.length ? (
        <select
          disabled={readOnly}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{k("select")}</option>
          {field.options.map((o) => (
            <option key={o} value={o}>
              {k(`codes.${o}`)}
            </option>
          ))}
        </select>
      ) : (
        <input
          disabled={readOnly}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}{" "}
      {changed && <small>{k("changed")}</small>}
      {field.link && (
        <a
          href={
            field.link === "io"
              ? "?section=results"
              : field.link === "wound"
                ? "?section=notes"
                : "?section=carePlan"
          }
        >
          {k(`links.${field.link}`)}
        </a>
      )}
    </label>
  );
}
function Overview({
  current,
  draft,
  k,
  onContinue,
  onReassess,
}: {
  current: InpatientNursingAssessmentV1 | null;
  draft: InpatientNursingAssessmentSave;
  k: (s: string) => string;
  onContinue: () => void;
  onReassess: () => void;
}) {
  const f = draft.structuredFindings ?? {};
  const rows = [
    ["assessmentType", draft.assessmentType],
    [
      "assessmentTime",
      current?.authoredAt
        ? new Date(current.authoredAt).toLocaleString()
        : null,
    ],
    ["author", current?.authorDisplayName],
    ["primaryRn", current?.authorDisplayName],
    ["currentPain", draft.pain?.score],
    ["fallRisk", draft.fallRisk?.level],
    ["mentalStatus", draft.mentalStatus?.code],
    ["respiratoryConcern", f.respiratoryConcern],
    ["skinWoundConcern", f.pressureInjuryConcern],
    ["mobility", draft.mobility?.code],
    ["linesDevices", draft.linesDrainsDevices?.length],
    ["safetyAlerts", f.safetyRisks],
    ["ioStatus", f.ioMonitoring],
    ["significantConcerns", draft.significantConcerns],
  ];
  return (
    <section data-testid="assessment-overview">
      <h3>{k("sections.overview")}</h3>
      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(180px,1fr) 2fr",
          gap: 6,
        }}
      >
        {rows.map(([label, value]) => (
          <div key={String(label)} style={{ display: "contents" }}>
            <dt>
              <strong>{k(`overview.${label}`)}</strong>
            </dt>
            <dd>
              {Array.isArray(value)
                ? value.map((v) => k(`codes.${v}`)).join(", ")
                : value == null || value === ""
                  ? k("notDocumented")
                  : String(value)}
            </dd>
          </div>
        ))}
      </dl>
      <button onClick={onContinue}>{k("continueAssessment")}</button>{" "}
      <button onClick={onReassess}>{k("startReassessment")}</button>
    </section>
  );
}
function History({
  history,
  k,
  onView,
}: {
  history: InpatientNursingAssessmentV1[];
  k: (s: string) => string;
  onView: (a: InpatientNursingAssessmentV1) => void;
}) {
  return (
    <section data-testid="inpatient-assessment-history">
      <h3>{k("sections.history")}</h3>
      {history.length === 0 ? (
        <p>{k("noHistory")}</p>
      ) : (
        <table>
          <thead>
            <tr>
              {[
                "dateTime",
                "assessmentType",
                "author",
                "role",
                "status",
                "actions",
              ].map((x) => (
                <th key={x}>{k(`historyColumns.${x}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history
              .slice()
              .reverse()
              .map((a) => (
                <tr key={a.sessionId}>
                  <td>{new Date(a.authoredAt).toLocaleString()}</td>
                  <td>
                    {a.assessmentType ? k(`codes.${a.assessmentType}`) : "—"}
                  </td>
                  <td>{a.authorDisplayName}</td>
                  <td>{a.authorRole}</td>
                  <td>{a.status}</td>
                  <td>
                    <button onClick={() => onView(a)}>{k("view")}</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
