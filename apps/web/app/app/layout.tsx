"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [activeFacility, setActiveFacility] = useState<string>("");
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    // Fetch user data
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.facilityRoles && data.facilityRoles.length > 0) {
          setUser(data);
          const facilityIds: string[] = Array.from(new Set(data.facilityRoles.map((fr: any) => String(fr.facilityId))));
          setFacilities(facilityIds);
          if (facilityIds.length > 0) {
            setActiveFacility(facilityIds[0]);
          }
        }
      })
      .catch((err) => console.error("Failed to fetch user:", err));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
    router.push("/login");
  };

  const navItems = [
    { href: "/app", label: "Dashboard" },
    { href: "/app/patients", label: "Patients" },
    { href: "/app/encounters", label: "Encounters" },
    { href: "/app/orders", label: "Orders" },
    { href: "/app/results", label: "Results" },
    { href: "/app/medications", label: "Medications" },
    { href: "/app/imaging", label: "Imaging" },
    { href: "/app/admin", label: "Admin" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Topbar */}
      <header
        style={{
          backgroundColor: "#1a1a1a",
          color: "white",
          padding: "12px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #333",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <h1 style={{ margin: 0, fontSize: 20 }}>Medora S</h1>
          {facilities.length > 0 && (
            <select
              value={activeFacility}
              onChange={(e) => setActiveFacility(e.target.value)}
              style={{
                backgroundColor: "#2a2a2a",
                color: "white",
                border: "1px solid #444",
                padding: "6px 12px",
                borderRadius: 4,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {facilities.map((facilityId) => (
                <option key={facilityId} value={facilityId}>
                  Facility {facilityId.slice(0, 8)}
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              backgroundColor: "transparent",
              border: "1px solid #444",
              color: "white",
              padding: "8px 16px",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {user?.fullName || "User"}
            <span>▼</span>
          </button>
          {showUserMenu && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: 8,
                backgroundColor: "#2a2a2a",
                border: "1px solid #444",
                borderRadius: 4,
                minWidth: 200,
                boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                zIndex: 1000,
              }}
            >
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #444" }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{user?.fullName || "User"}</div>
                <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                  {user?.username || ""}
                </div>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 16px",
                  backgroundColor: "transparent",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  fontSize: 14,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#333";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <div style={{ display: "flex", flex: 1 }}>
        {/* Sidebar */}
        <aside
          style={{
            width: 220,
            backgroundColor: "#2a2a2a",
            color: "white",
            padding: 24,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  color: "white",
                  textDecoration: "none",
                  padding: "10px 12px",
                  borderRadius: 4,
                  fontSize: 14,
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#333";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: 24, backgroundColor: "#f5f5f5" }}>{children}</main>
      </div>
    </div>
  );
}

