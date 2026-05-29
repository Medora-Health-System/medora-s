"use client";

import React, { useMemo, useState } from "react";
import {
  EDOC5_INTAKE_OUTPUT_CARD_IDS,
  IO_BLOOD_PRODUCT_INTAKE_CARD_ID,
  IO_DRAIN_OUTPUT_CARD_ID,
  IO_EMESIS_OUTPUT_CARD_ID,
  IO_FLUID_INTAKE_CARD_ID,
  IO_INTAKE_OUTPUT_SUMMARY_CARD_ID,
  IO_IV_INTAKE_CARD_ID,
  IO_NG_OUTPUT_CARD_ID,
  IO_PO_INTAKE_CARD_ID,
  IO_STOOL_OUTPUT_CARD_ID,
  IO_URINE_OUTPUT_CARD_ID,
  validateIntakeOutputPayloadForCard,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";

const fieldStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "6px 8px",
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid #e2e8f0",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "#475569",
  marginBottom: 2,
};

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
  gap: 8,
};

const UNITS = ["ML", "L", "OZ", "CC"] as const;

function nowLocalDatetimeValue(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function toIsoFromLocalDatetime(local: string): string {
  if (!local) return new Date().toISOString();
  return new Date(local).toISOString();
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#334155" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <span style={labelStyle}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={fieldStyle}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ClinicalDocumentationIntakeOutputForm({
  cardId,
  saving,
  onSubmit,
}: {
  cardId: string;
  saving: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const { t } = useI18n();
  const [validationError, setValidationError] = useState<string | null>(null);

  const [recordedAt, setRecordedAt] = useState(nowLocalDatetimeValue());
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<(typeof UNITS)[number]>("ML");
  const [notes, setNotes] = useState("");

  const [summary, setSummary] = useState({
    summaryStartTime: nowLocalDatetimeValue(),
    summaryEndTime: nowLocalDatetimeValue(),
    totalIntakeMl: "",
    totalOutputMl: "",
    netBalanceMl: "",
    includesEstimatedValues: false,
    reviewedByNurse: false,
    providerNotified: false,
  });

  const [fluid, setFluid] = useState({
    route: "IV" as "ORAL" | "IV" | "ENTERAL" | "OTHER",
    fluidType: "",
  });

  const [po, setPo] = useState({
    substance: "",
    tolerated: "YES" as "YES" | "NO" | "PARTIAL",
    nausea: false,
    vomiting: false,
  });

  const [iv, setIv] = useState({
    fluidType: "",
    accessSite: "",
    infusionRelated: false,
  });

  const [blood, setBlood] = useState({
    productType: "PRBC" as "PRBC" | "FFP" | "PLATELETS" | "CRYO" | "WHOLE_BLOOD" | "OTHER",
    unitIdentifier: "",
    transfusionRecordLinked: false,
    reactionSuspected: false,
  });

  const [urine, setUrine] = useState({
    method: "FOLEY" as "VOIDED" | "FOLEY" | "STRAIGHT_CATH" | "URINAL" | "BEDPAN" | "OTHER",
    color: "",
  });

  const [stool, setStool] = useState({
    occurrenceCount: "1",
    estimatedAmount: "",
    consistency: "FORMED" as "FORMED" | "LOOSE" | "WATERY" | "BLOODY" | "BLACK_TARRY" | "OTHER",
  });

  const [emesis, setEmesis] = useState({
    occurrenceCount: "1",
    amount: "",
    appearance: "BILIOUS" as "CLEAR" | "FOOD_CONTENT" | "BILIOUS" | "BLOODY" | "COFFEE_GROUND" | "OTHER",
  });

  const [ng, setNg] = useState({
    appearance: "BILIOUS" as "CLEAR" | "BILIOUS" | "BLOODY" | "COFFEE_GROUND" | "FOOD_CONTENT" | "OTHER",
    suctionType: "LOW_INTERMITTENT" as
      | "LOW_INTERMITTENT"
      | "LOW_CONTINUOUS"
      | "GRAVITY"
      | "CLAMPED"
      | "OTHER",
  });

  const [drain, setDrain] = useState({
    drainType: "",
    drainLocation: "",
    appearance: "SEROSANGUINOUS" as
      | "SEROUS"
      | "SEROSANGUINOUS"
      | "SANGUINEOUS"
      | "PURULENT"
      | "BILIOUS"
      | "OTHER",
  });

  const testId = useMemo(() => {
    switch (cardId) {
      case IO_PO_INTAKE_CARD_ID:
        return "clinical-documentation-po-intake-form";
      case IO_URINE_OUTPUT_CARD_ID:
        return "clinical-documentation-urine-output-form";
      case IO_BLOOD_PRODUCT_INTAKE_CARD_ID:
        return "clinical-documentation-blood-product-intake-form";
      default:
        return "clinical-documentation-intake-output-form";
    }
  }, [cardId]);

  const unitOptions = UNITS.map((u) => ({
    value: u,
    label: t(`clinicalDocumentation.forms.intakeOutput.enums.unit.${u}`),
  }));

  const buildPayload = (): Record<string, unknown> | null => {
    const trimmedNotes = notes.trim();
    const noteField = trimmedNotes ? { notes: trimmedNotes } : {};

    switch (cardId) {
      case IO_INTAKE_OUTPUT_SUMMARY_CARD_ID: {
        const intake = Number(summary.totalIntakeMl);
        const output = Number(summary.totalOutputMl);
        const net = Number(summary.netBalanceMl);
        if (!Number.isFinite(intake) || !Number.isFinite(output) || !Number.isFinite(net)) return null;
        return {
          summaryStartTime: toIsoFromLocalDatetime(summary.summaryStartTime),
          summaryEndTime: toIsoFromLocalDatetime(summary.summaryEndTime),
          totalIntakeMl: intake,
          totalOutputMl: output,
          netBalanceMl: net,
          includesEstimatedValues: summary.includesEstimatedValues,
          reviewedByNurse: summary.reviewedByNurse,
          providerNotified: summary.providerNotified,
          ...noteField,
        };
      }
      case IO_FLUID_INTAKE_CARD_ID: {
        const amt = Number(amount);
        if (!fluid.fluidType.trim() || !Number.isFinite(amt) || amt <= 0) return null;
        return {
          recordedAt: toIsoFromLocalDatetime(recordedAt),
          amount: amt,
          unit,
          route: fluid.route,
          fluidType: fluid.fluidType.trim(),
          ...noteField,
        };
      }
      case IO_PO_INTAKE_CARD_ID: {
        const amt = Number(amount);
        if (!po.substance.trim() || !Number.isFinite(amt) || amt <= 0) return null;
        return {
          recordedAt: toIsoFromLocalDatetime(recordedAt),
          amount: amt,
          unit,
          substance: po.substance.trim(),
          tolerated: po.tolerated,
          nausea: po.nausea,
          vomiting: po.vomiting,
          ...noteField,
        };
      }
      case IO_IV_INTAKE_CARD_ID: {
        const amt = Number(amount);
        if (!iv.fluidType.trim() || !Number.isFinite(amt) || amt <= 0) return null;
        return {
          recordedAt: toIsoFromLocalDatetime(recordedAt),
          amount: amt,
          unit,
          fluidType: iv.fluidType.trim(),
          infusionRelated: iv.infusionRelated,
          ...(iv.accessSite.trim() ? { accessSite: iv.accessSite.trim() } : {}),
          ...noteField,
        };
      }
      case IO_BLOOD_PRODUCT_INTAKE_CARD_ID: {
        const amt = Number(amount);
        if (!Number.isFinite(amt) || amt <= 0) return null;
        return {
          recordedAt: toIsoFromLocalDatetime(recordedAt),
          amount: amt,
          unit,
          productType: blood.productType,
          transfusionRecordLinked: blood.transfusionRecordLinked,
          reactionSuspected: blood.reactionSuspected,
          ...(blood.unitIdentifier.trim() ? { unitIdentifier: blood.unitIdentifier.trim() } : {}),
          ...noteField,
        };
      }
      case IO_URINE_OUTPUT_CARD_ID: {
        const amt = Number(amount);
        if (!Number.isFinite(amt) || amt <= 0) return null;
        return {
          recordedAt: toIsoFromLocalDatetime(recordedAt),
          amount: amt,
          unit,
          method: urine.method,
          ...(urine.color.trim() ? { color: urine.color.trim() } : {}),
          ...noteField,
        };
      }
      case IO_STOOL_OUTPUT_CARD_ID: {
        const count = Number.parseInt(stool.occurrenceCount, 10);
        if (!Number.isFinite(count) || count < 1) return null;
        const est = stool.estimatedAmount.trim() ? Number(stool.estimatedAmount) : undefined;
        return {
          recordedAt: toIsoFromLocalDatetime(recordedAt),
          occurrenceCount: count,
          consistency: stool.consistency,
          ...(est != null && est > 0 ? { estimatedAmount: est, unit } : {}),
          ...noteField,
        };
      }
      case IO_EMESIS_OUTPUT_CARD_ID: {
        const count = Number.parseInt(emesis.occurrenceCount, 10);
        if (!Number.isFinite(count) || count < 1) return null;
        const est = emesis.amount.trim() ? Number(emesis.amount) : undefined;
        return {
          recordedAt: toIsoFromLocalDatetime(recordedAt),
          occurrenceCount: count,
          appearance: emesis.appearance,
          ...(est != null && est > 0 ? { amount: est, unit } : {}),
          ...noteField,
        };
      }
      case IO_NG_OUTPUT_CARD_ID: {
        const amt = Number(amount);
        if (!Number.isFinite(amt) || amt <= 0) return null;
        return {
          recordedAt: toIsoFromLocalDatetime(recordedAt),
          amount: amt,
          unit,
          appearance: ng.appearance,
          suctionType: ng.suctionType,
          ...noteField,
        };
      }
      case IO_DRAIN_OUTPUT_CARD_ID: {
        const amt = Number(amount);
        if (!drain.drainType.trim() || !Number.isFinite(amt) || amt <= 0) return null;
        return {
          recordedAt: toIsoFromLocalDatetime(recordedAt),
          amount: amt,
          unit,
          drainType: drain.drainType.trim(),
          appearance: drain.appearance,
          ...(drain.drainLocation.trim() ? { drainLocation: drain.drainLocation.trim() } : {}),
          ...noteField,
        };
      }
      default:
        return null;
    }
  };

  const save = async () => {
    setValidationError(null);
    const payload = buildPayload();
    if (!payload) {
      setValidationError(t("clinicalDocumentation.forms.intakeOutput.validationError"));
      return;
    }
    const validated = validateIntakeOutputPayloadForCard(cardId, payload);
    if (!validated.ok) {
      setValidationError(t("clinicalDocumentation.forms.intakeOutput.validationError"));
      return;
    }
    await onSubmit(validated.data);
  };

  const amountUnitFields = (
    <>
      <div>
        <span style={labelStyle}>{t("clinicalDocumentation.forms.intakeOutput.amount")}</span>
        <input
          type="number"
          min={0}
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={fieldStyle}
        />
      </div>
      <SelectField
        label={t("clinicalDocumentation.forms.intakeOutput.unit")}
        value={unit}
        options={unitOptions}
        onChange={(v) => setUnit(v as (typeof UNITS)[number])}
      />
    </>
  );

  const recordedAtField = (
    <div>
      <span style={labelStyle}>{t("clinicalDocumentation.forms.intakeOutput.recordedAt")}</span>
      <input
        type="datetime-local"
        value={recordedAt}
        onChange={(e) => setRecordedAt(e.target.value)}
        style={fieldStyle}
      />
    </div>
  );

  const notesField = (
    <div style={{ gridColumn: "1 / -1" }}>
      <span style={labelStyle}>{t("clinicalDocumentation.forms.common.notes")}</span>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        style={{ ...fieldStyle, resize: "vertical" }}
      />
    </div>
  );

  return (
    <div
      data-testid={testId}
      data-card-id={cardId}
      style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}
    >
      {cardId === IO_BLOOD_PRODUCT_INTAKE_CARD_ID ? (
        <p
          data-testid="clinical-documentation-blood-product-io-warning"
          style={{
            margin: 0,
            padding: "6px 8px",
            fontSize: 11,
            borderRadius: 8,
            background: "#fef9c3",
            color: "#854d0e",
            border: "1px solid #fde047",
          }}
        >
          {t("clinicalDocumentation.forms.intakeOutput.bloodProductIoOnlyWarning")}
        </p>
      ) : null}

      {cardId === IO_INTAKE_OUTPUT_SUMMARY_CARD_ID ? (
        <div style={rowStyle}>
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.intakeOutput.summaryStart")}</span>
            <input
              type="datetime-local"
              value={summary.summaryStartTime}
              onChange={(e) => setSummary((s) => ({ ...s, summaryStartTime: e.target.value }))}
              style={fieldStyle}
            />
          </div>
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.intakeOutput.summaryEnd")}</span>
            <input
              type="datetime-local"
              value={summary.summaryEndTime}
              onChange={(e) => setSummary((s) => ({ ...s, summaryEndTime: e.target.value }))}
              style={fieldStyle}
            />
          </div>
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.intakeOutput.totalIntakeMl")}</span>
            <input
              type="number"
              min={0}
              value={summary.totalIntakeMl}
              onChange={(e) => setSummary((s) => ({ ...s, totalIntakeMl: e.target.value }))}
              style={fieldStyle}
            />
          </div>
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.intakeOutput.totalOutputMl")}</span>
            <input
              type="number"
              min={0}
              value={summary.totalOutputMl}
              onChange={(e) => setSummary((s) => ({ ...s, totalOutputMl: e.target.value }))}
              style={fieldStyle}
            />
          </div>
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.intakeOutput.netBalanceMl")}</span>
            <input
              type="number"
              value={summary.netBalanceMl}
              onChange={(e) => setSummary((s) => ({ ...s, netBalanceMl: e.target.value }))}
              style={fieldStyle}
            />
          </div>
          <CheckboxField
            label={t("clinicalDocumentation.forms.intakeOutput.includesEstimatedValues")}
            checked={summary.includesEstimatedValues}
            onChange={(v) => setSummary((s) => ({ ...s, includesEstimatedValues: v }))}
          />
          <CheckboxField
            label={t("clinicalDocumentation.forms.intakeOutput.reviewedByNurse")}
            checked={summary.reviewedByNurse}
            onChange={(v) => setSummary((s) => ({ ...s, reviewedByNurse: v }))}
          />
          <CheckboxField
            label={t("clinicalDocumentation.forms.intakeOutput.providerNotified")}
            checked={summary.providerNotified}
            onChange={(v) => setSummary((s) => ({ ...s, providerNotified: v }))}
          />
          {notesField}
        </div>
      ) : null}

      {cardId === IO_FLUID_INTAKE_CARD_ID ? (
        <div style={rowStyle}>
          {recordedAtField}
          {amountUnitFields}
          <SelectField
            label={t("clinicalDocumentation.forms.intakeOutput.route")}
            value={fluid.route}
            options={(["ORAL", "IV", "ENTERAL", "OTHER"] as const).map((v) => ({
              value: v,
              label: t(`clinicalDocumentation.forms.intakeOutput.enums.route.${v}`),
            }))}
            onChange={(v) => setFluid((s) => ({ ...s, route: v as typeof fluid.route }))}
          />
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.intakeOutput.fluidType")}</span>
            <input
              type="text"
              value={fluid.fluidType}
              onChange={(e) => setFluid((s) => ({ ...s, fluidType: e.target.value }))}
              style={fieldStyle}
            />
          </div>
          {notesField}
        </div>
      ) : null}

      {cardId === IO_PO_INTAKE_CARD_ID ? (
        <div style={rowStyle}>
          {recordedAtField}
          {amountUnitFields}
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.intakeOutput.substance")}</span>
            <input
              type="text"
              value={po.substance}
              onChange={(e) => setPo((s) => ({ ...s, substance: e.target.value }))}
              style={fieldStyle}
            />
          </div>
          <SelectField
            label={t("clinicalDocumentation.forms.intakeOutput.tolerated")}
            value={po.tolerated}
            options={(["YES", "NO", "PARTIAL"] as const).map((v) => ({
              value: v,
              label: t(`clinicalDocumentation.forms.enums.tolerated.${v}`),
            }))}
            onChange={(v) => setPo((s) => ({ ...s, tolerated: v as typeof po.tolerated }))}
          />
          <CheckboxField
            label={t("clinicalDocumentation.forms.poChallenge.nausea")}
            checked={po.nausea}
            onChange={(v) => setPo((s) => ({ ...s, nausea: v }))}
          />
          <CheckboxField
            label={t("clinicalDocumentation.forms.poChallenge.vomiting")}
            checked={po.vomiting}
            onChange={(v) => setPo((s) => ({ ...s, vomiting: v }))}
          />
          {notesField}
        </div>
      ) : null}

      {cardId === IO_IV_INTAKE_CARD_ID ? (
        <div style={rowStyle}>
          {recordedAtField}
          {amountUnitFields}
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.intakeOutput.fluidType")}</span>
            <input
              type="text"
              value={iv.fluidType}
              onChange={(e) => setIv((s) => ({ ...s, fluidType: e.target.value }))}
              style={fieldStyle}
            />
          </div>
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.intakeOutput.accessSite")}</span>
            <input
              type="text"
              value={iv.accessSite}
              onChange={(e) => setIv((s) => ({ ...s, accessSite: e.target.value }))}
              style={fieldStyle}
            />
          </div>
          <CheckboxField
            label={t("clinicalDocumentation.forms.intakeOutput.infusionRelated")}
            checked={iv.infusionRelated}
            onChange={(v) => setIv((s) => ({ ...s, infusionRelated: v }))}
          />
          {notesField}
        </div>
      ) : null}

      {cardId === IO_BLOOD_PRODUCT_INTAKE_CARD_ID ? (
        <div style={rowStyle}>
          {recordedAtField}
          {amountUnitFields}
          <SelectField
            label={t("clinicalDocumentation.forms.intakeOutput.productType")}
            value={blood.productType}
            options={(
              ["PRBC", "FFP", "PLATELETS", "CRYO", "WHOLE_BLOOD", "OTHER"] as const
            ).map((v) => ({
              value: v,
              label: t(`clinicalDocumentation.forms.intakeOutput.enums.productType.${v}`),
            }))}
            onChange={(v) => setBlood((s) => ({ ...s, productType: v as typeof blood.productType }))}
          />
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.intakeOutput.unitIdentifier")}</span>
            <input
              type="text"
              value={blood.unitIdentifier}
              onChange={(e) => setBlood((s) => ({ ...s, unitIdentifier: e.target.value }))}
              style={fieldStyle}
            />
          </div>
          <CheckboxField
            label={t("clinicalDocumentation.forms.intakeOutput.transfusionRecordLinked")}
            checked={blood.transfusionRecordLinked}
            onChange={(v) => setBlood((s) => ({ ...s, transfusionRecordLinked: v }))}
          />
          <CheckboxField
            label={t("clinicalDocumentation.forms.intakeOutput.reactionSuspected")}
            checked={blood.reactionSuspected}
            onChange={(v) => setBlood((s) => ({ ...s, reactionSuspected: v }))}
          />
          {notesField}
        </div>
      ) : null}

      {cardId === IO_URINE_OUTPUT_CARD_ID ? (
        <div style={rowStyle}>
          {recordedAtField}
          {amountUnitFields}
          <SelectField
            label={t("clinicalDocumentation.forms.intakeOutput.method")}
            value={urine.method}
            options={(
              ["VOIDED", "FOLEY", "STRAIGHT_CATH", "URINAL", "BEDPAN", "OTHER"] as const
            ).map((v) => ({
              value: v,
              label: t(`clinicalDocumentation.forms.intakeOutput.enums.urineMethod.${v}`),
            }))}
            onChange={(v) => setUrine((s) => ({ ...s, method: v as typeof urine.method }))}
          />
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.intakeOutput.color")}</span>
            <input
              type="text"
              value={urine.color}
              onChange={(e) => setUrine((s) => ({ ...s, color: e.target.value }))}
              style={fieldStyle}
            />
          </div>
          {notesField}
        </div>
      ) : null}

      {cardId === IO_STOOL_OUTPUT_CARD_ID ? (
        <div style={rowStyle}>
          {recordedAtField}
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.intakeOutput.occurrenceCount")}</span>
            <input
              type="number"
              min={1}
              value={stool.occurrenceCount}
              onChange={(e) => setStool((s) => ({ ...s, occurrenceCount: e.target.value }))}
              style={fieldStyle}
            />
          </div>
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.intakeOutput.estimatedAmount")}</span>
            <input
              type="number"
              min={0}
              value={stool.estimatedAmount}
              onChange={(e) => setStool((s) => ({ ...s, estimatedAmount: e.target.value }))}
              style={fieldStyle}
            />
          </div>
          <SelectField
            label={t("clinicalDocumentation.forms.intakeOutput.unit")}
            value={unit}
            options={unitOptions}
            onChange={(v) => setUnit(v as (typeof UNITS)[number])}
          />
          <SelectField
            label={t("clinicalDocumentation.forms.intakeOutput.consistency")}
            value={stool.consistency}
            options={(
              ["FORMED", "LOOSE", "WATERY", "BLOODY", "BLACK_TARRY", "OTHER"] as const
            ).map((v) => ({
              value: v,
              label: t(`clinicalDocumentation.forms.intakeOutput.enums.consistency.${v}`),
            }))}
            onChange={(v) => setStool((s) => ({ ...s, consistency: v as typeof stool.consistency }))}
          />
          {notesField}
        </div>
      ) : null}

      {cardId === IO_EMESIS_OUTPUT_CARD_ID ? (
        <div style={rowStyle}>
          {recordedAtField}
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.intakeOutput.occurrenceCount")}</span>
            <input
              type="number"
              min={1}
              value={emesis.occurrenceCount}
              onChange={(e) => setEmesis((s) => ({ ...s, occurrenceCount: e.target.value }))}
              style={fieldStyle}
            />
          </div>
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.intakeOutput.amountOptional")}</span>
            <input
              type="number"
              min={0}
              value={emesis.amount}
              onChange={(e) => setEmesis((s) => ({ ...s, amount: e.target.value }))}
              style={fieldStyle}
            />
          </div>
          <SelectField
            label={t("clinicalDocumentation.forms.intakeOutput.unit")}
            value={unit}
            options={unitOptions}
            onChange={(v) => setUnit(v as (typeof UNITS)[number])}
          />
          <SelectField
            label={t("clinicalDocumentation.forms.intakeOutput.appearance")}
            value={emesis.appearance}
            options={(
              ["CLEAR", "FOOD_CONTENT", "BILIOUS", "BLOODY", "COFFEE_GROUND", "OTHER"] as const
            ).map((v) => ({
              value: v,
              label: t(`clinicalDocumentation.forms.intakeOutput.enums.emesisAppearance.${v}`),
            }))}
            onChange={(v) => setEmesis((s) => ({ ...s, appearance: v as typeof emesis.appearance }))}
          />
          {notesField}
        </div>
      ) : null}

      {cardId === IO_NG_OUTPUT_CARD_ID ? (
        <div style={rowStyle}>
          {recordedAtField}
          {amountUnitFields}
          <SelectField
            label={t("clinicalDocumentation.forms.intakeOutput.appearance")}
            value={ng.appearance}
            options={(
              ["CLEAR", "BILIOUS", "BLOODY", "COFFEE_GROUND", "FOOD_CONTENT", "OTHER"] as const
            ).map((v) => ({
              value: v,
              label: t(`clinicalDocumentation.forms.intakeOutput.enums.ngAppearance.${v}`),
            }))}
            onChange={(v) => setNg((s) => ({ ...s, appearance: v as typeof ng.appearance }))}
          />
          <SelectField
            label={t("clinicalDocumentation.forms.intakeOutput.suctionType")}
            value={ng.suctionType}
            options={(
              ["LOW_INTERMITTENT", "LOW_CONTINUOUS", "GRAVITY", "CLAMPED", "OTHER"] as const
            ).map((v) => ({
              value: v,
              label: t(`clinicalDocumentation.forms.intakeOutput.enums.suctionType.${v}`),
            }))}
            onChange={(v) => setNg((s) => ({ ...s, suctionType: v as typeof ng.suctionType }))}
          />
          {notesField}
        </div>
      ) : null}

      {cardId === IO_DRAIN_OUTPUT_CARD_ID ? (
        <div style={rowStyle}>
          {recordedAtField}
          {amountUnitFields}
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.intakeOutput.drainType")}</span>
            <input
              type="text"
              value={drain.drainType}
              onChange={(e) => setDrain((s) => ({ ...s, drainType: e.target.value }))}
              style={fieldStyle}
            />
          </div>
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.intakeOutput.drainLocation")}</span>
            <input
              type="text"
              value={drain.drainLocation}
              onChange={(e) => setDrain((s) => ({ ...s, drainLocation: e.target.value }))}
              style={fieldStyle}
            />
          </div>
          <SelectField
            label={t("clinicalDocumentation.forms.intakeOutput.appearance")}
            value={drain.appearance}
            options={(
              ["SEROUS", "SEROSANGUINOUS", "SANGUINEOUS", "PURULENT", "BILIOUS", "OTHER"] as const
            ).map((v) => ({
              value: v,
              label: t(`clinicalDocumentation.forms.intakeOutput.enums.drainAppearance.${v}`),
            }))}
            onChange={(v) => setDrain((s) => ({ ...s, appearance: v as typeof drain.appearance }))}
          />
          {notesField}
        </div>
      ) : null}

      {validationError ? (
        <p
          data-testid="clinical-documentation-intake-output-validation-error"
          style={{ margin: 0, fontSize: 12, color: "#b91c1c" }}
        >
          {validationError}
        </p>
      ) : null}

      <button
        type="button"
        data-testid="clinical-documentation-intake-output-save"
        disabled={saving}
        onClick={() => void save()}
        style={{
          alignSelf: "flex-start",
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 8,
          border: "1px solid #cbd5e1",
          background: saving ? "#f1f5f9" : "#0f172a",
          color: saving ? "#94a3b8" : "#fff",
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? t("clinicalDocumentation.saving") : t("clinicalDocumentation.saveEntry")}
      </button>
    </div>
  );
}

export function isEdoc5IntakeOutputFormCard(cardId: string): boolean {
  return (EDOC5_INTAKE_OUTPUT_CARD_IDS as readonly string[]).includes(cardId);
}
