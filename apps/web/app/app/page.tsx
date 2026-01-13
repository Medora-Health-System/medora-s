"use client";

import React, { useState } from "react";
import { ROLE_CODES } from "@medora/shared";

export default function DashboardPage() {
  const [whoAmIData, setWhoAmIData] = useState<any>(null);
  const [whoAmILoading, setWhoAmILoading] = useState(false);
  const [whoAmIError, setWhoAmIError] = useState<string | null>(null);

  const handleWhoAmI = async () => {
    setWhoAmILoading(true);
    setWhoAmIError(null);
    setWhoAmIData(null);
    try {
      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Request failed" }));
        throw new Error(errorData.error || "Failed to fetch user data");
      }
      const data = await response.json();
      setWhoAmIData(data);
    } catch (error) {
      setWhoAmIError(error instanceof Error ? error.message : "Failed to fetch user data");
    } finally {
      setWhoAmILoading(false);
    }
  };

  return (
    <>
      <h1>Dashboard</h1>
      <p>Medora S web scaffold is running.</p>
      <p>Roles: {ROLE_CODES.join(", ")}</p>
      
      <div style={{ marginTop: 32, padding: 16, border: "1px solid #ddd", borderRadius: 4 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Auth Sanity Check</h2>
        <button
          onClick={handleWhoAmI}
          disabled={whoAmILoading}
          style={{
            padding: "8px 16px",
            backgroundColor: "#1a1a1a",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: whoAmILoading ? "not-allowed" : "pointer",
            opacity: whoAmILoading ? 0.6 : 1,
            fontSize: 14,
          }}
        >
          {whoAmILoading ? "Loading..." : "Who am I?"}
        </button>
        
        {whoAmIError && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              backgroundColor: "#fee",
              color: "#c33",
              borderRadius: 4,
              fontSize: 14,
            }}
          >
            Error: {whoAmIError}
          </div>
        )}
        
        {whoAmIData && (
          <pre
            style={{
              marginTop: 16,
              padding: 12,
              backgroundColor: "#f5f5f5",
              borderRadius: 4,
              fontSize: 12,
              overflow: "auto",
              maxHeight: 400,
            }}
          >
            {JSON.stringify(whoAmIData, null, 2)}
          </pre>
        )}
      </div>
    </>
  );
}

