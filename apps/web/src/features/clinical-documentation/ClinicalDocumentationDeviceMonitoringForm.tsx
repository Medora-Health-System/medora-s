"use client";

import React, { useState } from "react";
import {
  CENTRAL_LINE_ASSESSMENT_CARD_ID,
  DEVICE_CENTRAL_LINE_TYPE_OPTIONS,
  CHEST_TUBE_LOCATION_OPTIONS,
  CHEST_TUBE_MONITORING_CARD_ID,
  DEVICE_YES_NO_OPTIONS,
  DRESSING_STATUS_OPTIONS,
  DRAIN_APPEARANCE_OPTIONS,
  EDOC17_DEVICE_LINE_TUBE_DRAIN_MONITORING_CARD_IDS,
  ENDOTRACHEAL_TUBE_MONITORING_CARD_ID,
  EXTERNAL_URINARY_DEVICE_MONITORING_CARD_ID,
  EXTERNAL_URINARY_DEVICE_TYPE_OPTIONS,
  FOLEY_CATHETER_MONITORING_CARD_ID,
  IV_STATUS_OPTIONS,
  NG_OG_DRAINAGE_APPEARANCE_OPTIONS,
  NG_OG_TUBE_MONITORING_CARD_ID,
  NG_OG_TUBE_TYPE_OPTIONS,
  PERIPHERAL_IV_ASSESSMENT_CARD_ID,
  PICC_MIDLINE_ASSESSMENT_CARD_ID,
  PICC_MIDLINE_DEVICE_TYPE_OPTIONS,
  SITE_STATUS_OPTIONS,
  DEVICE_SKIN_INTEGRITY_OPTIONS,
  SURGICAL_DRAIN_MONITORING_CARD_ID,
  SURGICAL_DRAIN_SITE_STATUS_OPTIONS,
  SURGICAL_DRAIN_TYPE_OPTIONS,
  TRACHEOSTOMY_MONITORING_CARD_ID,
  TRACHEOSTOMY_TYPE_OPTIONS,
  DEVICE_URINE_APPEARANCE_OPTIONS,
  validateDeviceLineTubeDrainMonitoringPayloadForCard,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { ClinicalDocumentationSelectField } from "./ClinicalDocumentationFieldControls";

import { resolveProductUiLanguageOrDefault } from "@/i18n/config";

const fieldStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  minHeight: 36,
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
  gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
  gap: 8,
};

