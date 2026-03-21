"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/apiClient";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { getOrderItemStatusLabel } from "@/constants/orderStatusLabels";
import { getOrderPriorityLabelFr, getPathwayTypeLabelFr, ui } from "@/lib/uiLabels";
import { getOrderItemDisplayLabelFr } from "@/lib/orderItemDisplayFr";
import { worklistItemIsTerminal, worklistItemNeedsAcknowledge } from "@/lib/worklistLabRadUi";

export default function LabWorklistPage() {
  const { facilityId: facilityIdFromHook, ready } = useFacilityAndRoles();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("medora_facility_id="))
      ?.split("=")[1];
    setFacilityId(cookieValue || facilityIdFromHook || null);
  }, [facilityIdFromHook]);

  useEffect(() => {
    if (!ready || !facilityId) return;
    loadQueue();
    const interval = setInterval(loadQueue, 10000);
    return () => clearInterval(interval);
  }, [ready, facilityId]);

  const loadQueue = async () => {
    if (!facilityId) return;
    setLoading(true);
    try {
      const data = await apiFetch("/worklists/lab", { facilityId });
      setQueue(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load lab worklist:", error);
      setQueue([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (itemId: string) => {
    if (!facilityId) return;
    try {
      await apiFetch(`/orders/items/${itemId}/acknowledge`, {
        method: "POST",
        facilityId,
      });
      loadQueue();
    } catch (error) {
      alert("Impossible d'acquitter");
    }
  };

  const handleStart = async (itemId: string) => {
    if (!facilityId) return;
    try {
      await apiFetch(`/orders/items/${itemId}/start`, {
        method: "POST",
        facilityId,
      });
      loadQueue();
    } catch (error) {
      alert("Impossible de démarrer");
    }
  };

  const handleComplete = async (itemId: string) => {
    if (!facilityId) return;
    try {
      await apiFetch(`/orders/items/${itemId}/complete`, {
        method: "POST",
        facilityId,
      });
      loadQueue();
    } catch (error) {
      alert("Impossible de terminer");
    }
  };

  return (
    <div>
      <h1>Liste laboratoire</h1>
      <p>Ordres de laboratoire à traiter.</p>
      {loading && queue.length === 0 ? (
        <p>{ui.common.loading}</p>
      ) : queue.length === 0 ? (
        <div style={{ marginTop: 24, padding: 16, backgroundColor: "white", borderRadius: 4 }}>
          <p>Aucun ordre labo dans la liste.</p>
        </div>
      ) : (
        <div style={{ marginTop: 24 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.patient}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.nir}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.test}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.priority}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.status}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(queue) ? queue : []).map((order) =>
                (Array.isArray(order.items) ? order.items : []).map((item: any) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 12 }}>
                      {order.encounter?.patient?.firstName} {order.encounter?.patient?.lastName}
                    </td>
                    <td style={{ padding: 12 }}>{order.encounter?.patient?.mrn}</td>
                    <td style={{ padding: 12 }}>{getOrderItemDisplayLabelFr(item)}</td>
                    <td style={{ padding: 12 }}>
                      {getOrderPriorityLabelFr(order.priority)}
                      {order.pathwaySession && (
                        <span
                          style={{
                            marginLeft: 8,
                            padding: "2px 6px",
                            backgroundColor: "#e3f2fd",
                            color: "#1976d2",
                            borderRadius: 3,
                            fontSize: 11,
                          }}
                        >
                          {getPathwayTypeLabelFr(order.pathwaySession.type)}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: 12 }}>{getOrderItemStatusLabel(item.status)}</td>
                    <td style={{ padding: 12 }}>
                      {worklistItemIsTerminal(item.status) ? (
                        <Link
                          href={`/app/lab-worklist/commande/${order.id}?ligne=${item.id}`}
                          style={{
                            display: "inline-block",
                            padding: "6px 12px",
                            background: "#1a1a1a",
                            color: "#fff",
                            borderRadius: 4,
                            textDecoration: "none",
                            fontSize: 13,
                          }}
                        >
                          {ui.common.view}
                        </Link>
                      ) : (
                        <>
                          {worklistItemNeedsAcknowledge(item.status) && (
                            <button
                              type="button"
                              onClick={() => void handleAcknowledge(item.id)}
                              style={{ marginRight: 8, padding: "4px 8px", cursor: "pointer" }}
                            >
                              {ui.lab.acknowledge}
                            </button>
                          )}
                          {item.status === "ACKNOWLEDGED" && (
                            <button
                              type="button"
                              onClick={() => void handleStart(item.id)}
                              style={{ marginRight: 8, padding: "4px 8px", cursor: "pointer" }}
                            >
                              {ui.lab.start}
                            </button>
                          )}
                          {item.status === "IN_PROGRESS" && (
                            <button
                              type="button"
                              onClick={() => void handleComplete(item.id)}
                              style={{ marginRight: 8, padding: "4px 8px", cursor: "pointer" }}
                            >
                              {ui.lab.complete}
                            </button>
                          )}
                          <Link href={`/app/lab-worklist/commande/${order.id}?ligne=${item.id}`} style={{ marginLeft: 4, fontSize: 13 }}>
                            {ui.common.view}
                          </Link>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

