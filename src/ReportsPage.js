import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { apiFetch } from "./api";

const FIELDS = [
  "frequency",
  "city",
  "lat",
  "lon",
  "type",
  "description",
  "radius_km",
];

function Diff({ original, proposed }) {
  return (
    <table className="diff-table">
      <thead>
        <tr>
          <th>Field</th>
          <th>Current</th>
          <th>Proposed</th>
        </tr>
      </thead>
      <tbody>
        {FIELDS.map((f) => {
          const changed = String(original?.[f]) !== String(proposed?.[f]);
          return (
            <tr key={f} className={changed ? "diff-changed" : ""}>
              <td>{f}</td>
              <td>{String(original?.[f] ?? "-")}</td>
              <td>{String(proposed?.[f] ?? "-")}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function EditBeforeApprove({ report, onCancel, onSubmit }) {
  const [values, setValues] = useState({
    frequency: report.proposedChanges?.frequency ?? "",
    city: report.proposedChanges?.city ?? "",
    lat: report.proposedChanges?.lat ?? "",
    lon: report.proposedChanges?.lon ?? "",
    type: report.proposedChanges?.type ?? "",
    description: report.proposedChanges?.description ?? "",
    radius_km: report.proposedChanges?.radius_km ?? 5,
  });

  return (
    <div className="form">
      <div className="form-grid">
        {FIELDS.map((f) => (
          <input
            key={f}
            placeholder={f}
            value={values[f]}
            onChange={(e) => setValues({ ...values, [f]: e.target.value })}
          />
        ))}
      </div>
      <div className="report-actions">
        <button className="save-btn" onClick={() => onSubmit(values)}>
          ✅ Save &amp; approve
        </button>
        <button className="cancel-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { role, getToken } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      const { reports } = await apiFetch("/api/reports?status=pending", { token });
      setReports(reports);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (id, decision, changes) => {
    try {
      const token = await getToken();
      await apiFetch(`/api/reports/${id}/resolve`, {
        method: "POST",
        token,
        body: changes ? { decision, changes } : { decision },
      });
      setEditingId(null);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  if (role !== "admin" && role !== "moderator") {
    return <div className="container">You need to be logged in as a moderator or admin to see this page.</div>;
  }

  return (
    <div className="container">
      <h2>🚩 Reports</h2>
      {loading && <p>Loading…</p>}
      {error && <p className="login-error">{error}</p>}
      {!loading && reports.length === 0 && <p>No pending reports. 🎉</p>}

      {reports.map((r) => (
        <div className="report-card" key={r.id}>
          <div className="report-header">
            <b>{r.action === "delete" ? "🗑️ Delete suggestion" : "✏️ Edit suggestion"}</b>
            <span className="report-meta">
              {r.originalSnapshot?.frequency} MHz · {r.originalSnapshot?.city}
            </span>
          </div>
          {r.note && <p className="report-note">“{r.note}”</p>}

          {r.action === "edit" && editingId !== r.id && (
            <Diff original={r.originalSnapshot} proposed={r.proposedChanges} />
          )}

          {editingId === r.id ? (
            <EditBeforeApprove
              report={r}
              onCancel={() => setEditingId(null)}
              onSubmit={(changes) => resolve(r.id, "modify_approve", changes)}
            />
          ) : (
            <div className="report-actions">
              <button className="vote-btn up" onClick={() => resolve(r.id, "approve")}>
                ✅ Approve
              </button>
              {r.action === "edit" && (
                <button className="save-btn" onClick={() => setEditingId(r.id)}>
                  ✏️ Edit &amp; approve
                </button>
              )}
              <button className="vote-btn down" onClick={() => resolve(r.id, "reject")}>
                ❌ Reject
              </button>
            </div>
          )}
          {r.action === "delete" && role !== "admin" && (
            <p className="report-note">Only an admin can approve a deletion.</p>
          )}
        </div>
      ))}
    </div>
  );
}
