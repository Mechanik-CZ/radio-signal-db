import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import MainPage from "./MainPage";
import HelpPage from "./HelpPage";
import "./App.css";

function App() {
  return (
    <Router>
      <nav className="nav">
        <Link to="/" className="nav-link">Home</Link>
        <Link to="/help" className="nav-link">Help</Link>
      </nav>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/help" element={<HelpPage />} />
      </Routes>
    </Router>
  );
}

export default App;
