import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import { ref, push, onValue } from "firebase/database";
import { db } from "./firebase";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./App.css";

// Define type categories
const analogTypes = ["nfm", "fm", "bfm", "am", "nam", "ssb", "usb", "lsb", "dsb"];
const commonDigitals = ["dmr", "d-star", "tetra", "tetrapol", "nxdn", "c4fm"];
const simpleDigitals = ["rtty", "ft8", "ft4", "packet", "digi"];

// Determine marker color based on type
const determineColor = (type = "") => {
  const t = type.toLowerCase();
  if (analogTypes.includes(t)) return "blue";
  if (commonDigitals.includes(t)) return "red";
  if (simpleDigitals.includes(t)) return "green";
  if (t === "unknown" || t === "?") return "grey";
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

function MainPage() {
  const [signals, setSignals] = useState([]);
  const [filters, setFilters] = useState({ city: "", freq: "", type: "" });
  const [sortColumn, setSortColumn] = useState("frequency");
  const [sortAsc, setSortAsc] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newSignal, setNewSignal] = useState({
    frequency: "",
    city: "",
    lat: "",
    lon: "",
    type: "",
    description: ""
  });

  useEffect(() => {
    const signalsRef = ref(db, "signals");
    onValue(signalsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      setSignals(list);
    });
  }, []);

  const filteredSignals = signals.filter((sig) => {
    const matchCity = sig.city?.toLowerCase().includes(filters.city.toLowerCase());
    const matchType = sig.type?.toLowerCase().includes(filters.type.toLowerCase());
    const matchFreq = filters.freq === "" || String(sig.frequency).includes(filters.freq);
    return matchCity && matchType && matchFreq;
  });

  const sortedSignals = [...filteredSignals].sort((a, b) => {
    let aVal = a[sortColumn];
    let bVal = b[sortColumn];
    if (typeof aVal === "string") {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    if (aVal < bVal) return sortAsc ? -1 : 1;
    if (aVal > bVal) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortAsc(!sortAsc);
    } else {
      setSortColumn(column);
      setSortAsc(true);
    }
  };

  const saveSignal = () => {
    const color = determineColor(newSignal.type);
    push(ref(db, "signals"), {
      frequency: parseFloat(newSignal.frequency),
      city: newSignal.city,
      lat: newSignal.lat,
      lon: newSignal.lon,
      type: newSignal.type,
      description: newSignal.description,
      color,
      timestamp: Date.now(),
    });
    clearForm();
  };

  const clearForm = () => {
    setNewSignal({
      frequency: "",
      city: "",
      lat: "",
      lon: "",
      type: "",
      description: ""
    });
    setShowForm(false);
  };

  const handleMapClick = (latlng) => {
    if (window.confirm("Create new frequency here?")) {
      setNewSignal({ ...newSignal, lat: latlng.lat, lon: latlng.lng });
      setShowForm(true);
    }
  };

  const sortIndicator = (col) => {
    if (sortColumn !== col) return "";
    return sortAsc ? " ↑" : " ↓";
  };

   return (
    <div className="container">
      <h1>Radio Frequency Map</h1>

      {/* 🌍 Updated map + controls layout below */}
      <div className="map-controls-wrapper" style={{ position: "relative", width: "100%" }}>
        <MapContainer center={[49.8, 15.5]} zoom={7} className="map" style={{ width: "100%", height: "500px" }}>
          <ClickHandler />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filteredFrequencies.map((freq, idx) => (
            <Marker
              key={idx}
              position={[freq.lat, freq.lon]}
              icon={markerIcons[freq.type] || markerIcons["default"]}
            >
              <Popup>
                <strong>{freq.frequency} MHz</strong><br />
                {freq.city}, {freq.radius} km<br />
                Type: {freq.type}
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        <div
          className="controls-row"
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "10px",
            backgroundColor: "rgba(0,0,0,0.6)",
            padding: "10px",
            borderRadius: "8px",
          }}
        >
          <div className="filters-box">
            <input
              type="text"
              placeholder="Filter by frequency"
              name="frequency"
              value={filters.frequency}
              onChange={handleFilterChange}
            />
            <input
              type="text"
              placeholder="Filter by city"
              name="city"
              value={filters.city}
              onChange={handleFilterChange}
            />
            <input
              type="text"
              placeholder="Filter by type"
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
            />
          </div>
          <button className="add-freq-btn" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "➕ Add Frequency"}
          </button>
        </div>
      </div>

      {showForm && (
        <form className="add-form" onSubmit={handleFormSubmit}>
          <input
            type="text"
            placeholder="Frequency (e.g. 438.725)"
            name="frequency"
            value={formData.frequency}
            onChange={handleInputChange}
            required
          />
          <input
            type="text"
            placeholder="City"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            required
          />
          <input
            type="text"
            placeholder="Radius (km)"
            name="radius"
            value={formData.radius}
            onChange={handleInputChange}
            required
          />
          <input
            type="text"
            placeholder="Type (e.g. DMR, NFM)"
            name="type"
            value={formData.type}
            onChange={handleInputChange}
            required
          />
          <input
            type="text"
            placeholder="Latitude"
            name="lat"
            value={formData.lat}
            onChange={handleInputChange}
            required
          />
          <input
            type="text"
            placeholder="Longitude"
            name="lon"
            value={formData.lon}
            onChange={handleInputChange}
            required
          />
          <button type="submit">✅ Submit</button>
        </form>
      )}

      <div className="freq-list">
        <h2>Saved Frequencies</h2>
        <table>
          <thead>
            <tr>
              <th>Frequency</th>
              <th>City</th>
              <th>Radius</th>
              <th>Type</th>
              <th>Lat</th>
              <th>Lon</th>
            </tr>
          </thead>
          <tbody>
            {filteredFrequencies.map((freq, idx) => (
              <tr key={idx}>
                <td style={{ backgroundColor: getTypeColor(freq.type), color: "#fff" }}>{freq.frequency}</td>
                <td>{freq.city}</td>
                <td>{freq.radius}</td>
                <td>{freq.type}</td>
                <td>{freq.lat}</td>
                <td>{freq.lon}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="footer-label">Managed by @mechanikcz</div>
    </div>
  );
};

export default MainPage;
