import React from "react";
import {
  AnyDeskAccess,
  adminCreateAnyDeskAccess,
  adminDeleteAnyDeskAccess,
  adminListAnyDeskAccesses,
  adminListStores,
  adminUpdateAnyDeskAccess,
} from "../api";
import { useAuth } from "../auth";
import { useToast } from "../components/Toast";

type StoreOption = { id: string; name: string; cnpj: string };
type FormState = {
  id?: string;
  store_id: string;
  label: string;
  anydesk_id: string;
  notes: string;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  store_id: "",
  label: "Acesso principal",
  anydesk_id: "",
  notes: "",
  active: true,
};

function normalizeAnyDeskId(value: string) {
  return value.replace(/\D+/g, "");
}

export default function AccessesPage() {
  const { role } = useAuth();
  const { show, Toast } = useToast();

  const [stores, setStores] = React.useState<StoreOption[]>([]);
  const [items, setItems] = React.useState<AnyDeskAccess[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [storeFilter, setStoreFilter] = React.useState("");
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [storesData, accessesData] = await Promise.all([
        adminListStores(),
        adminListAnyDeskAccesses({ q: query.trim() || undefined, store_id: storeFilter || undefined }),
      ]);
      setStores(storesData);
      setItems(accessesData);
    } catch (err: any) {
      show(err?.message || "Erro ao carregar acessos", "error");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (role === "ADMIN") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  if (role !== "ADMIN") {
    return (
      <div className="card">
        <div className="h2">Acessos</div>
        <div className="small">Acesso restrito.</div>
      </div>
    );
  }

  const resetForm = () => setForm(EMPTY_FORM);

  const submit = async () => {
    const payload = {
      store_id: form.store_id,
      label: form.label.trim(),
      anydesk_id: normalizeAnyDeskId(form.anydesk_id),
      notes: form.notes.trim() || undefined,
      active: form.active,
    };

    if (!payload.store_id || !payload.label || !payload.anydesk_id) {
      show("Preencha loja, etiqueta e ID AnyDesk.", "error");
      return;
    }

    setSaving(true);
    try {
      if (form.id) {
        await adminUpdateAnyDeskAccess(form.id, payload);
        show("Acesso atualizado!", "success");
      } else {
        await adminCreateAnyDeskAccess(payload);
        show("Acesso cadastrado!", "success");
      }
      resetForm();
      await load();
    } catch (err: any) {
      show(err?.message || "Erro ao salvar acesso", "error");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: AnyDeskAccess) => {
    setForm({
      id: item.id,
      store_id: item.store_id,
      label: item.label,
      anydesk_id: item.anydesk_id,
      notes: item.notes || "",
      active: item.active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (item: AnyDeskAccess) => {
    const ok = window.confirm(`Excluir o acesso ${item.label} da loja ${item.store_name}?`);
    if (!ok) return;

    try {
      await adminDeleteAnyDeskAccess(item.id);
      show("Acesso excluído!", "success");
      if (form.id === item.id) resetForm();
      await load();
    } catch (err: any) {
      show(err?.message || "Erro ao excluir acesso", "error");
    }
  };

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      show("ID copiado!", "success");
    } catch {
      show("Não foi possível copiar o ID.", "error");
    }
  };

  const openAnyDesk = (id: string) => {
    const cleaned = normalizeAnyDeskId(id);
    try {
      window.location.href = `anydesk:${cleaned}`;
      show("Tentando abrir o AnyDesk...", "success");
    } catch {
      show("Não foi possível abrir o AnyDesk neste dispositivo.", "error");
    }
  };

  return (
    <div className="grid">
      <div className="col-12 card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "start", gap: 16 }}>
          <div>
            <div className="h2">Acessos</div>
            <div className="small">Cadastre e abra os IDs do AnyDesk das lojas. Área visível somente para ADMIN.</div>
          </div>
          <button className="btn" onClick={load} disabled={loading}>{loading ? "Atualizando..." : "Atualizar"}</button>
        </div>
      </div>

      <div className="col-5 card">
        <div className="h2">{form.id ? "Editar acesso" : "Novo acesso"}</div>
        <div className="grid">
          <div className="col-12">
            <label>Loja</label>
            <select value={form.store_id} onChange={(e) => setForm({ ...form, store_id: e.target.value })}>
              <option value="">Selecione...</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
          <div className="col-12">
            <label>Etiqueta / nome do acesso</label>
            <input className="input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex.: Servidor, Caixa 1, Retaguarda" />
          </div>
          <div className="col-12">
            <label>ID AnyDesk</label>
            <input
              className="input"
              value={form.anydesk_id}
              onChange={(e) => setForm({ ...form, anydesk_id: normalizeAnyDeskId(e.target.value) })}
              placeholder="Ex.: 123456789"
              inputMode="numeric"
            />
          </div>
          <div className="col-12">
            <label>Observações</label>
            <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ex.: Servidor principal da loja" />
          </div>
          <div className="col-12">
            <label>
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              <span style={{ marginLeft: 8 }}>Acesso ativo</span>
            </label>
          </div>
          <div className="col-12 row" style={{ justifyContent: "space-between" }}>
            <div className="row">
              <button className="btn primary" onClick={submit} disabled={saving}>{saving ? "Salvando..." : (form.id ? "Salvar alterações" : "Cadastrar")}</button>
              {form.id && <button className="btn" onClick={resetForm}>Cancelar edição</button>}
            </div>
          </div>
        </div>
      </div>

      <div className="col-7 card">
        <div className="h2">Busca</div>
        <div className="grid">
          <div className="col-7">
            <label>Pesquisar</label>
            <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Loja, etiqueta, ID ou observação" />
          </div>
          <div className="col-5">
            <label>Filtrar por loja</label>
            <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)}>
              <option value="">Todas</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
          <div className="col-12 row">
            <button className="btn" onClick={load} disabled={loading}>{loading ? "Buscando..." : "Buscar"}</button>
            <button className="btn" onClick={() => { setQuery(""); setStoreFilter(""); }}>Limpar filtros</button>
          </div>
        </div>
      </div>

      <div className="col-12 card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="h2">Lista de acessos</div>
            <div className="small">Clique em <b>Abrir</b> para tentar iniciar o AnyDesk no dispositivo atual.</div>
          </div>
          <div className="badge">{items.length} acesso(s)</div>
        </div>

        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Loja</th>
                <th>Etiqueta</th>
                <th>ID AnyDesk</th>
                <th>Obs.</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 800 }}>{item.store_name}</div>
                  </td>
                  <td>{item.label}</td>
                  <td>
                    <button className="link-btn" onClick={() => openAnyDesk(item.anydesk_id)}>
                      {item.anydesk_id}
                    </button>
                  </td>
                  <td className="small">{item.notes || "—"}</td>
                  <td>
                    <span className={`badge ${item.active ? "ok" : "danger"}`}>{item.active ? "ATIVO" : "INATIVO"}</span>
                  </td>
                  <td>
                    <div className="row" style={{ flexWrap: "wrap" }}>
                      <button className="btn primary" onClick={() => openAnyDesk(item.anydesk_id)}>Abrir</button>
                      <button className="btn" onClick={() => copyId(item.anydesk_id)}>Copiar ID</button>
                      <button className="btn" onClick={() => startEdit(item)}>Editar</button>
                      <button className="btn danger" onClick={() => remove(item)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="small">Nenhum acesso cadastrado.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Toast />
    </div>
  );
}
