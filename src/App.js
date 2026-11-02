import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import MainPage from "./MainPage";
import HelpPage from "./HelpPage";
import Login from "./Login";
import ReportsPage from "./ReportsPage";
import AdminUsersPage from "./AdminUsersPage";
import { AuthProvider, useAuth } from "./AuthContext";
import "./App.css";

function Nav() {
  const { user, role, logout } = useAuth();
  return (
    <nav className="nav">
      <Link to="/" className="nav-link">Home</Link>
      <Link to="/help" className="nav-link">Help</Link>
      {(role === "admin" || role === "moderator") && (
        <Link to="/reports" className="nav-link">Reports</Link>
      )}
      {role === "admin" && <Link to="/admin/users" className="nav-link">Users</Link>}
      <span className="nav-managed-by">Managed by @mechanikcz</span>
      {user ? (
        <>
          <span className="nav-user">{user.email}{role ? ` (${role})` : ""}</span>
          <button className="nav-link nav-logout" onClick={logout}>
            Log out
          </button>
        </>
      ) : (
        <Link to="/login" className="nav-link">Login</Link>
      )}
    </nav>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Nav />
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