const formStyle: React.CSSProperties = {
  marginTop: 8,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

function nowLocalDatetimeValue(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function toIsoFromLocalDatetime(local: string): string {
  if (!local) return new Date().toISOString();
  return new Date(local).toISOString();
}

type YesNo = (typeof DEVICE_YES_NO_OPTIONS)[number]["value"];

function YesNoField({
  label,
  value,
  locale,
  onChange,
  testId,
}: {
  label: string;
  value: YesNo;
  locale: string;
  onChange: (v: YesNo) => void;
  testId?: string;
}) {
  return (
    <ClinicalDocumentationSelectField
      label={label}
      value={value}
      options={DEVICE_YES_NO_OPTIONS}
      locale={locale}
      onChange={onChange}
      testId={testId}
    />
  );
}

export function ClinicalDocumentationDeviceMonitoringForm({
  cardId,
  saving,
  onSubmit,
}: {
  cardId: string;
  saving: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const { t, language } = useI18n();
  const locale = resolveProductUiLanguageOrDefault(language);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [peripheralIv, setPeripheralIv] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    siteLocation: "",
    gauge: "",
    status: "PATENT" as (typeof IV_STATUS_OPTIONS)[number]["value"],
    bloodReturnPresent: "YES" as YesNo,
    flushesWithoutResistance: "YES" as YesNo,
    dressingStatus: "CLEAN_DRY_INTACT" as (typeof DRESSING_STATUS_OPTIONS)[number]["value"],
    painPresent: "NO" as YesNo,
    swellingPresent: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [centralLine, setCentralLine] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    lineType: "CVC" as (typeof DEVICE_CENTRAL_LINE_TYPE_OPTIONS)[number]["value"],
    siteStatus: "NORMAL" as (typeof SITE_STATUS_OPTIONS)[number]["value"],
    dressingStatus: "CLEAN_DRY_INTACT" as (typeof DRESSING_STATUS_OPTIONS)[number]["value"],
    securementIntact: "YES" as YesNo,
    infectionConcern: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [piccMidline, setPiccMidline] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    deviceType: "PICC" as (typeof PICC_MIDLINE_DEVICE_TYPE_OPTIONS)[number]["value"],
    siteStatus: "NORMAL" as (typeof SITE_STATUS_OPTIONS)[number]["value"],
    bloodReturnPresent: "YES" as YesNo,
    flushesWithoutResistance: "YES" as YesNo,
    infectionConcern: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [foley, setFoley] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    indicationPresent: "YES" as YesNo,
    catheterSecure: "YES" as YesNo,
    urineFlowPresent: "YES" as YesNo,
    urineAppearance: "YELLOW" as (typeof DEVICE_URINE_APPEARANCE_OPTIONS)[number]["value"],
    catheterCareCompleted: "YES" as YesNo,
    obstructionConcern: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [externalUrinary, setExternalUrinary] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    deviceType: "PUREWICK" as (typeof EXTERNAL_URINARY_DEVICE_TYPE_OPTIONS)[number]["value"],
    deviceIntact: "YES" as YesNo,
    skinIntegrity: "INTACT" as (typeof DEVICE_SKIN_INTEGRITY_OPTIONS)[number]["value"],
    functioningProperly: "YES" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [ngOg, setNgOg] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    tubeType: "NG" as (typeof NG_OG_TUBE_TYPE_OPTIONS)[number]["value"],
    placementVerified: "YES" as YesNo,
    markingAtNares: "",
    suctionActive: "NO" as YesNo,
    drainagePresent: "NO" as YesNo,
    drainageAppearance: "CLEAR" as (typeof NG_OG_DRAINAGE_APPEARANCE_OPTIONS)[number]["value"],
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [chestTube, setChestTube] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    tubeLocation: "LEFT" as (typeof CHEST_TUBE_LOCATION_OPTIONS)[number]["value"],
    suctionActive: "YES" as YesNo,
    waterSealPresent: "YES" as YesNo,
    airLeakPresent: "NO" as YesNo,
    drainageAmount: "0",
    drainageAppearance: "SEROSANGUINOUS" as (typeof DRAIN_APPEARANCE_OPTIONS)[number]["value"],
    tubeSecure: "YES" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [surgicalDrain, setSurgicalDrain] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    drainType: "JP" as (typeof SURGICAL_DRAIN_TYPE_OPTIONS)[number]["value"],
    drainageAmount: "0",
    drainageAppearance: "SEROUS" as (typeof DRAIN_APPEARANCE_OPTIONS)[number]["value"],
    drainCompressed: "YES" as YesNo,
    siteStatus: "NORMAL" as (typeof SURGICAL_DRAIN_SITE_STATUS_OPTIONS)[number]["value"],
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [ett, setEtt] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    tubePosition: "22",
    securementIntact: "YES" as YesNo,
    oralCareCompleted: "YES" as YesNo,
    airwayPatent: "YES" as YesNo,
    displacementConcern: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [trach, setTrach] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    trachType: "CUFFED" as (typeof TRACHEOSTOMY_TYPE_OPTIONS)[number]["value"],
    siteStatus: "NORMAL" as (typeof SITE_STATUS_OPTIONS)[number]["value"],
    innerCannulaChecked: "YES" as YesNo,
    airwayPatent: "YES" as YesNo,
    dislodgementConcern: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  function buildPayload(): Record<string, unknown> {
    switch (cardId) {
      case PERIPHERAL_IV_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(peripheralIv.assessmentTime),
          siteLocation: peripheralIv.siteLocation.trim(),
          gauge: peripheralIv.gauge.trim(),
          status: peripheralIv.status,
          bloodReturnPresent: peripheralIv.bloodReturnPresent,
          flushesWithoutResistance: peripheralIv.flushesWithoutResistance,
          dressingStatus: peripheralIv.dressingStatus,
          painPresent: peripheralIv.painPresent,
          swellingPresent: peripheralIv.swellingPresent,
          providerNotified: peripheralIv.providerNotified,
          notes: peripheralIv.notes.trim() || undefined,
        };
      case CENTRAL_LINE_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(centralLine.assessmentTime),
          lineType: centralLine.lineType,
          siteStatus: centralLine.siteStatus,
          dressingStatus: centralLine.dressingStatus,
          securementIntact: centralLine.securementIntact,
          infectionConcern: centralLine.infectionConcern,
          providerNotified: centralLine.providerNotified,
          notes: centralLine.notes.trim() || undefined,
        };
      case PICC_MIDLINE_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(piccMidline.assessmentTime),
          deviceType: piccMidline.deviceType,
          siteStatus: piccMidline.siteStatus,
          bloodReturnPresent: piccMidline.bloodReturnPresent,
          flushesWithoutResistance: piccMidline.flushesWithoutResistance,
          infectionConcern: piccMidline.infectionConcern,
          providerNotified: piccMidline.providerNotified,
          notes: piccMidline.notes.trim() || undefined,
        };
      case FOLEY_CATHETER_MONITORING_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(foley.assessmentTime),
          indicationPresent: foley.indicationPresent,
          catheterSecure: foley.catheterSecure,
          urineFlowPresent: foley.urineFlowPresent,
          urineAppearance: foley.urineAppearance,
          catheterCareCompleted: foley.catheterCareCompleted,
          obstructionConcern: foley.obstructionConcern,
          providerNotified: foley.providerNotified,
          notes: foley.notes.trim() || undefined,
        };
      case EXTERNAL_URINARY_DEVICE_MONITORING_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(externalUrinary.assessmentTime),
          deviceType: externalUrinary.deviceType,
          deviceIntact: externalUrinary.deviceIntact,
          skinIntegrity: externalUrinary.skinIntegrity,
          functioningProperly: externalUrinary.functioningProperly,
          providerNotified: externalUrinary.providerNotified,
          notes: externalUrinary.notes.trim() || undefined,
        };
      case NG_OG_TUBE_MONITORING_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(ngOg.assessmentTime),
          tubeType: ngOg.tubeType,
          placementVerified: ngOg.placementVerified,
          markingAtNares: ngOg.markingAtNares.trim(),
          suctionActive: ngOg.suctionActive,
          drainagePresent: ngOg.drainagePresent,
          drainageAppearance: ngOg.drainageAppearance,
          providerNotified: ngOg.providerNotified,
          notes: ngOg.notes.trim() || undefined,
        };
      case CHEST_TUBE_MONITORING_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(chestTube.assessmentTime),
          tubeLocation: chestTube.tubeLocation,
          suctionActive: chestTube.suctionActive,
          waterSealPresent: chestTube.waterSealPresent,
          airLeakPresent: chestTube.airLeakPresent,
          drainageAmount: Number(chestTube.drainageAmount),
          drainageAppearance: chestTube.drainageAppearance,
          tubeSecure: chestTube.tubeSecure,
          providerNotified: chestTube.providerNotified,
          notes: chestTube.notes.trim() || undefined,
        };
      case SURGICAL_DRAIN_MONITORING_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(surgicalDrain.assessmentTime),
          drainType: surgicalDrain.drainType,
          drainageAmount: Number(surgicalDrain.drainageAmount),
          drainageAppearance: surgicalDrain.drainageAppearance,
          drainCompressed: surgicalDrain.drainCompressed,
          siteStatus: surgicalDrain.siteStatus,
          providerNotified: surgicalDrain.providerNotified,
          notes: surgicalDrain.notes.trim() || undefined,
        };
      case ENDOTRACHEAL_TUBE_MONITORING_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(ett.assessmentTime),
          tubePosition: Number(ett.tubePosition),
          positionUnit: "CM",
          securementIntact: ett.securementIntact,
          oralCareCompleted: ett.oralCareCompleted,
          airwayPatent: ett.airwayPatent,
          displacementConcern: ett.displacementConcern,
          providerNotified: ett.providerNotified,
          notes: ett.notes.trim() || undefined,
        };
      case TRACHEOSTOMY_MONITORING_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(trach.assessmentTime),
          trachType: trach.trachType,
          siteStatus: trach.siteStatus,
          innerCannulaChecked: trach.innerCannulaChecked,
          airwayPatent: trach.airwayPatent,
          dislodgementConcern: trach.dislodgementConcern,
          providerNotified: trach.providerNotified,
          notes: trach.notes.trim() || undefined,
        };
      default:
        return {};
    }
  }

  const save = async () => {
    setValidationError(null);
    const payload = buildPayload();
    const validated = validateDeviceLineTubeDrainMonitoringPayloadForCard(cardId, payload);
    if (!validated.ok) {
      setValidationError(t("clinicalDocumentation.forms.deviceMonitoring.validationError"));
      return;
    }
    await onSubmit(validated.data);
  };

  const datetimeField = (label: string, value: string, onChange: (v: string) => void, testId?: string) => (
    <div>
      <span style={labelStyle}>{label}</span>
      <input
        type="datetime-local"
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={fieldStyle}
      />
    </div>
  );

  const textField = (label: string, value: string, onChange: (v: string) => void, testId?: string) => (
    <div>
      <span style={labelStyle}>{label}</span>
      <input
        type="text"
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={fieldStyle}
      />
    </div>
  );

  const notesField = (value: string, onChange: (v: string) => void) => (
    <div style={{ gridColumn: "1 / -1" }}>
      <span style={labelStyle}>{t("clinicalDocumentation.forms.common.notes")}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        style={{ ...fieldStyle, resize: "vertical" }}
      />
    </div>
  );

  return (
    <div
      data-testid="clinical-documentation-device-form"
      data-card-id={cardId}
      data-compact-layout="true"
      style={formStyle}
    >
      {validationError ? (
        <p style={{ margin: 0, fontSize: 11, color: "#b91c1c" }}>{validationError}</p>
      ) : null}

      <div style={rowStyle}>
        {cardId === PERIPHERAL_IV_ASSESSMENT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.deviceMonitoring.assessmentTime"),
              peripheralIv.assessmentTime,
              (v) => setPeripheralIv({ ...peripheralIv, assessmentTime: v }),
              "device-peripheral-iv-time"
            )}
            {textField(
              t("clinicalDocumentation.forms.deviceMonitoring.siteLocation"),
              peripheralIv.siteLocation,
              (v) => setPeripheralIv({ ...peripheralIv, siteLocation: v }),
              "device-peripheral-iv-site"
            )}
            {textField(
              t("clinicalDocumentation.forms.deviceMonitoring.gauge"),
              peripheralIv.gauge,
              (v) => setPeripheralIv({ ...peripheralIv, gauge: v })
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.deviceMonitoring.ivStatus")}
              value={peripheralIv.status}
              options={IV_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setPeripheralIv({ ...peripheralIv, status: v })}
              testId="device-peripheral-iv-status"
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.deviceMonitoring.dressingStatus")}
              value={peripheralIv.dressingStatus}
              options={DRESSING_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setPeripheralIv({ ...peripheralIv, dressingStatus: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.deviceMonitoring.providerNotified")}
              value={peripheralIv.providerNotified}
              locale={locale}
              onChange={(v) => setPeripheralIv({ ...peripheralIv, providerNotified: v })}
            />
            {notesField(peripheralIv.notes, (notes) => setPeripheralIv({ ...peripheralIv, notes }))}
          </>
        ) : null}

        {cardId === CENTRAL_LINE_ASSESSMENT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.deviceMonitoring.assessmentTime"),
              centralLine.assessmentTime,
              (v) => setCentralLine({ ...centralLine, assessmentTime: v }),
              "device-central-line-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.deviceMonitoring.lineType")}
              value={centralLine.lineType}
              options={DEVICE_CENTRAL_LINE_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setCentralLine({ ...centralLine, lineType: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.deviceMonitoring.siteStatus")}
              value={centralLine.siteStatus}
              options={SITE_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setCentralLine({ ...centralLine, siteStatus: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.deviceMonitoring.infectionConcern")}
              value={centralLine.infectionConcern}
              locale={locale}
              onChange={(v) => setCentralLine({ ...centralLine, infectionConcern: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.deviceMonitoring.providerNotified")}
              value={centralLine.providerNotified}
              locale={locale}
              onChange={(v) => setCentralLine({ ...centralLine, providerNotified: v })}
            />
            {notesField(centralLine.notes, (notes) => setCentralLine({ ...centralLine, notes }))}
          </>
        ) : null}

        {cardId === PICC_MIDLINE_ASSESSMENT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.deviceMonitoring.assessmentTime"),
              piccMidline.assessmentTime,
              (v) => setPiccMidline({ ...piccMidline, assessmentTime: v }),
              "device-picc-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.deviceMonitoring.deviceType")}
              value={piccMidline.deviceType}
              options={PICC_MIDLINE_DEVICE_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setPiccMidline({ ...piccMidline, deviceType: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.deviceMonitoring.infectionConcern")}
              value={piccMidline.infectionConcern}
              locale={locale}
              onChange={(v) => setPiccMidline({ ...piccMidline, infectionConcern: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.deviceMonitoring.providerNotified")}
              value={piccMidline.providerNotified}
              locale={locale}
              onChange={(v) => setPiccMidline({ ...piccMidline, providerNotified: v })}
            />
            {notesField(piccMidline.notes, (notes) => setPiccMidline({ ...piccMidline, notes }))}
          </>
        ) : null}

        {cardId === FOLEY_CATHETER_MONITORING_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.deviceMonitoring.assessmentTime"),
              foley.assessmentTime,
              (v) => setFoley({ ...foley, assessmentTime: v }),
              "device-foley-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.deviceMonitoring.urineAppearance")}
              value={foley.urineAppearance}
              options={DEVICE_URINE_APPEARANCE_OPTIONS}
              locale={locale}
              onChange={(v) => setFoley({ ...foley, urineAppearance: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.deviceMonitoring.urineFlowPresent")}
              value={foley.urineFlowPresent}
              locale={locale}
              onChange={(v) => setFoley({ ...foley, urineFlowPresent: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.deviceMonitoring.obstructionConcern")}
              value={foley.obstructionConcern}
              locale={locale}
              onChange={(v) => setFoley({ ...foley, obstructionConcern: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.deviceMonitoring.providerNotified")}
              value={foley.providerNotified}
              locale={locale}
              onChange={(v) => setFoley({ ...foley, providerNotified: v })}
            />
            {notesField(foley.notes, (notes) => setFoley({ ...foley, notes }))}
          </>
        ) : null}

        {cardId === EXTERNAL_URINARY_DEVICE_MONITORING_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.deviceMonitoring.assessmentTime"),
              externalUrinary.assessmentTime,
              (v) => setExternalUrinary({ ...externalUrinary, assessmentTime: v })
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.deviceMonitoring.skinIntegrity")}
              value={externalUrinary.skinIntegrity}
              options={DEVICE_SKIN_INTEGRITY_OPTIONS}
              locale={locale}
              onChange={(v) => setExternalUrinary({ ...externalUrinary, skinIntegrity: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.deviceMonitoring.providerNotified")}
              value={externalUrinary.providerNotified}
              locale={locale}
              onChange={(v) => setExternalUrinary({ ...externalUrinary, providerNotified: v })}
            />
            {notesField(externalUrinary.notes, (notes) =>
              setExternalUrinary({ ...externalUrinary, notes })
            )}
          </>
        ) : null}

        {cardId === NG_OG_TUBE_MONITORING_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.deviceMonitoring.assessmentTime"),
              ngOg.assessmentTime,
              (v) => setNgOg({ ...ngOg, assessmentTime: v }),
              "device-ng-og-time"
            )}
            <YesNoField
              label={t("clinicalDocumentation.forms.deviceMonitoring.placementVerified")}
              value={ngOg.placementVerified}
              locale={locale}
              onChange={(v) => setNgOg({ ...ngOg, placementVerified: v })}
            />
            {textField(
              t("clinicalDocumentation.forms.deviceMonitoring.markingAtNares"),
              ngOg.markingAtNares,
              (v) => setNgOg({ ...ngOg, markingAtNares: v })
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.deviceMonitoring.drainageAppearance")}
              value={ngOg.drainageAppearance}
              options={NG_OG_DRAINAGE_APPEARANCE_OPTIONS}
              locale={locale}
              onChange={(v) => setNgOg({ ...ngOg, drainageAppearance: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.deviceMonitoring.providerNotified")}
              value={ngOg.providerNotified}
              locale={locale}
              onChange={(v) => setNgOg({ ...ngOg, providerNotified: v })}
            />
            {notesField(ngOg.notes, (notes) => setNgOg({ ...ngOg, notes }))}
          </>
        ) : null}

        {cardId === CHEST_TUBE_MONITORING_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.deviceMonitoring.assessmentTime"),
              chestTube.assessmentTime,
              (v) => setChestTube({ ...chestTube, assessmentTime: v }),
              "device-chest-tube-time"
            )}
            <YesNoField
              label={t("clinicalDocumentation.forms.deviceMonitoring.suctionActive")}
              value={chestTube.suctionActive}
              locale={locale}
              onChange={(v) => setChestTube({ ...chestTube, suctionActive: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.deviceMonitoring.airLeakPresent")}
              value={chestTube.airLeakPresent}
              locale={locale}
              onChange={(v) => setChestTube({ ...chestTube, airLeakPresent: v })}
            />
            {textField(
              t("clinicalDocumentation.forms.deviceMonitoring.drainageAmount"),
              chestTube.drainageAmount,
              (v) => setChestTube({ ...chestTube, drainageAmount: v })
            )}
            <YesNoField
              label={t("clinicalDocumentation.forms.deviceMonitoring.tubeSecure")}
              value={chestTube.tubeSecure}
              locale={locale}
              onChange={(v) => setChestTube({ ...chestTube, tubeSecure: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.deviceMonitoring.providerNotified")}
              value={chestTube.providerNotified}
              locale={locale}
              onChange={(v) => setChestTube({ ...chestTube, providerNotified: v })}
            />
            {notesField(chestTube.notes, (notes) => setChestTube({ ...chestTube, notes }))}
          </>
        ) : null}

        {cardId === SURGICAL_DRAIN_MONITORING_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.deviceMonitoring.assessmentTime"),
              surgicalDrain.assessmentTime,
              (v) => setSurgicalDrain({ ...surgicalDrain, assessmentTime: v }),
              "device-surgical-drain-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.deviceMonitoring.drainType")}
              value={surgicalDrain.drainType}
              options={SURGICAL_DRAIN_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setSurgicalDrain({ ...surgicalDrain, drainType: v })}
            />
            {textField(
              t("clinicalDocumentation.forms.deviceMonitoring.drainageAmount"),
              surgicalDrain.drainageAmount,
              (v) => setSurgicalDrain({ ...surgicalDrain, drainageAmount: v })
            )}
            <YesNoField
              label={t("clinicalDocumentation.forms.deviceMonitoring.providerNotified")}
              value={surgicalDrain.providerNotified}
              locale={locale}
              onChange={(v) => setSurgicalDrain({ ...surgicalDrain, providerNotified: v })}
            />
            {notesField(surgicalDrain.notes, (notes) => setSurgicalDrain({ ...surgicalDrain, notes }))}
          </>
        ) : null}

        {cardId === ENDOTRACHEAL_TUBE_MONITORING_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.deviceMonitoring.assessmentTime"),
              ett.assessmentTime,
              (v) => setEtt({ ...ett, assessmentTime: v }),
              "device-ett-time"
            )}
            {textField(
              t("clinicalDocumentation.forms.deviceMonitoring.tubePosition"),
              ett.tubePosition,
              (v) => setEtt({ ...ett, tubePosition: v }),
              "device-ett-position"
            )}
            <YesNoField
              label={t("clinicalDocumentation.forms.deviceMonitoring.airwayPatent")}
              value={ett.airwayPatent}
              locale={locale}
              onChange={(v) => setEtt({ ...ett, airwayPatent: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.deviceMonitoring.displacementConcern")}
              value={ett.displacementConcern}
              locale={locale}
              onChange={(v) => setEtt({ ...ett, displacementConcern: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.deviceMonitoring.providerNotified")}
              value={ett.providerNotified}
              locale={locale}
              onChange={(v) => setEtt({ ...ett, providerNotified: v })}
            />
            {notesField(ett.notes, (notes) => setEtt({ ...ett, notes }))}
          </>
        ) : null}

        {cardId === TRACHEOSTOMY_MONITORING_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.deviceMonitoring.assessmentTime"),
              trach.assessmentTime,
              (v) => setTrach({ ...trach, assessmentTime: v }),
              "device-trach-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.deviceMonitoring.siteStatus")}
              value={trach.siteStatus}
              options={SITE_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setTrach({ ...trach, siteStatus: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.deviceMonitoring.innerCannulaChecked")}
              value={trach.innerCannulaChecked}
              locale={locale}
              onChange={(v) => setTrach({ ...trach, innerCannulaChecked: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.deviceMonitoring.airwayPatent")}
              value={trach.airwayPatent}
              locale={locale}
              onChange={(v) => setTrach({ ...trach, airwayPatent: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.deviceMonitoring.providerNotified")}
              value={trach.providerNotified}
              locale={locale}
              onChange={(v) => setTrach({ ...trach, providerNotified: v })}
            />
            {notesField(trach.notes, (notes) => setTrach({ ...trach, notes }))}
          </>
        ) : null}
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        style={{
          alignSelf: "flex-start",
          padding: "8px 14px",
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 8,
          border: "none",
          background: saving ? "#94a3b8" : "#0f766e",
          color: "#fff",
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? t("common.saving") : t("clinicalDocumentation.actionSave")}
      </button>
    </div>
  );
}

export function isEdoc17DeviceMonitoringDocumentationFormCard(cardId: string): boolean {
  return (EDOC17_DEVICE_LINE_TUBE_DRAIN_MONITORING_CARD_IDS as readonly string[]).includes(cardId);
}
