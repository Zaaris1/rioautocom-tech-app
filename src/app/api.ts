export const API_BASE = (import.meta as any).env.VITE_API_BASE || "https://rioautocom-tech-backend.onrender.com";

export type Role = "ADMIN" | "TECH" | "CLIENT";
export type AuthState = { access_token: string; role: Role; must_change_password?: boolean; username?: string; };

const LS_KEY = "rioautocom_auth_v1";

export function getAuth(): AuthState | null {
  try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) as AuthState : null; } catch { return null; }
}
export function setAuth(a: AuthState | null) { if (!a) localStorage.removeItem(LS_KEY); else localStorage.setItem(LS_KEY, JSON.stringify(a)); }

export async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const auth = getAuth();
  const headers = new Headers(opts.headers || {});
  headers.set("Accept", "application/json");
  if (opts.body && !(opts.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (auth?.access_token) headers.set("Authorization", `Bearer ${auth.access_token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error((data && (data.detail || data.message)) ? (data.detail || data.message) : `HTTP ${res.status}`);
  return data as T;
}

export async function login(username: string, password: string) {
  const data = await apiFetch<AuthState>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
  setAuth({ ...data, username });
  return data;
}
export async function changePassword(old_password: string, new_password: string) {
  return apiFetch<{ ok: boolean }>("/auth/change-password", { method: "POST", body: JSON.stringify({ old_password, new_password }) });
}

export type Store = { id: string; name: string; cnpj: string; active?: boolean; network_id?: string | null; };
export type Network = { id: string; name: string; active: boolean; };


export type AnyDeskAccess = {
  id: string;
  store_id: string;
  store_name?: string | null;
  label: string;
  anydesk_id: string;
  notes?: string | null;
  active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};
export type TicketStatus = "ABERTO" | "ATRIBUIDO" | "EM_ATENDIMENTO" | "PENDENTE" | "CONCLUIDO";
export type Ticket = {
  id: string; store_id: string; store_name?: string;
  requester_name: string; local: string; problem: string;
  type: "REPARO" | "INSTALACAO" | "SERVICO" | "VISITA_TECNICA";
  priority: "NORMAL" | "URGENTE";
  status: TicketStatus;
  assigned_to?: string | null;
  created_at?: string; updated_at?: string;
};
export type TicketUpdate = { id: string; ticket_id: string; action: string; message?: string | null; created_at?: string; actor?: string | null; };

export async function listStores(params?: { network_id?: string }) {
  const qs = new URLSearchParams();
  if (params?.network_id) qs.set("network_id", params.network_id);
  const q = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<Store[]>(`/stores/${q}`, { method: "GET" });
}
export async function listNetworks() { return apiFetch<Network[]>("/networks/", { method: "GET" }); }
export async function listTickets(params?: { status?: string; mine?: boolean; network_id?: string; store_id?: string; open_only?: boolean; mine_only?: boolean }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.mine) qs.set("mine", "true");
  if (params?.network_id) qs.set("network_id", params.network_id);
  if (params?.store_id) qs.set("store_id", params.store_id);
  if (params?.open_only) qs.set("open_only", "true");
  if (params?.mine_only) qs.set("mine_only", "true");
  const q = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<Ticket[]>(`/tickets/${q}`, { method: "GET" });
}
export async function getTicket(ticketId: string) { return apiFetch<{ ticket: Ticket; updates: TicketUpdate[] }>(`/tickets/${ticketId}`, { method: "GET" }); }
export async function createTicket(input: { store_id: string; requester_name: string; local: string; problem: string; type: Ticket["type"]; priority: Ticket["priority"]; }) {
  return apiFetch<Ticket>("/tickets/", { method: "POST", body: JSON.stringify(input) });
}
export async function assignTicket(ticketId: string, username?: string) {
  return apiFetch<Ticket>(`/tickets/${ticketId}/assign`, { method: "POST", body: JSON.stringify(username ? { username } : {}) });
}
export async function startTicket(ticketId: string) { return apiFetch<Ticket>(`/tickets/${ticketId}/start`, { method: "POST" }); }
export async function pendTicket(ticketId: string, message?: string) { return apiFetch<Ticket>(`/tickets/${ticketId}/pend`, { method: "POST", body: JSON.stringify({ message: message || "" }) }); }
export async function commentTicket(ticketId: string, message: string) { return apiFetch<TicketUpdate>(`/tickets/${ticketId}/comment`, { method: "POST", body: JSON.stringify({ message }) }); }
export async function closeTicket(ticketId: string, parecer: string) { return apiFetch<Ticket>(`/tickets/${ticketId}/close`, { method: "POST", body: JSON.stringify({ parecer }) }); }

// Admin minimal
export type CreateUserInput = { username: string; role: Role; password: string; must_change_password?: boolean; };
export async function adminListUsers() { return apiFetch<any[]>("/admin/users", { method: "GET" }); }
export async function adminCreateUser(input: CreateUserInput) { return apiFetch<any>("/admin/users", { method: "POST", body: JSON.stringify(input) }); }
export async function adminListStores() { return apiFetch<any[]>("/admin/stores", { method: "GET" }); }
export async function adminCreateStore(input: { name: string; cnpj: string }) { return apiFetch<any>("/admin/stores", { method: "POST", body: JSON.stringify(input) }); }
export async function adminGrantStore(client_id: string, store_id: string) { return apiFetch<any>(`/admin/clients/${client_id}/stores/${store_id}`, { method: "POST" }); }


export async function adminListAnyDeskAccesses(params?: { q?: string; store_id?: string }) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.store_id) qs.set("store_id", params.store_id);
  const q = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<AnyDeskAccess[]>(`/accesses/${q}`, { method: "GET" });
}
export async function adminCreateAnyDeskAccess(input: { store_id: string; label: string; anydesk_id: string; notes?: string; active?: boolean }) {
  return apiFetch<AnyDeskAccess>("/accesses/", { method: "POST", body: JSON.stringify(input) });
}
export async function adminUpdateAnyDeskAccess(access_id: string, input: { store_id?: string; label?: string; anydesk_id?: string; notes?: string; active?: boolean }) {
  return apiFetch<AnyDeskAccess>(`/accesses/${access_id}`, { method: "PATCH", body: JSON.stringify(input) });
}
export async function adminDeleteAnyDeskAccess(access_id: string) {
  return apiFetch<{ ok: boolean }>(`/accesses/${access_id}`, { method: "DELETE" });
}
