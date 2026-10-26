// Camada de dados do portal RAVIERA.
// Fala com o Supabase pela API REST (sem biblioteca externa). Se config.js não estiver
// preenchido, entra em MODO DEMONSTRAÇÃO com dados fictícios salvos só no navegador.
// Os nomes de tabelas e colunas são exatamente os do banco já existente.
const p2 = n => String(n).padStart(2, "0");
const iso = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const lerLS = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
const gravarLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const CFG = window.RAVIERA_CONFIG || {};
const BASE = String(CFG.url || "").replace(/\/+$/, "");
const DEMO = !BASE || !CFG.anonKey || /SEU-PROJETO|COLE_SUA/.test(BASE + CFG.anonKey);

function semente() {
  const D = n => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
  const H = h => new Date(Date.now() - 36e5 * h).toISOString();
  let r = 7; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const base = [
    ["Carlos Silva", "RAV-CARLAO", "€ 2.480.000", "Scania S 730", "Krone Profi Liner", "Categoria E · Válida", "Nenhuma"],
    ["Marcos Oliveira", "RAV-MARQUITO", "€ 1.310.000", "Volvo FH16 750", "Schmitz Cargobull", "Categoria E · Válida", "1 multa (€ 300)"],
    ["Ana Souza", "RAV-ANINHA", "€ 742.000", "DAF XG+", "Krone Cool Liner", "Categoria E · Válida", "Nenhuma"],
    ["João Pereira", "RAV-JP", "€ 318.000", "MAN TGX", "Feldbinder cisterna", "Categoria C · Vence em 30 dias", "2 multas"],
    ["Rafael Lima", "RAV-RAFA", "A definir", "Mercedes Actros", "Schwarzmüller", "A definir", "A definir"],
    ["Bruno Costa", "RAV-BRUNAO", "€ 16.500", "Renault T High", "Sem reboque", "Categoria B · Suspensa", "3 multas"]
  ];
  const s = { drivers: [], convoys: [], wallet_entries: [], trips: [], event_participations: [], company_notices: [], join_applications: [], raviera_point_shifts: [] };
  base.forEach((b, i) => s.drivers.push({ id: "d" + (i + 1), name: b[0], qra: b[1], money: b[2], truck: b[3], trailer: b[4], license: b[5], fines: b[6] }));
  const cid = ["Calais", "Berlim", "Paris", "Roma", "Praga", "Viena", "Amsterdã", "Madri"];
  s.drivers.forEach((m, i) => {
    for (let k = 0; k < 14 - i * 2; k++) {
      const a = Math.floor(rnd() * 8), b = (a + 1 + Math.floor(rnd() * 7)) % 8;
      s.trips.push({ id: uid() + k + i, driver_id: m.id, trip_date: D(-Math.floor(rnd() * 55)), origin: cid[a], destination: cid[b], distance_km: 300 + Math.floor(rnd() * 1500), notes: "", status: k === 0 && i === 3 ? "pending" : "approved", created_at: H(k * 30 + 5) });
    }
    s.wallet_entries.push({ id: uid() + i, driver_id: m.id, kind: "credit", amount: 5000 + i * 1000, description: "Pagamento de fretes", created_at: H(24 * (i + 1)) });
    s.wallet_entries.push({ id: uid() + "d" + i, driver_id: m.id, kind: "debit", amount: 800, description: "Combustível e pedágios", created_at: H(24 * i + 2) });
  });
  s.convoys.push(
    { id: "c1", title: "Comboio de sábado", event_date: D(2), event_time: "20:00:00", map_name: "ETS2 · Europa", server: "Raviera 01", trailer: "Qualquer reboque", organizer: "CARLAO", status: "scheduled", description: "Ponto de encontro em Calais. Chegar 15 min antes." },
    { id: "c2", title: "Rota dos Alpes", event_date: D(9), event_time: "21:00:00", map_name: "Promods", server: "Raviera 01", trailer: "Cortina", organizer: "MARQUITO", status: "scheduled", description: "" },
    { id: "c3", title: "Comboio de aniversário", event_date: D(16), event_time: "19:30:00", map_name: "ETS2 · Europa", server: "Raviera 02", trailer: "Carga especial", organizer: "ANINHA", status: "scheduled", description: "" },
    { id: "c4", title: "Rota do Báltico", event_date: D(-3), event_time: "20:00:00", map_name: "Beyond the Baltic Sea", server: "Raviera 01", trailer: "Frigorífico", organizer: "CARLAO", status: "finished", description: "" });
  ["d1", "d2", "d3", "d5"].forEach((m, i) => s.event_participations.push({ id: uid() + "p" + i, driver_id: m, convoy_id: "c4", status: "approved", created_at: H(70) }));
  s.event_participations.push({ id: uid() + "pp", driver_id: "d4", convoy_id: "c1", status: "pending", created_at: H(3) });
  s.company_notices.push(
    { id: uid() + "a1", title: "Comboio oficial no sábado", priority: "important", body: "Confirme sua presença no calendário. Quem não puder ir, avise a gerência.", created_at: H(5) },
    { id: uid() + "a2", title: "Registro de viagens", priority: "normal", body: "Registre as viagens na aba Viagens para que elas contem XP.", created_at: H(96) });
  s.join_applications.push({ id: uid() + "s", name: "Pedro Alves", discord: "pedro#1234", steam: "pedro_trucks", experience: "Intermediário", message: "Quero rodar em comboios organizados.", status: "pending", created_at: H(1) });
  s.raviera_point_shifts.push({ id: uid() + "t1", driver_id: "d1", started_at: H(27), ended_at: H(24) });
  return s;
}
const store = () => lerLS("rv_demo2") || (gravarLS("rv_demo2", semente()), lerLS("rv_demo2"));

