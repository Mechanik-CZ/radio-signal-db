import React, { useEffect, useState } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../App.css";

const analogTypes = ["nfm", "fm", "bfm", "am", "nam", "ssb", "usb", "lsb", "dsb"];
const commonDigitals = ["dmr", "d-star", "tetra", "tetrapol", "nxdn", "c4fm"];
const simpleDigitals = ["rtty", "ft8", "ft4", "packet", "digi"];

const determineColor = (type = "") => {
  const t = type.toLowerCase();
  if (analogTypes.includes(t)) return "blue";
  if (commonDigitals.includes(t)) return "red";
  if (simpleDigitals.includes(t)) return "green";
  if (t === "unknown" || t === "?") return "grey";
  return "grey";
};

const MainPage = () => {
  const [frequencies, setFrequencies] = useState([]);
  const [filteredFrequencies, setFilteredFrequencies] = useState([]);
  const [cityFilter, setCityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [freqFilter, setFreqFilter] = useState("");

  useEffect(() => {
    axios.get("/api/frequencies").then((res) => {
      setFrequencies(res.data);
      setFilteredFrequencies(res.data);
    });
  }, []);

  useEffect(() => {
    const filtered = frequencies.filter((f) => {
      const matchesCity = cityFilter ? f.city.toLowerCase().includes(cityFilter.toLowerCase()) : true;
      const matchesType = typeFilter ? f.type.toLowerCase().includes(typeFilter.toLowerCase()) : true;
      const matchesFreq = freqFilter ? f.frequency.toString().includes(freqFilter) : true;
      return matchesCity && matchesType && matchesFreq;
    });
    setFilteredFrequencies(filtered);
  }, [cityFilter, typeFilter, freqFilter, frequencies]);

  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");

  const handleSort = (field) => {
    let direction = "asc";
    if (sortField === field && sortDirection === "asc") {
      direction = "desc";
    }
    setSortField(field);
    setSortDirection(direction);

    const sorted = [...filteredFrequencies].sort((a, b) => {
      if (a[field] < b[field]) return direction === "asc" ? -1 : 1;
      if (a[field] > b[field]) return direction === "asc" ? 1 : -1;
      return 0;
    });
    setFilteredFrequencies(sorted);
  };

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#222" }}>
      <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "row" }}>
        <MapContainer center={[50.0755, 14.4378]} zoom={7} style={{ flex: 2, height: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          />
          {filteredFrequencies.map((freq, index) => {
            const color = determineColor(freq.type);
            const customIcon = new L.DivIcon({
              className: "custom-marker",
              html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%;"></div>`,
            });

            return (
              <Marker key={index} position={[freq.lat, freq.lon]} icon={customIcon}>
                <Popup>
                  <strong>{freq.frequency} MHz</strong>
                  <br />
                  {freq.city}, {freq.type}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        <div className="filters" style={{ width: "300px", padding: "10px", backgroundColor: "#111", color: "white" }}>
          <h3>Filters</h3>
          <input
            type="text"
            placeholder="Filter by City"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            style={{ width: "100%", marginBottom: "10px", padding: "5px" }}
          />
          <input
            type="text"
            placeholder="Filter by Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ width: "100%", marginBottom: "10px", padding: "5px" }}
          />
          <input
            type="text"
            placeholder="Filter by Frequency"
            value={freqFilter}
            onChange={(e) => setFreqFilter(e.target.value)}
            style={{ width: "100%", marginBottom: "10px", padding: "5px" }}
          />
        </div>
      </div>

      <div style={{ overflowY: "auto", flex: 1 }}>
        <table className="frequency-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("frequency")}>Frequency</th>
              <th onClick={() => handleSort("city")}>City</th>
              <th onClick={() => handleSort("type")}>Type</th>
            </tr>
          </thead>
          <tbody>
            {filteredFrequencies.map((freq, index) => (
              <tr key={index}>
                <td style={{ backgroundColor: determineColor(freq.type), color: "white" }}>{freq.frequency}</td>
                <td>{freq.city}</td>
                <td>{freq.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ position: "absolute", top: 4, right: 10, fontSize: "0.75rem", color: "#ccc" }}>
        Managed by @mechanikcz
      </div>
    </div>
  );
};

export default MainPage;
