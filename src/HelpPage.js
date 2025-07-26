import React from "react";

const HelpPage = () => {
  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "auto" }}>
      <h1>Help - Radio Signal Database</h1>
      <h2>How to Add a New Frequency</h2>
      <p>
        1. Click on the map at the location where you want to add a new frequency.
        <br />
        2. Confirm the popup to create a new frequency entry at that location.
        <br />
        3. Fill in the frequency (MHz), city, type, description, and coordinates.
        <br />
        4. Click "Save" to add it to the database.
      </p>

      <h2>Defined Colors</h2>
      <ul>
        <li><b>Blue</b>: Analog signals (FM, NFM, AM, SSB, USB, LSB, etc.)</li>
        <li><b>Red</b>: Common digital signals (DMR, D-STAR, TETRA, TETRAPOL, NXDN, C4FM)</li>
        <li><b>Green</b>: Simple digital signals (RTTY, FT8, FT4, PACKET, DIGI)</li>
        <li><b>Grey</b>: Unknown or undefined signal types</li>
      </ul>

      <h2>Notes</h2>
      <p>
        Use consistent naming for signal types to ensure proper categorization and coloring.
      </p>
    </div>
  );
};

export default HelpPage;
