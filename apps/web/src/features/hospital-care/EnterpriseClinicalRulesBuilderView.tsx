"use client";

/**
 * D4A.2.8A — Clinical Rules Builder (admin).
 * Visual WHEN → IF (AND/OR) → THEN / ELSE → END structure.
 * Calls APIs only — no local evaluation of production side effects.
 */

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import type {
  ClinicalRuleActionV1,
  ClinicalRuleConditionNodeV1,
  ClinicalRuleConflictV1,
  ClinicalRuleDefinitionV1,
  ClinicalRuleEvaluationResultV1,
  ClinicalRuleEventType,
  ClinicalRulePriority,
  ClinicalRuleStatus,
  EnterpriseClinicalRulesCatalogV1,
} from "@medora/shared";
import { CLINICAL_RULE_EVENT_TYPES, CLINICAL_RULE_ACTION_TYPES } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { HospitalCareShell } from "./HospitalCareShell";
import {
  activateClinicalRuleRemote,
  fetchClinicalRulesCatalog,
  rollbackClinicalRuleRemote,
  setClinicalRuleStatusRemote,
  simulateClinicalRulesRemote,
  upsertClinicalRuleRemote,
} from "./enterpriseClinicalRulesApi";
import { isForbiddenApiError } from "./hospitalCarePlacementApi";
import {
  HOSPITAL_CARE_ENTERPRISE_WORKFLOW,
  HOSPITAL_CARE_ENTERPRISE_WORKFLOW_ADMIN,
} from "./hospitalCarePaths";

const shell: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  background: "#fff",
  padding: 12,
  marginBottom: 12,
};

const rowBtn: CSSProperties = {
  fontSize: 13,
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
  cursor: "pointer",
};

const primaryBtn: CSSProperties = {
  ...rowBtn,
  background: "#0f766e",
  color: "#fff",
  borderColor: "#0f766e",
  fontWeight: 600,
};

function emptyLeaf(): ClinicalRuleConditionNodeV1 {
  return { kind: "LEAF", field: "eventType", op: "EQ", value: "" };
}

function draftRule(facilityId: string, nowIso: string): ClinicalRuleDefinitionV1 {
  return {
    ruleId: `rule-${Date.now()}`,
    name: "",
    description: "",
    scope: { facilityId },
    enabled: false,
    priority: "MEDIUM",
    category: "GENERAL",
    version: 1,
    status: "DRAFT",
    whenEvent: "CRITICAL_LAB",
    ifCondition: {
      kind: "GROUP",
      logic: "AND",
      children: [emptyLeaf()],
    },
    thenActions: [
      {
        actionId: `act-${Date.now()}`,
        type: "NOTIFY",
        department: "PROVIDER",
        message: "",
      },
    ],
    elseActions: [],
    stopOnMatch: false,
    createdAt: nowIso,
    modifiedAt: nowIso,
    immutable: false,
  };
}

