import React from "react";

const HelpPage = () => {
  return (
    <div className="container help-page">
      <h2>❓ Help - Radio Signal Database</h2>

      <h3>🗺️ The map</h3>
      <ul>
        <li>Each pin is a frequency. Click a pin to see its details, or click a signal's row in the table below to highlight it and draw its coverage circle (if it has a radius).</li>
        <li>Pins that sit very close together are grouped into one marker - click it to see the list and pick one.</li>
        <li><b>📍 My Location</b> centers the map on you (your browser will ask permission).</li>
        <li><b>Click anywhere on the empty map</b> to open the "Add Frequency" form pre-filled with that spot's coordinates.</li>
      </ul>

      <h3>🎨 Marker &amp; frequency colors</h3>
      <p>Colors are assigned automatically from the <b>Type</b> field (also shown as a legend on the main page):</p>
      <ul>
        <li><b style={{ color: "#5b9bd5" }}>Blue</b> - analog signals (FM, NFM, BFM, AM, NAM, SSB, USB, LSB, DSB)</li>
        <li><b style={{ color: "#e06666" }}>Red</b> - common digital signals (DMR, D-STAR, TETRA, TETRAPOL, NXDN, C4FM)</li>
        <li><b style={{ color: "#6aa84f" }}>Green</b> - simple digital signals (RTTY, FT8, FT4, PACKET, DIGI)</li>
        <li><b style={{ color: "#8e7cc3" }}>Violet</b> - ČTÚ measurement points</li>
        <li><b>Grey</b> - unknown or anything else</li>
      </ul>

      <h3>🔎 Filters &amp; table</h3>
      <ul>
        <li>The <b>Filters</b> box (City, Frequency, Type, Description) narrows the map and table together as you type. <b>Clear</b> resets them.</li>
        <li>Click a column header (Frequency, City, Lat, Lon, Type, Description) to sort by it; click again to reverse the order.</li>
        <li>The count above the table shows how many results match your current filters.</li>
      </ul>

      <h3>➕ Adding a frequency</h3>
      <p>
        Anyone can add a new frequency - no login needed. Click <b>➕ Add Frequency</b> (or click the
        map), fill in Frequency (MHz), City, Latitude/Longitude, Type and Description, pick a
        Radius, and click <b>✅ Save</b>. To keep things tidy, the server only allows one new
        frequency every 30 seconds per visitor.
      </p>

      <h3>👍 Voting</h3>
      <p>
        Each row has <b>▲</b>/<b>▼</b> buttons with vote counts. Use them to say whether a
        frequency looks right or wrong. You can vote once per frequency.
      </p>

      <h3>🚩 Suggesting a change</h3>
      <p>
        See something wrong with an existing entry? Click the <b>🚩</b> icon in its Actions
        column. You can suggest an edit (prefilled with the current values - just change what's
        wrong) or suggest the entry be deleted, with an optional note explaining why. A moderator
        or admin will review it.
      </p>

      <h3>🔐 Moderators &amp; admins</h3>
      <p>
        Everything above works for everyone, with no account. Logging in (<b>Login</b> link,
        top right) unlocks extra tools for people who manage the database:
      </p>
      <ul>
        <li><b>Moderator</b>: edit any frequency directly (✏️ icon), and review reports under <b>Reports</b> - approve, reject, or edit-and-approve a suggested change.</li>
        <li><b>Admin</b>: everything a moderator can do, plus delete frequencies directly (🗑️ icon), approve deletion reports, and manage moderators under <b>Users</b> (invite new ones, remove the role).</li>
      </ul>

      <h3>⚠️ Legal</h3>
      <p>
        This website does not encourage piracy. Data shown here was collected from publicly
        available sources and is provided for informational purposes only. Use responsibly and
        follow local law.
      </p>
    </div>
  );
};

export default HelpPage;
