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
const ctu = ["ctu", "čtú", "čtu", "ctú" ];

// Determine marker color based on type
const determineColor = (type = "") => {
  const t = type.toLowerCase();
  if (analogTypes.includes(t)) return "blue";
  if (commonDigitals.includes(t)) return "red";
  if (simpleDigitals.includes(t)) return "green";
  if (t === "unknown" || t === "?") return "grey";
  if (ctu.includes(t)) return "violet"; //this is not included in /help/ site
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
      <h2>📻 Radio Signal Database</h2>
      <div className="corner-label">Managed by @mechanikcz</div>

      {/* Map + Filters side-by-side */}
      <div className="map-controls-wrapper">
        <MapContainer center={[49.8, 15.5]} zoom={7} className="map">
          <TileLayer
            attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onClick={handleMapClick} />
          {sortedSignals.map((s) => (
            <Marker
              key={s.id}
              position={[s.lat, s.lon]}
              icon={createColorIcon(s.color || determineColor(s.type))}
            >
              <Popup>
                <b>{s.frequency} MHz</b>
                <br />
                {s.city} – {s.type}
                <br />
                <small>{s.description}</small>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        <div className="controls-row">
          <div className="filters-box">
            <div className="filters-label">Filters:</div>
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
            </div>
          </div>
          <button
            className="add-freq-btn"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "Cancel" : "➕ Add Frequency"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="form">
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
            onChange={(e) =>
              setNewSignal({ ...newSignal, city: e.target.value })
            }
          />
          <input
            type="number"
            step="any"
            placeholder="Latitude"
            value={newSignal.lat}
            onChange={(e) =>
              setNewSignal({ ...newSignal, lat: parseFloat(e.target.value) })
            }
          />
          <input
            type="number"
            step="any"
            placeholder="Longitude"
            value={newSignal.lon}
            onChange={(e) =>
              setNewSignal({ ...newSignal, lon: parseFloat(e.target.value) })
            }
          />
          <input
            placeholder="Type"
            value={newSignal.type}
            onChange={(e) =>
              setNewSignal({ ...newSignal, type: e.target.value })
            }
          />
          <input
            placeholder="Description"
            value={newSignal.description}
            onChange={(e) =>
              setNewSignal({ ...newSignal, description: e.target.value })
            }
          />
          <button onClick={saveSignal}>✅ Save</button>
        </div>
      )}

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
              <th onClick={() => handleSort("lat")}>
                Lat{sortIndicator("lat")}
              </th>
              <th onClick={() => handleSort("lon")}>
                Lon{sortIndicator("lon")}
              </th>
              <th onClick={() => handleSort("type")}>
                Type{sortIndicator("type")}
              </th>
              <th onClick={() => handleSort("description")}>
                Description{sortIndicator("description")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedSignals.map((s) => {
              const bgColor = s.color || determineColor(s.type);
              return (
                <tr key={s.id}>
                  <td style={{ backgroundColor: bgColor, color: "white" }}>
                    {s.frequency}
                  </td>
                  <td>{s.city}</td>
                  <td>{s.lat.toFixed(4)}</td>
                  <td>{s.lon.toFixed(4)}</td>
                  <td>{s.type}</td>
                  <td>{s.description}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MainPage;
