"use client";

import React, { useMemo, useState } from "react";
import {
  BELONGINGS_ALTERED_CONDITION_OPTIONS,
  BELONGINGS_ALTERED_PATIENT_CARD_ID,
  BELONGINGS_INVENTORY_CARD_ID,
  BELONGINGS_RELEASE_REPRESENTATIVE_CARD_ID,
  BELONGINGS_RELEASE_REASON_OPTIONS,
  BELONGINGS_RECIPIENT_RELATIONSHIP_OPTIONS,
  BELONGINGS_RETURN_PATIENT_CARD_ID,
  BELONGINGS_SECURED_BAGGED_CARD_ID,
  BELONGINGS_STORAGE_LOCATION_OPTIONS,
  BELONGINGS_TRANSFER_SECURITY_CARD_ID,
  EDOC9_BELONGINGS_VALUABLES_DOCUMENTATION_CARD_IDS,
  VALUABLES_INVENTORY_CARD_ID,
  requiresImmediateWitnessCaptureForPayload,
  validateBelongingsValuablesPayloadForCard,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import {
  ClinicalDocumentationBooleanField,
  ClinicalDocumentationSelectField,
} from "./ClinicalDocumentationFieldControls";

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
  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
  gap: 8,
};

const noticeStyle: React.CSSProperties = {
  margin: 0,
  padding: "6px 8px",
  fontSize: 11,
  borderRadius: 8,
  background: "#fff7ed",
  color: "#9a3412",
  border: "1px solid #fed7aa",
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

function ItemListField({
  label,
  items,
  onChange,
  testIdPrefix,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  testIdPrefix: string;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div style={{ gridColumn: "1 / -1" }} data-testid={`${testIdPrefix}-list`}>
      <span style={labelStyle}>{label}</span>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
        <input
          type="text"
          data-testid={`${testIdPrefix}-input`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          style={{ ...fieldStyle, flex: "1 1 120px" }}
        />
        <button
          type="button"
          data-testid={`${testIdPrefix}-add`}
          onClick={() => {
            const v = draft.trim();
            if (!v) return;
            onChange([...items, v]);
            setDraft("");
          }}
          style={{ padding: "6px 10px", fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
        >
          +
        </button>
      </div>
      {items.length > 0 ? (
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11 }}>
          {items.map((item, idx) => (
            <li key={`${item}-${idx}`}>
              {item}{" "}
              <button
                type="button"
                data-testid={`${testIdPrefix}-remove-${idx}`}
                onClick={() => onChange(items.filter((_, i) => i !== idx))}
                style={{ fontSize: 10, border: "none", background: "none", color: "#64748b" }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function ClinicalDocumentationBelongingsValuablesForm({
  cardId,
  saving,
  onSubmit,
}: {
  cardId: string;
  saving: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const { t, language } = useI18n();
  const locale = language === "en" ? "en" : "fr";
  const [validationError, setValidationError] = useState<string | null>(null);

  const [inventory, setInventory] = useState({
    documentedAt: nowLocalDatetimeValue(),
    patientAbleToParticipate: true,
    clothingItems: [] as string[],
    personalItems: [] as string[],
    assistiveDevices: [] as string[],
    medicationsBroughtFromHome: false,
    medicationDescription: "",
    belongingsKeptWithPatient: true,
    belongingsBagged: false,
    bagIdentifier: "",
    notes: "",
  });

  const [valuables, setValuables] = useState({
    documentedAt: nowLocalDatetimeValue(),
    cashPresent: false,
    cashAmount: "",
    jewelryPresent: false,
    jewelryDescription: "",
    electronicsPresent: false,
    electronicsDescription: "",
    walletOrPursePresent: false,
    keysPresent: false,
    identificationPresent: false,
    otherValuablesDescription: "",
    patientDeclinedValuablesInventory: false,
    valuablesSecured: false,
    securityBagIdentifier: "",
    notes: "",
  });

  const [secured, setSecured] = useState({
    securedAt: nowLocalDatetimeValue(),
    bagIdentifier: "",
    sealedByUserAcknowledged: false,
    patientLabelApplied: false,
    storageLocation: "ED_LOCKER" as (typeof BELONGINGS_STORAGE_LOCATION_OPTIONS)[number]["value"],
    storageLocationOther: "",
    witnessRequired: false,
    notes: "",
  });

  const [transfer, setTransfer] = useState({
    transferredAt: nowLocalDatetimeValue(),
    bagIdentifier: "",
    transferredByUserAcknowledged: false,
    receivedBySecurityName: "",
    securityReceiptNumber: "",
    storageLocation: "SECURITY" as (typeof BELONGINGS_STORAGE_LOCATION_OPTIONS)[number]["value"],
    notes: "",
  });

  const [release, setRelease] = useState({
    releasedAt: nowLocalDatetimeValue(),
    bagIdentifier: "",
    recipientName: "",
    recipientRelationship: "SPOUSE" as (typeof BELONGINGS_RECIPIENT_RELATIONSHIP_OPTIONS)[number]["value"],
    recipientPhone: "",
    recipientIdChecked: false,
    patientAuthorizedRelease: true,
    releaseReason: "PATIENT_REQUEST" as (typeof BELONGINGS_RELEASE_REASON_OPTIONS)[number]["value"],
    notes: "",
  });

  const [returnPatient, setReturnPatient] = useState({
    returnedAt: nowLocalDatetimeValue(),
    bagIdentifier: "",
    patientReceived: true,
    patientUnableToSign: false,
    discrepancyReported: false,
    discrepancyDescription: "",
    notes: "",
  });

  const [altered, setAltered] = useState({
    documentedAt: nowLocalDatetimeValue(),
    patientCondition: "UNCONSCIOUS" as (typeof BELONGINGS_ALTERED_CONDITION_OPTIONS)[number]["value"],
    belongingsInventoriedByTwoStaff: true,
    bagIdentifier: "",
    valuablesPresent: false,
    securityNotified: false,
    securityReceiptNumber: "",
    familyNotified: false,
    notes: "",
  });

  const note = (n: string) => (n.trim() ? { notes: n.trim() } : {});

  const buildPayload = (): Record<string, unknown> | null => {
    switch (cardId) {
      case BELONGINGS_INVENTORY_CARD_ID:
        return {
          documentedAt: toIsoFromLocalDatetime(inventory.documentedAt),
          patientAbleToParticipate: inventory.patientAbleToParticipate,
          clothingItems: inventory.clothingItems,
          personalItems: inventory.personalItems,
          assistiveDevices: inventory.assistiveDevices,
          medicationsBroughtFromHome: inventory.medicationsBroughtFromHome,
          ...(inventory.medicationsBroughtFromHome && inventory.medicationDescription.trim()
            ? { medicationDescription: inventory.medicationDescription.trim() }
            : {}),
          belongingsKeptWithPatient: inventory.belongingsKeptWithPatient,
          belongingsBagged: inventory.belongingsBagged,
          ...(inventory.belongingsBagged && inventory.bagIdentifier.trim()
            ? { bagIdentifier: inventory.bagIdentifier.trim() }
            : {}),
          ...note(inventory.notes),
        };
      case VALUABLES_INVENTORY_CARD_ID:
        return {
          documentedAt: toIsoFromLocalDatetime(valuables.documentedAt),
          cashPresent: valuables.cashPresent,
          ...(valuables.cashPresent && valuables.cashAmount.trim()
            ? { cashAmount: valuables.cashAmount.trim() }
            : {}),
          jewelryPresent: valuables.jewelryPresent,
          ...(valuables.jewelryPresent && valuables.jewelryDescription.trim()
            ? { jewelryDescription: valuables.jewelryDescription.trim() }
            : {}),
          electronicsPresent: valuables.electronicsPresent,
          ...(valuables.electronicsPresent && valuables.electronicsDescription.trim()
            ? { electronicsDescription: valuables.electronicsDescription.trim() }
            : {}),
          walletOrPursePresent: valuables.walletOrPursePresent,
          keysPresent: valuables.keysPresent,
          identificationPresent: valuables.identificationPresent,
          ...(valuables.otherValuablesDescription.trim()
            ? { otherValuablesDescription: valuables.otherValuablesDescription.trim() }
            : {}),
          patientDeclinedValuablesInventory: valuables.patientDeclinedValuablesInventory,
          valuablesSecured: valuables.valuablesSecured,
          ...(valuables.valuablesSecured && valuables.securityBagIdentifier.trim()
            ? { securityBagIdentifier: valuables.securityBagIdentifier.trim() }
            : {}),
          ...note(valuables.notes),
        };
      case BELONGINGS_SECURED_BAGGED_CARD_ID:
        if (!secured.bagIdentifier.trim()) return null;
        return {
          securedAt: toIsoFromLocalDatetime(secured.securedAt),
          bagIdentifier: secured.bagIdentifier.trim(),
          sealedByUserAcknowledged: secured.sealedByUserAcknowledged,
          patientLabelApplied: secured.patientLabelApplied,
          storageLocation: secured.storageLocation,
          ...(secured.storageLocation === "OTHER" && secured.storageLocationOther.trim()
            ? { storageLocationOther: secured.storageLocationOther.trim() }
            : {}),
          witnessRequired: secured.witnessRequired,
          ...note(secured.notes),
        };
      case BELONGINGS_TRANSFER_SECURITY_CARD_ID:
        if (!transfer.bagIdentifier.trim() || !transfer.receivedBySecurityName.trim()) return null;
        return {
          transferredAt: toIsoFromLocalDatetime(transfer.transferredAt),
          bagIdentifier: transfer.bagIdentifier.trim(),
          transferredByUserAcknowledged: transfer.transferredByUserAcknowledged,
          receivedBySecurityName: transfer.receivedBySecurityName.trim(),
          ...(transfer.securityReceiptNumber.trim()
            ? { securityReceiptNumber: transfer.securityReceiptNumber.trim() }
            : {}),
          storageLocation: transfer.storageLocation,
          ...note(transfer.notes),
        };
      case BELONGINGS_RELEASE_REPRESENTATIVE_CARD_ID:
        if (!release.bagIdentifier.trim() || !release.recipientName.trim()) return null;
        return {
          releasedAt: toIsoFromLocalDatetime(release.releasedAt),
          bagIdentifier: release.bagIdentifier.trim(),
          recipientName: release.recipientName.trim(),
          recipientRelationship: release.recipientRelationship,
          ...(release.recipientPhone.trim() ? { recipientPhone: release.recipientPhone.trim() } : {}),
          recipientIdChecked: release.recipientIdChecked,
          patientAuthorizedRelease: release.patientAuthorizedRelease,
          releaseReason: release.releaseReason,
          ...note(release.notes),
        };
      case BELONGINGS_RETURN_PATIENT_CARD_ID:
        if (!returnPatient.bagIdentifier.trim()) return null;
        return {
          returnedAt: toIsoFromLocalDatetime(returnPatient.returnedAt),
          bagIdentifier: returnPatient.bagIdentifier.trim(),
          patientReceived: returnPatient.patientReceived,
          patientUnableToSign: returnPatient.patientUnableToSign,
          discrepancyReported: returnPatient.discrepancyReported,
          ...(returnPatient.discrepancyReported && returnPatient.discrepancyDescription.trim()
            ? { discrepancyDescription: returnPatient.discrepancyDescription.trim() }
            : {}),
          ...note(returnPatient.notes),
        };
      case BELONGINGS_ALTERED_PATIENT_CARD_ID:
        if (!altered.bagIdentifier.trim()) return null;
        return {
          documentedAt: toIsoFromLocalDatetime(altered.documentedAt),
          patientCondition: altered.patientCondition,
          belongingsInventoriedByTwoStaff: altered.belongingsInventoriedByTwoStaff,
          bagIdentifier: altered.bagIdentifier.trim(),
          valuablesPresent: altered.valuablesPresent,
          securityNotified: altered.securityNotified,
          ...(altered.securityNotified && altered.securityReceiptNumber.trim()
            ? { securityReceiptNumber: altered.securityReceiptNumber.trim() }
            : {}),
          familyNotified: altered.familyNotified,
          ...note(altered.notes),
        };
      default:
        return null;
    }
  };

  const save = async () => {
    setValidationError(null);
    const payload = buildPayload();
    if (!payload) {
      setValidationError(t("clinicalDocumentation.forms.belongings.validationError"));
      return;
    }
    const validated = validateBelongingsValuablesPayloadForCard(cardId, payload);
    if (!validated.ok) {
      const sensitive = /card number|SSN|Bank account|Sensitive identifier/i.test(validated.message);
      setValidationError(
        sensitive
          ? t("clinicalDocumentation.forms.belongings.sensitiveDataError")
          : t("clinicalDocumentation.forms.belongings.validationError")
      );
      return;
    }
    await onSubmit(validated.data);
  };

  const draftPayload = buildPayload();
  const showWitnessNotice =
    draftPayload != null && requiresImmediateWitnessCaptureForPayload(cardId, draftPayload);

  const testId = useMemo(() => {
    if (cardId === BELONGINGS_INVENTORY_CARD_ID) return "clinical-documentation-belongings-inventory-form";
    if (cardId === VALUABLES_INVENTORY_CARD_ID) return "clinical-documentation-valuables-inventory-form";
    if (cardId === BELONGINGS_TRANSFER_SECURITY_CARD_ID)
      return "clinical-documentation-belongings-transfer-security-form";
    if (cardId === BELONGINGS_ALTERED_PATIENT_CARD_ID)
      return "clinical-documentation-belongings-altered-patient-form";
    return "clinical-documentation-belongings-form";
  }, [cardId]);

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

  const textField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    testId?: string
  ) => (
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

  const textAreaField = (label: string, value: string, onChange: (v: string) => void) => (
    <div style={{ gridColumn: "1 / -1" }}>
      <span style={labelStyle}>{label}</span>
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
      data-testid={testId}
      data-card-id={cardId}
      data-compact-layout="true"
      style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}
    >
      {showWitnessNotice ? (
        <p data-testid="clinical-documentation-belongings-witness-notice" style={noticeStyle}>
          {t("clinicalDocumentation.forms.belongings.chainOfCustodyWitnessNotice")}
        </p>
      ) : null}

      <div style={rowStyle}>
        {cardId === BELONGINGS_INVENTORY_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.belongings.documentedAt"),
              inventory.documentedAt,
              (v) => setInventory({ ...inventory, documentedAt: v }),
              "belongings-inventory-documented-at"
            )}
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.belongings.patientAbleToParticipate")}
              value={inventory.patientAbleToParticipate}
              locale={locale}
              onChange={(v) => setInventory({ ...inventory, patientAbleToParticipate: v })}
              testId="belongings-inventory-patient-participate"
            />
            <ItemListField
              label={t("clinicalDocumentation.forms.belongings.clothingItems")}
              items={inventory.clothingItems}
              onChange={(clothingItems) => setInventory({ ...inventory, clothingItems })}
              testIdPrefix="belongings-inventory-clothing"
            />
            <ItemListField
              label={t("clinicalDocumentation.forms.belongings.personalItems")}
              items={inventory.personalItems}
              onChange={(personalItems) => setInventory({ ...inventory, personalItems })}
              testIdPrefix="belongings-inventory-personal"
            />
            <ItemListField
              label={t("clinicalDocumentation.forms.belongings.assistiveDevices")}
              items={inventory.assistiveDevices}
              onChange={(assistiveDevices) => setInventory({ ...inventory, assistiveDevices })}
              testIdPrefix="belongings-inventory-devices"
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.belongings.medicationsBroughtFromHome")}
              value={inventory.medicationsBroughtFromHome}
              locale={locale}
              onChange={(v) => setInventory({ ...inventory, medicationsBroughtFromHome: v })}
            />
            {inventory.medicationsBroughtFromHome
              ? textField(
                  t("clinicalDocumentation.forms.belongings.medicationDescription"),
                  inventory.medicationDescription,
                  (v) => setInventory({ ...inventory, medicationDescription: v })
                )
              : null}
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.belongings.belongingsKeptWithPatient")}
              value={inventory.belongingsKeptWithPatient}
              locale={locale}
              onChange={(v) => setInventory({ ...inventory, belongingsKeptWithPatient: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.belongings.belongingsBagged")}
              value={inventory.belongingsBagged}
              locale={locale}
              onChange={(v) => setInventory({ ...inventory, belongingsBagged: v })}
              testId="belongings-inventory-bagged"
            />
            {inventory.belongingsBagged
              ? textField(
                  t("clinicalDocumentation.forms.belongings.bagIdentifier"),
                  inventory.bagIdentifier,
                  (v) => setInventory({ ...inventory, bagIdentifier: v }),
                  "belongings-inventory-bag-id"
                )
              : null}
            {textAreaField(t("clinicalDocumentation.forms.common.notes"), inventory.notes, (v) =>
              setInventory({ ...inventory, notes: v })
            )}
          </>
        ) : null}

        {cardId === VALUABLES_INVENTORY_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.belongings.documentedAt"),
              valuables.documentedAt,
              (v) => setValuables({ ...valuables, documentedAt: v })
            )}
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.belongings.cashPresent")}
              value={valuables.cashPresent}
              locale={locale}
              onChange={(v) => setValuables({ ...valuables, cashPresent: v })}
            />
            {valuables.cashPresent
              ? textField(
                  t("clinicalDocumentation.forms.belongings.cashAmount"),
                  valuables.cashAmount,
                  (v) => setValuables({ ...valuables, cashAmount: v }),
                  "valuables-cash-amount"
                )
              : null}
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.belongings.jewelryPresent")}
              value={valuables.jewelryPresent}
              locale={locale}
              onChange={(v) => setValuables({ ...valuables, jewelryPresent: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.belongings.electronicsPresent")}
              value={valuables.electronicsPresent}
              locale={locale}
              onChange={(v) => setValuables({ ...valuables, electronicsPresent: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.belongings.walletOrPursePresent")}
              value={valuables.walletOrPursePresent}
              locale={locale}
              onChange={(v) => setValuables({ ...valuables, walletOrPursePresent: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.belongings.keysPresent")}
              value={valuables.keysPresent}
              locale={locale}
              onChange={(v) => setValuables({ ...valuables, keysPresent: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.belongings.identificationPresent")}
              value={valuables.identificationPresent}
              locale={locale}
              onChange={(v) => setValuables({ ...valuables, identificationPresent: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.belongings.patientDeclinedValuablesInventory")}
              value={valuables.patientDeclinedValuablesInventory}
              locale={locale}
              onChange={(v) => setValuables({ ...valuables, patientDeclinedValuablesInventory: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.belongings.valuablesSecured")}
              value={valuables.valuablesSecured}
              locale={locale}
              onChange={(v) => setValuables({ ...valuables, valuablesSecured: v })}
              testId="valuables-secured"
            />
            {valuables.valuablesSecured
              ? textField(
                  t("clinicalDocumentation.forms.belongings.securityBagIdentifier"),
                  valuables.securityBagIdentifier,
                  (v) => setValuables({ ...valuables, securityBagIdentifier: v }),
                  "valuables-security-bag-id"
                )
              : null}
            {textAreaField(t("clinicalDocumentation.forms.common.notes"), valuables.notes, (v) =>
              setValuables({ ...valuables, notes: v })
            )}
          </>
        ) : null}

        {cardId === BELONGINGS_SECURED_BAGGED_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.belongings.securedAt"),
              secured.securedAt,
              (v) => setSecured({ ...secured, securedAt: v })
            )}
            {textField(
              t("clinicalDocumentation.forms.belongings.bagIdentifier"),
              secured.bagIdentifier,
              (v) => setSecured({ ...secured, bagIdentifier: v })
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.belongings.storageLocation")}
              value={secured.storageLocation}
              options={BELONGINGS_STORAGE_LOCATION_OPTIONS}
              locale={locale}
              onChange={(v) => setSecured({ ...secured, storageLocation: v })}
            />
            {secured.storageLocation === "OTHER"
              ? textField(
                  t("clinicalDocumentation.forms.belongings.storageLocationOther"),
                  secured.storageLocationOther,
                  (v) => setSecured({ ...secured, storageLocationOther: v })
                )
              : null}
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.belongings.sealedByUserAcknowledged")}
              value={secured.sealedByUserAcknowledged}
              locale={locale}
              onChange={(v) => setSecured({ ...secured, sealedByUserAcknowledged: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.belongings.patientLabelApplied")}
              value={secured.patientLabelApplied}
              locale={locale}
              onChange={(v) => setSecured({ ...secured, patientLabelApplied: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.belongings.witnessRequired")}
              value={secured.witnessRequired}
              locale={locale}
              onChange={(v) => setSecured({ ...secured, witnessRequired: v })}
              testId="belongings-secured-witness-required"
            />
            {textAreaField(t("clinicalDocumentation.forms.common.notes"), secured.notes, (v) =>
              setSecured({ ...secured, notes: v })
            )}
          </>
        ) : null}

        {cardId === BELONGINGS_TRANSFER_SECURITY_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.belongings.transferredAt"),
              transfer.transferredAt,
              (v) => setTransfer({ ...transfer, transferredAt: v })
            )}
            {textField(
              t("clinicalDocumentation.forms.belongings.bagIdentifier"),
              transfer.bagIdentifier,
              (v) => setTransfer({ ...transfer, bagIdentifier: v }),
              "belongings-transfer-bag-id"
            )}
            {textField(
              t("clinicalDocumentation.forms.belongings.receivedBySecurityName"),
              transfer.receivedBySecurityName,
              (v) => setTransfer({ ...transfer, receivedBySecurityName: v })
            )}
            {textField(
              t("clinicalDocumentation.forms.belongings.securityReceiptNumber"),
              transfer.securityReceiptNumber,
              (v) => setTransfer({ ...transfer, securityReceiptNumber: v })
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.belongings.storageLocation")}
              value={transfer.storageLocation}
              options={BELONGINGS_STORAGE_LOCATION_OPTIONS}
              locale={locale}
              onChange={(v) => setTransfer({ ...transfer, storageLocation: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.belongings.transferredByUserAcknowledged")}
              value={transfer.transferredByUserAcknowledged}
              locale={locale}
              onChange={(v) => setTransfer({ ...transfer, transferredByUserAcknowledged: v })}
            />
            {textAreaField(t("clinicalDocumentation.forms.common.notes"), transfer.notes, (v) =>
              setTransfer({ ...transfer, notes: v })
            )}
          </>
        ) : null}

        {cardId === BELONGINGS_RELEASE_REPRESENTATIVE_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.belongings.releasedAt"),
              release.releasedAt,
              (v) => setRelease({ ...release, releasedAt: v })
            )}
            {textField(
              t("clinicalDocumentation.forms.belongings.bagIdentifier"),
              release.bagIdentifier,
              (v) => setRelease({ ...release, bagIdentifier: v })
            )}
            {textField(
              t("clinicalDocumentation.forms.belongings.recipientName"),
              release.recipientName,
              (v) => setRelease({ ...release, recipientName: v })
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.belongings.recipientRelationship")}
              value={release.recipientRelationship}
              options={BELONGINGS_RECIPIENT_RELATIONSHIP_OPTIONS}
              locale={locale}
              onChange={(v) => setRelease({ ...release, recipientRelationship: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.belongings.recipientIdChecked")}
              value={release.recipientIdChecked}
              locale={locale}
              onChange={(v) => setRelease({ ...release, recipientIdChecked: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.belongings.patientAuthorizedRelease")}
              value={release.patientAuthorizedRelease}
              locale={locale}
              onChange={(v) => setRelease({ ...release, patientAuthorizedRelease: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.belongings.releaseReason")}
              value={release.releaseReason}
              options={BELONGINGS_RELEASE_REASON_OPTIONS}
              locale={locale}
              onChange={(v) => setRelease({ ...release, releaseReason: v })}
            />
            {textAreaField(t("clinicalDocumentation.forms.common.notes"), release.notes, (v) =>
              setRelease({ ...release, notes: v })
            )}
          </>
        ) : null}

        {cardId === BELONGINGS_RETURN_PATIENT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.belongings.returnedAt"),
              returnPatient.returnedAt,
              (v) => setReturnPatient({ ...returnPatient, returnedAt: v })
            )}
            {textField(
              t("clinicalDocumentation.forms.belongings.bagIdentifier"),
              returnPatient.bagIdentifier,
              (v) => setReturnPatient({ ...returnPatient, bagIdentifier: v })
            )}
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.belongings.patientReceived")}
              value={returnPatient.patientReceived}
              locale={locale}
              onChange={(v) => setReturnPatient({ ...returnPatient, patientReceived: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.belongings.patientUnableToSign")}
              value={returnPatient.patientUnableToSign}
              locale={locale}
              onChange={(v) => setReturnPatient({ ...returnPatient, patientUnableToSign: v })}
              testId="belongings-return-unable-sign"
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.belongings.discrepancyReported")}
              value={returnPatient.discrepancyReported}
              locale={locale}
              onChange={(v) => setReturnPatient({ ...returnPatient, discrepancyReported: v })}
              testId="belongings-return-discrepancy"
            />
            {returnPatient.discrepancyReported
              ? textField(
                  t("clinicalDocumentation.forms.belongings.discrepancyDescription"),
                  returnPatient.discrepancyDescription,
                  (v) => setReturnPatient({ ...returnPatient, discrepancyDescription: v })
                )
              : null}
            {textAreaField(t("clinicalDocumentation.forms.common.notes"), returnPatient.notes, (v) =>
              setReturnPatient({ ...returnPatient, notes: v })
            )}
          </>
        ) : null}

        {cardId === BELONGINGS_ALTERED_PATIENT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.belongings.documentedAt"),
              altered.documentedAt,
              (v) => setAltered({ ...altered, documentedAt: v })
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.belongings.patientCondition")}
              value={altered.patientCondition}
              options={BELONGINGS_ALTERED_CONDITION_OPTIONS}
              locale={locale}
              onChange={(v) => setAltered({ ...altered, patientCondition: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.belongings.belongingsInventoriedByTwoStaff")}
              value={altered.belongingsInventoriedByTwoStaff}
              locale={locale}
              onChange={(v) => setAltered({ ...altered, belongingsInventoriedByTwoStaff: v })}
              testId="belongings-altered-two-staff"
            />
            {textField(
              t("clinicalDocumentation.forms.belongings.bagIdentifier"),
              altered.bagIdentifier,
              (v) => setAltered({ ...altered, bagIdentifier: v }),
              "belongings-altered-bag-id"
            )}
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.belongings.valuablesPresent")}
              value={altered.valuablesPresent}
              locale={locale}
              onChange={(v) => setAltered({ ...altered, valuablesPresent: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.belongings.securityNotified")}
              value={altered.securityNotified}
              locale={locale}
              onChange={(v) => setAltered({ ...altered, securityNotified: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.belongings.familyNotified")}
              value={altered.familyNotified}
              locale={locale}
              onChange={(v) => setAltered({ ...altered, familyNotified: v })}
            />
            {textAreaField(t("clinicalDocumentation.forms.common.notes"), altered.notes, (v) =>
              setAltered({ ...altered, notes: v })
            )}
          </>
        ) : null}
      </div>

      {validationError ? (
        <p data-testid="clinical-documentation-belongings-validation-error" style={{ margin: 0, fontSize: 11, color: "#b91c1c" }}>
          {validationError}
        </p>
      ) : null}

      <button
        type="button"
        data-testid="clinical-documentation-belongings-save"
        disabled={saving}
        onClick={() => void save()}
        style={{
          alignSelf: "flex-start",
          padding: "8px 14px",
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 8,
          border: "none",
          background: "#0f766e",
          color: "#fff",
        }}
      >
        {saving ? t("clinicalDocumentation.saving") : t("clinicalDocumentation.saveEntry")}
      </button>
    </div>
  );
}

export function isEdoc9BelongingsValuablesFormCard(cardId: string): boolean {
  return (EDOC9_BELONGINGS_VALUABLES_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId);
}
