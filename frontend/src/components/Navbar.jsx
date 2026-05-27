import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import CreateSessionModal from "./CreateSessionModal";

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isActive = (p) => location.pathname === p;

  return (
    <>
      <style>{`
        .nav-inner {
          max-width: 1280px; margin: 0 auto;
          padding: 0 16px; height: 60px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px;
        }
        .nav-logo {
          font-family: 'Fraunces', serif; font-size: 1.2rem; font-weight: 600;
          color: var(--text); text-decoration: none; white-space: nowrap;
        }
        .nav-links { display: flex; align-items: center; gap: 2px; }
        .nav-link {
          padding: 6px 12px; border-radius: var(--r-sm);
          font-size: 0.84rem; font-weight: 500;
          transition: all .15s; text-decoration: none; white-space: nowrap;
        }
        .nav-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .user-chip {
          display: flex; align-items: center; gap: 6px;
          padding: 4px 10px 4px 5px; border-radius: 100px;
          border: 1px solid var(--border); font-size: 0.78rem; font-weight: 500;
          cursor: pointer; background: var(--surface); white-space: nowrap;
        }
        @media (max-width: 480px) {
          .nav-links { display: none; }
          .nav-logo { font-size: 1.1rem; }
        }
      `}</style>

      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(250,250,247,.92)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="nav-inner">
          <Link to="/" className="nav-logo">
            Skill<span style={{ color: "var(--accent)" }}>Flow</span>
          </Link>

          <div className="nav-links">
            <Link
              to="/"
              className="nav-link"
              style={{
                background: isActive("/") ? "var(--accent-bg)" : "transparent",
                color: isActive("/") ? "var(--accent)" : "var(--text-2)",
              }}
            >
              Home
            </Link>
            <Link
              to="/browse"
              className="nav-link"
              style={{
                background: isActive("/browse")
                  ? "var(--accent-bg)"
                  : "transparent",
                color: isActive("/browse") ? "var(--accent)" : "var(--text-2)",
              }}
            >
              Browse
            </Link>
          </div>

          <div className="nav-right">
            {user ? (
              <>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowCreate(true)}
                >
                  + Teach
                </button>
                <div style={{ position: "relative" }}>
                  <div
                    className="user-chip"
                    onClick={() => setShowMenu((m) => !m)}
                  >
                    <div
                      className="avatar avatar-sm"
                      style={{ background: user.avatar_color }}
                    >
                      {user.name[0].toUpperCase()}
                    </div>
                    <span
                      style={{
                        maxWidth: 80,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {user.name.split(" ")[0]}
                    </span>
                  </div>
                  {showMenu && (
                    <div
                      style={{
                        position: "absolute",
                        right: 0,
                        top: "110%",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--r-sm)",
                        boxShadow: "var(--shadow)",
                        minWidth: 150,
                        overflow: "hidden",
                        zIndex: 99,
                      }}
                    >
                      <button
                        className="btn btn-ghost"
                        style={{
                          width: "100%",
                          justifyContent: "flex-start",
                          borderRadius: 0,
                          padding: "10px 16px",
                          color: "var(--live)",
                          fontSize: "0.84rem",
                        }}
                        onClick={() => {
                          logout();
                          setShowMenu(false);
                          navigate("/");
                        }}
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link to="/auth" className="btn btn-primary btn-sm">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </nav>

      {showCreate && (
        <CreateSessionModal onClose={() => setShowCreate(false)} />
      )}
    </>
  );
}
