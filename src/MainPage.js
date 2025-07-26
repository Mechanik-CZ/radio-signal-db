import React, { useState, useEffect } from 'react';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

const signalColors = {
  'analog': 'blue',
  'digital': 'red',
  'simple_digital': 'green',
  'unknown': 'gray'
};

function getSignalCategory(type) {
  const t = type.toLowerCase();
  if (["nfm", "fm", "bfm", "am", "nam", "ssb", "usb", "lsb", "dsb"].includes(t)) return 'analog';
  if (["dmr", "d-star", "tetra", "tetrapol", "nxdn"].includes(t)) return 'digital';
  if (["rtty", "ft8", "ft4", "packet", "digi"].includes(t)) return 'simple_digital';
  return 'unknown';
}

const MainPage = () => {
  const [frequencies, setFrequencies] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [form, setForm] = useState({ frequency: '', city: '', type: '', lat: '', lng: '' });
  const [filters, setFilters] = useState({ frequency: '', city: '', type: '' });
  const [map, setMap] = useState(null);

  useEffect(() => {
    axios.get('/api/frequencies').then(res => {
      setFrequencies(res.data);
      setFiltered(res.data);
    });

    const m = L.map('map').setView([50.0755, 14.4378], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);

    m.on('click', (e) => {
      setForm({ ...form, lat: e.latlng.lat, lng: e.latlng.lng });
    });

    setMap(m);
  }, []);

  useEffect(() => {
    if (!map) return;
    map.eachLayer(layer => {
      if (layer.options && layer.options.pane === "markerPane") map.removeLayer(layer);
    });
    filtered.forEach(f => {
      const category = getSignalCategory(f.type);
      const color = signalColors[category] || 'gray';
      const marker = L.circleMarker([f.lat, f.lng], {
        radius: 8,
        fillColor: color,
        color: '#000',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
      });
      marker.bindPopup(`${f.frequency} MHz<br>${f.city}<br>${f.type}`);
      marker.addTo(map);
    });
  }, [filtered, map]);

  const handleFilterChange = (e) => {
    const newFilters = { ...filters, [e.target.name]: e.target.value };
    setFilters(newFilters);
    setFiltered(frequencies.filter(f =>
      f.frequency.toLowerCase().includes(newFilters.frequency.toLowerCase()) &&
      f.city.toLowerCase().includes(newFilters.city.toLowerCase()) &&
      f.type.toLowerCase().includes(newFilters.type.toLowerCase())
    ));
  };

  const handleAdd = () => {
    axios.post('/api/frequencies', form).then(res => {
      const newFreq = res.data;
      setFrequencies([...frequencies, newFreq]);
      setFiltered([...filtered, newFreq]);
      setForm({ frequency: '', city: '', type: '', lat: '', lng: '' });
    });
  };

  return (
    <div className="container">
      <div className="map" id="map"></div>
      <div className="corner-label">Managed by @mechanikcz</div>

      <div className="controls-row">
        <div className="filters-box">
          <div className="filters-label">Filters:</div>
          <div className="filters-inputs">
            <input
              type="text"
              name="frequency"
              placeholder="Frequency"
              value={filters.frequency}
              onChange={handleFilterChange}
            />
            <input
              type="text"
              name="city"
              placeholder="City"
              value={filters.city}
              onChange={handleFilterChange}
            />
            <input
              type="text"
              name="type"
              placeholder="Type"
              value={filters.type}
              onChange={handleFilterChange}
            />
          </div>
        </div>
        <button className="add-freq-btn" onClick={handleAdd}>Add Frequency</button>
      </div>

      <div className="form">
        <input
          type="text"
          placeholder="Frequency (MHz)"
          value={form.frequency}
          onChange={(e) => setForm({ ...form, frequency: e.target.value })}
        />
        <input
          type="text"
          placeholder="City"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
        />
        <input
          type="text"
          placeholder="Type"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        />
        <input
          type="text"
          placeholder="Latitude"
          value={form.lat}
          onChange={(e) => setForm({ ...form, lat: e.target.value })}
        />
        <input
          type="text"
          placeholder="Longitude"
          value={form.lng}
          onChange={(e) => setForm({ ...form, lng: e.target.value })}
        />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Frequency</th>
              <th>City</th>
              <th>Type</th>
              <th>Latitude</th>
              <th>Longitude</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f, i) => (
              <tr key={i}>
                <td style={{ backgroundColor: signalColors[getSignalCategory(f.type)] || 'gray' }}>
                  {f.frequency}
                </td>
                <td>{f.city}</td>
                <td>{f.type}</td>
                <td>{f.lat}</td>
                <td>{f.lng}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MainPage;
