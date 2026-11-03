// MainPage.js
import React, { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  Circle,
  useMap,
} from "react-leaflet";
import { ref, onValue } from "firebase/database";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { apiFetch } from "./api";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./App.css";

// categories
const analogTypes = ["nfm", "fm", "bfm", "am", "nam", "ssb", "usb", "lsb", "dsb"];
const commonDigitals = ["dmr", "d-star", "tetra", "tetrapol", "nxdn", "c4fm"];
const simpleDigitals = ["rtty", "ft8", "ft4", "packet", "digi"];
const ctu = ["ctu", "čtú", "čtu", "ctú"];

const LEGEND = [
  { color: "blue", label: "Analog (FM, AM, SSB, …)" },
  { color: "red", label: "Common digital (DMR, TETRA, …)" },
  { color: "green", label: "Simple digital (RTTY, FT8, …)" },
  { color: "violet", label: "ČTÚ" },
  { color: "grey", label: "Unknown" },
];

const determineColor = (type = "") => {
  const t = (type || "").toLowerCase();
  if (analogTypes.includes(t)) return "blue";
  if (commonDigitals.includes(t)) return "red";
  if (simpleDigitals.includes(t)) return "green";
  if (t === "unknown" || t === "?") return "grey";
  if (ctu.includes(t)) return "violet";
  return "grey";
};

const createColorIcon = (color = "grey") =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

function ClickHandler({ onClick }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng);
    },
  });
  return null;
}

// GPS button component
function LocateButton() {
  const map = useMap();
  const locateUser = () => {
    map.locate({ setView: true, maxZoom: 13 });
  };
  return (
    <button className="gps-btn" onClick={locateUser} title="Center map on my location">
      📍 My Location
    </button>
  );
}

