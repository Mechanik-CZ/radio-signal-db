import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const defaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const initialData = [
  {
    id: 1,
    frequency: 145.500,
    city: "Prague",
    lat: 50.0755,
    lon: 14.4378,
    type: "Amateur VHF",
    description: "Repeater OK0P",
  },
  {
    id: 2,
    frequency: 446.00625,
    city: "Brno",
    lat: 49.1951,
    lon: 16.6068,
    type: "PMR",
    description: "Channel 1",
  },
];

function App() {
  const [signals, setSignals] = useState(initialData);
  const [filterCity, setFilterCity] = useState("");
  const [newSignal, setNewSignal] = useState({
    frequency: "",
    city: "",
    lat: "",
    lon: "",
    type: "",
    description: "",
  });
  const [showForm, setShowForm] = useState(false);

  const filteredSignals = signals.filter(signal =>
    signal.city.toLowerCase().includes(filterCity.toLowerCase())
  );

  const handleAddSignal = () => {
    const newId = Date.now();
    setSignals([...signals, { ...newSignal, id: newId }]);
    setNewSignal({ frequency: "", city: "", lat: "", lon: "", type: "", description: "" });
    setShowForm(false);
  };

  return (
    <div style={{ padding: "10px" }}>
      <h2>📻 Radio Signal Database</h2>

      <div style={{ marginBottom: "10px" }}>
        🔍 Filter by city:{" "}
        <input
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
          placeholder="Type a city..."
        />
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "➕ Add Frequency"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "#eee", padding: "10px", marginBottom: "10px" }}>
          <h4>Add New Frequency</h4>
          <input
            placeholder="Frequency (MHz)"
            value={newSignal.frequency}
            onChange={(e) => setNewSignal({ ...newSignal, frequency: e.target.value })}
          />
          <input
            placeholder="City"
            value={newSignal.city}
            onChange={(e) => setNewSignal({ ...newSignal, city: e.target.value })}
          />
          <input
            placeholder="Latitude"
            value={newSignal.lat}
            onChange={(e) => setNewSignal({ ...newSignal, lat: parseFloat(e.target.value) })}
          />
          <input
            placeholder="Longitude"
            value={newSignal.lon}
            onChange={(e) => setNewSignal({ ...newSignal, lon: parseFloat(e.target.value) })}
          />
          <input
            placeholder="Type (e.g., PMR, Airband)"
            value={newSignal.type}
            onChange={(e) => setNewSignal({ ...newSignal, type: e.target.value })}
          />
          <input
            placeholder="Description"
            value={newSignal.description}
            onChange={(e) => setNewSignal({ ...newSignal, description: e.target.value })}
          />
          <br />
          <button onClick={handleAddSignal}>✅ Save Frequency</button>
        </div>
      )}

      <h3>📋 Frequency List</h3>
      <ul>
        {filteredSignals.map((s) => (
          <li key={s.id}>
            <strong>{s.frequency} MHz</strong> – {s.city} – {s.type}  
            <br />
            <small>{s.description}</small>
          </li>
        ))}
      </ul>

      <h3>🗺 Map View</h3>
      <MapContainer center={[49.8, 15.5]} zoom={7} style={{ height: "400px", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {filteredSignals.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lon]} icon={defaultIcon}>
            <Popup>
              <strong>{s.frequency} MHz</strong><br />
              {s.city} – {s.type}<br />
              {s.description}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default App;
