"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/apiClient";

export default function RegistrationPage() {
  const [facilityId, setFacilityId] = useState<string | null>(null);

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("medora_facility_id="))
      ?.split("=")[1];
    setFacilityId(cookieValue || null);
  }, []);

  return (
    <div>
      <h1>Registration</h1>
      <p>Patient registration and encounter creation for Front Desk staff.</p>
      <div style={{ marginTop: 24, padding: 16, backgroundColor: "white", borderRadius: 4 }}>
        <p>Use the Patients page to search and register new patients.</p>
        <p>Create encounters from the patient detail page.</p>
      </div>
    </div>
  );
}

