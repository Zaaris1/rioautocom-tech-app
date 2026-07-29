import React from "react";
import {
  adminCreateNetwork,
  adminCreateStore,
  adminCreateUser,
  adminGrantStore,
  adminListNetworks,
  adminListStores,
  adminListUsers,
  adminUpdateNetwork,
  Network,
} from "../api";
import { useAuth } from "../auth";
import { useToast } from "../components/Toast";

export default function AdminPage() {
  const { role } = useAuth();
  const { show, Toast } = useToast();

  const [users, setUsers] = React.useState<any[]>([]);
  const [stores, setStores] = React.useState<any[]>([]);
  const [networks, setNetworks] = React.useState<Network[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [savingNetwork, setSavingNetwork] = React.useState(false);

  const [newUser, setNewUser] = React.useState({ username:"", role:"TECH", password:"", must_change_password:true });
  const [newStore, setNewStore] = React.useState({ name:"", cnpj:"" });
  const [newNetworkName, setNewNetworkName] = React.useState("");
  const [editingNetwork, setEditingNetwork] = React.useState<Network | null>(null);
  const [grant, setGrant] = React.useState({ client_id:"", store_id:"" });

  const load = async () => {
    setLoading(true);
    try {
      const [u, s, n] = await Promise.all([adminListUsers(), adminListStores(), adminListNetworks()]);
      setUsers(u); setStores(s);
      setNetworks([...n].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err:any) {
      show(err?.message || "Erro ao carregar admin", "error");
    } finally { setLoading(false); }
  };

  React.useEffect(() => { if (role === "ADMIN") load(); }, [role]);

  if (role !== "ADMIN") return <div className="card"><div className="h2">Admin</div><div className="small">Acesso restrito.</div></div>;

  const createUser = async () => {
    try {
      await adminCreateUser({
        username: newUser.username.trim(),
        role: newUser.role as any,
        password: newUser.password,
        must_change_password: !!newUser.must_change_password
      });
      show("Usuário criado!", "success");
      setNewUser({ username:"", role:"TECH", password:"", must_change_password:true });
      await load();
    } catch (err:any) { show(err?.message || "Erro ao criar usuário", "error"); }
  };

  const createStore = async () => {
    try {
      await adminCreateStore({ name: newStore.name.trim(), cnpj: newStore.cnpj.trim() });
      show("Loja criada!", "success");
      setNewStore({ name:"", cnpj:"" });
      await load();
    } catch (err:any) { show(err?.message || "Erro ao criar loja", "error"); }
  };

  const doGrant = async () => {
    try { await adminGrantStore(grant.client_id.trim(), grant.store_id.trim()); show("Acesso liberado!", "success"); }
    catch (err:any) { show(err?.message || "Erro ao liberar acesso", "error"); }
  };

  const createNetwork = async () => {
    const name = newNetworkName.trim();
    if (!name) return;
    setSavingNetwork(true);
    try {
      await adminCreateNetwork({ name });
      setNewNetworkName("");
      show("Rede criada!", "success");
      await load();
    } catch (err:any) { show(err?.message || "Erro ao criar rede", "error"); }
    finally { setSavingNetwork(false); }
  };

  const saveNetwork = async () => {
    if (!editingNetwork) return;
    const name = editingNetwork.name.trim();
    if (!name) {
      show("Informe o nome da rede.", "error");
      return;
    }
    setSavingNetwork(true);
    try {
      await adminUpdateNetwork(editingNetwork.id, { name, active: editingNetwork.active });
      setEditingNetwork(null);
      show("Rede atualizada!", "success");
      await load();
    } catch (err:any) { show(err?.message || "Erro ao atualizar rede", "error"); }
    finally { setSavingNetwork(false); }
  };

  return (
    <div className="grid">
      <div className="col-12 card">
        <div className="row" style={{ justifyContent:"space-between" }}>
          <div><div className="h2">Admin</div><div className="small">Gerencie usuários e lojas.</div></div>
          <button className="btn" onClick={load} disabled={loading}>{loading ? "Atualizando..." : "Atualizar"}</button>
        </div>
      </div>

      <div className="col-6 card">
        <div className="h2">Criar usuário</div>
        <div className="grid">
          <div className="col-12">
            <label>username</label>
            <input className="input" value={newUser.username} onChange={(e)=>setNewUser({ ...newUser, username:e.target.value })} />
          </div>
          <div className="col-6">
            <label>role</label>
            <select value={newUser.role} onChange={(e)=>setNewUser({ ...newUser, role:e.target.value })}>
              <option value="TECH">TECH</option>
              <option value="CLIENT">CLIENT</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <div className="col-6">
            <label>senha</label>
            <input className="input" type="password" value={newUser.password} onChange={(e)=>setNewUser({ ...newUser, password:e.target.value })} />
          </div>
          <div className="col-12">
            <label>
              <input type="checkbox" checked={!!newUser.must_change_password} onChange={(e)=>setNewUser({ ...newUser, must_change_password:e.target.checked })}/>
              <span style={{ marginLeft: 8 }}>Forçar troca no primeiro login</span>
            </label>
          </div>
          <div className="col-12">
            <button className="btn primary" onClick={createUser} disabled={!newUser.username || !newUser.password}>Criar</button>
          </div>
        </div>
      </div>

      <div className="col-6 card">
        <div className="h2">Criar loja</div>
        <div className="grid">
          <div className="col-12">
            <label>Nome</label>
            <input className="input" value={newStore.name} onChange={(e)=>setNewStore({ ...newStore, name:e.target.value })} />
          </div>
          <div className="col-12">
            <label>CNPJ</label>
            <input className="input" value={newStore.cnpj} onChange={(e)=>setNewStore({ ...newStore, cnpj:e.target.value })} />
          </div>
          <div className="col-12">
            <button className="btn primary" onClick={createStore} disabled={!newStore.name || !newStore.cnpj}>Criar</button>
          </div>
        </div>
      </div>

      <div className="col-12 card">
        <div className="row" style={{ justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
          <div>
            <div className="h2">Redes de lojas</div>
            <div className="small">Crie, renomeie ou desative redes sem alterar as lojas vinculadas.</div>
          </div>
          {editingNetwork && <span className="badge">Editando rede</span>}
        </div>
        <div className="grid" style={{ marginTop:12 }}>
          <div className="col-4">
            <label>Nova rede</label>
            <input
              className="input"
              value={newNetworkName}
              onChange={(e) => setNewNetworkName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createNetwork(); }}
              placeholder="Ex.: Rede Centro"
            />
            <button className="btn primary" style={{ marginTop:10 }} onClick={createNetwork} disabled={savingNetwork || !newNetworkName.trim()}>
              Criar rede
            </button>
          </div>

          <div className="col-8">
            {editingNetwork ? (
              <div className="card" style={{ padding:12, background:"rgba(0,0,0,0.18)" }}>
                <div className="h2">Editar rede</div>
                <div className="grid">
                  <div className="col-8">
                    <label>Nome da rede</label>
                    <input className="input" value={editingNetwork.name} onChange={(e) => setEditingNetwork({ ...editingNetwork, name:e.target.value })} />
                  </div>
                  <div className="col-4">
                    <label>Status</label>
                    <select value={editingNetwork.active ? "true" : "false"} onChange={(e) => setEditingNetwork({ ...editingNetwork, active:e.target.value === "true" })}>
                      <option value="true">Ativa</option>
                      <option value="false">Inativa</option>
                    </select>
                  </div>
                  <div className="col-12 row" style={{ justifyContent:"flex-end" }}>
                    <button className="btn" onClick={() => setEditingNetwork(null)} disabled={savingNetwork}>Cancelar</button>
                    <button className="btn primary" onClick={saveNetwork} disabled={savingNetwork || !editingNetwork.name.trim()}>
                      {savingNetwork ? "Salvando..." : "Salvar alterações"}
                    </button>
                  </div>
                </div>
              </div>
            ) : networks.length === 0 ? (
              <div className="small">Nenhuma rede cadastrada.</div>
            ) : (
              <div style={{ display:"grid", gap:8 }}>
                {networks.map((network) => (
                  <div key={network.id} className="card" style={{ padding:12, background:"rgba(0,0,0,0.18)" }}>
                    <div className="row" style={{ justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
                      <div>
                        <div style={{ fontWeight:800 }}>{network.name}</div>
                        <div className="small">{network.active ? "Rede ativa" : "Rede inativa"}</div>
                      </div>
                      <button className="btn" onClick={() => setEditingNetwork({ ...network })}>Editar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="col-12 card">
        <div className="h2">Vincular cliente → loja</div>
        <div className="small">Use IDs listados abaixo.</div>
        <div className="grid" style={{ marginTop: 10 }}>
          <div className="col-4">
            <label>client_id</label>
            <input className="input" value={grant.client_id} onChange={(e)=>setGrant({ ...grant, client_id:e.target.value })} />
          </div>
          <div className="col-4">
            <label>store_id</label>
            <input className="input" value={grant.store_id} onChange={(e)=>setGrant({ ...grant, store_id:e.target.value })} />
          </div>
          <div className="col-4" style={{ display:"flex", alignItems:"end" }}>
            <button className="btn" onClick={doGrant} disabled={!grant.client_id || !grant.store_id}>Liberar acesso</button>
          </div>
        </div>
      </div>

      <div className="col-6 card">
        <div className="h2">Usuários</div>
        <div className="small">ID / username / role</div>
        <div className="sep" />
        <div style={{ display:"grid", gap:10 }}>
          {users.map(u => (
            <div key={u.id} className="card" style={{ padding:12, background:"rgba(0,0,0,0.18)" }}>
              <div style={{ fontWeight:800 }}>{u.username} <span className="badge" style={{ marginLeft:8 }}>{u.role}</span></div>
              <div className="small">{u.id}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="col-6 card">
        <div className="h2">Lojas</div>
        <div className="small">ID / nome / CNPJ</div>
        <div className="sep" />
        <div style={{ display:"grid", gap:10 }}>
          {stores.map(s => (
            <div key={s.id} className="card" style={{ padding:12, background:"rgba(0,0,0,0.18)" }}>
              <div style={{ fontWeight:800 }}>{s.name}</div>
              <div className="small">{s.id}</div>
              <div className="small">CNPJ: {s.cnpj}</div>
            </div>
          ))}
        </div>
      </div>

      <Toast />
    </div>
  );
}
