import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { apiFetch } from "./api";

export default function AdminUsersPage() {
  const { role, getToken } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [resetLink, setResetLink] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      const { users } = await apiFetch("/api/admin/users", { token });
      setUsers(users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const invite = async (e) => {
    e.preventDefault();
    setInviting(true);
    setResetLink("");
    try {
      const token = await getToken();
      const { resetLink } = await apiFetch("/api/admin/users", {
        method: "POST",
        token,
        body: { email: inviteEmail },
      });
      setResetLink(resetLink);
      setInviteEmail("");
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setInviting(false);
    }
  };

  const setRole = async (uid, newRole) => {
    try {
      const token = await getToken();
      await apiFetch(`/api/admin/users/${uid}/role`, {
        method: "POST",
        token,
        body: { role: newRole },
      });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  if (role !== "admin") {
    return <div className="container">You need to be logged in as an admin to see this page.</div>;
  }

  return (
    <div className="container">
      <h2>👥 Users</h2>
      <p className="login-hint">
        Admin accounts are created with a local script - see
        server/README.md. A role change applies the next time that person
        logs in.
      </p>

      <form className="form" onSubmit={invite}>
        <div className="filters-label">Invite a new moderator</div>
        <div className="report-type-toggle" style={{ marginTop: 8 }}>
          <input
            type="email"
            placeholder="their@email.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
            style={{ flex: 1, padding: "7px 9px", borderRadius: 4, border: "1px solid #555", background: "#1e1e1e", color: "#eee" }}
          />
          <button className="save-btn" type="submit" disabled={inviting}>
            {inviting ? "Creating…" : "Invite"}
          </button>
        </div>
        {resetLink && (
          <p className="login-hint">
            Account created. Send them this one-time link so they can set
            their own password:
            <br />
            <code>{resetLink}</code>
          </p>
        )}
      </form>

      {loading && <p>Loading…</p>}
      {error && <p className="login-error">{error}</p>}

      {!loading && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.uid}>
                  <td>{u.email}</td>
                  <td>{u.role || "-"}</td>
                  <td>
                    {u.role === "admin" ? (
                      <span className="report-meta">managed via script</span>
                    ) : u.role === "moderator" ? (
                      <button className="vote-btn down" onClick={() => setRole(u.uid, null)}>
                        Remove moderator
                      </button>
                    ) : (
                      <button className="vote-btn up" onClick={() => setRole(u.uid, "moderator")}>
                        Make moderator
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
