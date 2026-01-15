import React from "react";
import { Link } from "react-router-dom";
import { Ticket, listTickets, listNetworks, listStores } from "../api";
import { useAuth } from "../auth";
import { useToast } from "../components/Toast";

function statusBadge(s: string) {
  if (s === "CONCLUIDO") return <span className="badge ok">CONCLUÍDO</span>;
  if (s === "PENDENTE") return <span className="badge warn">PENDENTE</span>;
  if (s === "EM_ATENDIMENTO") return <span className="badge">EM ATENDIMENTO</span>;
  if (s === "ATRIBUIDO") return <span className="badge">ATRIBUÍDO</span>;
  return <span className="badge">ABERTO</span>;
}

export default function TicketsPage() {
  const { role } = useAuth();
  const { show, Toast } = useToast();

  const isAdmin = role === "ADMIN";

  const [loading, setLoading] = React.useState(true);
  const [tickets, setTickets] = React.useState<Ticket[]>([]);

  const [status, setStatus] = React.useState("");
  const [networks, setNetworks] = React.useState<any[]>([]);
  const [stores, setStores] = React.useState<any[]>([]);

  const [networkId, setNetworkId] = React.useState("");
  const [storeId, setStoreId] = React.useState("");

  // ✅ NOVO: Ocultar concluídos (somente ADMIN), marcado por padrão
  const [hideConcluded, setHideConcluded] = React.useState<boolean>(false);
  const initHideRef = React.useRef(false);

  // garante default = true para ADMIN quando role chega (primeira vez)
  React.useEffect(() => {
    if (initHideRef.current) return;
    if (isAdmin) {
      setHideConcluded(true);
      initHideRef.current = true;
    } else if (role) {
      // se já sabemos que não é admin, considera inicializado também
      initHideRef.current = true;
    }
  }, [isAdmin, role]);

  // carregar redes
  const loadNetworks = async () => {
    try {
      const list = await listNetworks();
      // ordena por nome (melhor UX)
      const sorted = Array.isArray(list) ? [...list].sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || ""))) : [];
      setNetworks(sorted);
    } catch {
      show("Erro ao carregar redes", "error");
    }
  };

  // carregar lojas (dependente da rede)
  const loadStores = async (netId?: string) => {
    try {
      const list = await listStores(netId ? { network_id: netId } : undefined);
      // ordena por nome (melhor UX)
      const sorted = Array.isArray(list) ? [...list].sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || ""))) : [];
      setStores(sorted);
    } catch {
      show("Erro ao carregar lojas", "error");
    }
  };

  const loadTickets = async () => {
    setLoading(true);
    try {
      const list = await listTickets({
        status: status || undefined,
        network_id: networkId || undefined,
        store_id: storeId || undefined,
      } as any);

      // ✅ aplica ocultação de concluídos apenas para ADMIN e apenas se marcado
      const filtered =
        isAdmin && hideConcluded && !status
          ? (list || []).filter((t: Ticket) => t?.status !== "CONCLUIDO")
          : list;

      setTickets(filtered || []);
    } catch (err: any) {
      show(err?.message || "Erro ao carregar tickets", "error");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadNetworks();
    loadStores();
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    // quando troca a rede:
    setStoreId(""); // limpa loja
    loadStores(networkId); // carrega lojas da rede
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networkId]);

  React.useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, status, hideConcluded]);

  return (
    <div className="grid">
      <div className="col-12 card">
        <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="h2">Tickets</div>
            <div className="small">
              {role === "TECH"
                ? "Você vê e assume tickets abertos, e gerencia o atendimento."
                : role === "CLIENT"
                ? "Você consulta seus tickets e histórico."
                : "Admin vê tudo e pode criar tickets."}
            </div>
          </div>

          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            {/* ✅ ADMIN ONLY: Ocultar concluídos */}
            {isAdmin && (
              <label
                className="small"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(0,0,0,0.18)",
                }}
                title="Quando marcado, tickets CONCLUÍDOS não aparecem (a menos que você filtre por status)."
              >
                <input
                  type="checkbox"
                  checked={!!hideConcluded}
                  onChange={(e) => setHideConcluded(e.target.checked)}
                />
                Ocultar concluídos
              </label>
            )}

            {/* Rede */}
            <select value={networkId} onChange={(e) => setNetworkId(e.target.value)}>
              <option value="">Todas as redes</option>
              {networks.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>

            {/* Loja */}
            <select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
              <option value="">Todas as lojas</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Status */}
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="ABERTO">ABERTO</option>
              <option value="ATRIBUIDO">ATRIBUÍDO</option>
              <option value="EM_ATENDIMENTO">EM ATENDIMENTO</option>
              <option value="PENDENTE">PENDENTE</option>
              <option value="CONCLUIDO">CONCLUÍDO</option>
            </select>

            <button className="btn" onClick={loadTickets} disabled={loading}>
              {loading ? "Atualizando..." : "Atualizar"}
            </button>
          </div>
        </div>
      </div>

      <div className="col-12 card">
        {loading ? (
          <div className="small">Carregando...</div>
        ) : tickets.length === 0 ? (
          <div className="small">Nenhum ticket encontrado.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Loja</th>
                <th>Tipo</th>
                <th>Prioridade</th>
                <th>Local</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td>{statusBadge(t.status)}</td>
                  <td>
                    <div style={{ fontWeight: 800 }}>{t.store_name || t.store_id}</div>
                    <div className="small">{t.requester_name}</div>
                  </td>
                  <td>
                    <span className="badge">{t.type}</span>
                  </td>
                  <td>
                    <span className={"badge " + (t.priority === "URGENTE" ? "danger" : "")}>{t.priority}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 650 }}>{t.local}</div>
                    <div
                      className="small"
                      style={{ maxWidth: 360, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      {t.problem}
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link className="btn primary" to={`/tickets/${t.id}`}>
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Toast />
    </div>
  );
}
