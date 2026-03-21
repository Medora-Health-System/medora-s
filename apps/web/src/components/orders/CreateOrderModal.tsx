"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { apiFetch, parseApiResponse } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import type { OrderCreateDto } from "@medora/shared";
import { SharedCatalogAutocomplete } from "@/components/catalog/SharedCatalogAutocomplete";
import { printRx } from "@/components/pharmacy/RxPrintLayout";
import { medicationSearchLabel } from "@/lib/pharmacyApi";
import type { CatalogSearchItem } from "@/lib/catalogSearchTypes";
import { OrderTypeTabs } from "./createOrderModal/OrderTypeTabs";
import { OrderPriorityField } from "./createOrderModal/OrderPriorityField";
import { SelectedLabItems } from "./createOrderModal/SelectedLabItems";
import { SelectedImagingItems } from "./createOrderModal/SelectedImagingItems";
import { SelectedMedicationItems } from "./createOrderModal/SelectedMedicationItems";
import { ManualOrderEntry } from "./createOrderModal/ManualOrderEntry";
import type { CreateOrderLineItem, OrderModalTab } from "./createOrderModal/types";
import { newOrderLineId } from "./createOrderModal/types";

function mapOrderCreateError(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  return normalizeUserFacingError(msg.trim() || null) || "Impossible de créer l'ordre.";
}

function catalogLineLabel(item: CatalogSearchItem): string {
  if (item.type === "MEDICATION") return medicationSearchLabel(item);
  const line = [item.displayNameFr, item.secondaryText].filter(Boolean).join(" · ");
  return line || item.code;
}

function buildPayload(
  type: OrderModalTab,
  priority: "ROUTINE" | "URGENT" | "STAT",
  notes: string,
  prescriberName: string,
  prescriberLicense: string,
  prescriberContact: string,
  items: CreateOrderLineItem[]
): OrderCreateDto {
  const rootNotes = notes.trim() || undefined;

  if (type === "LAB") {
    return {
      type: "LAB",
      priority,
      notes: rootNotes,
      items: items.map((it) =>
        it.isManual || !it.catalogItemId
          ? {
              catalogItemId: null,
              catalogItemType: "LAB_TEST" as const,
              manualLabel: (it.manualLabel ?? it._label).trim(),
              notes: it.notes?.trim() || undefined,
            }
          : {
              catalogItemId: it.catalogItemId,
              catalogItemType: "LAB_TEST" as const,
            }
      ),
    };
  }

  if (type === "IMAGING") {
    return {
      type: "IMAGING",
      priority,
      notes: rootNotes,
      items: items.map((it) =>
        it.isManual || !it.catalogItemId
          ? {
              catalogItemId: null,
              catalogItemType: "IMAGING_STUDY" as const,
              manualLabel: (it.manualLabel ?? it._label).trim(),
              manualSecondaryText: it.manualSecondaryText?.trim() || undefined,
              notes: it.notes?.trim() || undefined,
            }
          : {
              catalogItemId: it.catalogItemId,
              catalogItemType: "IMAGING_STUDY" as const,
            }
      ),
    };
  }

  return {
    type: "MEDICATION",
    priority,
    notes: rootNotes,
    prescriberName: prescriberName.trim(),
    prescriberLicense: prescriberLicense.trim() || undefined,
    prescriberContact: prescriberContact.trim() || undefined,
    items: items.map((it) =>
      it.isManual || !it.catalogItemId
        ? {
            catalogItemId: null,
            catalogItemType: "MEDICATION" as const,
            manualLabel: (it.manualLabel ?? it._label).trim(),
            quantity: it.quantity!,
            notes: it.notes?.trim() || undefined,
            strength: it.strength?.trim() || undefined,
            refillCount: it.refillCount != null && it.refillCount >= 0 ? it.refillCount : undefined,
            medicationFulfillmentIntent: it.medicationFulfillmentIntent ?? "PHARMACY_DISPENSE",
          }
        : {
            catalogItemId: it.catalogItemId,
            catalogItemType: "MEDICATION" as const,
            quantity: it.quantity!,
            notes: it.notes?.trim() || undefined,
            strength: it.strength?.trim() || undefined,
            refillCount: it.refillCount != null && it.refillCount >= 0 ? it.refillCount : undefined,
            medicationFulfillmentIntent: it.medicationFulfillmentIntent ?? "PHARMACY_DISPENSE",
          }
    ),
  };
}

