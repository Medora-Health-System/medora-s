"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";

interface Patient {
  id: string;
  mrn: string | null;
  firstName: string;
  lastName: string;
  dob: string | null;
  phone: string | null;
}

export default function PatientsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
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
    if (searchQuery.trim() || facilityId) {
      handleSearch();
    }
  }, [searchQuery, facilityId]);

  const handleSearch = async () => {
    if (!facilityId) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }
      const data = await apiFetch(`/api/patients/search?${params.toString()}`, {
        facilityId,
      });
      setPatients(data || []);
    } catch (error) {
      console.error("Search error:", error);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (patientId: string) => {
    router.push(`/app/patients/${patientId}`);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Patients</h1>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: "10px 20px",
            backgroundColor: "#1a1a1a",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          New Patient
        </button>
      </div>

      <div style={{ marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Search by name, MRN, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            maxWidth: 500,
            padding: 10,
            border: "1px solid #ddd",
            borderRadius: 4,
            fontSize: 16,
          }}
        />
      </div>

      {loading && <div style={{ padding: 20, textAlign: "center" }}>Loading...</div>}

      {!loading && patients.length === 0 && searchQuery && (
        <div style={{ padding: 20, textAlign: "center", color: "#666" }}>
          No patients found
        </div>
      )}

      {!loading && patients.length > 0 && (
        <div style={{ backgroundColor: "white", borderRadius: 8, overflow: "hidden", border: "1px solid #ddd" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>MRN</th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Name</th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>DOB</th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Phone</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr
                  key={patient.id}
                  onClick={() => handleRowClick(patient.id)}
                  style={{
                    cursor: "pointer",
                    borderBottom: "1px solid #eee",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f9f9f9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "white";
                  }}
                >
                  <td style={{ padding: 12 }}>{patient.mrn || "-"}</td>
                  <td style={{ padding: 12 }}>
                    {patient.firstName} {patient.lastName}
                  </td>
                  <td style={{ padding: 12 }}>{formatDate(patient.dob)}</td>
                  <td style={{ padding: 12 }}>{patient.phone || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <NewPatientModal
          facilityId={facilityId}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            handleSearch();
          }}
        />
      )}
    </div>
  );
}

function NewPatientModal({
  facilityId,
  onClose,
  onSuccess,
}: {
  facilityId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dob: "",
    phone: "",
    email: "",
    sexAtBirth: "",
    address: "",
    city: "",
    country: "",
    language: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId) {
      setError("Facility ID required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        ...formData,
      };
      if (formData.dob) {
        payload.dob = new Date(formData.dob).toISOString();
      }
      if (!formData.sexAtBirth) delete payload.sexAtBirth;
      // Remove empty strings
      Object.keys(payload).forEach((key) => {
        if (payload[key] === "") delete payload[key];
      });

      await apiFetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        facilityId,
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create patient");
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
        <h2 style={{ marginTop: 0 }}>New Patient</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
                First Name *
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
                Last Name *
              </label>
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

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
            />
          </div>

          {error && (
            <div style={{ padding: 12, backgroundColor: "#fee", color: "#c33", borderRadius: 4, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 20px",
                border: "1px solid #ddd",
                borderRadius: 4,
                cursor: "pointer",
                backgroundColor: "white",
              }}
            >
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
              {loading ? "Creating..." : "Create Patient"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
