import React, { useCallback, useEffect, useMemo, useState } from "react";
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

function formatTimestamp(ms) {
  if (!ms) return "-";
  const d = new Date(Number(ms));
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}.${pad(
    d.getMonth() + 1
  )}.${String(d.getFullYear()).slice(-2)}`;
}

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

const STATUS_BADGE = {
  pending: { label: "⏳ Pending", className: "status-pending" },
  approved: { label: "✅ Approved", className: "status-approved" },
  rejected: { label: "❌ Rejected", className: "status-rejected" },
};

function ReportCard({ r, children }) {
  return (
    <div className="report-card">
      <div className="report-header">
        <b>{r.action === "delete" ? "🗑️ Delete suggestion" : "✏️ Edit suggestion"}</b>
        <span className="report-meta">
          {r.originalSnapshot?.frequency} MHz · {r.originalSnapshot?.city}
        </span>
      </div>
      {r.note && <p className="report-note">“{r.note}”</p>}
      {children}
    </div>
  );
}

function PendingTab({ role, getToken, reload, reports, loading, error }) {
  const [editingId, setEditingId] = useState(null);

  const resolve = async (id, decision, changes) => {
    try {
      const token = await getToken();
      await apiFetch(`/api/reports/${id}/resolve`, {
        method: "POST",
        token,
        body: changes ? { decision, changes } : { decision },
      });
      setEditingId(null);
      reload();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <>
      {loading && <p>Loading…</p>}
      {error && <p className="login-error">{error}</p>}
      {!loading && reports.length === 0 && <p>No pending reports. 🎉</p>}

      {reports.map((r) => (
        <ReportCard r={r} key={r.id}>
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
        </ReportCard>
      ))}
    </>
  );
}

function HistoryTab({ reports, loading, error }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [resolvedByFilter, setResolvedByFilter] = useState("");

  const filtered = useMemo(
    () =>
      reports.filter((r) => {
        if (statusFilter !== "all" && r.status !== statusFilter) return false;
        if (actionFilter !== "all" && r.action !== actionFilter) return false;
        if (
          resolvedByFilter &&
          !(r.resolvedBy || "").toLowerCase().includes(resolvedByFilter.toLowerCase())
        )
          return false;
        return true;
      }),
    [reports, statusFilter, actionFilter, resolvedByFilter]
  );

  return (
    <>
      <div className="filters-box" style={{ marginBottom: 14 }}>
        <div className="filters-box-header">
          <div className="filters-label">Filters</div>
        </div>
        <div className="history-filters-row">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="all">Edit + delete</option>
            <option value="edit">Edit suggestions</option>
            <option value="delete">Delete suggestions</option>
          </select>
          <input
            placeholder="Resolved by (email)"
            value={resolvedByFilter}
            onChange={(e) => setResolvedByFilter(e.target.value)}
          />
        </div>
      </div>

      {loading && <p>Loading…</p>}
      {error && <p className="login-error">{error}</p>}
      <p className="results-row">
        {filtered.length} {filtered.length === 1 ? "report" : "reports"}
      </p>
      {!loading && filtered.length === 0 && <p>No reports match these filters.</p>}

      {filtered.map((r) => {
        const badge = STATUS_BADGE[r.status] || STATUS_BADGE.pending;
        return (
          <ReportCard r={r} key={r.id}>
            <span className={`status-badge ${badge.className}`}>{badge.label}</span>
            {r.action === "edit" && (
              <Diff
                original={r.originalSnapshot}
                proposed={r.appliedChanges || r.proposedChanges}
              />
            )}
            <p className="report-meta">
              Submitted {formatTimestamp(r.createdAt)}
              {r.resolvedBy && (
                <>
                  {" "}
                  · {r.status === "rejected" ? "rejected" : "resolved"} by{" "}
                  <b>{r.resolvedBy}</b> at {formatTimestamp(r.resolvedAt)}
                </>
              )}
            </p>
          </ReportCard>
        );
      })}
    </>
  );
}

export default function ReportsPage() {
  const { role, getToken } = useAuth();
  const [view, setView] = useState("pending"); // "pending" | "history"
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (targetView) => {
      setLoading(true);
      setError("");
      try {
        const token = await getToken();
        const status = targetView === "pending" ? "pending" : "all";
        const { reports } = await apiFetch(`/api/reports?status=${status}`, { token });
        setReports(reports);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [getToken]
  );

  useEffect(() => {
    load(view);
  }, [view, load]);

  if (role !== "admin" && role !== "moderator") {
    return <div className="container">You need to be logged in as a moderator or admin to see this page.</div>;
  }

  return (
    <div className="container">
      <h2>🚩 Reports</h2>
      <div className="report-tabs">
        <button
          className={`report-tab-btn ${view === "pending" ? "active" : ""}`}
          onClick={() => setView("pending")}
        >
          Pending
        </button>
        <button
          className={`report-tab-btn ${view === "history" ? "active" : ""}`}
          onClick={() => setView("history")}
        >
          History
        </button>
      </div>

      {view === "pending" ? (
        <PendingTab
          role={role}
          getToken={getToken}
          reload={() => load("pending")}
          reports={reports}
          loading={loading}
          error={error}
        />
      ) : (
        <HistoryTab reports={reports} loading={loading} error={error} />
      )}
    </div>
  );
}
