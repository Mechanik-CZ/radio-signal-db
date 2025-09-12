// MainPage.js
import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Circle } from "react-leaflet";
import { ref, push, onValue, runTransaction } from "firebase/database";
import { db } from "./firebase";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./App.css";

// categories
const analogTypes = ["nfm", "fm", "bfm", "am", "nam", "ssb", "usb", "lsb", "dsb"];
const commonDigitals = ["dmr", "d-star", "tetra", "tetrapol", "nxdn", "c4fm"];
const simpleDigitals = ["rtty", "ft8", "ft4", "packet", "digi"];
const ctu = ["ctu", "čtú", "čtu", "ctú"];

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

function formatTimestamp(ms) {
  if (!ms) return "-";
  const d = new Date(Number(ms));
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(-2)}`;
}

export default function MainPage() {
  const [signals, setSignals] = useState([]);
  const [filters, setFilters] = useState({ city: "", freq: "", type: "" });
  const [sortColumn, setSortColumn] = useState("frequency");
  const [sortAsc, setSortAsc] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [newSignal, setNewSignal] = useState({
    frequency: "",
    city: "",
    lat: "",
    lon: "",
    type: "",
    description: "",
    radius_km: 5,
  });
  const [activeSignalId, setActiveSignalId] = useState(null);

  useEffect(() => {
    const signalsRef = ref(db, "signals");
    return onValue(signalsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      setSignals(list);
    });
  }, []);

  const filteredSignals = signals.filter((sig) => {
    const matchCity = (sig.city || "").toLowerCase().includes(filters.city.toLowerCase());
    const matchType = (sig.type || "").toLowerCase().includes(filters.type.toLowerCase());
    const matchFreq = filters.freq === "" || String(sig.frequency).includes(filters.freq);
    return matchCity && matchType && matchFreq;
  });

  const sortedSignals = [...filteredSignals].sort((a, b) => {
    let aVal = a[sortColumn];
    let bVal = b[sortColumn];
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

  const handleSort = (column) => {
    if (sortColumn === column) setSortAsc(!sortAsc);
    else {
      setSortColumn(column);
      setSortAsc(true);
    }
  };

  const saveSignal = () => {
    const color = determineColor(newSignal.type);
    push(ref(db, "signals"), {
      frequency: parseFloat(newSignal.frequency),
      city: newSignal.city,
      lat: Number(newSignal.lat) || 0,
      lon: Number(newSignal.lon) || 0,
      type: newSignal.type,
      description: newSignal.description,
      color,
      radius_km: Number(newSignal.radius_km) || 0,
      timestamp: Date.now(),
      votes: { up: 0, down: 0 },
    });
    setNewSignal({ frequency: "", city: "", lat: "", lon: "", type: "", description: "", radius_km: 5 });
    setShowForm(false);
  };

  const handleMapClick = (latlng) => {
    if (window.confirm("Create new frequency here?")) {
      setNewSignal({ ...newSignal, lat: latlng.lat, lon: latlng.lng });
      setShowForm(true);
      setActiveSignalId(null);
    }
  };

  const sortIndicator = (col) => (sortColumn === col ? (sortAsc ? " ↑" : " ↓") : "");

  // voting cooldown using localStorage (light anti-spam)
  const VOTE_COOLDOWN_MS = 30 * 1000;
  const canVote = (id) => {
    try {
      const last = Number(localStorage.getItem(`lastVote_${id}`) || 0);
      return Date.now() - last > VOTE_COOLDOWN_MS;
    } catch {
      return true;
    }
  };
  const markVoted = (id) => {
    try { localStorage.setItem(`lastVote_${id}`, String(Date.now())); } catch {}
  };

  const vote = (id, dir) => {
    if (!canVote(id)) {
      alert("Please wait a little before voting again.");
      return;
    }
    const votesRef = ref(db, `signals/${id}/votes`);
    runTransaction(votesRef, (current) => {
      if (current == null) {
        return dir === "up" ? { up: 1, down: 0 } : { up: 0, down: 1 };
      }
      if (dir === "up") current.up = (current.up || 0) + 1;
      else current.down = (current.down || 0) + 1;
      return current;
    })
      .then(() => markVoted(id))
      .catch((e) => console.error("Vote error", e));
  };

  // find active signal for circle
  const activeSignal = signals.find((s) => s.id === activeSignalId);

  return (
    <div className="container">
      {/* WARNING BOX only — DO NOT add nav here if you have global nav in App.js */}
      <div style={{ marginTop: 8 }}>
        <div className={`warning-box ${showWarning ? "open" : ""}`} onClick={() => setShowWarning(!showWarning)}>
          <div className="warning-header">⚠️ Legal / Warning</div>
          {showWarning && (
            <div className="warning-content">
              This website does not encourage piracy. Data shown here was collected from publicly available sources and is provided for informational purposes only. Use responsibly and follow local law.
            </div>
          )}
        </div>
      </div>

      <h2>📻 Radio Signal Database</h2>
      <div className="corner-label">Managed by @mechanikcz</div>

      <div className="map-controls-wrapper">
        <MapContainer center={[49.8, 15.5]} zoom={7} className="map">
          <TileLayer attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickHandler onClick={handleMapClick} />

          {sortedSignals.map((s) => (
            <Marker
              key={s.id}
              position={[Number(s.lat) || 0, Number(s.lon) || 0]}
              icon={createColorIcon(s.color || determineColor(s.type))}
              eventHandlers={{ click: () => setActiveSignalId(s.id) }}
            >
              <Popup>
                <b>{s.frequency} MHz</b>
                <br />
                {s.city} – {s.type}
                <br />
                <small>{s.description}</small>
                <br />
                <small>Added: {formatTimestamp(s.timestamp)}</small>
                <br />
                <small>Votes: {(s.votes && s.votes.up) || 0} ↑ / {(s.votes && s.votes.down) || 0} ↓</small>
              </Popup>
            </Marker>
          ))}

          {activeSignal && activeSignal.lat && activeSignal.lon && activeSignal.radius_km > 0 && (
            <Circle
              center={[Number(activeSignal.lat), Number(activeSignal.lon)]}
              radius={Number(activeSignal.radius_km) * 1000}
              pathOptions={{ color: activeSignal.color || determineColor(activeSignal.type), fillColor: activeSignal.color || determineColor(activeSignal.type), fillOpacity: 0.15 }}
            />
          )}
        </MapContainer>

        <div className="controls-row">
          <div className="filters-box">
            <div className="filters-label">Filters:</div>
            <div className="filters-inputs">
              <input value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} placeholder="City" />
              <input value={filters.freq} onChange={(e) => setFilters({ ...filters, freq: e.target.value })} placeholder="Frequency" />
              <input value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} placeholder="Type" />
            </div>
          </div>
          <button className="add-freq-btn" onClick={() => { setShowForm(!showForm); setActiveSignalId(null); }}>
            {showForm ? "Cancel" : "➕ Add Frequency"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="form">
          <input type="number" step="any" placeholder="Frequency (MHz)" value={newSignal.frequency} onChange={(e) => setNewSignal({ ...newSignal, frequency: e.target.value })} />
          <input placeholder="City" value={newSignal.city} onChange={(e) => setNewSignal({ ...newSignal, city: e.target.value })} />
          <input type="number" step="any" placeholder="Latitude" value={newSignal.lat} onChange={(e) => setNewSignal({ ...newSignal, lat: e.target.value })} />
          <input type="number" step="any" placeholder="Longitude" value={newSignal.lon} onChange={(e) => setNewSignal({ ...newSignal, lon: e.target.value })} />
          <input placeholder="Type" value={newSignal.type} onChange={(e) => setNewSignal({ ...newSignal, type: e.target.value })} />
          <input placeholder="Description" value={newSignal.description} onChange={(e) => setNewSignal({ ...newSignal, description: e.target.value })} />
          <label style={{ marginTop: 6 }}>Radius (km, 1 - 80)</label>
          <input type="number" min="1" max="80" step="1" value={newSignal.radius_km} onChange={(e) => setNewSignal({ ...newSignal, radius_km: Math.max(1, Math.min(80, Number(e.target.value))) })} />
          <button onClick={saveSignal}>✅ Save</button>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort("frequency")}>Frequency (MHz){sortIndicator("frequency")}</th>
              <th onClick={() => handleSort("city")}>City{sortIndicator("city")}</th>
              <th onClick={() => handleSort("lat")}>Lat{sortIndicator("lat")}</th>
              <th onClick={() => handleSort("lon")}>Lon{sortIndicator("lon")}</th>
              <th onClick={() => handleSort("type")}>Type{sortIndicator("type")}</th>
              <th onClick={() => handleSort("description")}>Description{sortIndicator("description")}</th>
              <th>Added</th>
              <th style={{ width: 160 }}>Votes</th>
            </tr>
          </thead>
          <tbody>
            {sortedSignals.map((s) => {
              const bgColor = s.color || determineColor(s.type);
              return (
                <tr key={s.id}>
                  <td style={{ backgroundColor: bgColor, color: "white", fontWeight: 700 }}>{s.frequency}</td>
                  <td>{s.city || "-"}</td>
                  <td>{s.lat ? Number(s.lat).toFixed(4) : "-"}</td>
                  <td>{s.lon ? Number(s.lon).toFixed(4) : "-"}</td>
                  <td>{s.type || "-"}</td>
                  <td>{s.description || "-"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{formatTimestamp(s.timestamp)}</td>
                  <td>
                    <div className="vote-controls">
                      <button className="vote-btn up" onClick={() => vote(s.id, "up")} title="Upvote">▲</button>
                      <div className="vote-count">{(s.votes && s.votes.up) || 0}</div>
                      <button className="vote-btn down" onClick={() => vote(s.id, "down")} title="Downvote">▼</button>
                      <div className="vote-count">{(s.votes && s.votes.down) || 0}</div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
