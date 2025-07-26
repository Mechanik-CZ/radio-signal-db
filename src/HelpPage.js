import React from 'react';
import './App.css';

const HelpPage = () => {
  return (
    <div className="container">
      <h2>Help</h2>
      <p>
        To log a new frequency, click on the map to select a location,
        then fill in the frequency, city, and signal type in the form below.
        Click "Add Frequency" to save the entry.
      </p>

      <h3>Color Legend</h3>
      <ul>
        <li><strong style={{ color: 'blue' }}>Blue</strong>: Analog signals (NFM, FM, BFM, AM, NAM, SSB, USB, LSB, DSB)</li>
        <li><strong style={{ color: 'red' }}>Red</strong>: Common digital signals (DMR, D-STAR, TETRA, TETRAPOL, NXDN)</li>
        <li><strong style={{ color: 'green' }}>Green</strong>: Simple digital modes (RTTY, FT8, FT4, PACKET, DIGI)</li>
        <li><strong style={{ color: 'gray' }}>Gray</strong>: Unknown or unspecified type</li>
      </ul>
    </div>
  );
};

export default HelpPage;
