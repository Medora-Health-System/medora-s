"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import {
  fetchInventoryList,
  fetchCatalogMedications,
  createInventoryItem,
  type CatalogMedication,
  type InventoryItemRow,
} from "@/lib/pharmacyApi";
import { InventoryTable } from "@/components/pharmacy/InventoryTable";
import { PharmacyAlertsCard } from "@/components/pharmacy/PharmacyAlertsCard";
import { PharmacyInventoryToolbar } from "@/components/pharmacy/PharmacyInventoryToolbar";
import { PharmacyInventoryFilters } from "@/components/pharmacy/PharmacyInventoryFilters";
import { PharmacyFavorites } from "@/components/pharmacy/PharmacyFavorites";
import { QuickAddStockModal } from "@/components/pharmacy/QuickAddStockModal";
import { ReceiveStockModal } from "@/components/pharmacy/ReceiveStockModal";
import { AdjustStockModal } from "@/components/pharmacy/AdjustStockModal";
import { Modal, Field, inputStyle } from "@/components/pharmacy/Modal";
import { CommonSuspenseFallback } from "@/components/i18n/CommonSuspenseFallback";
import { useI18n } from "@/lib/i18n";

const btnPrimary: React.CSSProperties = {
  padding: "10px 18px",
  backgroundColor: "#1a1a1a",
  color: "white",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 14,
};

function PharmacyInventoryPageContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const openedFromQuery = React.useRef(false);
  const { facilityId, ready, canManagePharmacy, canViewPharmacy } =
    useFacilityAndRoles();
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [items, setItems] = useState<InventoryItemRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState<
    "quickAdd" | "create" | "receive" | "adjust" | null
  >(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quickAddInitialMed, setQuickAddInitialMed] = useState<Parameters<typeof QuickAddStockModal>[0]["initialMedication"]>(null);
  const [catalogs, setCatalogs] = useState<CatalogMedication[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    catalogMedicationId: "",
    sku: "",
    lotNumber: "",
    expirationDate: "",
    quantityOnHand: "0",
    reorderLevel: "0",
    unit: "",
  });

  const load = useCallback(async () => {
    if (!facilityId || !canViewPharmacy) return;
    setLoading(true);
    setError(null);
    try {
      const expirationBefore =
        expiringOnly
          ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
          : undefined;
      const res = await fetchInventoryList(facilityId, {
        medicationNameOrCode: search.trim() || undefined,
        activeOnly: activeOnly ? "true" : undefined,
        lowStockOnly: lowStockOnly ? "true" : undefined,
        expirationBefore,
        limit: "100",
      });
      setItems(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("common.loadError"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [facilityId, canViewPharmacy, search, activeOnly, lowStockOnly, expiringOnly, t]);

  useEffect(() => {
    if (ready && facilityId && canViewPharmacy) load();
  }, [ready, facilityId, canViewPharmacy, load]);

  const openQuickAdd = (initialMed?: Parameters<typeof QuickAddStockModal>[0]["initialMedication"]) => {
    setQuickAddInitialMed(initialMed ?? null);
    setModal("quickAdd");
  };

  const openCreate = async () => {
    setFormMsg(null);
    try {
      const c = await fetchCatalogMedications(facilityId);
      setCatalogs(c);
      setCreateForm((f) => ({
        ...f,
        catalogMedicationId: c[0]?.id ?? "",
      }));
      setModal("create");
    } catch (e: unknown) {
      setFormMsg(e instanceof Error ? e.message : t("common.loadError"));
      setModal("create");
      setCatalogs([]);
    }
  };

  const submitCreate = async () => {
    if (!facilityId) return;
    setSubmitting(true);
    setFormMsg(null);
    try {
      await createInventoryItem(facilityId, {
        catalogMedicationId: createForm.catalogMedicationId,
        sku: createForm.sku.trim(),
        lotNumber: createForm.lotNumber.trim() || undefined,
        expirationDate: createForm.expirationDate || undefined,
        quantityOnHand: parseInt(createForm.quantityOnHand, 10) || 0,
        reorderLevel: parseInt(createForm.reorderLevel, 10) || 0,
        unit: createForm.unit.trim() || undefined,
      });
      setModal(null);
      load();
    } catch (e: unknown) {
      setFormMsg(e instanceof Error ? e.message : t("pharmacyInventoryPage.createFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedItem = selectedId ? items.find((i) => i.id === selectedId) : null;

  const openReceive = (id: string) => {
    setSelectedId(id);
    setFormMsg(null);
    setModal("receive");
  };

  const openAdjust = (id: string) => {
    setSelectedId(id);
    setFormMsg(null);
    setModal("adjust");
  };

  useEffect(() => {
    if (!ready || !canManagePharmacy || openedFromQuery.current) return;
    const recv = searchParams.get("receive");
    const adj = searchParams.get("adjust");
    if (recv) {
      openedFromQuery.current = true;
      setSelectedId(recv);
      setFormMsg(null);
      setModal("receive");
      window.history.replaceState({}, "", "/app/pharmacy/inventory");
    } else if (adj) {
      openedFromQuery.current = true;
      setSelectedId(adj);
      setFormMsg(null);
      setModal("adjust");
      window.history.replaceState({}, "", "/app/pharmacy/inventory");
    }
  }, [ready, canManagePharmacy, searchParams]);

  if (!ready) return <p>{t("common.loading")}</p>;
  if (!canViewPharmacy) {
    return (
      <div>
        <h1>{t("pharmacyInventoryPage.title")}</h1>
        <p>{t("pharmacyInventoryPage.accessDenied")}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>{t("pharmacyInventoryPage.title")}</h1>
      {facilityId && canManagePharmacy && (
        <PharmacyAlertsCard facilityId={facilityId} onRefreshInventory={load} />
      )}

      <PharmacyInventoryToolbar
        onQuickAdd={() => openQuickAdd()}
        onRefresh={load}
        onAdvancedCreate={canManagePharmacy ? openCreate : undefined}
        canManage={!!canManagePharmacy}
      />

      <PharmacyInventoryFilters
        search={search}
        onSearchChange={setSearch}
        activeOnly={activeOnly}
        onActiveOnlyChange={setActiveOnly}
        lowStockOnly={lowStockOnly}
        onLowStockOnlyChange={setLowStockOnly}
        expiringOnly={expiringOnly}
        onExpiringOnlyChange={setExpiringOnly}
        onApply={load}
      />

      {facilityId && canManagePharmacy && (
        <PharmacyFavorites
          facilityId={facilityId}
          onAddToStock={(med) => openQuickAdd(med)}
          compact
        />
      )}

      {error && (
        <p style={{ color: "#b00020", marginBottom: 12 }}>{error}</p>
      )}
      {loading ? (
        <p>{t("common.loading")}</p>
      ) : (
        <>
          <p style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
            {total === 1 ? t("pharmacyInventoryPage.countOne") : `${total} ${t("pharmacyInventoryPage.countManyItems")}`}
          </p>
          <InventoryTable
            items={items}
            showActions={!!canManagePharmacy}
            onReceive={openReceive}
            onAdjust={openAdjust}
          />
        </>
      )}

      {modal === "quickAdd" && facilityId && (
        <QuickAddStockModal
          facilityId={facilityId}
          initialMedication={quickAddInitialMed}
          onClose={() => setModal(null)}
          onSuccess={() => load()}
        />
      )}

      {modal === "create" && (
        <Modal title={t("pharmacyInventoryPage.createItemTitle")} onClose={() => setModal(null)}>
          {formMsg && (
            <p style={{ color: "#b00020", marginBottom: 12 }}>{formMsg}</p>
          )}
          <Field label={t("pharmacyInventoryPage.fieldCatalogMedication")}>
            <select
              style={inputStyle}
              value={createForm.catalogMedicationId}
              onChange={(e) =>
                setCreateForm((f) => ({
                  ...f,
                  catalogMedicationId: e.target.value,
                }))
              }
            >
              {catalogs.length === 0 ? (
                <option value="">{t("pharmacyInventoryPage.noCatalogOption")}</option>
              ) : (
                catalogs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))
              )}
            </select>
          </Field>
          <Field label={t("pharmacyInventoryPage.fieldSku")}>
            <input
              style={inputStyle}
              value={createForm.sku}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, sku: e.target.value }))
              }
            />
          </Field>
          <Field label={t("pharmacyInventoryPage.fieldLot")}>
            <input
              style={inputStyle}
              value={createForm.lotNumber}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, lotNumber: e.target.value }))
              }
            />
          </Field>
          <Field label={t("pharmacyInventoryPage.fieldExpiration")}>
            <input
              type="date"
              style={inputStyle}
              value={createForm.expirationDate}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, expirationDate: e.target.value }))
              }
            />
          </Field>
          <Field label={t("pharmacyInventoryPage.fieldInitialQty")}>
            <input
              type="number"
              min={0}
              style={inputStyle}
              value={createForm.quantityOnHand}
              onChange={(e) =>
                setCreateForm((f) => ({
                  ...f,
                  quantityOnHand: e.target.value,
                }))
              }
            />
          </Field>
          <Field label={t("pharmacyInventoryPage.fieldReorder")}>
            <input
              type="number"
              min={0}
              style={inputStyle}
              value={createForm.reorderLevel}
              onChange={(e) =>
                setCreateForm((f) => ({
                  ...f,
                  reorderLevel: e.target.value,
                }))
              }
            />
          </Field>
          <Field label={t("pharmacyInventoryPage.fieldUnit")}>
            <input
              style={inputStyle}
              placeholder={t("pharmacyInventoryPage.unitPlaceholder")}
              value={createForm.unit}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, unit: e.target.value }))
              }
            />
          </Field>
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <button
              type="button"
              disabled={submitting || !createForm.sku.trim()}
              onClick={submitCreate}
              style={btnPrimary}
            >
              {submitting ? t("pharmacyInventoryPage.submitCreating") : t("pharmacyInventoryPage.submitCreate")}
            </button>
          </div>
        </Modal>
      )}

      {modal === "receive" && facilityId && selectedItem && (
        <ReceiveStockModal
          facilityId={facilityId}
          item={selectedItem}
          onClose={() => setModal(null)}
          onSuccess={() => load()}
        />
      )}

      {modal === "adjust" && facilityId && selectedItem && (
        <AdjustStockModal
          facilityId={facilityId}
          item={selectedItem}
          onClose={() => setModal(null)}
          onSuccess={() => load()}
        />
      )}
    </div>
  );
}

export default function PharmacyInventoryPage() {
  return (
    <Suspense fallback={<CommonSuspenseFallback padded />}>
      <PharmacyInventoryPageContent />
    </Suspense>
  );
}
