"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { getOrderItemDisplayLabelFr } from "@/lib/orderItemDisplayFr";
import { ui } from "@/lib/uiLabels";

type AdminRow = {
  id: string;
  orderItemId: string | null;
  medicationLabelSnapshot?: string | null;
  administeredAt: string;
  notes: string | null;
  administeredBy: { id: string; firstName: string; lastName: string };
};

function formatDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MedicationAdministrationTab({
  encounterId,
  facilityId,
  encounterStatus,
}: {
  encounterId: string;
  facilityId: string;
  encounterStatus: string;
}) {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [medicationOptions, setMedicationOptions] = useState<{ id: string; label: string }[]>([]);
  const [orderItemId, setOrderItemId] = useState("");
  const [notes, setNotes] = useState("");
  const [administeredAt, setAdministeredAt] = useState(() => formatDatetimeLocalValue(new Date()));
  const [submitting, setSubmitting] = useState(false);

  const loadOrdersForDropdown = useCallback(async () => {
    try {
      const orders = await apiFetch(`/encounters/${encounterId}/orders`, { facilityId });
      const opts: { id: string; label: string }[] = [];
      if (Array.isArray(orders)) {
        for (const o of orders) {
          const items = (o as { items?: unknown[] }).items ?? [];
          for (const it of items) {
            const row = it as { id?: string; catalogItemType?: string };
            if (row.catalogItemType === "MEDICATION" && row.id) {
              opts.push({ id: row.id, label: getOrderItemDisplayLabelFr(it as Parameters<typeof getOrderItemDisplayLabelFr>[0]) });
            }
          }
        }
      }
      setMedicationOptions(opts);
    } catch {
      setMedicationOptions([]);
    }
  }, [encounterId, facilityId]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/encounters/${encounterId}/medication-administrations`, { facilityId });
      setRows(Array.isArray(data) ? (data as AdminRow[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [encounterId, facilityId]);

  useEffect(() => {
    void loadList();
    void loadOrdersForDropdown();
  }, [loadList, loadOrdersForDropdown]);

  const labelByOrderItemId = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of medicationOptions) {
      m.set(o.id, o.label);
    }
    return m;
  }, [medicationOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (encounterStatus !== "OPEN") return;
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        administeredAt: new Date(administeredAt).toISOString(),
      };
      const n = notes.trim();
      if (n) body.notes = n;
      if (orderItemId) body.orderItemId = orderItemId;
      await apiFetch(`/encounters/${encounterId}/medication-administrations`, {
        method: "POST",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setNotes("");
      setOrderItemId("");
      setAdministeredAt(formatDatetimeLocalValue(new Date()));
      await loadList();
      void loadOrdersForDropdown();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {error ? (
        <p style={{ color: "#c62828", fontSize: 14, marginTop: 0 }} role="alert">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={(ev) => void handleSubmit(ev)}
        style={{
          marginBottom: 24,
          padding: 16,
          backgroundColor: "#fafafa",
          borderRadius: 8,
          border: "1px solid #eee",
          maxWidth: 560,
        }}
      >
        <h3 style={{ margin: "0 0 12px 0", fontSize: 16 }}>Nouvelle administration</h3>
        {encounterStatus !== "OPEN" ? (
          <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#616161" }}>{ui.mar.closedHint}</p>
        ) : null}
        <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600 }}>
          {ui.mar.orderLineOptional}
        </label>
        <select
          value={orderItemId}
          onChange={(e) => setOrderItemId(e.target.value)}
          disabled={encounterStatus !== "OPEN" || submitting}
          style={{ width: "100%", padding: 8, marginBottom: 12, borderRadius: 4, border: "1px solid #ccc" }}
        >
          <option value="">—</option>
          {medicationOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600 }}>
          {ui.mar.datetimeLabel}
        </label>
        <input
          type="datetime-local"
          value={administeredAt}
          onChange={(e) => setAdministeredAt(e.target.value)}
          disabled={encounterStatus !== "OPEN" || submitting}
          style={{ width: "100%", padding: 8, marginBottom: 12, borderRadius: 4, border: "1px solid #ccc" }}
        />
        <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600 }}>
          {ui.mar.notesLabel}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          disabled={encounterStatus !== "OPEN" || submitting}
          style={{ width: "100%", padding: 8, marginBottom: 12, borderRadius: 4, border: "1px solid #ccc", resize: "vertical" }}
        />
        <button
          type="submit"
          disabled={encounterStatus !== "OPEN" || submitting}
          style={{
            padding: "8px 16px",
            backgroundColor: encounterStatus === "OPEN" ? "#1a1a1a" : "#9e9e9e",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: encounterStatus === "OPEN" && !submitting ? "pointer" : "not-allowed",
            fontSize: 14,
          }}
        >
          {submitting ? ui.common.loading : ui.mar.submit}
        </button>
      </form>

      <h3 style={{ margin: "0 0 12px 0", fontSize: 16 }}>Historique</h3>
      {loading ? (
        <p>{ui.common.loading}</p>
      ) : rows.length === 0 ? (
        <p style={{ color: "#666", fontSize: 14 }}>{ui.mar.empty}</p>
      ) : (
        <div style={{ overflowX: "auto", backgroundColor: "white", borderRadius: 8, border: "1px solid #eee" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd", backgroundColor: "#f5f5f5" }}>
                <th style={{ padding: 10, textAlign: "left", fontSize: 13 }}>{ui.common.medication}</th>
                <th style={{ padding: 10, textAlign: "left", fontSize: 13 }}>{ui.mar.columnWhen}</th>
                <th style={{ padding: 10, textAlign: "left", fontSize: 13 }}>{ui.mar.columnNurse}</th>
                <th style={{ padding: 10, textAlign: "left", fontSize: 13 }}>{ui.mar.columnNotes}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const medName =
                  row.medicationLabelSnapshot?.trim() ||
                  (row.orderItemId
                    ? labelByOrderItemId.get(row.orderItemId) ?? ui.common.dash
                    : ui.mar.noLinkedOrder);
                const nurse = `${row.administeredBy.firstName} ${row.administeredBy.lastName}`.trim() || ui.common.dash;
                return (
                  <tr key={row.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 10, fontSize: 14 }}>{medName}</td>
                    <td style={{ padding: 10, fontSize: 14 }}>
                      {new Date(row.administeredAt).toLocaleString("fr-FR")}
                    </td>
                    <td style={{ padding: 10, fontSize: 14 }}>{nurse}</td>
                    <td style={{ padding: 10, fontSize: 14, wordBreak: "break-word" }}>{row.notes?.trim() || ui.common.dash}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
