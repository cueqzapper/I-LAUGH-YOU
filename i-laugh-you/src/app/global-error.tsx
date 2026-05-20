"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", {
      message: error?.message,
      stack: error?.stack,
      digest: error?.digest,
      name: error?.name,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    });
  }, [error]);

  const message = error?.message || "Unknown error";
  const digest = error?.digest;

  return (
    <html>
      <body
        style={{
          margin: 0,
          padding: "24px",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          background: "#fafafa",
          color: "#222",
          minHeight: "100vh",
          boxSizing: "border-box",
        }}
      >
        <div style={{ maxWidth: 640, margin: "60px auto" }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ marginTop: 0, marginBottom: 16, color: "#555" }}>
            The page hit an unexpected error. Try reloading.
          </p>
          <button
            type="button"
            onClick={() => {
              try {
                reset();
              } catch {
                if (typeof window !== "undefined") window.location.reload();
              }
            }}
            style={{
              padding: "10px 18px",
              fontSize: 15,
              border: "none",
              borderRadius: 6,
              background: "#000",
              color: "#fff",
              cursor: "pointer",
              marginRight: 8,
            }}
          >
            Reload
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                try {
                  localStorage.clear();
                  sessionStorage.clear();
                } catch {}
                window.location.href = "/";
              }
            }}
            style={{
              padding: "10px 18px",
              fontSize: 15,
              border: "1px solid #ccc",
              borderRadius: 6,
              background: "#fff",
              color: "#222",
              cursor: "pointer",
            }}
          >
            Clear data &amp; reload
          </button>
          <details style={{ marginTop: 24, color: "#666", fontSize: 13 }}>
            <summary style={{ cursor: "pointer" }}>Error details</summary>
            <div style={{ marginTop: 8 }}>
              <div>
                <strong>Message:</strong> {message}
              </div>
              {digest && (
                <div>
                  <strong>Digest:</strong> {digest}
                </div>
              )}
              {error?.stack && (
                <pre
                  style={{
                    background: "#fff",
                    border: "1px solid #ddd",
                    padding: 8,
                    borderRadius: 4,
                    overflow: "auto",
                    fontSize: 12,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {error.stack}
                </pre>
              )}
            </div>
          </details>
        </div>
      </body>
    </html>
  );
}
