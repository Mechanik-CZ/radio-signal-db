// MainPage.js
import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
} from "react-leaflet";
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

// custom marker icons
const createColorIcon = (color) =>
  new L.Icon({
    iconUrl: `https://chart.googleapis.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|${color}`,
    iconSize: [21, 34],
    iconAnchor: [10, 34],
    popupAnchor: [1, -34],
  });

function MainPage() {
  const [signals, setSignals] = useState([]);
  const [activeSignalId, setActiveSignalId] = useState(null);

  // fetch signals
  useEffect(() => {
    const signalsRef = ref(db, "signals");
    onValue(signalsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.keys(data).map((key) => ({ id: key, ...data[key] }));
      setSignals(list);
    });
  }, []);

  // group overlapping markers
  const groupSignals = () => {
    const groups = [];
    const used = new Set();

    signals.forEach((s, i) => {
      if (used.has(s.id)) return;
      const group = [s];
      used.add(s.id);

      signals.forEach((other, j) => {
        if (i !== j && !used.has(other.id)) {
          const dist = getDistanceFromLatLonInKm(
            s.lat,
            s.lon,
            other.lat,
            other.lon
          );
          if (dist < 0.1) {
            group.push(other);
            used.add(other.id);
          }
        }
      });

      groups.push(group);
    });

    return groups;
  };

  const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // voting logic
  const handleVote = (signalId, type) => {
    const signalRef = ref(db, `signals/${signalId}/votes/${type}`);
    runTransaction(signalRef, (current) => (current || 0) + 1);
  };

  // format timestamp
  const formatTimestamp = (ts) => {
    if (!ts) return "unknown";
    const date = new Date(ts);
    return date.toLocaleString();
  };

  const groups = groupSignals();
  const activeSignal = signals.find((s) => s.id === activeSignalId);

  return (
    <div className="map-container">
      <MapContainer
        center={[49.8, 15.5]}
        zoom={8}
        style={{ height: "100vh", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {groups.map((group, idx) => (
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
                  <br />
                  <button onClick={() => handleVote(group[0].id, "up")}>
                    👍
                  </button>
                  <button onClick={() => handleVote(group[0].id, "down")}>
                    👎
                  </button>
                  <br />
                  <small>Radius: {group[0].radius_km} km</small>
                </>
              ) : (
                <div className="multi-popup">
                  {group.map((s) => {
                    const bgColor = s.color || determineColor(s.type);
                    return (
                      <div
                        key={s.id}
                        className="multi-popup-item"
                        style={{
                          borderLeft: `6px solid ${bgColor}`,
                        }}
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
                        <br />
                        <button onClick={() => handleVote(s.id, "up")}>
                          👍
                        </button>
                        <button onClick={() => handleVote(s.id, "down")}>
                          👎
                        </button>
                        <br />
                        <small>Radius: {s.radius_km} km</small>
                      </div>
                    );
                  })}
                </div>
              )}
            </Popup>
          </Marker>
        ))}

        {activeSignal && activeSignal.radius_km && (
          <Circle
            center={[Number(activeSignal.lat), Number(activeSignal.lon)]}
            radius={activeSignal.radius_km * 1000}
            pathOptions={{
              color: activeSignal.color || determineColor(activeSignal.type),
              fillOpacity: 0.15,
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}

export default MainPage;
