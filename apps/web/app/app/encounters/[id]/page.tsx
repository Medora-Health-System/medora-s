"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";

export default function EncounterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const encounterId = params.id as string;
  const [encounter, setEncounter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("summary");
  const [facilityId, setFacilityId] = useState<string>("");

  useEffect(() => {
    // Get facility ID from cookie
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("medora_facility_id="))
      ?.split("=")[1];
    
    if (cookieValue) {
      setFacilityId(cookieValue);
    } else {
      // Fallback to fetching from user data
      fetch("/api/auth/me")
        .then((res) => res.json())
        .then((data) => {
          if (data.facilityRoles && data.facilityRoles.length > 0) {
            const firstFacility = data.facilityRoles[0].facilityId;
            setFacilityId(firstFacility);
            document.cookie = `medora_facility_id=${firstFacility}; path=/; max-age=${365 * 24 * 60 * 60}`;
          }
        });
    }
  }, []);

  useEffect(() => {
    if (encounterId && facilityId) {
      loadEncounter();
    }
  }, [encounterId, facilityId]);

  const loadEncounter = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/encounters/${encounterId}`, { facilityId });
      setEncounter(data);
    } catch (error) {
      console.error("Failed to load encounter:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseEncounter = async () => {
    if (!confirm("Close this encounter?")) return;
    try {
      await apiFetch(`/encounters/${encounterId}/close`, {
        method: "POST",
        facilityId,
      });
      loadEncounter();
    } catch (error) {
      alert("Failed to close encounter");
    }
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  if (!encounter) {
    return <div style={{ padding: 24 }}>Encounter not found</div>;
  }

  const tabs = [
    { id: "summary", label: "Summary" },
    { id: "triage", label: "Triage/Vitals" },
    { id: "notes", label: "Notes" },
    { id: "orders", label: "Orders" },
    { id: "results", label: "Results" },
    { id: "medications", label: "Medications" },
    { id: "imaging", label: "Imaging" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ backgroundColor: "white", padding: 24, borderRadius: 8, border: "1px solid #ddd" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
            <div>
              <h1 style={{ margin: "0 0 8px 0" }}>
                {encounter.patient.firstName} {encounter.patient.lastName}
              </h1>
              <div style={{ color: "#666", fontSize: 14 }}>
                <div>MRN: {encounter.patient.mrn || "-"}</div>
                <div>Type: {encounter.type}</div>
                <div>
                  Status:{" "}
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      backgroundColor: encounter.status === "OPEN" ? "#e3f2fd" : "#f5f5f5",
                      color: encounter.status === "OPEN" ? "#1976d2" : "#666",
                    }}
                  >
                    {encounter.status}
                  </span>
                </div>
                <div>Started: {new Date(encounter.createdAt).toLocaleString()}</div>
                {encounter.status === "CLOSED" && encounter.updatedAt && (
                  <div>Ended: {new Date(encounter.updatedAt).toLocaleString()}</div>
                )}
              </div>
            </div>
            {encounter.status === "OPEN" && (
              <button
                onClick={handleCloseEncounter}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#d32f2f",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Close Encounter
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: "white", borderRadius: 8, border: "1px solid #ddd" }}>
        <div style={{ display: "flex", borderBottom: "1px solid #ddd" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "12px 24px",
                border: "none",
                backgroundColor: activeTab === tab.id ? "#f5f5f5" : "transparent",
                borderBottom: activeTab === tab.id ? "2px solid #1a1a1a" : "2px solid transparent",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: activeTab === tab.id ? 600 : 400,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 24 }}>
          {activeTab === "summary" && <EncounterSummaryTab encounter={encounter} />}
          {activeTab === "triage" && <TriageVitalsTab encounter={encounter} facilityId={facilityId} onUpdate={loadEncounter} />}
          {activeTab === "notes" && <NotesTab encounter={encounter} facilityId={facilityId} onUpdate={loadEncounter} />}
          {activeTab === "orders" && <OrdersTab encounterId={encounterId} facilityId={facilityId} />}
          {activeTab === "results" && <div>Results coming soon</div>}
          {activeTab === "medications" && <div>Medications coming soon</div>}
          {activeTab === "imaging" && <div>Imaging coming soon</div>}
        </div>
      </div>
    </div>
  );
}

function EncounterSummaryTab({ encounter }: { encounter: any }) {
  return (
    <div>
      <h3>Encounter Details</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <strong>Type:</strong> {encounter.type}
        </div>
        <div>
          <strong>Status:</strong> {encounter.status}
        </div>
        <div>
          <strong>Started:</strong> {new Date(encounter.createdAt).toLocaleString()}
        </div>
        {encounter.status === "CLOSED" && encounter.updatedAt && (
          <div>
            <strong>Ended:</strong> {new Date(encounter.updatedAt).toLocaleString()}
          </div>
        )}
        {encounter.providerId && (
          <div>
            <strong>Provider:</strong> {encounter.providerId}
          </div>
        )}
        {encounter.chiefComplaint && (
          <div>
            <strong>Chief Complaint:</strong> {encounter.chiefComplaint}
          </div>
        )}
      </div>
      {encounter.notes && (
        <div style={{ marginTop: 16 }}>
          <strong>Notes:</strong>
          <div style={{ marginTop: 8, padding: 12, backgroundColor: "#f5f5f5", borderRadius: 4 }}>
            {encounter.notes}
          </div>
        </div>
      )}
    </div>
  );
}

function TriageVitalsTab({
  encounter,
  facilityId,
  onUpdate,
}: {
  encounter: any;
  facilityId: string;
  onUpdate: () => void;
}) {
  const vitals = (encounter.vitals as any) || {};
  const [formData, setFormData] = useState({
    chiefComplaint: encounter.chiefComplaint || "",
    triageAcuity: encounter.triageAcuity || "",
    tempC: vitals.tempC || "",
    hr: vitals.hr || "",
    rr: vitals.rr || "",
    bpSys: vitals.bpSys || "",
    bpDia: vitals.bpDia || "",
    spo2: vitals.spo2 || "",
    weightKg: vitals.weightKg || "",
    heightCm: vitals.heightCm || "",
  });
  const [saving, setSaving] = useState(false);
  const isReadOnly = encounter.status !== "OPEN";

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        chiefComplaint: formData.chiefComplaint || null,
        triageAcuity: formData.triageAcuity ? parseInt(formData.triageAcuity) : null,
        vitals: {
          tempC: formData.tempC ? parseFloat(formData.tempC) : null,
          hr: formData.hr ? parseInt(formData.hr) : null,
          rr: formData.rr ? parseInt(formData.rr) : null,
          bpSys: formData.bpSys ? parseInt(formData.bpSys) : null,
          bpDia: formData.bpDia ? parseInt(formData.bpDia) : null,
          spo2: formData.spo2 ? parseInt(formData.spo2) : null,
          weightKg: formData.weightKg ? parseFloat(formData.weightKg) : null,
          heightCm: formData.heightCm ? parseFloat(formData.heightCm) : null,
        },
      };
      // Remove null values
      Object.keys(payload.vitals).forEach((key) => {
        if (payload.vitals[key] === null) delete payload.vitals[key];
      });
      if (Object.keys(payload.vitals).length === 0) payload.vitals = null;

      await apiFetch(`/encounters/${encounter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        facilityId,
      });
      onUpdate();
      alert("Vitals saved");
    } catch (error) {
      alert("Failed to save vitals");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h3>Triage & Vitals</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Chief Complaint
          </label>
          <input
            type="text"
            value={formData.chiefComplaint}
            onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
            disabled={isReadOnly}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Triage Acuity (1-5)
          </label>
          <select
            value={formData.triageAcuity}
            onChange={(e) => setFormData({ ...formData, triageAcuity: e.target.value })}
            disabled={isReadOnly}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          >
            <option value="">Select...</option>
            <option value="1">1 - Resuscitation</option>
            <option value="2">2 - Emergent</option>
            <option value="3">3 - Urgent</option>
            <option value="4">4 - Less Urgent</option>
            <option value="5">5 - Non-Urgent</option>
          </select>
        </div>
      </div>

      <h4 style={{ marginTop: 24, marginBottom: 16 }}>Vital Signs</h4>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Temp (°C)</label>
          <input
            type="number"
            step="0.1"
            value={formData.tempC}
            onChange={(e) => setFormData({ ...formData, tempC: e.target.value })}
            disabled={isReadOnly}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Heart Rate (bpm)</label>
          <input
            type="number"
            value={formData.hr}
            onChange={(e) => setFormData({ ...formData, hr: e.target.value })}
            disabled={isReadOnly}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Respiratory Rate</label>
          <input
            type="number"
            value={formData.rr}
            onChange={(e) => setFormData({ ...formData, rr: e.target.value })}
            disabled={isReadOnly}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>BP Systolic</label>
          <input
            type="number"
            value={formData.bpSys}
            onChange={(e) => setFormData({ ...formData, bpSys: e.target.value })}
            disabled={isReadOnly}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>BP Diastolic</label>
          <input
            type="number"
            value={formData.bpDia}
            onChange={(e) => setFormData({ ...formData, bpDia: e.target.value })}
            disabled={isReadOnly}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>SpO2 (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={formData.spo2}
            onChange={(e) => setFormData({ ...formData, spo2: e.target.value })}
            disabled={isReadOnly}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Weight (kg)</label>
          <input
            type="number"
            step="0.1"
            value={formData.weightKg}
            onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
            disabled={isReadOnly}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Height (cm)</label>
          <input
            type="number"
            step="0.1"
            value={formData.heightCm}
            onChange={(e) => setFormData({ ...formData, heightCm: e.target.value })}
            disabled={isReadOnly}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
      </div>

      {!isReadOnly && (
        <div style={{ marginTop: 24 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "10px 20px",
              backgroundColor: "#1a1a1a",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving..." : "Save Vitals"}
          </button>
        </div>
      )}
      {isReadOnly && (
        <div style={{ marginTop: 16, padding: 12, backgroundColor: "#fff3cd", borderRadius: 4, color: "#856404" }}>
          Encounter is closed. Vitals are read-only.
        </div>
      )}
    </div>
  );
}

function NotesTab({
  encounter,
  facilityId,
  onUpdate,
}: {
  encounter: any;
  facilityId: string;
  onUpdate: () => void;
}) {
  const [notes, setNotes] = useState(encounter.notes || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch(`/encounters/${encounter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
        facilityId,
      });
      onUpdate();
      alert("Notes saved");
    } catch (error) {
      alert("Failed to save notes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h3>Encounter Notes</h3>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={10}
        style={{ width: "100%", padding: 12, border: "1px solid #ddd", borderRadius: 4, marginBottom: 16 }}
      />
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: "10px 20px",
          backgroundColor: "#1a1a1a",
          color: "white",
          border: "none",
          borderRadius: 4,
          cursor: saving ? "not-allowed" : "pointer",
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? "Saving..." : "Save Notes"}
      </button>
    </div>
  );
}

function OrdersTab({ encounterId, facilityId }: { encounterId: string; facilityId: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (facilityId) {
      loadOrders();
    }
  }, [encounterId, facilityId]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/encounters/${encounterId}/orders`, { facilityId });
      setOrders(data || []);
    } catch (error) {
      console.error("Failed to load orders:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading orders...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Orders</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: "8px 16px",
            backgroundColor: "#1a1a1a",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Create Order
        </button>
      </div>

      {orders.length === 0 ? (
        <div style={{ padding: 20, textAlign: "center", color: "#666" }}>
          No orders found
        </div>
      ) : (
        <div style={{ border: "1px solid #ddd", borderRadius: 4, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <th style={{ padding: 12, textAlign: "left" }}>Type</th>
                <th style={{ padding: 12, textAlign: "left" }}>Status</th>
                <th style={{ padding: 12, textAlign: "left" }}>Priority</th>
                <th style={{ padding: 12, textAlign: "left" }}>Items</th>
                <th style={{ padding: 12, textAlign: "left" }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: 12 }}>{order.type}</td>
                  <td style={{ padding: 12 }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 12,
                        backgroundColor:
                          order.status === "PENDING"
                            ? "#fff3cd"
                            : order.status === "COMPLETED"
                            ? "#d4edda"
                            : "#f5f5f5",
                        color:
                          order.status === "PENDING"
                            ? "#856404"
                            : order.status === "COMPLETED"
                            ? "#155724"
                            : "#666",
                      }}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>{order.priority}</td>
                  <td style={{ padding: 12 }}>{order.items?.length || 0}</td>
                  <td style={{ padding: 12 }}>{new Date(order.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <CreateOrderModal
          encounterId={encounterId}
          facilityId={facilityId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadOrders();
          }}
        />
      )}
    </div>
  );
}

function CreateOrderModal({
  encounterId,
  facilityId,
  onClose,
  onSuccess,
}: {
  encounterId: string;
  facilityId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"LAB" | "IMAGING" | "MEDICATION">("LAB");
  const [formData, setFormData] = useState({
    type: "LAB" as "LAB" | "IMAGING" | "MEDICATION",
    priority: "ROUTINE" as "ROUTINE" | "URGENT" | "STAT",
    notes: "",
    items: [] as Array<{ catalogItemId: string; catalogItemType: string; quantity?: number; notes?: string }>,
  });
  const [catalog, setCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load catalog based on active tab
    loadCatalog();
  }, [activeTab]);

  const loadCatalog = async () => {
    // For now, use mock data. In production, this would fetch from /catalog/lab-tests, etc.
    const mockCatalog = [
      { id: "1", code: "CBC", name: "Complete Blood Count" },
      { id: "2", code: "CMP", name: "Comprehensive Metabolic Panel" },
      { id: "3", code: "XRAY", name: "Chest X-Ray" },
      { id: "4", code: "CT", name: "CT Scan" },
      { id: "5", code: "ASPIRIN", name: "Aspirin 81mg" },
      { id: "6", code: "IBUPROFEN", name: "Ibuprofen 200mg" },
    ];
    setCatalog(mockCatalog);
  };

  const handleAddItem = (item: any) => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          catalogItemId: item.id,
          catalogItemType:
            activeTab === "LAB"
              ? "LAB_TEST"
              : activeTab === "IMAGING"
              ? "IMAGING_STUDY"
              : "MEDICATION",
        },
      ],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      setError("Please add at least one item");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiFetch(`/encounters/${encounterId}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        facilityId,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: 24,
          borderRadius: 8,
          maxWidth: 700,
          width: "90%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>Create Order</h2>

        <div style={{ display: "flex", gap: 8, marginBottom: 16, borderBottom: "1px solid #ddd" }}>
          {(["LAB", "IMAGING", "MEDICATION"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setFormData({ ...formData, type: tab });
              }}
              style={{
                padding: "8px 16px",
                border: "none",
                backgroundColor: activeTab === tab ? "#1a1a1a" : "transparent",
                color: activeTab === tab ? "white" : "#666",
                cursor: "pointer",
                borderBottom: activeTab === tab ? "2px solid #1a1a1a" : "2px solid transparent",
              }}
            >
              {tab === "LAB" ? "Labs" : tab === "IMAGING" ? "Imaging" : "Meds"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Priority</label>
            <select
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: e.target.value as "ROUTINE" | "URGENT" | "STAT" })
              }
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
            >
              <option value="ROUTINE">Routine</option>
              <option value="URGENT">Urgent</option>
              <option value="STAT">Stat</option>
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Search Catalog</label>
            <input
              type="text"
              placeholder={`Search ${activeTab.toLowerCase()}...`}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
            />
            <div style={{ marginTop: 8, maxHeight: 200, overflow: "auto", border: "1px solid #ddd", borderRadius: 4 }}>
              {catalog.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleAddItem(item)}
                  style={{
                    padding: 8,
                    cursor: "pointer",
                    borderBottom: "1px solid #eee",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f5f5f5";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "white";
                  }}
                >
                  {item.name} ({item.code})
                </div>
              ))}
            </div>
          </div>

          {formData.items.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <strong>Selected Items:</strong>
              <ul>
                {formData.items.map((item, idx) => (
                  <li key={idx}>{item.catalogItemId}</li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <div style={{ padding: 12, backgroundColor: "#fee", color: "#c33", borderRadius: 4, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{ padding: "10px 20px", border: "1px solid #ddd", borderRadius: 4, cursor: "pointer" }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 20px",
                backgroundColor: "#1a1a1a",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "Creating..." : "Create Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

