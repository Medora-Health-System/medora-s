"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("summary");
  const [facilityId, setFacilityId] = useState<string>("");
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.facilityRoles && data.facilityRoles.length > 0) {
          setFacilityId(data.facilityRoles[0].facilityId);
        }
      });
  }, []);

  useEffect(() => {
    if (patientId && facilityId) {
      loadPatient();
    }
  }, [patientId, facilityId]);

  const loadPatient = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/patients/${patientId}`, { facilityId });
      setPatient(data);
    } catch (error) {
      console.error("Failed to load patient:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  if (!patient) {
    return <div style={{ padding: 24 }}>Patient not found</div>;
  }

  const tabs = [
    { id: "summary", label: "Summary" },
    { id: "encounters", label: "Encounters" },
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
                {patient.firstName} {patient.lastName}
              </h1>
              <div style={{ color: "#666", fontSize: 14 }}>
                <div>MRN: {patient.mrn || patient.globalMrn || "-"}</div>
                {patient.dob && <div>DOB: {formatDate(patient.dob)}</div>}
                {patient.phone && <div>Phone: {patient.phone}</div>}
                {patient.email && <div>Email: {patient.email}</div>}
                {patient.sexAtBirth && <div>Sex: {patient.sexAtBirth}</div>}
              </div>
            </div>
            <button
              onClick={() => setShowEditModal(true)}
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
              Edit Patient
            </button>
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
          {activeTab === "summary" && <SummaryTab patient={patient} />}
          {activeTab === "encounters" && <EncountersTab patientId={patientId} facilityId={facilityId} />}
          {activeTab === "notes" && <div>Notes coming soon</div>}
          {activeTab === "orders" && <div>Orders coming soon</div>}
          {activeTab === "results" && <div>Results coming soon</div>}
          {activeTab === "medications" && <div>Medications coming soon</div>}
          {activeTab === "imaging" && <div>Imaging coming soon</div>}
        </div>
      </div>

      {showEditModal && (
        <EditPatientModal
          patient={patient}
          facilityId={facilityId}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            loadPatient();
          }}
        />
      )}
    </div>
  );
}

function SummaryTab({ patient }: { patient: any }) {
  return (
    <div>
      <h3>Demographics</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <strong>First Name:</strong> {patient.firstName}
        </div>
        <div>
          <strong>Last Name:</strong> {patient.lastName}
        </div>
        {patient.dob && (
          <div>
            <strong>Date of Birth:</strong> {new Date(patient.dob).toLocaleDateString()}
          </div>
        )}
        {patient.sexAtBirth && (
          <div>
            <strong>Sex at Birth:</strong> {patient.sexAtBirth}
          </div>
        )}
        {patient.phone && (
          <div>
            <strong>Phone:</strong> {patient.phone}
          </div>
        )}
        {patient.email && (
          <div>
            <strong>Email:</strong> {patient.email}
          </div>
        )}
        {patient.address && (
          <div>
            <strong>Address:</strong> {patient.address}
          </div>
        )}
        {patient.city && (
          <div>
            <strong>City:</strong> {patient.city}
          </div>
        )}
        {patient.country && (
          <div>
            <strong>Country:</strong> {patient.country}
          </div>
        )}
      </div>
    </div>
  );
}

function EncountersTab({ patientId, facilityId }: { patientId: string; facilityId: string }) {
  const [encounters, setEncounters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (facilityId) {
      loadEncounters();
    }
  }, [patientId, facilityId]);

  const loadEncounters = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/patients/${patientId}/encounters`, { facilityId });
      setEncounters(data || []);
    } catch (error) {
      console.error("Failed to load encounters:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEncounterClick = (encounterId: string) => {
    window.location.href = `/app/encounters/${encounterId}`;
  };

  if (loading) return <div>Loading encounters...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Encounters</h3>
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
          Start Encounter
        </button>
      </div>

      {encounters.length === 0 ? (
        <div style={{ padding: 20, textAlign: "center", color: "#666" }}>
          No encounters found
        </div>
      ) : (
        <div style={{ border: "1px solid #ddd", borderRadius: 4, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <th style={{ padding: 12, textAlign: "left" }}>Type</th>
                <th style={{ padding: 12, textAlign: "left" }}>Status</th>
                <th style={{ padding: 12, textAlign: "left" }}>Date</th>
                <th style={{ padding: 12, textAlign: "left" }}>Provider</th>
              </tr>
            </thead>
            <tbody>
              {encounters.map((encounter) => (
                <tr
                  key={encounter.id}
                  onClick={() => handleEncounterClick(encounter.id)}
                  style={{ cursor: "pointer", borderTop: "1px solid #eee" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f9f9f9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "white";
                  }}
                >
                  <td style={{ padding: 12 }}>{encounter.type}</td>
                  <td style={{ padding: 12 }}>
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
                  </td>
                  <td style={{ padding: 12 }}>
                    {new Date(encounter.startAt).toLocaleString()}
                  </td>
                  <td style={{ padding: 12 }}>{encounter.providerId || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <CreateEncounterModal
          patientId={patientId}
          facilityId={facilityId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadEncounters();
          }}
        />
      )}
    </div>
  );
}

function CreateEncounterModal({
  patientId,
  facilityId,
  onClose,
  onSuccess,
}: {
  patientId: string;
  facilityId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    type: "OUTPATIENT",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiFetch(`/patients/${patientId}/encounters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        facilityId,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create encounter");
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
          maxWidth: 500,
          width: "90%",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>Start Encounter</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
              Type *
            </label>
            <select
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
            >
              <option value="OUTPATIENT">Outpatient</option>
              <option value="INPATIENT">Inpatient</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="URGENT_CARE">Urgent Care</option>
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
            />
          </div>

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
              {loading ? "Creating..." : "Start Encounter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditPatientModal({
  patient,
  facilityId,
  onClose,
  onSuccess,
}: {
  patient: any;
  facilityId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    firstName: patient.firstName || "",
    lastName: patient.lastName || "",
    dob: patient.dob ? new Date(patient.dob).toISOString().split("T")[0] : "",
    phone: patient.phone || "",
    email: patient.email || "",
    sexAtBirth: patient.sexAtBirth || "",
    address: patient.address || "",
    city: patient.city || "",
    country: patient.country || "",
    language: patient.language || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: any = { ...formData };
      if (payload.dob) {
        payload.dob = new Date(payload.dob).toISOString();
      }
      if (!payload.sexAtBirth) payload.sexAtBirth = null;
      if (!payload.phone) payload.phone = null;
      if (!payload.email) payload.email = null;

      await apiFetch(`/patients/${patient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        facilityId,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update patient");
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
          maxWidth: 600,
          width: "90%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>Edit Patient</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>First Name *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Last Name *</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>DOB</label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
              />
            </div>
          </div>

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
              {loading ? "Updating..." : "Update Patient"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

