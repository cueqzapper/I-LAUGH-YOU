"use client";

import { useState } from "react";

interface CredentialRow {
  image_id: number;
  admin_visible_password: string;
  issued_at: string;
  last_rotated_at: string;
  password_version: number;
  buyer_name: string | null;
  buyer_email: string | null;
  piece_slug: string | null;
}

interface AdminPasswordsSectionProps {
  credentials: CredentialRow[];
}

export default function AdminPasswordsSection({
  credentials: initialCredentials,
}: AdminPasswordsSectionProps) {
  const [credentials, setCredentials] = useState(initialCredentials);
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lastRotated = credentials.length > 0
    ? credentials.reduce((latest, c) =>
        c.last_rotated_at > latest ? c.last_rotated_at : latest,
      credentials[0].last_rotated_at)
    : null;

  async function handleRegenerate(imageId: number) {
    const confirmed = window.confirm(
      `Regenerate password for piece #${imageId}? The old password will stop working immediately.`
    );
    if (!confirmed) return;

    setRegeneratingId(imageId);
    setError(null);

    try {
      const response = await fetch("/api/admin/credentials/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to regenerate");
      }

      const data = await response.json();

      setCredentials((prev) =>
        prev.map((c) =>
          c.image_id === imageId
            ? {
                ...c,
                admin_visible_password: data.newPassword,
                last_rotated_at: data.lastRotatedAt,
                password_version: c.password_version + 1,
              }
            : c
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate password");
    } finally {
      setRegeneratingId(null);
    }
  }

  async function handleCopy(password: string, imageId: number) {
    try {
      await navigator.clipboard.writeText(password);
      setCopiedId(imageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback: select text in a temp input
      const input = document.createElement("input");
      input.value = password;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopiedId(imageId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  return (
    <>
      {/* Stats */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Credentials</div>
          <div className="admin-stat-value highlight">{credentials.length}</div>
          <div className="admin-stat-meta">active passwords</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Last Rotated</div>
          <div className="admin-stat-value" style={{ fontSize: "1.1rem" }}>
            {lastRotated ? new Date(lastRotated).toLocaleDateString() : "-"}
          </div>
          <div className="admin-stat-meta">
            {lastRotated ? new Date(lastRotated).toLocaleTimeString() : "no credentials"}
          </div>
        </div>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error" style={{ marginBottom: "1.5rem" }}>
          <span>&#x274C;</span>
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="admin-table-wrapper">
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Image ID</th>
                <th>Buyer</th>
                <th>Password</th>
                <th>Issued</th>
                <th>Last Rotated</th>
                <th>Version</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {credentials.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="admin-empty-state">
                      <div className="admin-empty-state-icon">&#x1F511;</div>
                      <div className="admin-empty-state-text">No credentials issued yet</div>
                    </div>
                  </td>
                </tr>
              ) : (
                credentials.map((cred) => {
                  const buyerLabel = cred.buyer_name
                    ? `${cred.buyer_name} (${cred.buyer_email ?? "no email"})`
                    : cred.buyer_email ?? "-";

                  const piecePath = cred.piece_slug ? `/piece/${cred.piece_slug}` : null;

                  return (
                    <tr key={cred.image_id}>
                      <td>
                        {piecePath ? (
                          <a
                            href={piecePath}
                            target="_blank"
                            rel="noreferrer"
                            className="admin-badge admin-badge-info"
                            style={{ textDecoration: "none" }}
                          >
                            #{cred.image_id}
                          </a>
                        ) : (
                          <span className="admin-badge admin-badge-info">#{cred.image_id}</span>
                        )}
                      </td>
                      <td>{buyerLabel}</td>
                      <td>
                        <div className="admin-password-cell">
                          <code className="admin-code-inline">
                            {cred.admin_visible_password}
                          </code>
                          <button
                            type="button"
                            className="admin-copy-btn"
                            title="Copy password"
                            onClick={() => handleCopy(cred.admin_visible_password, cred.image_id)}
                          >
                            {copiedId === cred.image_id ? "\u2713" : "\u2398"}
                          </button>
                        </div>
                      </td>
                      <td>{new Date(cred.issued_at).toLocaleDateString()}</td>
                      <td>{new Date(cred.last_rotated_at).toLocaleDateString()}</td>
                      <td>
                        <span className="admin-badge admin-badge-muted">v{cred.password_version}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admin-btn admin-btn-danger"
                          style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                          disabled={regeneratingId === cred.image_id}
                          onClick={() => handleRegenerate(cred.image_id)}
                        >
                          {regeneratingId === cred.image_id ? "Regenerating\u2026" : "Regenerate"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