export function CreateOrderModal({
  encounterId,
  facilityId,
  canPrescribe,
  encounter,
  initialOrderTab = "LAB",
  onClose,
  onSuccess,
}: {
  encounterId: string;
  facilityId: string;
  canPrescribe: boolean;
  encounter?: { patient?: { firstName?: string; lastName?: string; mrn?: string } };
  initialOrderTab?: OrderModalTab;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const firstTab: OrderModalTab =
    !canPrescribe && initialOrderTab === "MEDICATION" ? "LAB" : initialOrderTab;

  const [activeTab, setActiveTab] = useState<OrderModalTab>(firstTab);
  const [rxSuccess, setRxSuccess] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<{
    id: string;
    createdAt: string;
    prescriberName?: string;
    prescriberLicense?: string;
    prescriberContact?: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    type: firstTab,
    priority: "ROUTINE" as "ROUTINE" | "URGENT" | "STAT",
    notes: "",
    prescriberName: "",
    prescriberLicense: "",
    prescriberContact: "",
    items: [] as CreateOrderLineItem[],
  });

  const orderTypes: OrderModalTab[] = canPrescribe ? ["LAB", "IMAGING", "MEDICATION"] : ["LAB", "IMAGING"];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queuedSync, setQueuedSync] = useState(false);
  const prescriberPrefilled = useRef(false);

  /** Préremplir le prescripteur pour le flux ordonnance (médecin / admin connecté). */
  useEffect(() => {
    if (!canPrescribe || prescriberPrefilled.current) return;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? parseApiResponse(r) : Promise.resolve(null)))
      .then((me) => {
        const m = me && typeof me === "object" && !Array.isArray(me) ? (me as { fullName?: string }) : null;
        const name = typeof m?.fullName === "string" ? m.fullName.trim() : "";
        if (!name) return;
        prescriberPrefilled.current = true;
        setFormData((fd) => ({
          ...fd,
          prescriberName: fd.prescriberName.trim() ? fd.prescriberName : name,
        }));
      })
      .catch(() => {});
  }, [canPrescribe]);

  const changeTab = (tab: OrderModalTab) => {
    setActiveTab(tab);
    setFormData((fd) => ({ ...fd, type: tab, items: [] }));
    setError(null);
  };

  const catalogTypeForTab = (tab: OrderModalTab): "LAB_TEST" | "IMAGING_STUDY" | "MEDICATION" => {
    if (tab === "LAB") return "LAB_TEST";
    if (tab === "IMAGING") return "IMAGING_STUDY";
    return "MEDICATION";
  };

  const handleSelectItem = (item: CatalogSearchItem) => {
    const tab = activeTab;
    if (tab === "LAB" || tab === "IMAGING") {
      const catalogItemType = tab === "LAB" ? "LAB_TEST" : "IMAGING_STUDY";
      setFormData((fd) => {
        if (fd.items.some((x) => x.catalogItemId && x.catalogItemId === item.id)) return fd;
        return {
          ...fd,
          items: [
            ...fd.items,
            {
              _lineId: newOrderLineId(),
              isManual: false,
              catalogItemId: item.id,
              catalogItemType,
              _label: catalogLineLabel(item),
              _modality: item.metadata?.modality,
              _bodyRegion: item.metadata?.bodyRegion,
            },
          ],
        };
      });
      return;
    }

    setFormData((fd) => {
      if (fd.items.some((x) => x.catalogItemId && x.catalogItemId === item.id)) return fd;
      return {
        ...fd,
        items: [
          ...fd.items,
          {
            _lineId: newOrderLineId(),
            isManual: false,
            catalogItemId: item.id,
            catalogItemType: "MEDICATION",
            quantity: 30,
            notes: "",
            strength: item.metadata?.strength ?? undefined,
            _label: catalogLineLabel(item),
            _dosageForm: item.metadata?.dosageForm ?? undefined,
            _route: item.metadata?.route ?? undefined,
            refillCount: 0,
            medicationFulfillmentIntent: "PHARMACY_DISPENSE",
          },
        ],
      };
    });
  };

  const handleAddManualLine = (line: CreateOrderLineItem) => {
    setFormData((fd) => ({ ...fd, items: [...fd.items, line] }));
  };

  const removeItem = (idx: number) => {
    setFormData((fd) => ({ ...fd, items: fd.items.filter((_, i) => i !== idx) }));
  };

  const patchMedItem = (idx: number, patch: Partial<CreateOrderLineItem>) => {
    setFormData((fd) => {
      const next = [...fd.items];
      next[idx] = { ...next[idx], ...patch };
      return { ...fd, items: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      setError("Veuillez sélectionner au moins un élément");
      return;
    }

    if (formData.type === "MEDICATION") {
      if (!formData.prescriberName.trim()) {
        setError("Le prescripteur est requis");
        return;
      }
      const missingQty = formData.items.some((it) => it.quantity == null || it.quantity < 1);
      if (missingQty) {
        setError("La quantité est requise");
        return;
      }
    }

    setLoading(true);
    setError(null);

    const payload = buildPayload(
      formData.type,
      formData.priority,
      formData.notes,
      formData.prescriberName,
      formData.prescriberLicense,
      formData.prescriberContact,
      formData.items
    );

    try {
      const res = (await apiFetch(`/encounters/${encounterId}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        facilityId,
      })) as {
        id: string;
        createdAt: string;
        prescriberName?: string;
        prescriberLicense?: string;
        prescriberContact?: string;
      };

      if ((res as any)?.queued) {
        setQueuedSync(true);
        setOrderSuccess(true);
      } else if (formData.type === "MEDICATION") {
        setCreatedOrder(res);
        setRxSuccess(true);
      } else {
        setOrderSuccess(true);
      }
    } catch (err) {
      setError(mapOrderCreateError(err));
    } finally {
      setLoading(false);
    }
  };

  const title = orderSuccess
    ? "Ordre créé"
    : rxSuccess
      ? "Ordonnance"
      : activeTab === "MEDICATION"
        ? "Ordonnance"
        : "Créer un ordre";

  const searchPlaceholder =
    activeTab === "LAB"
      ? "Rechercher une analyse (2 caractères min.)"
      : activeTab === "IMAGING"
        ? "Rechercher un examen d'imagerie…"
        : "Rechercher un médicament…";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#fff",
          padding: "20px 22px",
          borderRadius: 6,
          maxWidth: 640,
          width: "92%",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: "0 0 14px", fontSize: 18, fontWeight: 700 }}>{title}</h2>

        {orderSuccess && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 14, color: "#444", margin: "0 0 16px", lineHeight: 1.5 }}>
              {queuedSync
                ? "Ordre enregistré localement. En attente de synchronisation."
                : "L&apos;ordre a été enregistré pour cette visite."}
            </p>
            <button
              type="button"
              onClick={() => {
                setOrderSuccess(false);
                setQueuedSync(false);
                onSuccess();
              }}
              style={{
                padding: "10px 18px",
                backgroundColor: "#1a1a1a",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Continuer
            </button>
          </div>
        )}

        {rxSuccess && createdOrder && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 15, color: "#1b5e20", margin: "0 0 16px" }}>Ordonnance envoyée à la pharmacie</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  const patient = encounter?.patient ?? {};
                  printRx({
                    order: {
                      createdAt: createdOrder.createdAt,
                      prescriberName: formData.prescriberName || createdOrder.prescriberName,
                      prescriberLicense: formData.prescriberLicense || createdOrder.prescriberLicense,
                      prescriberContact: formData.prescriberContact || createdOrder.prescriberContact,
                      items: formData.items.map((it) => ({
                        catalogItemId: it.catalogItemId,
                        manualLabel: it.isManual ? it.manualLabel ?? it._label : undefined,
                        strength: it.strength ?? null,
                        notes: it.notes ?? null,
                        quantity: it.quantity ?? null,
                        refillCount: it.refillCount ?? 0,
                        catalogMedication: {
                          displayNameFr: it._label ?? null,
                          name: it._label ?? undefined,
                          strength: it.strength ?? undefined,
                          dosageForm: it._dosageForm ?? undefined,
                          route: it._route ?? undefined,
                        },
                      })),
                    },
                    patient,
                  });
                }}
                style={{
                  padding: "10px 18px",
                  backgroundColor: "#1a1a1a",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Imprimer l&apos;ordonnance
              </button>
              <Link
                href="/app/pharmacy-worklist"
                style={{
                  padding: "10px 18px",
                  border: "1px solid #1a1a1a",
                  borderRadius: 4,
                  color: "#1a1a1a",
                  textDecoration: "none",
                  fontSize: 14,
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                Voir la file pharmacie
              </Link>
              <button
                type="button"
                onClick={() => {
                  setRxSuccess(false);
                  setCreatedOrder(null);
                  onSuccess();
                }}
                style={{
                  padding: "10px 18px",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  backgroundColor: "#f5f5f5",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Continuer
              </button>
            </div>
            <p style={{ marginTop: 14, fontSize: 13, color: "#666" }}>
              Date d&apos;envoi :{" "}
              {createdOrder.createdAt ? new Date(createdOrder.createdAt).toLocaleString("fr-FR") : "—"}
            </p>
          </div>
        )}

        {!rxSuccess && !orderSuccess && (
          <>
            <OrderTypeTabs orderTypes={orderTypes} activeTab={activeTab} onChange={changeTab} />

            <form onSubmit={handleSubmit}>
              <OrderPriorityField
                value={formData.priority}
                onChange={(priority) => setFormData((fd) => ({ ...fd, priority }))}
              />

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 12, color: "#333" }}>
                  Notes cliniques <span style={{ fontWeight: 400, color: "#888" }}>(optionnel)</span>
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((fd) => ({ ...fd, notes: e.target.value }))}
                  rows={2}
                  placeholder="Contexte, indication, précisions…"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid #ccc",
                    borderRadius: 4,
                    fontSize: 14,
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div
                style={{
                  border: "1px solid #e0e0e0",
                  borderRadius: 6,
                  padding: "12px 12px 4px",
                  marginBottom: 8,
                  backgroundColor: "#fafafa",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 8, textTransform: "uppercase" }}>
                  Recherche et ajout
                </div>
                <SharedCatalogAutocomplete
                  catalogType={catalogTypeForTab(activeTab)}
                  label=""
                  placeholder={searchPlaceholder}
                  facilityId={facilityId}
                  onSelect={handleSelectItem}
                  favoritesFirst={activeTab === "MEDICATION"}
                  minChars={activeTab === "MEDICATION" ? 2 : 2}
                />
                <ManualOrderEntry tab={activeTab} onAdd={handleAddManualLine} />
              </div>

              <div
                style={{
                  border: "1px solid #e8e8e8",
                  borderRadius: 6,
                  padding: "10px 12px 4px",
                  minHeight: 56,
                  marginBottom: 14,
                  backgroundColor: "#fff",
                }}
              >
                {activeTab === "LAB" && <SelectedLabItems items={formData.items} onRemove={removeItem} />}
                {activeTab === "IMAGING" && <SelectedImagingItems items={formData.items} onRemove={removeItem} />}
                {activeTab === "MEDICATION" && (
                  <SelectedMedicationItems items={formData.items} onPatch={patchMedItem} onRemove={removeItem} />
                )}
                {formData.items.length === 0 && (
                  <p style={{ margin: "8px 0 12px", fontSize: 13, color: "#999" }}>
                    Aucun élément — recherchez ci-dessus pour ajouter.
                  </p>
                )}
              </div>

              {activeTab === "MEDICATION" && (
                <div
                  style={{
                    marginBottom: 14,
                    paddingTop: 4,
                    borderTop: "1px solid #eee",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 10, textTransform: "uppercase" }}>
                    Prescription (prescripteur)
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 12 }}>Prescripteur</label>
                    <input
                      type="text"
                      value={formData.prescriberName}
                      onChange={(e) => setFormData((fd) => ({ ...fd, prescriberName: e.target.value }))}
                      placeholder="Nom du prescripteur"
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid #ccc", borderRadius: 4, fontSize: 14 }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 12 }}>
                        Numéro de licence
                      </label>
                      <input
                        type="text"
                        value={formData.prescriberLicense}
                        onChange={(e) => setFormData((fd) => ({ ...fd, prescriberLicense: e.target.value }))}
                        placeholder="Optionnel"
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #ccc", borderRadius: 4, fontSize: 14 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 12 }}>
                        Contact du prescripteur
                      </label>
                      <input
                        type="text"
                        value={formData.prescriberContact}
                        onChange={(e) => setFormData((fd) => ({ ...fd, prescriberContact: e.target.value }))}
                        placeholder="Téléphone ou courriel"
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #ccc", borderRadius: 4, fontSize: 14 }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div
                  style={{
                    padding: "10px 12px",
                    backgroundColor: "#ffebee",
                    color: "#b71c1c",
                    borderRadius: 4,
                    marginBottom: 12,
                    fontSize: 14,
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ padding: "10px 18px", border: "1px solid #ccc", borderRadius: 4, cursor: "pointer", fontSize: 14, background: "#fff" }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: "10px 18px",
                    backgroundColor: "#1a1a1a",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.65 : 1,
                    fontSize: 14,
                  }}
                >
                  {loading ? "Envoi…" : activeTab === "MEDICATION" ? "Envoyer à la pharmacie" : "Créer l'ordre"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