const DB = {
  demo: DEMO,
  sess: lerLS("rv_sess2"),
  salvarSessao() { gravarLS("rv_sess2", this.sess); },
  async renovar() {
    if (!this.sess?.refresh) return false;
    const r = await fetch(BASE + "/auth/v1/token?grant_type=refresh_token", { method: "POST", headers: { apikey: CFG.anonKey, "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: this.sess.refresh }) });
    if (!r.ok) return false;
    const j = await r.json(); this.sess.token = j.access_token; this.sess.refresh = j.refresh_token || this.sess.refresh; this.salvarSessao(); return true;
  },
  async req(path, opt = {}, tentou = false) {
    const r = await fetch(BASE + path, { ...opt, headers: { apikey: CFG.anonKey, Authorization: "Bearer " + (this.sess?.token || CFG.anonKey), "Content-Type": "application/json", Prefer: "return=representation", ...(opt.headers || {}) } });
    if (r.status === 401 && !tentou && await this.renovar()) return this.req(path, opt, true);
    if (r.status === 401) { this.logout(); location.hash = "#/login"; throw new Error("Sessão expirada. Entre novamente."); }
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(traduzErro(j.message || j.hint || "Erro " + r.status)); }
    return r.status === 204 ? null : r.json();
  },
  async list(t) { return this.demo ? structuredClone(store()[t] || []) : this.req(`/rest/v1/${t}?select=*&limit=1000`); },
  async add(t, row) {
    if (this.demo) { const s = store(); row = { id: uid(), created_at: new Date().toISOString(), ...row }; s[t].push(row); gravarLS("rv_demo2", s); return row; }
    return (await this.req(`/rest/v1/${t}`, { method: "POST", body: JSON.stringify(row) }))[0];
  },
  async set(t, id, patch) {
    if (this.demo) { const s = store(), x = s[t].find(i => i.id === id); if (x) Object.assign(x, patch); gravarLS("rv_demo2", s); return x; }
    return this.req(`/rest/v1/${t}?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) });
  },
  async del(t, id) {
    if (this.demo) { const s = store(); s[t] = s[t].filter(i => i.id !== id); gravarLS("rv_demo2", s); return; }
    return this.req(`/rest/v1/${t}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  /* ponto: usa as funções que já existem no seu banco */
  ponto: {
    async hist() {
      if (DEMO) return store().raviera_point_shifts.filter(p => p.driver_id === DB.sess.driver_id).sort((a, b) => b.started_at.localeCompare(a.started_at)).slice(0, 60);
      return DB.req("/rest/v1/raviera_point_shifts?select=started_at,ended_at&order=started_at.desc&limit=60");
    },
    async rank() {
      if (DEMO) { const s = store(), t = {}; s.raviera_point_shifts.forEach(p => t[p.driver_id] = (t[p.driver_id] || 0) + (new Date(p.ended_at || Date.now()) - new Date(p.started_at)) / 1000);
        return Object.entries(t).map(([d, v]) => ({ qra: s.drivers.find(x => x.id === d)?.qra, total_seconds: v })).sort((a, b) => b.total_seconds - a.total_seconds); }
      return DB.req("/rest/v1/rpc/raviera_point_ranking", { method: "POST", body: "{}" });
    },
    async start() { if (DEMO) return DB.add("raviera_point_shifts", { driver_id: DB.sess.driver_id, started_at: new Date().toISOString(), ended_at: null }); return DB.req("/rest/v1/rpc/raviera_point_start", { method: "POST", body: "{}" }); },
    async stop() {
      if (DEMO) { const a = store().raviera_point_shifts.find(p => p.driver_id === DB.sess.driver_id && !p.ended_at); if (a) await DB.set("raviera_point_shifts", a.id, { ended_at: new Date().toISOString() }); return; }
      return DB.req("/rest/v1/rpc/raviera_point_stop", { method: "POST", body: "{}" });
    }
  },
  async login(email, senha) {
    if (this.demo) {
      const adm = /admin|gerente/i.test(email);
      this.sess = { email, uid: "demo-user", papel: adm ? "admin" : "driver", driver_id: adm ? "d1" : "d2", nome: adm ? "Administrador" : "Motorista" };
    } else {
      const r = await fetch(BASE + "/auth/v1/token?grant_type=password", { method: "POST", headers: { apikey: CFG.anonKey, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: senha }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(traduzErro(j.error_description || j.msg || j.message || "Invalid login credentials"));
      this.sess = { token: j.access_token, refresh: j.refresh_token, uid: j.user.id, email };
      const p = (await this.req(`/rest/v1/user_profiles?select=role,display_name&id=eq.${j.user.id}`))[0];
      if (!p) { this.logout(); throw new Error("Conta sem perfil. Peça à administração para liberar seu acesso."); }
      Object.assign(this.sess, { papel: p.role, nome: p.display_name });
      try { const d = (await this.req(`/rest/v1/drivers?select=id,qra&auth_user_id=eq.${j.user.id}`))[0]; if (d) Object.assign(this.sess, { driver_id: d.id, driver_qra: d.qra }); } catch (e) {}
    }
    this.salvarSessao();
  },
  logout() { this.sess = null; try { localStorage.removeItem("rv_sess2"); } catch (e) {} }
};
function traduzErro(m) {
  if (/Invalid login credentials/i.test(m)) return "E-mail ou senha incorretos.";
  if (/Failed to fetch|NetworkError/i.test(m)) return "Não foi possível conectar ao Supabase. Confira a URL e a chave em config.js.";
  if (/row-level security|permission denied/i.test(m)) return "Você não tem permissão para esta ação.";
  if (/duplicate key/i.test(m)) return "Já existe um registro com esse valor (ex.: QRA repetido).";
  return m;
}
