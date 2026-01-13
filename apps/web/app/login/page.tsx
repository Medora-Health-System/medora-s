"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Show "Invalid credentials" for 401, otherwise show the error message
        const errorMessage = response.status === 401 
          ? "Invalid credentials" 
          : (data.error || data.message || "Login failed");
        setError(errorMessage);
        setLoading(false);
        return;
      }

      // Success - redirect to /app
      router.push("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: 32,
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: 400,
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: 24, textAlign: "center" }}>
          Medora S
        </h1>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="username"
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 500,
              }}
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              placeholder="Email or username"
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #ddd",
                borderRadius: 4,
                fontSize: 16,
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 500,
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #ddd",
                borderRadius: 4,
                fontSize: 16,
                boxSizing: "border-box",
              }}
            />
          </div>
          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: 12,
                backgroundColor: "#fee",
                color: "#c33",
                borderRadius: 4,
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: 12,
              backgroundColor: "#1a1a1a",
              color: "white",
              border: "none",
              borderRadius: 4,
              fontSize: 16,
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

