import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import { ref, push, onValue } from "firebase/database";
import { db } from "./firebase";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./App.css";

// Leaflet custom icon via CDN
const defaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Map click handler hook
function ClickHandler({ onClick }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng);
    }
  });
  return null;
}

function App() {
  const [signals, setSignals] = useState([]);
  const [filterCity, setFilterCity] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newSignal, setNewSignal] = useState({
    frequency: "", city: "", lat: "", lon: "", type: "", description: ""
  });

  // Load signals from Firebase
  useEffect(() => {
    const signalsRef = ref(db, "signals");
    onValue(signalsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      setSignals(list);
    });
  }, []);

  const filteredSignals = signals.filter(sig =>
    sig.city?.toLowerCase().includes(filterCity.toLowerCase())
  );

  // Save new signal to Firebase
  const saveSignal = () => {
    push(ref(db, "signals"), {
      frequency: parseFloat(newSignal.frequency),
      city: newSignal.city,
      lat: newSignal.lat,
      lon: newSignal.lon,
      type: newSignal.type,
      description: newSignal.description,
      timestamp: Date.now()
    });
    clearForm();
  };

  const clearForm = () => {
    setNewSignal({ frequency: "", city: "", lat: "", lon: "", type: "", description: "" });
    setShowForm(false);
  };

  // Map click → prompt add
  const handleMapClick = (latlng) => {
    if (window.confirm("Create new frequency here?")) {
      setNewSignal({ ...newSignal, lat: latlng.lat, lon: latlng.lng });
      setShowForm(true);
    }
  };

  return (
    <div className="container">
      <h2>📻 Radio Signal Database</h2>

      <MapContainer center={[49.8, 15.5]} zoom={7} className="map">
        <TileLayer
          attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onClick={handleMapClick} />
        {filteredSignals.map(s => (
          <Marker key={s.id} position={[s.lat, s.lon]} icon={defaultIcon}>
            <Popup>
              <b>{s.frequency} MHz</b><br/>
              {s.city} – {s.type}<br/>
              <small>{s.description}</small>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="controls">
        <div className="filter-add">
          <input
            value={filterCity}
            onChange={e => setFilterCity(e.target.value)}
            placeholder="Filter by city…"
          />
          <button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "➕ Add Frequency"}
          </button>
        </div>

        {showForm && (
          <div className="form">
            <input
              type="number" step="any"
              placeholder="Frequency (MHz)"
              value={newSignal.frequency}
              onChange={e => setNewSignal({ ...newSignal, frequency: e.target.value })}
            />
            <input
              placeholder="City"
              value={newSignal.city}
              onChange={e => setNewSignal({ ...newSignal, city: e.target.value })}
            />
            <input
              type="number" step="any"
              placeholder="Latitude"
              value={newSignal.lat}
              onChange={e => setNewSignal({ ...newSignal, lat: parseFloat(e.target.value) })}
            />
            <input
              type="number" step="any"
              placeholder="Longitude"
              value={newSignal.lon}
              onChange={e => setNewSignal({ ...newSignal, lon: parseFloat(e.target.value) })}
            />
            <input
              placeholder="Type"
              value={newSignal.type}
              onChange={e => setNewSignal({ ...newSignal, type: e.target.value })}
            />
            <input
              placeholder="Description"
              value={newSignal.description}
              onChange={e => setNewSignal({ ...newSignal, description: e.target.value })}
            />
            <button onClick={saveSignal}>✅ Save</button>
          </div>
        )}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Frequency (MHz)</th><th>City</th><th>Lat</th><th>Lon</th><th>Type</th><th>Description</th>
            </tr>
          </thead>
          <tbody>
            {filteredSignals.map(s => (
              <tr key={s.id}>
                <td>{s.frequency}</td>
                <td>{s.city}</td>
                <td>{s.lat.toFixed(4)}</td>
                <td>{s.lon.toFixed(4)}</td>
                <td>{s.type}</td>
                <td>{s.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