function ConditionEditor(props: {
  node: ClinicalRuleConditionNodeV1;
  onChange: (n: ClinicalRuleConditionNodeV1) => void;
  t: (k: string) => string;
}) {
  const { node, onChange, t } = props;
  if (node.kind === "LEAF") {
    return (
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
        <select
          aria-label={t("enterpriseClinicalRulesD4a28a.builder.field")}
          value={node.field}
          onChange={(e) =>
            onChange({ ...node, field: e.target.value as typeof node.field })
          }
          style={{ fontSize: 13, borderRadius: 8, padding: 4 }}
        >
          {[
            "ageYears",
            "location",
            "labCode",
            "labValue",
            "labFlag",
            "painScore",
            "fallRiskScore",
            "sepsisScore",
            "eventType",
            "customVar",
          ].map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <select
          aria-label={t("enterpriseClinicalRulesD4a28a.builder.op")}
          value={node.op}
          onChange={(e) =>
            onChange({ ...node, op: e.target.value as typeof node.op })
          }
          style={{ fontSize: 13, borderRadius: 8, padding: 4 }}
        >
          {["EQ", "NEQ", "GT", "GTE", "LT", "LTE", "IN", "EXISTS"].map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>
        <input
          aria-label={t("enterpriseClinicalRulesD4a28a.builder.value")}
          value={
            typeof node.value === "string" || typeof node.value === "number"
              ? String(node.value)
              : ""
          }
          onChange={(e) => {
            const raw = e.target.value;
            const num = Number(raw);
            onChange({
              ...node,
              value: raw !== "" && Number.isFinite(num) && raw.trim() !== "" && !Number.isNaN(num) && /^-?\d+(\.\d+)?$/.test(raw)
                ? num
                : raw,
            });
          }}
          style={{ fontSize: 13, borderRadius: 8, padding: 4, minWidth: 100 }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        borderLeft: "3px solid #99f6e4",
        paddingLeft: 8,
        marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
        <strong style={{ fontSize: 12 }}>
          {node.logic === "AND"
            ? t("enterpriseClinicalRulesD4a28a.builder.and")
            : t("enterpriseClinicalRulesD4a28a.builder.or")}
        </strong>
        <button
          type="button"
          style={rowBtn}
          onClick={() =>
            onChange({ ...node, logic: node.logic === "AND" ? "OR" : "AND" })
          }
        >
          {node.logic === "AND" ? "→ OR" : "→ AND"}
        </button>
        <button
          type="button"
          style={rowBtn}
          onClick={() =>
            onChange({ ...node, children: [...node.children, emptyLeaf()] })
          }
        >
          {t("enterpriseClinicalRulesD4a28a.builder.addCondition")}
        </button>
        <button
          type="button"
          style={rowBtn}
          onClick={() =>
            onChange({
              ...node,
              children: [
                ...node.children,
                { kind: "GROUP", logic: "AND", children: [emptyLeaf()] },
              ],
            })
          }
        >
          {t("enterpriseClinicalRulesD4a28a.builder.addGroup")}
        </button>
      </div>
      {node.children.map((child, idx) => (
        <ConditionEditor
          key={idx}
          node={child}
          t={t}
          onChange={(next) => {
            const children = node.children.slice();
            children[idx] = next;
            onChange({ ...node, children });
          }}
        />
      ))}
    </div>
  );
}

function ActionListEditor(props: {
  actions: ClinicalRuleActionV1[];
  onChange: (a: ClinicalRuleActionV1[]) => void;
  t: (k: string) => string;
}) {
  return (
    <div>
      {props.actions.map((action, idx) => (
        <div key={action.actionId} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <select
            aria-label={props.t("enterpriseClinicalRulesD4a28a.builder.actionType")}
            value={action.type}
            onChange={(e) => {
              const next = props.actions.slice();
              next[idx] = {
                ...action,
                type: e.target.value as ClinicalRuleActionV1["type"],
              };
              props.onChange(next);
            }}
            style={{ fontSize: 13, borderRadius: 8, padding: 4 }}
          >
            {CLINICAL_RULE_ACTION_TYPES.map((ty) => (
              <option key={ty} value={ty}>
                {ty}
              </option>
            ))}
          </select>
          <input
            value={action.message ?? action.workflowDefinitionCode ?? action.taskTitle ?? ""}
            onChange={(e) => {
              const next = props.actions.slice();
              const v = e.target.value;
              next[idx] = {
                ...action,
                message: v,
                workflowDefinitionCode:
                  action.type === "CREATE_WORKFLOW" ? v : action.workflowDefinitionCode,
                taskTitle: action.type === "CREATE_TASK" ? v : action.taskTitle,
              };
              props.onChange(next);
            }}
            placeholder="message / code"
            style={{ fontSize: 13, borderRadius: 8, padding: 4, flex: 1 }}
          />
        </div>
      ))}
      <button
        type="button"
        style={rowBtn}
        onClick={() =>
          props.onChange([
            ...props.actions,
            {
              actionId: `act-${Date.now()}`,
              type: "TIMELINE",
              timelineTitle: "",
            },
          ])
        }
      >
        {props.t("enterpriseClinicalRulesD4a28a.builder.addAction")}
      </button>
    </div>
  );
}

export function EnterpriseClinicalRulesBuilderView() {
  const { t } = useI18n();
  const { ready, roles } = useFacilityAndRoles();
  const isAdmin = roles.some((r) => String(r).toUpperCase() === "ADMIN");

  const [catalog, setCatalog] = useState<EnterpriseClinicalRulesCatalogV1 | null>(null);
  const [conflicts, setConflicts] = useState<ClinicalRuleConflictV1[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ClinicalRuleDefinitionV1 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [simEvent, setSimEvent] = useState<ClinicalRuleEventType>("CRITICAL_LAB");
  const [simLabCode, setSimLabCode] = useState("K");
  const [simLabFlag, setSimLabFlag] = useState("CRITICAL");
  const [simPain, setSimPain] = useState("8");
  const [simResult, setSimResult] = useState<ClinicalRuleEvaluationResultV1 | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchClinicalRulesCatalog();
      setCatalog(res.catalog);
      setConflicts(res.conflicts);
      if (!selectedId && res.catalog.rules[0]) {
        setSelectedId(res.catalog.rules[0].ruleId);
        setDraft({ ...res.catalog.rules[0] });
      } else if (selectedId) {
        const found = res.catalog.rules.find((r) => r.ruleId === selectedId);
        if (found) setDraft({ ...found });
      }
    } catch (e) {
      setCatalog(null);
      setError(
        isForbiddenApiError(e)
          ? t("common.unauthorizedRedirect")
          : t("enterpriseClinicalRulesD4a28a.loadError")
      );
    } finally {
      setLoading(false);
    }
  }, [selectedId, t]);

  useEffect(() => {
    if (!ready) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load once ready
  }, [ready]);

  const selectRule = (rule: ClinicalRuleDefinitionV1) => {
    setSelectedId(rule.ruleId);
    setDraft({ ...rule });
    setMessage(null);
  };

  const onSave = async () => {
    if (!catalog || !draft || !isAdmin) return;
    setMessage(null);
    try {
      const res = await upsertClinicalRuleRemote({
        rule: draft,
        expectedVersion: catalog.expectedVersion,
      });
      setCatalog(res.catalog);
      setConflicts(res.conflicts);
      setDraft({ ...res.rule });
      setSelectedId(res.rule.ruleId);
      setMessage(t("enterpriseClinicalRulesD4a28a.saved"));
    } catch (e) {
      setError(
        isForbiddenApiError(e)
          ? t("common.unauthorizedRedirect")
          : t("enterpriseClinicalRulesD4a28a.loadError")
      );
    }
  };

  const onActivate = async () => {
    if (!catalog || !draft || !isAdmin) return;
    try {
      const res = await activateClinicalRuleRemote(draft.ruleId, {
        expectedVersion: catalog.expectedVersion,
      });
      setCatalog(res.catalog);
      setDraft({ ...res.rule });
      setMessage(t("enterpriseClinicalRulesD4a28a.activated"));
    } catch {
      setError(t("enterpriseClinicalRulesD4a28a.loadError"));
    }
  };

  const onStatus = async (status: ClinicalRuleStatus) => {
    if (!catalog || !draft || !isAdmin) return;
    try {
      const res = await setClinicalRuleStatusRemote(draft.ruleId, {
        status,
        expectedVersion: catalog.expectedVersion,
      });
      setCatalog(res.catalog);
      setDraft({ ...res.rule });
      setMessage(t("enterpriseClinicalRulesD4a28a.statusUpdated"));
    } catch {
      setError(t("enterpriseClinicalRulesD4a28a.loadError"));
    }
  };

  const onRollback = async () => {
    if (!catalog || !draft || !isAdmin || draft.version <= 1) return;
    try {
      const res = await rollbackClinicalRuleRemote(draft.ruleId, {
        toVersion: draft.version - 1,
        expectedVersion: catalog.expectedVersion,
      });
      setCatalog(res.catalog);
      setDraft({ ...res.rule });
      setMessage(t("enterpriseClinicalRulesD4a28a.statusUpdated"));
    } catch {
      setError(t("enterpriseClinicalRulesD4a28a.loadError"));
    }
  };

  const onSimulate = async () => {
    try {
      const res = await simulateClinicalRulesRemote({
        context: {
          facilityId: catalog?.facilityId ?? "",
          patientId: "sim-patient",
          encounterId: "sim-encounter",
          eventType: simEvent,
          occurredAt: new Date().toISOString(),
          labCode: simLabCode,
          labFlag: simLabFlag,
          painScore: Number(simPain) || null,
        },
      });
      setSimResult(res.result);
    } catch {
      setError(t("enterpriseClinicalRulesD4a28a.loadError"));
    }
  };

  return (
    <HospitalCareShell
      active="home"
      title={t("enterpriseClinicalRulesD4a28a.title")}
      subtitle={t("enterpriseClinicalRulesD4a28a.subtitle")}
      actions={
        <div style={{ display: "flex", gap: 10 }}>
          <Link
            href={HOSPITAL_CARE_ENTERPRISE_WORKFLOW}
            style={{ fontSize: 13, fontWeight: 600, color: "#0f766e" }}
          >
            {t("enterpriseWorkflowD4a28.openLink")}
          </Link>
          <Link
            href={HOSPITAL_CARE_ENTERPRISE_WORKFLOW_ADMIN}
            style={{ fontSize: 13, fontWeight: 600, color: "#0f766e" }}
          >
            {t("enterpriseWorkflowD4a28.adminLink")}
          </Link>
        </div>
      }
    >
      <p style={{ fontSize: 12, color: "#64748b", marginTop: 0 }}>
        {t("enterpriseClinicalRulesD4a28a.rulesOn")} ·{" "}
        {t("enterpriseClinicalRulesD4a28a.placementOff")}
      </p>
      {!isAdmin ? (
        <p style={{ fontSize: 13, color: "#b45309" }}>
          {t("enterpriseClinicalRulesD4a28a.permissions.adminOnly")}
        </p>
      ) : null}

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button type="button" style={rowBtn} onClick={() => void load()}>
          {t("enterpriseClinicalRulesD4a28a.refresh")}
        </button>
        {isAdmin ? (
          <button
            type="button"
            style={primaryBtn}
            onClick={() => {
              const next = draftRule(catalog?.facilityId ?? "facility", new Date().toISOString());
              setDraft(next);
              setSelectedId(next.ruleId);
            }}
          >
            {t("enterpriseClinicalRulesD4a28a.newRule")}
          </button>
        ) : null}
      </div>

      {loading ? <p>{t("enterpriseClinicalRulesD4a28a.loading")}</p> : null}
      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
      {message ? <p style={{ color: "#0f766e" }}>{message}</p> : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px, 280px) 1fr",
          gap: 12,
        }}
      >
        <div style={shell}>
          <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>
            {t("enterpriseClinicalRulesD4a28a.list.title")}
          </h3>
          {!catalog?.rules.length ? (
            <p style={{ fontSize: 13, color: "#64748b" }}>
              {t("enterpriseClinicalRulesD4a28a.list.empty")}
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {catalog.rules.map((r) => (
                <li key={r.ruleId} style={{ marginBottom: 4 }}>
                  <button
                    type="button"
                    onClick={() => selectRule(r)}
                    style={{
                      ...rowBtn,
                      width: "100%",
                      textAlign: "left",
                      background: selectedId === r.ruleId ? "#ecfdf5" : "#fff",
                      borderColor: selectedId === r.ruleId ? "#0f766e" : "#cbd5e1",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      {r.whenEvent} · v{r.version} ·{" "}
                      {t(`enterpriseClinicalRulesD4a28a.statuses.${r.status}` as never)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={shell}>
          <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>
            {t("enterpriseClinicalRulesD4a28a.builderTitle")}
          </h3>
          {!draft ? (
            <p style={{ fontSize: 13 }}>
              {t("enterpriseClinicalRulesD4a28a.builder.selectRule")}
            </p>
          ) : (
            <>
              <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                <label style={{ fontSize: 12 }}>
                  {t("enterpriseClinicalRulesD4a28a.builder.name")}
                  <input
                    value={draft.name}
                    disabled={!isAdmin}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    style={{ display: "block", width: "100%", marginTop: 4, padding: 6, borderRadius: 8 }}
                  />
                </label>
                <label style={{ fontSize: 12 }}>
                  {t("enterpriseClinicalRulesD4a28a.builder.description")}
                  <textarea
                    value={draft.description ?? ""}
                    disabled={!isAdmin}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    rows={2}
                    style={{ display: "block", width: "100%", marginTop: 4, padding: 6, borderRadius: 8 }}
                  />
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <label style={{ fontSize: 12 }}>
                    {t("enterpriseClinicalRulesD4a28a.list.priority")}
                    <select
                      value={draft.priority}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          priority: e.target.value as ClinicalRulePriority,
                        })
                      }
                      style={{ display: "block", marginTop: 4, padding: 4, borderRadius: 8 }}
                    >
                      {(["EMERGENCY", "CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map(
                        (p) => (
                          <option key={p} value={p}>
                            {t(`enterpriseClinicalRulesD4a28a.priorities.${p}` as never)}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                  <label style={{ fontSize: 12, alignItems: "end", display: "flex", gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={draft.stopOnMatch}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setDraft({ ...draft, stopOnMatch: e.target.checked })
                      }
                    />
                    {t("enterpriseClinicalRulesD4a28a.builder.stopOnMatch")}
                  </label>
                </div>
              </div>

              <div style={{ ...shell, background: "#f8fafc" }}>
                <strong style={{ fontSize: 12 }}>
                  {t("enterpriseClinicalRulesD4a28a.builder.when")}
                </strong>
                <select
                  value={draft.whenEvent}
                  disabled={!isAdmin}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      whenEvent: e.target.value as ClinicalRuleEventType,
                    })
                  }
                  style={{ display: "block", marginTop: 6, padding: 6, borderRadius: 8 }}
                >
                  {CLINICAL_RULE_EVENT_TYPES.map((ev) => (
                    <option key={ev} value={ev}>
                      {ev}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ ...shell, background: "#f8fafc" }}>
                <strong style={{ fontSize: 12 }}>
                  {t("enterpriseClinicalRulesD4a28a.builder.if")}
                </strong>
                <p style={{ fontSize: 11, color: "#64748b", margin: "4px 0 8px" }}>
                  {t("enterpriseClinicalRulesD4a28a.builder.nestedHint")}
                </p>
                <ConditionEditor
                  node={draft.ifCondition}
                  t={t}
                  onChange={(ifCondition) => setDraft({ ...draft, ifCondition })}
                />
              </div>

              <div style={{ ...shell, background: "#ecfdf5" }}>
                <strong style={{ fontSize: 12 }}>
                  {t("enterpriseClinicalRulesD4a28a.builder.then")}
                </strong>
                <div style={{ marginTop: 8 }}>
                  <ActionListEditor
                    actions={draft.thenActions}
                    t={t}
                    onChange={(thenActions) => setDraft({ ...draft, thenActions })}
                  />
                </div>
              </div>

              <div style={{ ...shell, background: "#fff7ed" }}>
                <strong style={{ fontSize: 12 }}>
                  {t("enterpriseClinicalRulesD4a28a.builder.else")}
                </strong>
                <div style={{ marginTop: 8 }}>
                  <ActionListEditor
                    actions={draft.elseActions}
                    t={t}
                    onChange={(elseActions) => setDraft({ ...draft, elseActions })}
                  />
                </div>
              </div>

              <div style={{ ...shell, background: "#f1f5f9" }}>
                <strong style={{ fontSize: 12 }}>
                  {t("enterpriseClinicalRulesD4a28a.builder.end")}
                </strong>
                <p style={{ fontSize: 12, color: "#64748b", margin: "6px 0 0" }}>
                  STOP · {draft.stopOnMatch ? "ON" : "OFF"} · v{draft.version} ·{" "}
                  {t(`enterpriseClinicalRulesD4a28a.statuses.${draft.status}` as never)}
                </p>
              </div>

              {isAdmin ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  <button type="button" style={primaryBtn} onClick={() => void onSave()}>
                    {t("enterpriseClinicalRulesD4a28a.save")}
                  </button>
                  <button type="button" style={rowBtn} onClick={() => void onActivate()}>
                    {t("enterpriseClinicalRulesD4a28a.activate")}
                  </button>
                  <button
                    type="button"
                    style={rowBtn}
                    onClick={() => void onStatus("DISABLED")}
                  >
                    {t("enterpriseClinicalRulesD4a28a.disable")}
                  </button>
                  <button
                    type="button"
                    style={rowBtn}
                    onClick={() => void onStatus("ARCHIVED")}
                  >
                    {t("enterpriseClinicalRulesD4a28a.archive")}
                  </button>
                  <button type="button" style={rowBtn} onClick={() => void onRollback()}>
                    {t("enterpriseClinicalRulesD4a28a.rollback")}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={shell}>
          <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>
            {t("enterpriseClinicalRulesD4a28a.simulatePanel.title")}
          </h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <select
              value={simEvent}
              onChange={(e) => setSimEvent(e.target.value as ClinicalRuleEventType)}
              style={{ padding: 4, borderRadius: 8, fontSize: 13 }}
            >
              {CLINICAL_RULE_EVENT_TYPES.map((ev) => (
                <option key={ev} value={ev}>
                  {ev}
                </option>
              ))}
            </select>
            <input
              value={simLabCode}
              onChange={(e) => setSimLabCode(e.target.value)}
              placeholder={t("enterpriseClinicalRulesD4a28a.simulatePanel.labCode")}
              style={{ padding: 4, borderRadius: 8, fontSize: 13, width: 90 }}
            />
            <input
              value={simLabFlag}
              onChange={(e) => setSimLabFlag(e.target.value)}
              placeholder={t("enterpriseClinicalRulesD4a28a.simulatePanel.labFlag")}
              style={{ padding: 4, borderRadius: 8, fontSize: 13, width: 100 }}
            />
            <input
              value={simPain}
              onChange={(e) => setSimPain(e.target.value)}
              placeholder={t("enterpriseClinicalRulesD4a28a.simulatePanel.painScore")}
              style={{ padding: 4, borderRadius: 8, fontSize: 13, width: 70 }}
            />
            <button type="button" style={primaryBtn} onClick={() => void onSimulate()}>
              {t("enterpriseClinicalRulesD4a28a.simulatePanel.run")}
            </button>
          </div>
          {simResult ? (
            <div style={{ fontSize: 13 }}>
              <div>
                <strong>{t("enterpriseClinicalRulesD4a28a.simulatePanel.matched")}:</strong>{" "}
                {simResult.matchedRuleIds.length
                  ? simResult.matchedRuleIds.join(", ")
                  : t("enterpriseClinicalRulesD4a28a.simulatePanel.none")}
              </div>
              <div style={{ marginTop: 6 }}>
                <strong>{t("enterpriseClinicalRulesD4a28a.simulatePanel.actions")}:</strong>{" "}
                {simResult.actions.map((a) => a.type).join(", ") || "—"}
              </div>
            </div>
          ) : null}
        </div>

        <div style={shell}>
          <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>
            {t("enterpriseClinicalRulesD4a28a.conflictPanel.title")}
          </h3>
          {!conflicts.length ? (
            <p style={{ fontSize: 13, color: "#64748b" }}>
              {t("enterpriseClinicalRulesD4a28a.conflictPanel.empty")}
            </p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              {conflicts.map((c, i) => (
                <li key={`${c.code}-${i}`}>
                  <strong>{c.severity}</strong> — {c.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </HospitalCareShell>
  );
}
