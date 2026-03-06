import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth";

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink to={to} className={({ isActive }) => (isActive ? "active" : "")}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: "rgba(255,255,255,0.35)" }} />
      <span>{label}</span>
    </NavLink>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const { auth, logout } = useAuth();
  const role = auth?.role;

  return (
    <div className="container">
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <div className="logo">RA</div>
            <div>
              <h1>RioAutocom tech</h1>
              <p>{role ? `Perfil: ${role}` : "—"}</p>
            </div>
          </div>

          <nav className="nav" style={{ display:"grid", gap:6 }}>
            <NavItem to="/tickets" label="Tickets" />
            {role === "ADMIN" && <NavItem to="/admin" label="Admin" />}
            {role === "ADMIN" && <NavItem to="/accesses" label="Acessos" />}
            <NavItem to="/me" label="Minha conta" />
          </nav>

          <div className="sep" />
          <button className="btn danger" onClick={logout}>Sair</button>
          <p className="small" style={{ marginTop: 10 }}>
            Dica: no celular, abra no Chrome e toque em <b>Adicionar à tela inicial</b>.
          </p>
        </aside>

        <main className="content">
          <div className="topbar">
            <div>
              <div style={{ fontWeight: 800 }}>Olá, {auth?.username || "usuário"} 👋</div>
              <div className="small">App único (cliente / técnico / admin) — UI muda pelo login.</div>
            </div>
            <div className="badge">{new Date().toLocaleString("pt-BR")}</div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