function formatTimestamp(ms) {
  if (!ms) return "-";
  const d = new Date(Number(ms));
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}.${pad(
    d.getMonth() + 1
  )}.${String(d.getFullYear()).slice(-2)}`;
}

const emptyNewSignal = {
  frequency: "",
  city: "",
  lat: "",
  lon: "",
  type: "",
  description: "",
  radius_km: 5,
};

function signalToFormValues(s) {
  return {
    frequency: s.frequency ?? "",
    city: s.city ?? "",
    lat: s.lat ?? "",
    lon: s.lon ?? "",
    type: s.type ?? "",
    description: s.description ?? "",
    radius_km: s.radius_km ?? 5,
  };
}

function toSignalPayload(values) {
  return {
    frequency: parseFloat(values.frequency),
    city: values.city,
    lat: Number(values.lat) || 0,
    lon: Number(values.lon) || 0,
    type: values.type,
    description: values.description,
    radius_km: Number(values.radius_km) || 0,
  };
}

export default function MainPage() {
  const { role, getToken } = useAuth();
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    city: "",
    freq: "",
    type: "",
    description: "",
  });
  const [sortColumn, setSortColumn] = useState("frequency");
  const [sortAsc, setSortAsc] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [newSignal, setNewSignal] = useState(emptyNewSignal);
  const [honeypot, setHoneypot] = useState("");
  const [activeSignalId, setActiveSignalId] = useState(null);
  const [saving, setSaving] = useState(false);

  // direct edit (admin/moderator)
  const [editingSignal, setEditingSignal] = useState(null);
  const [editValues, setEditValues] = useState(emptyNewSignal);
  const [editSaving, setEditSaving] = useState(false);

  // suggest a change (anyone)
  const [reportTarget, setReportTarget] = useState(null); // the signal being reported
  const [reportAction, setReportAction] = useState("edit"); // "edit" | "delete"
  const [reportValues, setReportValues] = useState(emptyNewSignal);
  const [reportNote, setReportNote] = useState("");
  const [reportHoneypot, setReportHoneypot] = useState("");
  const [reportSaving, setReportSaving] = useState(false);

  const canEdit = role === "admin" || role === "moderator";
  const canDelete = role === "admin";

  useEffect(() => {
    const signalsRef = ref(db, "signals");
    return onValue(signalsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      setSignals(list);
      setLoading(false);
    });
  }, []);

  const filteredSignals = useMemo(
    () =>
      signals.filter((sig) => {
        const matchCity = (sig.city || "")
          .toLowerCase()
          .includes(filters.city.toLowerCase());
        const matchType = (sig.type || "")
          .toLowerCase()
          .includes(filters.type.toLowerCase());
        const matchFreq =
          filters.freq === "" || String(sig.frequency).includes(filters.freq);
        const matchDesc = (sig.description || "")
          .toLowerCase()
          .includes(filters.description.toLowerCase());
        return matchCity && matchType && matchFreq && matchDesc;
      }),
    [signals, filters]
  );

  const sortedSignals = useMemo(() => {
    const copy = [...filteredSignals];
    copy.sort((a, b) => {
      let aVal;
      let bVal;
      if (sortColumn === "votesUp") {
        aVal = (a.votes && a.votes.up) || 0;
        bVal = (b.votes && b.votes.up) || 0;
      } else if (sortColumn === "votesDown") {
        aVal = (a.votes && a.votes.down) || 0;
        bVal = (b.votes && b.votes.down) || 0;
      } else {
        aVal = a[sortColumn];
        bVal = b[sortColumn];
      }
      if (aVal == null) aVal = "";
      if (bVal == null) bVal = "";
      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filteredSignals, sortColumn, sortAsc]);

  const hasActiveFilters =
    filters.city || filters.freq || filters.type || filters.description;

  const clearFilters = () =>
    setFilters({ city: "", freq: "", type: "", description: "" });

  // Added date and vote counts are more useful sorted highest/newest first.
  const DESC_DEFAULT_COLUMNS = ["timestamp", "votesUp", "votesDown"];
  const handleSort = (column) => {
    if (sortColumn === column) setSortAsc(!sortAsc);
    else {
      setSortColumn(column);
      setSortAsc(!DESC_DEFAULT_COLUMNS.includes(column));
    }
  };

  const saveSignal = async () => {
    if (!newSignal.frequency || !newSignal.city) {
      alert("Frequency and city are required.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/signals", {
        method: "POST",
        body: { ...toSignalPayload(newSignal), company: honeypot },
      });
      setNewSignal(emptyNewSignal);
      setHoneypot("");
      setShowForm(false);
    } catch (e) {
      alert(e.message || "Could not save the frequency, please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleMapClick = (latlng) => {
    setNewSignal((prev) => ({ ...prev, lat: latlng.lat, lon: latlng.lng }));
    setShowForm(true);
    setActiveSignalId(null);
  };

  const sortIndicator = (col) =>
    sortColumn === col ? (sortAsc ? " ↑" : " ↓") : "";

  // One vote per signal per IP address, enforced server-side by the API
  // (signals/{id}/voters/{ip-hash} can only be set once).
  const vote = async (id, dir) => {
    try {
      await apiFetch(`/api/signals/${id}/vote`, { method: "POST", body: { dir } });
    } catch (e) {
      if (e.status === 409) {
        alert(e.message || "You've already voted on this frequency.");
      } else if (e.status !== 429) {
        console.error("Vote error", e);
      }
    }
  };

  // --- direct edit / delete (admin, moderator) -----------------------------
  const openEdit = (s) => {
    setEditingSignal(s);
    setEditValues(signalToFormValues(s));
  };

  const saveEdit = async () => {
    if (!editValues.frequency || !editValues.city) {
      alert("Frequency and city are required.");
      return;
    }
    setEditSaving(true);
    try {
      const token = await getToken();
      await apiFetch(`/api/signals/${editingSignal.id}`, {
        method: "PUT",
        token,
        body: toSignalPayload(editValues),
      });
      setEditingSignal(null);
    } catch (e) {
      alert(e.message || "Could not update the frequency.");
    } finally {
      setEditSaving(false);
    }
  };

  const deleteSignal = async (s) => {
    if (!window.confirm(`Delete ${s.frequency} MHz in ${s.city}? This can't be undone.`)) {
      return;
    }
    try {
      const token = await getToken();
      await apiFetch(`/api/signals/${s.id}`, { method: "DELETE", token });
    } catch (e) {
      alert(e.message || "Could not delete the frequency.");
    }
  };

  // --- suggest an edit/deletion (anyone) ------------------------------------
  const openReport = (s) => {
    setReportTarget(s);
    setReportAction("edit");
    setReportValues(signalToFormValues(s));
    setReportNote("");
    setReportHoneypot("");
  };

  const submitReport = async () => {
    if (reportAction === "edit" && (!reportValues.frequency || !reportValues.city)) {
      alert("Frequency and city are required.");
      return;
    }
    setReportSaving(true);
    try {
      await apiFetch("/api/reports", {
        method: "POST",
        body: {
          signalId: reportTarget.id,
          action: reportAction,
          proposedChanges: reportAction === "edit" ? toSignalPayload(reportValues) : undefined,
          note: reportNote,
          company: reportHoneypot,
        },
      });
      setReportTarget(null);
      alert("Thanks! A moderator will review your suggestion.");
    } catch (e) {
      alert(e.message || "Could not submit the report.");
    } finally {
      setReportSaving(false);
    }
  };

  // group markers by lat/lon to detect collisions
  const groupedSignals = {};
  sortedSignals.forEach((s) => {
    const key = `${Math.round(s.lat * 10000)},${Math.round(s.lon * 10000)}`;
    if (!groupedSignals[key]) groupedSignals[key] = [];
    groupedSignals[key].push(s);
  });

  // find active signal for circle
  const activeSignal = signals.find((s) => s.id === activeSignalId);

  return (
    <div className="container">
      {/* Warning */}
      <div
        className={`warning-box ${showWarning ? "open" : ""}`}
        onClick={() => setShowWarning(!showWarning)}
      >
        <div className="warning-header">
          ⚠️ Legal / Warning
          <span className="warning-toggle">{showWarning ? "▲" : "▼"}</span>
        </div>
        {showWarning && (
          <div className="warning-content">
            This website does not encourage piracy. Data shown here was
            collected from publicly available sources and is provided for
            informational purposes only. Use responsibly and follow local law.
          </div>
        )}
      </div>

      <h2>📻 Radio Signal Database</h2>

      <div className="layout">
        <div className="map-controls-wrapper">
          <MapContainer center={[49.8, 15.5]} zoom={7} className="map">
            <TileLayer
              attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickHandler onClick={handleMapClick} />
            <LocateButton />

            {Object.values(groupedSignals).map((group, idx) => (
              <Marker
                key={idx}
                position={[Number(group[0].lat) || 0, Number(group[0].lon) || 0]}
                icon={createColorIcon(
                  group[0].color || determineColor(group[0].type)
                )}
                eventHandlers={{
                  click: () => setActiveSignalId(group[0].id),
                }}
              >
                <Popup>
                  {group.length === 1 ? (
                    <>
                      <b>{group[0].frequency} MHz</b>
                      <br />
                      {group[0].city} – {group[0].type}
                      <br />
                      <small>{group[0].description}</small>
                      <br />
                      <small>Added: {formatTimestamp(group[0].timestamp)}</small>
                      <br />
                      <small>
                        Votes: {(group[0].votes && group[0].votes.up) || 0} ↑ /{" "}
                        {(group[0].votes && group[0].votes.down) || 0} ↓
                      </small>
                    </>
                  ) : (
                    <div className="multi-popup">
                      {group.map((s) => (
                        <div
                          key={s.id}
                          className="multi-popup-item"
                          style={{ borderLeft: `6px solid ${s.color || determineColor(s.type)}` }}
                          onClick={() => setActiveSignalId(s.id)}
                        >
                          <b>{s.frequency} MHz</b>
                          <br />
                          {s.city} – {s.type}
                          <br />
                          <small>{s.description}</small>
                          <br />
                          <small>Added: {formatTimestamp(s.timestamp)}</small>
                          <br />
                          <small>
                            Votes: {(s.votes && s.votes.up) || 0} ↑ /{" "}
                            {(s.votes && s.votes.down) || 0} ↓
                          </small>
                        </div>
                      ))}
                    </div>
                  )}
                </Popup>
              </Marker>
            ))}

            {activeSignal &&
              activeSignal.lat &&
              activeSignal.lon &&
              activeSignal.radius_km > 0 && (
                <Circle
                  center={[Number(activeSignal.lat), Number(activeSignal.lon)]}
                  radius={Number(activeSignal.radius_km) * 1000}
                  pathOptions={{
                    color:
                      activeSignal.color || determineColor(activeSignal.type),
                    fillColor:
                      activeSignal.color || determineColor(activeSignal.type),
                    fillOpacity: 0.15,
                  }}
                />
              )}
          </MapContainer>
          <div className="map-hint">Tip: click anywhere on the map to add a frequency there.</div>
        </div>

        <div className="sidebar">
          <div className="filters-box">
            <div className="filters-box-header">
              <div className="filters-label">Filters</div>
              {hasActiveFilters && (
                <button className="clear-filters-btn" onClick={clearFilters}>
                  Clear
                </button>
              )}
            </div>
            <div className="filters-inputs">
              <input
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                placeholder="City"
              />
              <input
                value={filters.freq}
                onChange={(e) => setFilters({ ...filters, freq: e.target.value })}
                placeholder="Frequency"
              />
              <input
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                placeholder="Type"
              />
              <input
                value={filters.description}
                onChange={(e) =>
                  setFilters({ ...filters, description: e.target.value })
                }
                placeholder="Description"
              />
            </div>
          </div>

          <button
            className="add-freq-btn"
            onClick={() => {
              setShowForm(!showForm);
              setActiveSignalId(null);
            }}
          >
            {showForm ? "Cancel" : "➕ Add Frequency"}
          </button>

          <div className="legend-box">
            <div
              className="legend-header"
              onClick={() => setShowLegend(!showLegend)}
            >
              🎨 Marker colors <span>{showLegend ? "▲" : "▼"}</span>
            </div>
            {showLegend && (
              <ul className="legend-list">
                {LEGEND.map((l) => (
                  <li key={l.color}>
                    <span
                      className="legend-dot"
                      style={{ background: l.color }}
                    />
                    {l.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="form">
          <div className="form-grid">
            <input
              type="number"
              step="any"
              placeholder="Frequency (MHz)"
              value={newSignal.frequency}
              onChange={(e) =>
                setNewSignal({ ...newSignal, frequency: e.target.value })
              }
            />
            <input
              placeholder="City"
              value={newSignal.city}
              onChange={(e) => setNewSignal({ ...newSignal, city: e.target.value })}
            />
            <input
              type="number"
              step="any"
              placeholder="Latitude"
              value={newSignal.lat}
              onChange={(e) => setNewSignal({ ...newSignal, lat: e.target.value })}
            />
            <input
              type="number"
              step="any"
              placeholder="Longitude"
              value={newSignal.lon}
              onChange={(e) => setNewSignal({ ...newSignal, lon: e.target.value })}
            />
            <input
              placeholder="Type"
              value={newSignal.type}
              onChange={(e) => setNewSignal({ ...newSignal, type: e.target.value })}
            />
            <input
              placeholder="Description"
              value={newSignal.description}
              onChange={(e) =>
                setNewSignal({ ...newSignal, description: e.target.value })
              }
            />
          </div>
          <label className="radius-label">
            Radius: {newSignal.radius_km} km
            <input
              type="range"
              min="1"
              max="80"
              step="1"
              value={newSignal.radius_km}
              onChange={(e) =>
                setNewSignal({ ...newSignal, radius_km: Number(e.target.value) })
              }
            />
          </label>
          {/* honeypot: hidden from real users, bots that fill every field trip it */}
          <input
            type="text"
            name="company"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            autoComplete="off"
            tabIndex={-1}
            aria-hidden="true"
            className="honeypot-field"
          />
          <button
            className="save-btn"
            onClick={saveSignal}
            disabled={saving}
          >
            {saving ? "Saving…" : "✅ Save"}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="results-row">
        <span>
          {loading
            ? "Loading…"
            : `${sortedSignals.length} ${
                sortedSignals.length === 1 ? "result" : "results"
              }${hasActiveFilters ? " (filtered)" : ""}`}
        </span>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort("frequency")}>
                Frequency (MHz){sortIndicator("frequency")}
              </th>
              <th onClick={() => handleSort("city")}>
                City{sortIndicator("city")}
              </th>
              <th onClick={() => handleSort("lat")}>Lat{sortIndicator("lat")}</th>
              <th onClick={() => handleSort("lon")}>Lon{sortIndicator("lon")}</th>
              <th onClick={() => handleSort("type")}>
                Type{sortIndicator("type")}
              </th>
              <th onClick={() => handleSort("description")}>
                Description{sortIndicator("description")}
              </th>
              <th onClick={() => handleSort("timestamp")}>
                Added{sortIndicator("timestamp")}
              </th>
              <th style={{ width: 160 }}>
                <span>Votes</span>
                <span className="vote-sort-buttons">
                  <span
                    className="vote-sort-btn up"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSort("votesUp");
                    }}
                    title="Sort by upvotes"
                  >
                    ▲{sortIndicator("votesUp")}
                  </span>
                  <span
                    className="vote-sort-btn down"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSort("votesDown");
                    }}
                    title="Sort by downvotes"
                  >
                    ▼{sortIndicator("votesDown")}
                  </span>
                </span>
              </th>
              <th style={{ width: 120 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && sortedSignals.length === 0 && (
              <tr>
                <td colSpan={9} className="empty-row">
                  No frequencies match your filters.
                </td>
              </tr>
            )}
            {sortedSignals.map((s) => {
              const bgColor = s.color || determineColor(s.type);
              return (
                <tr
                  key={s.id}
                  className={activeSignalId === s.id ? "active-row" : ""}
                  onClick={() => setActiveSignalId(s.id)}
                >
                  <td
                    style={{
                      backgroundColor: bgColor,
                      color: "white",
                      fontWeight: 700,
                    }}
                  >
                    {s.frequency}
                  </td>
                  <td>{s.city || "-"}</td>
                  <td>{s.lat ? Number(s.lat).toFixed(4) : "-"}</td>
                  <td>{s.lon ? Number(s.lon).toFixed(4) : "-"}</td>
                  <td>{s.type || "-"}</td>
                  <td>{s.description || "-"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {formatTimestamp(s.timestamp)}
                  </td>
                  <td>
                    <div className="vote-controls">
                      <button
                        className="vote-btn up"
                        onClick={(e) => {
                          e.stopPropagation();
                          vote(s.id, "up");
                        }}
                        title="Upvote"
                      >
                        ▲
                      </button>
                      <div className="vote-count">
                        {(s.votes && s.votes.up) || 0}
                      </div>
                      <button
                        className="vote-btn down"
                        onClick={(e) => {
                          e.stopPropagation();
                          vote(s.id, "down");
                        }}
                        title="Downvote"
                      >
                        ▼
                      </button>
                      <div className="vote-count">
                        {(s.votes && s.votes.down) || 0}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="row-actions">
                      {canEdit && (
                        <button
                          className="row-action-btn"
                          title="Edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(s);
                          }}
                        >
                          ✏️
                        </button>
                      )}
                      {canDelete && (
                        <button
                          className="row-action-btn"
                          title="Delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSignal(s);
                          }}
                        >
                          🗑️
                        </button>
                      )}
                      <button
                        className="row-action-btn"
                        title="Suggest an edit or deletion"
                        onClick={(e) => {
                          e.stopPropagation();
                          openReport(s);
                        }}
                      >
                        🚩
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Direct edit modal (admin/moderator) */}
      {editingSignal && (
        <div className="modal-backdrop" onClick={() => setEditingSignal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>✏️ Edit frequency</h3>
            <div className="form-grid">
              <input
                type="number"
                step="any"
                placeholder="Frequency (MHz)"
                value={editValues.frequency}
                onChange={(e) => setEditValues({ ...editValues, frequency: e.target.value })}
              />
              <input
                placeholder="City"
                value={editValues.city}
                onChange={(e) => setEditValues({ ...editValues, city: e.target.value })}
              />
              <input
                type="number"
                step="any"
                placeholder="Latitude"
                value={editValues.lat}
                onChange={(e) => setEditValues({ ...editValues, lat: e.target.value })}
              />
              <input
                type="number"
                step="any"
                placeholder="Longitude"
                value={editValues.lon}
                onChange={(e) => setEditValues({ ...editValues, lon: e.target.value })}
              />
              <input
                placeholder="Type"
                value={editValues.type}
                onChange={(e) => setEditValues({ ...editValues, type: e.target.value })}
              />
              <input
                placeholder="Description"
                value={editValues.description}
                onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
              />
            </div>
            <label className="radius-label">
              Radius: {editValues.radius_km} km
              <input
                type="range"
                min="1"
                max="80"
                step="1"
                value={editValues.radius_km}
                onChange={(e) => setEditValues({ ...editValues, radius_km: Number(e.target.value) })}
              />
            </label>
            <div className="report-actions">
              <button className="save-btn" onClick={saveEdit} disabled={editSaving}>
                {editSaving ? "Saving…" : "✅ Save"}
              </button>
              <button className="cancel-btn" onClick={() => setEditingSignal(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggest edit/deletion modal (anyone) */}
      {reportTarget && (
        <div className="modal-backdrop" onClick={() => setReportTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>🚩 Suggest a change</h3>
            <p className="login-hint">
              {reportTarget.frequency} MHz · {reportTarget.city} - a moderator will review this.
            </p>
            <div className="report-type-toggle">
              <label>
                <input
                  type="radio"
                  checked={reportAction === "edit"}
                  onChange={() => setReportAction("edit")}
                />
                Suggest an edit
              </label>
              <label>
                <input
                  type="radio"
                  checked={reportAction === "delete"}
                  onChange={() => setReportAction("delete")}
                />
                Suggest deletion
              </label>
            </div>

            {reportAction === "edit" && (
              <div className="form-grid">
                <input
                  type="number"
                  step="any"
                  placeholder="Frequency (MHz)"
                  value={reportValues.frequency}
                  onChange={(e) => setReportValues({ ...reportValues, frequency: e.target.value })}
                />
                <input
                  placeholder="City"
                  value={reportValues.city}
                  onChange={(e) => setReportValues({ ...reportValues, city: e.target.value })}
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Latitude"
                  value={reportValues.lat}
                  onChange={(e) => setReportValues({ ...reportValues, lat: e.target.value })}
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Longitude"
                  value={reportValues.lon}
                  onChange={(e) => setReportValues({ ...reportValues, lon: e.target.value })}
                />
                <input
                  placeholder="Type"
                  value={reportValues.type}
                  onChange={(e) => setReportValues({ ...reportValues, type: e.target.value })}
                />
                <input
                  placeholder="Description"
                  value={reportValues.description}
                  onChange={(e) => setReportValues({ ...reportValues, description: e.target.value })}
                />
              </div>
            )}

            <input
              className="report-note-input"
              placeholder="Why? (optional)"
              value={reportNote}
              onChange={(e) => setReportNote(e.target.value)}
            />
            {/* honeypot */}
            <input
              type="text"
              value={reportHoneypot}
              onChange={(e) => setReportHoneypot(e.target.value)}
              autoComplete="off"
              tabIndex={-1}
              aria-hidden="true"
              className="honeypot-field"
            />

            <div className="report-actions">
              <button className="save-btn" onClick={submitReport} disabled={reportSaving}>
                {reportSaving ? "Submitting…" : "Submit suggestion"}
              </button>
              <button className="cancel-btn" onClick={() => setReportTarget(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
