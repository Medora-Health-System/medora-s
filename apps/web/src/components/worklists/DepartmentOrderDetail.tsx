"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { getOrderItemStatusLabel } from "@/constants/orderStatusLabels";
import { getOrderPriorityLabelFr, getPathwayTypeLabelFr, ui } from "@/lib/uiLabels";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { printRx } from "@/components/pharmacy/RxPrintLayout";
import { getOrderItemDisplayLabelFr } from "@/lib/orderItemDisplayFr";
import { MEDORA_CHART_RESULT_UPDATED } from "@/lib/chartEvents";
import { ClinicalResultViewer } from "@/components/clinical/ClinicalResultViewer";
import { attachmentsFromResultDataAll, clinicalResultFromOrderItemLike } from "@/lib/clinicalResultNormalize";
import {
  collectResultUploadFiles,
  validateResultUploadPreflight,
  MAX_RAW_BYTES_PER_FILE,
  RESULT_UPLOAD_HINT_FR,
} from "@/lib/resultUploadLimits";

export type WorklistDeptKind = "lab" | "radiology" | "pharmacy";

type AttachmentMeta = { fileName?: string; mimeType?: string; dataBase64?: string };

/** Statuts où texte / fichiers peuvent être enregistrés (aligné backend + flux accusé → démarrage → examen). */
function statusAllowsSubstantiveResultEntry(itemStatus: string): boolean {
  return (
    itemStatus === "COMPLETED" ||
    itemStatus === "RESULTED" ||
    itemStatus === "VERIFIED" ||
    itemStatus === "IN_PROGRESS"
  );
}

/** Message affiché tant que la ligne n’est pas prête pour un résultat (texte / pièces). */
function getWorkflowBlockMessageFr(itemStatus: string): string | null {
  if (statusAllowsSubstantiveResultEntry(itemStatus)) return null;
  if (itemStatus === "ACKNOWLEDGED") {
    return "Démarrez l’examen avant d’ajouter un résultat (texte ou fichiers). Ensuite vous pouvez enregistrer pendant « En cours » ou après « Terminer ».";
  }
  if (itemStatus === "PLACED" || itemStatus === "PENDING" || itemStatus === "SIGNED") {
    return "Accusez réception, démarrez l’examen avant d’ajouter un résultat (texte ou fichiers). Ensuite vous pouvez enregistrer pendant « En cours » ou après « Terminer ».";
  }
  if (itemStatus === "CANCELLED" || itemStatus === "DRAFT") {
    return "Cette ligne ne permet pas la saisie de résultat avec ce statut.";
  }
  return "Complétez le flux (accusé réception, démarrage) avant d’ajouter un résultat (texte ou fichiers).";
}

function readFileAsAttachment(file: File): Promise<AttachmentMeta> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || "");
      const m = s.match(/^data:([^;]+);base64,(.+)$/);
      if (m) resolve({ fileName: file.name, mimeType: m[1], dataBase64: m[2] });
      else reject(new Error("Lecture du fichier impossible."));
    };
    r.onerror = () => reject(r.error ?? new Error("Lecture du fichier impossible."));
    r.readAsDataURL(file);
  });
}

