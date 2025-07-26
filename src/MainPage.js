import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import './App.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

const colorMap = {
  DMR: 'red',
  NFM: 'blue',
  FM: 'blue',
  AM: 'orange',
  SSB: 'purple',
  DIGI: 'teal',
  'D-STAR': 'lime',
  TETRA: 'yellow',
  TETRAPOL: 'pink',
  C4FM: 'cyan',
  NXDN: 'brown',
  unknown: 'gray',
  '?': 'gray'
};

const MarkerWithColor = ({ position, signalType, children }) => {
  const markerColor = colorMap[signalType?.toUpperCase()] || 'gray';
  const icon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color:${markerColor}; width:12px; height:12px; border-radius:50%;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });

  return <Marker position={position} icon={icon}>{children}</Marker>;
};

const ClickHandler = ({ onClick }) => {
  useMapEvents({
    click(e) {
      onClick(e.latlng);
    }
  });
  return null;
};

function MainPage() {
  const [frequencies, setFrequencies] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [sortField, setSortField] = useState('frequency');
  const [sortAsc, setSortAsc] = useState(true);
  const [filters, setFilters] = useState({ city: '', type: '', freq: '' });

  useEffect(() => {
    axios.get('/api/frequencies').then(res => {
      setFrequencies(res.data);
      setFiltered(res.data);
    });
  }, []);

  useEffect(() => {
    let result = [...frequencies];
    if (filters.city) result = result.filter(f => f.city.toLowerCase().includes(filters.city.toLowerCase()));
    if (filters.type) result = result.filter(f => f.type.toLowerCase().includes(filters.type.toLowerCase()));
    if (filters.freq) result = result.filter(f => f.frequency.toString().includes(filters.freq));
    setFiltered(result);
  }, [filters, frequencies]);

  const sortData = field => {
    const isAsc = sortField === field ? !sortAsc : true;
    const sorted = [...filtered].sort((a, b) => {
      if (field === 'frequency') return isAsc ? a.frequency - b.frequency : b.frequency - a.frequency;
      return isAsc ? a[field].localeCompare(b[field]) : b[field].localeCompare(a[field]);
    });
    setSortField(field);
    setSortAsc(isAsc);
    setFiltered(sorted);
  };

  const addFrequency = (latlng) => {
    const newFreq = {
      id: Date.now(),
      frequency: 0,
      city: 'New City',
      type: 'unknown',
      lat: latlng.lat,
      lon: latlng.lng
    };
    const updated = [...frequencies, newFreq];
    setFrequencies(updated);
    setFiltered(updated);
    axios.post('/api/frequencies', newFreq); // Save to server
  };

  return (
    <div className="fullscreen-container">
      <div className="top-row">
        <MapContainer center={[50.08, 14.44]} zoom={6} className="map">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap"
          />
          <ClickHandler onClick={addFrequency} />
          {filtered.map(freq => (
            <MarkerWithColor
              key={freq.id}
              position={[freq.lat, freq.lon]}
              signalType={freq.type}
            >
              <Popup>
                <strong>{freq.frequency} MHz</strong><br />
                {freq.city}<br />
                Type: {freq.type}
              </Popup>
            </MarkerWithColor>
          ))}
        </MapContainer>

        <div className="filters-box">
          <div className="filters-label">Filters</div>
          <input
            type="text"
            placeholder="City"
            value={filters.city}
            onChange={e => setFilters({ ...filters, city: e.target.value })}
          />
          <input
            type="text"
            placeholder="Type"
            value={filters.type}
            onChange={e => setFilters({ ...filters, type: e.target.value })}
          />
          <input
            type="text"
            placeholder="Frequency"
            value={filters.freq}
            onChange={e => setFilters({ ...filters, freq: e.target.value })}
          />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => sortData('frequency')}>Frequency</th>
              <th onClick={() => sortData('city')}>City</th>
              <th onClick={() => sortData('type')}>Type</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(freq => (
              <tr key={freq.id}>
                <td style={{ backgroundColor: colorMap[freq.type?.toUpperCase()] || 'gray' }}>
                  {freq.frequency}
                </td>
                <td>{freq.city}</td>
                <td>{freq.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MainPage;