export default function DepartmentOrderDetail({
  kind,
  orderId,
  listHref,
  facilityId,
}: {
  kind: WorklistDeptKind;
  orderId: string;
  listHref: string;
  facilityId: string | null;
}) {
  const searchParams = useSearchParams();
  const highlightLineId = searchParams.get("ligne") || "";

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dispenseItem, setDispenseItem] = useState<any>(null);
  const [dispenseQty, setDispenseQty] = useState("1");
  const [dispenseInstr, setDispenseInstr] = useState("");
  const [dispenseNotes, setDispenseNotes] = useState("");
  const [dispenseBusy, setDispenseBusy] = useState(false);

  const labels = useMemo(() => {
    if (kind === "lab") {
      return {
        title: "Détail commande laboratoire",
        resultLabel: "Résultat / interprétation",
        resultPlaceholder: "Saisir le résultat ou l’interprétation…",
        submitResult: "Ajouter un résultat",
        showCritical: true,
      };
    }
    if (kind === "radiology") {
      return {
        title: "Détail examen d’imagerie",
        resultLabel: "Compte rendu / interprétation",
        resultPlaceholder: "Saisir le compte rendu…",
        submitResult: "Ajouter un compte rendu",
        showCritical: false,
      };
    }
    return {
      title: "Détail ordonnance pharmacie",
      resultLabel: "",
      resultPlaceholder: "",
      submitResult: "",
      showCritical: false,
    };
  }, [kind]);

  const load = useCallback(async () => {
    if (!facilityId || !orderId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/orders/${orderId}`, { facilityId });
      setOrder(asApiObject(data));
    } catch (e: unknown) {
      setOrder(null);
      setError(normalizeUserFacingError(e instanceof Error ? e.message : null) || "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [facilityId, orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!highlightLineId || !order?.items?.length) return;
    const el = document.getElementById(`ligne-${highlightLineId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [highlightLineId, order]);

  const filterItems = (items: any[]) => {
    if (!items) return [];
    if (kind === "lab") return items.filter((i: any) => i.catalogItemType === "LAB_TEST");
    if (kind === "radiology") return items.filter((i: any) => i.catalogItemType === "IMAGING_STUDY");
    return items.filter((i: any) => i.catalogItemType === "MEDICATION");
  };

  const handleAck = async (itemId: string) => {
    if (!facilityId) return;
    await apiFetch(`/orders/items/${itemId}/acknowledge`, { method: "POST", facilityId });
    await load();
  };

  const handleStart = async (itemId: string) => {
    if (!facilityId) return;
    await apiFetch(`/orders/items/${itemId}/start`, { method: "POST", facilityId });
    await load();
  };

  const handleComplete = async (itemId: string) => {
    if (!facilityId) return;
    await apiFetch(`/orders/items/${itemId}/complete`, { method: "POST", facilityId });
    await load();
  };

  const openDispense = (item: any) => {
    setDispenseItem(item);
    setDispenseQty(String(item.quantity ?? 1));
    setDispenseInstr(((item.notes as string) || "").trim());
    setDispenseNotes("");
  };

  const submitDispense = async () => {
    if (!facilityId || !dispenseItem) return;
    const q = parseInt(dispenseQty, 10);
    if (!Number.isFinite(q) || q < 1) {
      alert("Quantité invalide");
      return;
    }
    setDispenseBusy(true);
    try {
      await apiFetch("/pharmacy/dispenses/record-order", {
        method: "POST",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderItemId: dispenseItem.id,
          quantityDispensed: q,
          dosageInstructions: dispenseInstr.trim() || undefined,
          notes: dispenseNotes.trim() || undefined,
        }),
      });
      setDispenseItem(null);
      await load();
    } catch {
      alert("Impossible d’enregistrer la dispensation");
    } finally {
      setDispenseBusy(false);
    }
  };

  if (!facilityId) {
    return <p style={{ padding: 24 }}>Établissement requis.</p>;
  }

  if (loading && !order) {
    return <p style={{ padding: 24 }}>{ui.common.loading}</p>;
  }

  if (error || !order) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: "#c62828" }}>{error || "Commande introuvable."}</p>
        <Link href={listHref} style={{ color: "#1565c0" }}>
          {ui.common.back} vers la liste
        </Link>
      </div>
    );
  }

  const patient = order.encounter?.patient;
  const items = filterItems(order.items || []);

  const typeMismatch =
    (kind === "lab" && order.type !== "LAB") ||
    (kind === "radiology" && order.type !== "IMAGING") ||
    (kind === "pharmacy" && order.type !== "MEDICATION");

  return (
    <div style={{ maxWidth: 920, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <Link href={listHref} style={{ fontSize: 14, color: "#1565c0" }}>
          ← Retour à la liste
        </Link>
      </div>
      <h1 style={{ marginTop: 0 }}>{labels.title}</h1>

      {typeMismatch ? (
        <p style={{ color: "#c62828" }}>
          Cette commande ne correspond pas à ce module. Utilisez la bonne file ou vérifiez le lien.
        </p>
      ) : null}

      <section
        style={{
          background: "#fff",
          border: "1px solid #e0e0e0",
          borderRadius: 8,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Patient et prescription</h2>
        <div style={{ fontSize: 14, lineHeight: 1.6 }}>
          <div>
            <strong>Patient :</strong> {patient ? `${patient.firstName} ${patient.lastName}` : "—"}
          </div>
          <div>
            <strong>NIR :</strong> {patient?.mrn ?? "—"}
          </div>
          <div>
            <strong>Consultation :</strong>{" "}
            {order.encounterId ? (
              <Link href={`/app/encounters/${order.encounterId}`} style={{ color: "#1565c0" }}>
                Ouvrir la consultation
              </Link>
            ) : (
              "—"
            )}
          </div>
          <div>
            <strong>Priorité :</strong> {getOrderPriorityLabelFr(order.priority)}
            {order.pathwaySession ? (
              <span style={{ marginLeft: 8, fontSize: 12, color: "#1976d2" }}>
                {getPathwayTypeLabelFr(order.pathwaySession.type)}
              </span>
            ) : null}
          </div>
          <div>
            <strong>Prescripteur :</strong> {(order.prescriberName as string) || "—"}
          </div>
          <div>
            <strong>Contact prescripteur :</strong> {(order.prescriberContact as string) || "—"}
          </div>
          <div>
            <strong>Date de la commande :</strong>{" "}
            {order.createdAt ? new Date(order.createdAt).toLocaleString("fr-FR") : "—"}
          </div>
          {order.notes ? (
            <div style={{ marginTop: 8 }}>
              <strong>Notes :</strong> {order.notes}
            </div>
          ) : null}
        </div>
      </section>

      {items.length === 0 ? (
        <p>Aucune ligne à afficher pour cette commande.</p>
      ) : (
        items.map((item: any) => (
          <LineCard
            key={item.id}
            item={item}
            kind={kind}
            highlight={highlightLineId === item.id}
            labels={labels}
            facilityId={facilityId}
            order={order}
            onReload={load}
            onAck={handleAck}
            onStart={handleStart}
            onComplete={handleComplete}
            onOpenDispense={kind === "pharmacy" ? openDispense : undefined}
          />
        ))
      )}

      {kind === "pharmacy" && (
        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            onClick={() =>
              printRx({
                order: {
                  createdAt: order.createdAt,
                  prescriberName: order.prescriberName,
                  prescriberLicense: order.prescriberLicense,
                  prescriberContact: order.prescriberContact,
                  items: order.items || [],
                },
                patient: patient ?? {},
              })
            }
            style={{ padding: "8px 14px", cursor: "pointer" }}
          >
            Imprimer l’ordonnance
          </button>
        </div>
      )}

      {dispenseItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3000,
            padding: 16,
          }}
          onClick={() => !dispenseBusy && setDispenseItem(null)}
          role="presentation"
        >
          <div
            style={{ background: "#fff", borderRadius: 8, padding: 24, maxWidth: 480, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Enregistrer la dispensation</h2>
            <p style={{ fontSize: 14 }}>
              <strong>{getOrderItemDisplayLabelFr(dispenseItem)}</strong> — Qté prescrite : {dispenseItem.quantity ?? "—"}
            </p>
            <label style={{ display: "block", marginTop: 12, fontSize: 13 }}>
              Quantité délivrée
              <input
                type="number"
                min={1}
                value={dispenseQty}
                onChange={(e) => setDispenseQty(e.target.value)}
                style={{ display: "block", marginTop: 4, padding: 8, width: "100%", boxSizing: "border-box" }}
              />
            </label>
            <label style={{ display: "block", marginTop: 12, fontSize: 13 }}>
              Posologie (rappel)
              <textarea
                value={dispenseInstr}
                onChange={(e) => setDispenseInstr(e.target.value)}
                rows={2}
                style={{ display: "block", marginTop: 4, padding: 8, width: "100%", boxSizing: "border-box" }}
              />
            </label>
            <label style={{ display: "block", marginTop: 12, fontSize: 13 }}>
              Notes pharmacie
              <textarea
                value={dispenseNotes}
                onChange={(e) => setDispenseNotes(e.target.value)}
                rows={2}
                style={{ display: "block", marginTop: 4, padding: 8, width: "100%", boxSizing: "border-box" }}
              />
            </label>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button type="button" disabled={dispenseBusy} onClick={() => setDispenseItem(null)}>
                Annuler
              </button>
              <button type="button" disabled={dispenseBusy} onClick={() => void submitDispense()}>
                {dispenseBusy ? "…" : "Valider"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LineCard({
  item,
  kind,
  highlight,
  labels,
  facilityId,
  order,
  onReload,
  onAck,
  onStart,
  onComplete,
  onOpenDispense,
}: {
  item: any;
  kind: WorklistDeptKind;
  highlight: boolean;
  labels: {
    title: string;
    resultLabel: string;
    resultPlaceholder: string;
    submitResult: string;
    showCritical: boolean;
  };
  facilityId: string;
  order: any;
  onReload: () => Promise<void>;
  onAck: (id: string) => Promise<void>;
  onStart: (id: string) => Promise<void>;
  onComplete: (id: string) => Promise<void>;
  onOpenDispense?: (item: any) => void;
}) {
  const [resultText, setResultText] = useState(item.result?.resultText ?? "");
  const [critical, setCritical] = useState(!!item.result?.criticalValue);
  const [saving, setSaving] = useState(false);
  const [pdfFiles, setPdfFiles] = useState<FileList | null>(null);
  const [imgFiles, setImgFiles] = useState<FileList | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    setResultText(item.result?.resultText ?? "");
    setCritical(!!item.result?.criticalValue);
  }, [item.id, item.result?.resultText, item.result?.criticalValue]);

  const canResult = kind === "lab" || kind === "radiology";
  const existingAtt = attachmentsFromResultDataAll(item.result?.resultData).filter(
    (a) => a.dataBase64 && String(a.dataBase64).length > 0
  );

  const statusAllowsSubstantiveResult = statusAllowsSubstantiveResultEntry(item.status);
  const workflowBlockMessage = canResult ? getWorkflowBlockMessageFr(item.status) : null;

  const criticalChanged = critical !== !!item.result?.criticalValue;
  const hasNewFiles = (pdfFiles?.length ?? 0) > 0 || (imgFiles?.length ?? 0) > 0;
  const hasText = resultText.trim().length > 0;
  const hasPayloadForSubmit =
    kind === "lab"
      ? hasText || hasNewFiles || criticalChanged
      : hasText || hasNewFiles;

  const substantiveBlocked = (hasText || hasNewFiles) && !statusAllowsSubstantiveResult;

  const workflowButtons = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
      {(item.status === "PLACED" || item.status === "PENDING" || item.status === "SIGNED") && (
        <button type="button" onClick={() => onAck(item.id)} style={{ padding: "6px 10px", cursor: "pointer" }}>
          Accuser réception
        </button>
      )}
      {item.status === "ACKNOWLEDGED" && (
        <button type="button" onClick={() => onStart(item.id)} style={{ padding: "6px 10px", cursor: "pointer" }}>
          Démarrer
        </button>
      )}
      {item.status === "IN_PROGRESS" && (
        <button type="button" onClick={() => onComplete(item.id)} style={{ padding: "6px 10px", cursor: "pointer" }}>
          Terminer
        </button>
      )}
      {kind === "pharmacy" && onOpenDispense && (
        <>
          <button type="button" onClick={() => onOpenDispense(item)} style={{ padding: "6px 10px", cursor: "pointer" }}>
            Enregistrer dispensation
          </button>
          {order.encounter?.patient?.id ? (
            <Link
              href={`/app/pharmacy/dispense?patientId=${order.encounter.patient.id}&encounterId=${order.encounterId}`}
              style={{ fontSize: 14, alignSelf: "center" }}
            >
              Ouvrir l’écran de dispensation
            </Link>
          ) : null}
        </>
      )}
    </div>
  );

  const submitResult = async () => {
    if (!facilityId) return;
    setFeedback(null);

    if (!hasPayloadForSubmit) {
      setFeedback({
        type: "err",
        text:
          kind === "lab"
            ? "Saisissez un texte de résultat, joignez un fichier ou modifiez la valeur critique pour enregistrer."
            : "Saisissez un compte rendu ou joignez au moins un fichier (PDF ou image).",
      });
      return;
    }

    if (substantiveBlocked) {
      setFeedback({
        type: "err",
        text:
          getWorkflowBlockMessageFr(item.status) ||
          "Pour enregistrer un texte ou des fichiers, complétez d’abord le flux (accusé réception, démarrage).",
      });
      return;
    }

    const newFiles = collectResultUploadFiles(pdfFiles, imgFiles);
    const preflight = validateResultUploadPreflight({
      resultText,
      existingResultData: item.result?.resultData,
      newFiles,
    });
    if (!preflight.ok) {
      setFeedback({ type: "err", text: preflight.messageFr });
      return;
    }

    setSaving(true);
    try {
      const newAttachments: AttachmentMeta[] = [];
      const collect = async (list: FileList | null) => {
        if (!list?.length) return;
        for (let i = 0; i < list.length; i++) {
          const f = list[i];
          newAttachments.push(await readFileAsAttachment(f));
        }
      };
      await collect(pdfFiles);
      await collect(imgFiles);

      const body: Record<string, unknown> = {
        resultText: resultText.trim() || undefined,
      };
      if (labels.showCritical) body.criticalValue = critical;
      if (newAttachments.length > 0) body.resultData = { attachments: newAttachments };

      const res = await apiFetch(`/orders/${item.id}/result`, {
        method: "PUT",
        facilityId,
        body: JSON.stringify(body),
      });
      if (res && typeof res === "object" && (res as { queued?: boolean }).queued === true) {
        setPdfFiles(null);
        setImgFiles(null);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(MEDORA_CHART_RESULT_UPDATED, {
              detail: { patientId: order.encounter?.patient?.id, encounterId: order.encounterId },
            })
          );
        }
        setFeedback({
          type: "ok",
          text:
            "Résultat enregistré localement. En attente de synchronisation — visible sur cet appareil (dossier patient, onglet Résultats) jusqu’à l’envoi au serveur.",
        });
        return;
      }

      setPdfFiles(null);
      setImgFiles(null);
      await onReload();
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(MEDORA_CHART_RESULT_UPDATED, {
            detail: { patientId: order.encounter?.patient?.id, encounterId: order.encounterId },
          })
        );
      }
      setFeedback({
        type: "ok",
        text: "Résultat enregistré. La commande et le dossier patient (onglet Résultats, timeline) sont à jour.",
      });
    } catch (e: unknown) {
      const msg = normalizeUserFacingError(e instanceof Error ? e.message : null);
      setFeedback({
        type: "err",
        text: msg || "Enregistrement impossible. Vérifiez le statut de la ligne, la taille des fichiers et réessayez.",
      });
    } finally {
      setSaving(false);
    }
  };

  const modalityLine =
    kind === "radiology" && item.catalogImagingStudy
      ? [item.catalogImagingStudy.modality, item.catalogImagingStudy.bodyRegion].filter(Boolean).join(" · ")
      : null;

  return (
    <section
      id={`ligne-${item.id}`}
      style={{
        background: "#fff",
        border: highlight ? "2px solid #1565c0" : "1px solid #e0e0e0",
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <h3 style={{ marginTop: 0, fontSize: 15 }}>
        {getOrderItemDisplayLabelFr(item)}{" "}
        <span style={{ fontWeight: 400, color: "#666", fontSize: 13 }}>({getOrderItemStatusLabel(item.status)})</span>
      </h3>
      {kind === "radiology" && modalityLine ? (
        <div style={{ fontSize: 13, color: "#546e7a", marginBottom: 8 }}>Modalité / région : {modalityLine}</div>
      ) : null}
      {kind === "pharmacy" ? (
        <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 8 }}>
          <div>
            <strong>Dosage :</strong> {item.strength ?? item.catalogMedication?.strength ?? "—"}
          </div>
          <div>
            <strong>Posologie (ligne) :</strong> {(item.notes as string) || "—"}
          </div>
          <div>
            <strong>Quantité :</strong> {item.quantity ?? "—"} · <strong>Renouvellements :</strong> {item.refillCount ?? 0}
          </div>
        </div>
      ) : null}
      {item.notes && kind !== "pharmacy" ? (
        <div style={{ fontSize: 13, marginBottom: 8 }}>
          <strong>Note ligne :</strong> {item.notes}
        </div>
      ) : null}

      {workflowButtons}

      {item.result &&
      (item.result.resultText?.trim() ||
        existingAtt.length > 0 ||
        attachmentsFromResultDataAll(item.result.resultData).length > 0) ? (
        <div style={{ marginTop: 14 }}>
          {(() => {
            const v = clinicalResultFromOrderItemLike({
              displayLabelFr: getOrderItemDisplayLabelFr(item),
              status: item.status,
              catalogItemType: item.catalogItemType,
              result: item.result,
            });
            return (
              <ClinicalResultViewer
                compact
                title={v.title}
                itemStatus={v.itemStatus}
                verifiedAt={v.verifiedAt}
                criticalValue={v.criticalValue}
                resultText={v.resultText}
                attachments={v.attachments}
                enteredByDisplayFr={v.enteredByDisplayFr}
                catalogItemType={v.catalogItemType}
              />
            );
          })()}
        </div>
      ) : null}

      {canResult ? (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #eee" }}>
          {workflowBlockMessage ? (
            <div
              id={`workflow-result-hint-${item.id}`}
              role="status"
              style={{
                marginBottom: 12,
                padding: "10px 12px",
                background: "#fff8e1",
                border: "1px solid #ffcc80",
                borderRadius: 8,
                fontSize: 13,
                color: "#5d4037",
                lineHeight: 1.45,
              }}
            >
              <strong>Étape requise :</strong> {workflowBlockMessage}
            </div>
          ) : null}
          {feedback ? (
            <div
              role={feedback.type === "err" ? "alert" : "status"}
              style={{
                marginBottom: 12,
                padding: "10px 12px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                background: feedback.type === "ok" ? "#e8f5e9" : "#ffebee",
                color: feedback.type === "ok" ? "#1b5e20" : "#b71c1c",
                border: `1px solid ${feedback.type === "ok" ? "#a5d6a7" : "#ffcdd2"}`,
              }}
            >
              {feedback.text}
            </div>
          ) : null}
          <label style={{ display: "block", fontSize: 13, fontWeight: 600 }}>
            {labels.resultLabel}
            <textarea
              value={resultText}
              onChange={(e) => setResultText(e.target.value)}
              rows={4}
              placeholder={labels.resultPlaceholder}
              style={{ display: "block", marginTop: 6, width: "100%", boxSizing: "border-box", padding: 8 }}
            />
          </label>
          {labels.showCritical ? (
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 13 }}>
              <input type="checkbox" checked={critical} onChange={(e) => setCritical(e.target.checked)} />
              Valeur critique signalée
            </label>
          ) : null}
          <div style={{ marginTop: 10, fontSize: 13 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Téléverser un PDF</div>
            <input
              type="file"
              accept="application/pdf,.pdf"
              multiple
              onChange={(e) => setPdfFiles(e.target.files)}
            />
          </div>
          <div style={{ marginTop: 10, fontSize: 13 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Téléverser une image</div>
            <input type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg" multiple onChange={(e) => setImgFiles(e.target.files)} />
          </div>
          <button
            type="button"
            disabled={saving}
            aria-describedby={workflowBlockMessage ? `workflow-result-hint-${item.id}` : undefined}
            onClick={() => void submitResult()}
            style={{
              marginTop: 12,
              padding: "8px 14px",
              cursor: saving ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            {saving ? "Enregistrement…" : labels.submitResult}
          </button>
          <p style={{ fontSize: 12, color: "#757575", marginTop: 8 }}>
            {RESULT_UPLOAD_HINT_FR} Les fichiers sont ajoutés aux pièces existantes. La date et l’auteur de saisie sont
            enregistrées automatiquement.
          </p>
        </div>
      ) : null}
    </section>
  );
}
