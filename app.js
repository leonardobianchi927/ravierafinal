"use strict";
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const eur = n => (n < 0 ? "− " : "") + "€ " + Math.abs(Math.round(+n || 0)).toLocaleString("pt-BR");
const num = n => (+n || 0).toLocaleString("pt-BR");
const dBR = d => d ? new Date(String(d).length <= 10 ? d + "T12:00:00" : d).toLocaleDateString("pt-BR") : "—";
const hBR = d => new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const ini = n => String(n || "?").split(" ").filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase();
const dur = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${p2(Math.floor(s / 3600))}:${p2(Math.floor(s % 3600 / 60))}:${p2(s % 60)}`; };
const horas = s => (s / 3600).toFixed(1).replace(".", ",") + " h";
const desc = k => (a, b) => String(b[k] || "").localeCompare(String(a[k] || ""));
const isG = () => ["admin", "manager"].includes(DB.sess?.papel);
const by = a => Object.fromEntries(a.map(x => [String(x.id), x]));
const view = $("#view");
// "money" e "fines" são texto no banco ("€ 1.250.000", "A definir"): convertemos só para ordenar
const dinheiro = v => { const s = String(v ?? "").trim(), m = s.match(/,(\d{1,2})\s*$/), d = (m ? s.slice(0, m.index) : s).replace(/\D/g, ""); return (d ? +d : 0) + (m ? +("0." + m[1]) : 0); };
const temMulta = f => { const s = String(f ?? "").trim(); return !!s && !/^(0|nenhuma?|sem multas?|a definir|—|-)$/i.test(s); };

const MENU = [["", "🏠", "Início"], ["motoristas", "🚛", "Motoristas"], ["calendario", "📅", "Comboios"], ["dashboard", "📊", "Dashboard"], ["carteira", "💳", "Carteira"], ["viagens", "🛣️", "Viagens"], ["avisos", "📢", "Avisos"], ["ponto", "⏱️", "Ponto"], ["gerencia", "🛡️", "Gerência"]];
const CARDS = [
  ["motoristas", "🚛", "Motoristas cadastrados", "Conta, caminhão, reboque, CNH e multas."],
  ["calendario", "📅", "Calendário de comboios", "Datas, mapas, reboques e próximos eventos."],
  ["dashboard", "📊", "Dashboard geral", "Estatísticas, níveis, XP e ranking completo."],
  ["carteira", "💳", "Carteira financeira", "Extrato, receitas, despesas e saldos virtuais."],
  ["viagens", "🛣️", "Viagens e experiência", "Registre viagens e acompanhe a evolução."],
  ["ponto", "⏱️", "Bater ponto", "Entrada, saída, horas trabalhadas e ranking."],
  ["avisos", "📢", "Central de avisos", "Comunicados oficiais e atualizações."],
  ["ingresso", "📋", "Solicitação de ingresso", "Preencha sua candidatura à empresa."]
];
const NIVEIS = [["Recruta", 0, "#9bb0a1"], ["Motorista", 500, "#a6d94a"], ["Veterano", 1500, "#2fd12f"], ["Elite", 4000, "#14b8a6"], ["Lenda", 10000, "#f2c230"]];
const ROTULO = { pending: "Pendente", approved: "Aprovada", rejected: "Recusada", scheduled: "Agendado", cancelled: "Cancelado", finished: "Finalizado", important: "Importante", normal: "Normal" };
function nivel(xp) {
  let i = 0; NIVEIS.forEach((n, k) => { if (xp >= n[1]) i = k; });
  const a = NIVEIS[i], b = NIVEIS[i + 1];
  return { nome: a[0], cor: a[2], pct: b ? Math.round((xp - a[1]) / (b[1] - a[1]) * 100) : 100, falta: b ? b[1] - xp : 0, prox: b && b[0] };
}
// Mesma regra do site anterior: 100 XP por viagem aprovada + 50 por participação aprovada; saldo virtual = créditos − débitos
function stats(ds, trips, parts, wallet) {
  const o = {}; ds.forEach(d => o[d.id] = { d, viagens: 0, km: 0, part: 0, saldo: 0, dinheiro: dinheiro(d.money) });
  trips.filter(t => t.status === "approved").forEach(t => { const s = o[t.driver_id]; if (s) { s.viagens++; s.km += +t.distance_km || 0; } });
  parts.filter(p => p.status === "approved").forEach(p => { const s = o[p.driver_id]; if (s) s.part++; });
  wallet.forEach(w => { const s = o[w.driver_id]; if (s) s.saldo += (w.kind === "credit" ? 1 : -1) * (+w.amount || 0); });
  Object.values(o).forEach(s => s.xp = s.viagens * 100 + s.part * 50);
  return o;
}
const av = (d, g = "") => `<span class="av ${g}" aria-hidden="true">${esc(ini(d?.name))}</span>`;
const badge = (t, k = "") => `<span class="badge ${k}">${esc(t)}</span>`;
const stBadge = s => badge(ROTULO[s] || s, { approved: "ok", finished: "ok", scheduled: "info", pending: "warn", rejected: "bad", cancelled: "bad", important: "warn" }[s] || "");
const vazio = t => `<p class="vazio">${t}</p>`;
const optD = (ds, v) => ds.map(d => `<option value="${esc(d.id)}" ${String(d.id) === String(v) ? "selected" : ""}>${esc(d.name)} (${esc(d.qra)})</option>`).join("");
const hora5 = h => String(h || "").slice(0, 5);

function fld(f) {
  const r = f.r ? "required" : "", v = f.v ?? "";
  let c;
  if (f.t === "select") c = `<select name="${f.n}" ${r}>${f.o.map(o => { const [a, b] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(a)}" ${a == v ? "selected" : ""}>${esc(b)}</option>`; }).join("")}</select>`;
  else if (f.t === "textarea") c = `<textarea name="${f.n}" rows="3" maxlength="1000" ${r}>${esc(v)}</textarea>`;
  else c = `<input name="${f.n}" type="${f.t || "text"}" ${r} value="${esc(v)}" ${f.t === "number" ? 'step="any" min="0"' : ""}>`;
  return `<label class="${f.w ? "w" : ""}"><span>${f.l}${f.r ? " *" : ""}</span>${c}</label>`;
}
const form = (nome, fields, btn, extra = "") => `<form class="form" data-form="${nome}" ${extra}>${fields.map(fld).join("")}<div class="w"><button class="btn">${btn}</button></div></form>`;
let tt;
function toast(msg, erro) { const t = $("#toast"); t.textContent = msg; t.className = "toast on" + (erro ? " erro" : ""); clearTimeout(tt); tt = setTimeout(() => t.className = "toast", 3600); }
const ler = (...t) => Promise.all(t.map(x => DB.list(x)));
const meu = () => DB.sess.driver_id;

/* ---------------- telas ---------------- */
function login() {
  view.innerHTML = `<section class="login"><img class="logo" src="logo.png" alt="Logo RAVIERA GROUP" width="110" height="110">
    <p class="sub">Portal do motorista</p><h1>Bem-vindo à Raviera</h1><p class="sub">Acesse a área interna da empresa com sua conta autorizada.</p>
    <form class="form um" data-form="login">
      <label><span>E-mail cadastrado</span><input name="email" type="email" required autocomplete="username"></label>
      <label><span>Senha</span><input name="senha" type="password" required autocomplete="current-password"></label>
      <button class="btn">Entrar no portal</button></form>
    ${DB.demo ? `<p class="dica">Demonstração: use <b>admin@raviera.demo</b> (gerência) ou <b>motorista@raviera.demo</b>, com qualquer senha.</p>` : ""}
    <p class="lema">RAVIERAGROUP · ESTRADA, UNIÃO E RESPEITO</p></section>`;
}

async function home() {
  const [ds, trips, cs, notices, parts, wallet] = await ler("drivers", "trips", "convoys", "company_notices", "event_participations", "wallet_entries");
  const st = stats(ds, trips, parts, wallet), eu = ds.find(d => d.id === meu()), hoje = iso(new Date());
  const prox = cs.filter(c => c.status === "scheduled" && c.event_date >= hoje).sort((a, b) => (a.event_date + a.event_time).localeCompare(b.event_date + b.event_time))[0];
  const aviso = [...notices].sort(desc("created_at")).sort((a, b) => (b.priority === "important") - (a.priority === "important"))[0];
  const top = Object.values(st).sort((a, b) => b.dinheiro - a.dinheiro).slice(0, 3);
  const dias = prox ? Math.round((new Date(prox.event_date + "T12:00:00") - new Date(hoje + "T12:00:00")) / 864e5) : 0;
  const cards = CARDS.concat(isG() ? [["gerencia", "🛡️", "Área de gerência", "Solicitações, registros e eventos."]] : []);
  view.innerHTML = `
  <section class="hero"><p class="sub">Central do motorista</p><h1>Boa estrada, ${esc(eu?.qra || DB.sess.nome || "equipe")}!</h1>
    <p class="sub">Consulte os perfis e acompanhe os dados registrados pela equipe da Raviera.</p></section>
  ${aviso ? `<a class="aviso ${aviso.priority === "important" ? "importante" : ""}" href="#/avisos"><b>${esc(aviso.title)}</b><span>${esc(aviso.body)}</span></a>` : ""}
  <section class="kpis">
    <div><b>${ds.length}</b><span>motoristas cadastrados</span></div>
    <div><b>${num(Object.values(st).reduce((s, x) => s + x.km, 0))} km</b><span>percorridos pela frota</span></div>
    <div><b>${prox ? (dias === 0 ? "Hoje" : dias === 1 ? "Amanhã" : "em " + dias + " dias") : "—"}</b><span>${prox ? "próximo comboio: " + esc(prox.title) : "nenhum comboio agendado"}</span></div>
    <div><b>${trips.filter(t => t.status === "approved").length}</b><span>viagens aprovadas</span></div>
  </section>
  <section class="grid">${cards.map(c => `<a class="card link" href="#/${c[0]}"><span class="ico">${c[1]}</span><h2>${c[2]}</h2><p>${c[3]}</p></a>`).join("")}
    <a class="card link" href="${esc(CFG.whatsapp || "https://chat.whatsapp.com/HBiIhE2yKAXJFXNSzu3Ac1")}" target="_blank" rel="noopener"><span class="ico">📝</span><h2>Solicitar cadastro</h2><p>Entre no grupo oficial do WhatsApp e envie seus dados.</p></a></section>
  <h2 class="sec">🏆 Top 3 · Maiores fortunas</h2>
  <section class="podio">${top.map((t, i) => `<a class="card link p${i + 1}" href="#/motorista/${t.d.id}"><span class="medal">${["🥇", "🥈", "🥉"][i]}</span>${av(t.d, "g")}<h3>${esc(t.d.name)}</h3><p>${esc(t.d.qra)}</p><b>${esc(t.d.money || "—")}</b></a>`).join("")}</section>`;
}

async function motoristas() {
  const [ds, trips, parts] = await ler("drivers", "trips", "event_participations"), st = stats(ds, trips, parts, []);
  view.innerHTML = `<h1>Motoristas cadastrados</h1><p class="sub">Selecione um perfil para abrir a ficha.</p>
  <input class="busca" type="search" data-busca placeholder="Buscar por nome, QRA ou caminhão" aria-label="Buscar motorista">
  <section class="grid" id="lista">${ds.sort((a, b) => a.name.localeCompare(b.name)).map(d => { const n = nivel(st[d.id].xp); return `<a class="card link mc" href="#/motorista/${d.id}">
    <div class="cab">${av(d)}<div><h2>${esc(d.name)}</h2><p>${esc(d.qra)}</p></div></div>
    <p>🚚 ${esc(d.truck || "—")}</p><p>🪪 ${esc(d.license || "—")}</p>
    <div class="rod">${badge(n.nome, "nv")}${temMulta(d.fines) ? badge("Multas: " + d.fines, "bad") : badge("Sem multas", "ok")}</div></a>`; }).join("")}</section>
  ${isG() ? `<h2 class="sec">➕ Cadastrar motorista</h2><p class="sub">Somente administrador e gerentes. O QRA precisa ser único.</p>${form("novoMotorista", [{ n: "name", l: "Nome", r: 1 }, { n: "qra", l: "QRA", r: 1, v: "RAV-" }], "Cadastrar")}` : ""}`;
}

async function perfil(id) {
  const [ds, trips, parts, wallet] = await ler("drivers", "trips", "event_participations", "wallet_entries");
  const d = ds.find(x => String(x.id) === String(id)); if (!d) return view.innerHTML = vazio("Motorista não encontrado.") + `<a class="btn sec" href="#/motoristas">Todos os motoristas</a>`;
  const s = stats(ds, trips, parts, wallet)[d.id], n = nivel(s.xp), minhas = trips.filter(v => v.driver_id === d.id).sort(desc("trip_date")).slice(0, 6);
  view.innerHTML = `<a class="voltar" href="#/motoristas">← Todos os motoristas</a>
  <section class="ficha"><div class="cab">${av(d, "g")}<div><p class="sub">Ficha do motorista</p><h1>${esc(d.name)}</h1><p class="sub">QRA ${esc(d.qra)} · RavieraGroup</p></div></div>
    <div class="kpis"><div><b>${esc(d.money || "—")}</b><span>💰 dinheiro na conta</span></div><div><b>${esc(d.truck || "—")}</b><span>🚚 caminhão registrado</span></div>
      <div><b>${esc(d.trailer || "—")}</b><span>🛻 reboque registrado</span></div><div><b>${esc(d.license || "—")}</b><span>🪪 CNH</span></div>
      <div><b class="${temMulta(d.fines) ? "txt-bad" : ""}">${esc(d.fines || "—")}</b><span>⚠️ multas</span></div><div><b>${eur(s.saldo)}</b><span>💳 saldo virtual (carteira)</span></div></div>
    <div class="card"><div class="linha"><b>${badge(n.nome, "nv")} ${num(s.xp)} XP</b><span>${n.prox ? `faltam ${num(n.falta)} XP para ${n.prox}` : "nível máximo"}</span></div>
      <div class="bar"><i style="width:${n.pct}%;background:${n.cor}"></i></div>
      <p class="sub">${s.viagens} viagens aprovadas · ${num(s.km)} km · ${s.part} eventos confirmados</p></div></section>
  <h2 class="sec">Últimas viagens</h2>${minhas.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Data</th><th>Rota</th><th>Distância</th><th>Status</th></tr></thead><tbody>${minhas.map(v => `<tr><td>${dBR(v.trip_date)}</td><td>${esc(v.origin)} → ${esc(v.destination)}</td><td>${num(v.distance_km)} km</td><td>${stBadge(v.status)}</td></tr>`).join("")}</tbody></table></div>` : vazio("Nenhuma viagem registrada.")}
  ${isG() ? `<h2 class="sec">✏️ Atualizar ficha</h2><p class="sub">Somente administrador e gerentes podem salvar alterações.</p>${form("motorista", [
    { n: "name", l: "Nome do motorista", v: d.name, r: 1 }, { n: "qra", l: "QRA", v: d.qra, r: 1 }, { n: "money", l: "Dinheiro na conta", v: d.money }, { n: "fines", l: "Multas", v: d.fines },
    { n: "truck", l: "Caminhão registrado", v: d.truck }, { n: "trailer", l: "Reboque registrado", v: d.trailer }, { n: "license", l: "CNH", v: d.license, w: 1 }], "Salvar alterações", `data-id="${d.id}"`)}` : ""}`;
}

const cal = { y: new Date().getFullYear(), m: new Date().getMonth(), sel: iso(new Date()) };
function cardComboio(c, G) {
  return `<article class="card cb"><div class="linha"><h3>${esc(c.title)}</h3>${stBadge(c.status)}</div>
  <p>📅 ${dBR(c.event_date)} às ${esc(hora5(c.event_time))} (Brasília) · 🗺️ ${esc(c.map_name || "—")}</p><p>🖥️ ${esc(c.server || "—")} · 🛻 ${esc(c.trailer || "—")} · 👤 ${esc(c.organizer || "—")}</p>
  ${c.description ? `<p class="sub">${esc(c.description)}</p>` : ""}
  <div class="rod">${c.status === "scheduled" ? `<button class="mini" data-act="part" data-id="${c.id}">Vou participar</button>` : ""}
  ${G ? `<button class="mini" data-act="st" data-t="convoys" data-id="${c.id}" data-v="finished">Finalizar</button><button class="mini" data-act="st" data-t="convoys" data-id="${c.id}" data-v="cancelled">Cancelar</button><button class="mini bad" data-act="del" data-t="convoys" data-id="${c.id}">Excluir</button>` : ""}</div></article>`;
}
async function calendario() {
  const [cs] = await ler("convoys"), G = isG(), por = {}; cs.forEach(c => (por[c.event_date] = por[c.event_date] || []).push(c));
  const first = new Date(cal.y, cal.m, 1), n = new Date(cal.y, cal.m + 1, 0).getDate(), hoje = iso(new Date());
  let cells = '<span></span>'.repeat(first.getDay());
  for (let d = 1; d <= n; d++) { const k = `${cal.y}-${p2(cal.m + 1)}-${p2(d)}`, q = por[k]; cells += `<button class="dia ${k === cal.sel ? "sel" : ""} ${k === hoje ? "hoje" : ""}" data-act="dia" data-d="${k}" aria-label="${d}${q ? ", " + q.length + " comboio(s)" : ""}">${d}${q ? `<i>${q.length}</i>` : ""}</button>`; }
  const dia = por[cal.sel] || [], prox = cs.filter(c => c.status === "scheduled" && c.event_date >= hoje && c.event_date !== cal.sel).sort((a, b) => a.event_date.localeCompare(b.event_date)).slice(0, 4);
  view.innerHTML = `<p class="sub">Agenda oficial · RavieraGroup</p><h1>Calendário de comboios</h1><p class="sub">Confira os próximos eventos, horários e informações para participar.</p>
  <div class="duas"><section class="card"><div class="linha"><button class="mini" data-act="mes" data-d="-1" aria-label="Mês anterior">‹</button><h2 class="cap">${first.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</h2><button class="mini" data-act="mes" data-d="1" aria-label="Próximo mês">›</button></div>
    <div class="cal">${["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => `<b>${d}</b>`).join("")}${cells}</div></section>
  <section><h2 class="sec">Comboios do dia ${dBR(cal.sel)}</h2>${dia.length ? dia.map(c => cardComboio(c, G)).join("") : vazio("Nenhum comboio neste dia.")}
  ${prox.length ? `<h2 class="sec">Próximos comboios</h2>${prox.map(c => cardComboio(c, G)).join("")}` : ""}</section></div>
  ${G ? `<h2 class="sec">Cadastrar comboio</h2><p class="sub">Somente administradores e gerentes podem publicar e alterar eventos.</p>${form("comboio", [
    { n: "title", l: "Nome do comboio", r: 1 }, { n: "event_date", l: "Data", t: "date", r: 1, v: cal.sel }, { n: "event_time", l: "Horário (Brasília)", t: "time", r: 1, v: "20:00" }, { n: "map_name", l: "Mapa", r: 1, v: "ETS2 · Europa" },
    { n: "server", l: "Servidor" }, { n: "trailer", l: "Reboque" }, { n: "organizer", l: "Organizador" }, { n: "status", l: "Status", t: "select", o: [["scheduled", "Agendado"], ["cancelled", "Cancelado"], ["finished", "Finalizado"]] },
    { n: "description", l: "Observações", t: "textarea", w: 1 }], "Salvar comboio")}` : ""}`;
}

const dash = { tab: "xp", mes: iso(new Date()).slice(0, 7) };
async function dashboard() {
  const [ds, trips, parts, cs, wallet] = await ler("drivers", "trips", "event_participations", "convoys", "wallet_entries");
  const st = Object.values(stats(ds, trips, parts, wallet)), key = { xp: "xp", viagens: "viagens", saldo: "saldo" }[dash.tab], rk = st.sort((a, b) => b[key] - a[key]);
  const mes = trips.filter(v => v.status === "approved" && String(v.trip_date).startsWith(dash.mes)), kmMes = {};
  mes.forEach(v => kmMes[v.driver_id] = (kmMes[v.driver_id] || 0) + (+v.distance_km || 0));
  const barras = ds.map(d => [d, kmMes[d.id] || 0]).sort((a, b) => b[1] - a[1]), max = Math.max(1, ...barras.map(b => b[1]));
  view.innerHTML = `<p class="sub">Indicadores da frota</p><h1>Dashboard geral</h1><p class="sub">Ranking completo, experiência e estatísticas mensais.</p>
  <section class="kpis"><div><b>${ds.length}</b><span>motoristas</span></div><div><b>${num(st.reduce((s, x) => s + x.xp, 0))}</b><span>XP total</span></div><div><b>${cs.length}</b><span>comboios</span></div><div><b>${eur(st.reduce((s, x) => s + x.saldo, 0))}</b><span>saldo virtual da frota</span></div></section>
  <h2 class="sec">🏆 Ranking completo</h2>
  <div class="tabs" role="tablist">${[["xp", "Por experiência"], ["viagens", "Por viagens"], ["saldo", "Por saldo virtual"]].map(t => `<button role="tab" aria-selected="${dash.tab === t[0]}" data-act="tab" data-v="${t[0]}">${t[1]}</button>`).join("")}</div>
  <section class="rank">${rk.map((s, i) => { const n = nivel(s.xp); return `<a class="card link rk" href="#/motorista/${s.d.id}"><span class="pos">${i + 1}</span>${av(s.d)}<div class="gr"><b>${esc(s.d.name)}</b> ${badge(n.nome, "nv")}<div class="bar"><i style="width:${n.pct}%;background:${n.cor}"></i></div></div>
    <b class="val">${key === "saldo" ? eur(s.saldo) : key === "xp" ? num(s.xp) + " XP" : s.viagens + " viagens"}</b></a>`; }).join("")}</section>
  <h2 class="sec">📈 Estatísticas mensais</h2>
  <label class="mesf"><span>Mês de referência</span><input type="month" value="${dash.mes}" data-mes></label>
  <section class="kpis"><div><b>${mes.length}</b><span>viagens aprovadas</span></div><div><b>${num(mes.reduce((s, v) => s + (+v.distance_km || 0), 0))} km</b><span>percorridos</span></div>
    <div><b>${cs.filter(c => String(c.event_date).startsWith(dash.mes)).length}</b><span>comboios no mês</span></div><div><b>${Object.keys(kmMes).length}</b><span>motoristas ativos</span></div></section>
  <section class="card">${barras.map(([d, km]) => `<div class="hb"><span>${esc(d.qra)}</span><div class="bar"><i style="width:${km / max * 100}%"></i></div><b>${num(km)} km</b></div>`).join("")}</section>`;
}

const cartF = { m: "" };
async function carteira() {
  const [ds, mv] = await ler("drivers", "wallet_entries"), G = isG(), M = by(ds);
  const alvo = G ? cartF.m : meu(), lista = mv.filter(x => G ? (!alvo || x.driver_id === alvo) : (!alvo || x.driver_id === alvo)).sort(desc("created_at"));
  const rec = lista.filter(x => x.kind === "credit").reduce((s, x) => s + +x.amount, 0), des = lista.filter(x => x.kind === "debit").reduce((s, x) => s + +x.amount, 0);
  view.innerHTML = `<p class="sub">Economia virtual</p><h1>Carteira financeira</h1><p class="sub">Extrato das movimentações virtuais da RavieraGroup.</p>
  ${G ? `<label class="mesf"><span>Motorista</span><select data-cartf><option value="">Todos</option>${optD(ds, cartF.m)}</select></label>` : ""}
  <section class="kpis"><div><b>${eur(rec - des)}</b><span>saldo virtual${alvo ? "" : " da frota"}</span></div><div><b class="txt-ok">${eur(rec)}</b><span>receitas</span></div><div><b class="txt-bad">${eur(des)}</b><span>despesas</span></div></section>
  <div class="linha"><h2 class="sec">Extrato</h2>${lista.length ? `<button class="mini" data-act="csv">Baixar CSV</button>` : ""}</div>
  ${lista.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Data</th><th>Motorista</th><th>Descrição</th><th class="r">Valor</th></tr></thead><tbody>${lista.map(x => `<tr><td>${dBR(x.created_at)}</td><td>${esc(M[x.driver_id]?.qra)}</td><td>${esc(x.description)}</td><td class="r ${x.kind === "credit" ? "txt-ok" : "txt-bad"}">${x.kind === "credit" ? "+" : "−"} ${eur(x.amount)}</td></tr>`).join("")}</tbody></table></div>` : vazio("Nenhuma movimentação encontrada.")}
  ${G ? `<h2 class="sec">💸 Registrar movimentação</h2><p class="sub">Somente a gerência pode registrar lançamentos. Os saldos são virtuais e não alteram o campo "dinheiro na conta" da ficha.</p>${form("mov", [
    { n: "driver_id", l: "Motorista", t: "select", o: ds.map(d => [d.id, d.name + " (" + d.qra + ")"]), r: 1 }, { n: "kind", l: "Tipo", t: "select", o: [["credit", "Crédito"], ["debit", "Débito"]] },
    { n: "amount", l: "Valor (€ virtual)", t: "number", r: 1 }, { n: "description", l: "Descrição", r: 1 }], "Salvar movimentação")}` : ""}`;
}

async function viagens() {
  const [ds, trips, cs] = await ler("drivers", "trips", "convoys"), G = isG(), M = by(ds), eu = meu();
  const lista = trips.filter(v => G || !eu || v.driver_id === eu).sort(desc("trip_date")).slice(0, 25);
  const escolha = G || !eu ? ds : ds.filter(d => d.id === eu);
  const campoD = { n: "driver_id", l: "Motorista", t: "select", o: escolha.map(d => [d.id, d.name + " (" + d.qra + ")"]), v: eu, r: 1 };
  const abertos = cs.filter(c => c.status === "scheduled");
  view.innerHTML = `<p class="sub">Progresso da frota</p><h1>Viagens e níveis</h1><p class="sub">XP: 100 por viagem aprovada e 50 por evento confirmado.</p>
  <div class="duas"><section><h2 class="sec">🛣️ Registrar viagem</h2>${form("viagem", [campoD, { n: "trip_date", l: "Data", t: "date", v: iso(new Date()), r: 1 }, { n: "origin", l: "Origem", r: 1 }, { n: "destination", l: "Destino", r: 1 }, { n: "distance_km", l: "Distância (km)", t: "number", r: 1 }, { n: "notes", l: "Observação" }], "Enviar viagem para aprovação")}</section>
  <section><h2 class="sec">🎟️ Participação em eventos</h2>${form("part", [campoD, { n: "convoy_id", l: "Comboio", t: "select", o: abertos.length ? abertos.map(c => [c.id, c.title + " · " + dBR(c.event_date)]) : [["", "Nenhum comboio agendado"]], r: 1 }], "Registrar participação")}</section></div>
  <h2 class="sec">Viagens registradas</h2>${lista.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Data</th><th>Motorista</th><th>Rota</th><th class="r">Km</th><th>Status</th></tr></thead><tbody>${lista.map(v => `<tr><td>${dBR(v.trip_date)}</td><td>${esc(M[v.driver_id]?.qra)}</td><td>${esc(v.origin)} → ${esc(v.destination)}</td><td class="r">${num(v.distance_km)}</td><td>${stBadge(v.status)}</td></tr>`).join("")}</tbody></table></div>` : vazio("Nenhuma viagem registrada. Use o formulário acima.")}`;
}

async function avisos() {
  const [lista] = await ler("company_notices"); lista.sort(desc("created_at"));
  view.innerHTML = `<p class="sub">Comunicação oficial</p><h1>Central de avisos</h1><p class="sub">Comunicados da administração para toda a equipe.</p>
  ${isG() ? `<h2 class="sec">Publicar aviso</h2>${form("aviso", [{ n: "title", l: "Título", r: 1 }, { n: "priority", l: "Prioridade", t: "select", o: [["normal", "Normal"], ["important", "Importante"]] }, { n: "body", l: "Mensagem", t: "textarea", w: 1, r: 1 }], "Publicar aviso")}` : ""}
  <h2 class="sec">Avisos</h2>${lista.length ? lista.map(a => `<article class="card"><div class="linha"><h3>${esc(a.title)}</h3>${stBadge(a.priority)}</div><p>${esc(a.body)}</p><div class="linha"><span class="sub">${dBR(a.created_at)}</span>${isG() ? `<button class="mini bad" data-act="del" data-t="company_notices" data-id="${a.id}">Excluir</button>` : ""}</div></article>`).join("") : vazio("Nenhum aviso publicado.")}`;
}

function ingresso() {
  view.innerHTML = `<p class="sub">Recrutamento</p><h1>Solicitação de ingresso</h1><p class="sub">Preencha o formulário e acompanhe sua solicitação.</p>
  ${form("ingresso", [{ n: "name", l: "Nome / QRA", r: 1 }, { n: "discord", l: "Usuário do Discord", r: 1 }, { n: "steam", l: "Usuário Steam" }, { n: "experience", l: "Experiência no ETS2", t: "select", o: ["Iniciante", "Intermediário", "Experiente"] }, { n: "message", l: "Por que deseja entrar?", t: "textarea", w: 1, r: 1 }], "Enviar solicitação")}
  <p class="sub">Não envie senhas nem documentos pessoais.</p><a class="btn sec" href="${esc(CFG.whatsapp || "https://chat.whatsapp.com/HBiIhE2yKAXJFXNSzu3Ac1")}" target="_blank" rel="noopener">Entrar no grupo do WhatsApp ↗</a>`;
}

async function gerencia() {
  if (!isG()) return view.innerHTML = vazio("Acesso restrito à gerência.");
  const [ds, apps, trips, parts, cs] = await ler("drivers", "join_applications", "trips", "event_participations", "convoys"), D = by(ds), C = by(cs);
  const bt = (t, id, v, l, k = "") => `<button class="mini ${k}" data-act="st" data-t="${t}" data-id="${id}" data-v="${v}">${l}</button>`;
  const pend = a => a.filter(x => x.status === "pending").sort(desc("created_at"));
  const box = (tit, a, fn) => `<h2 class="sec">${tit} <small>(${a.length})</small></h2>${a.length ? a.map(x => `<article class="card"><div class="linha">${fn(x)}</div></article>`).join("") : vazio("Nada pendente.")}`;
  view.innerHTML = `<p class="sub">Acesso restrito</p><h1>Área de gerência</h1><p class="sub">Controle de solicitações e aprovações.</p>
  ${box("Solicitações de ingresso", pend(apps), s => `<div><b>${esc(s.name)}</b> ${badge(s.experience)}<p>Discord: ${esc(s.discord)} · Steam: ${esc(s.steam || "—")}</p><p class="sub">${esc(s.message)}</p></div><div class="rod">${bt("join_applications", s.id, "approved", "Aprovar")}<button class="mini" data-act="solap" data-id="${s.id}">Aprovar e cadastrar</button>${bt("join_applications", s.id, "rejected", "Recusar", "bad")}</div>`)}
  ${box("Viagens pendentes", pend(trips), v => `<div><b>${esc(D[v.driver_id]?.qra)}</b> · ${esc(v.origin)} → ${esc(v.destination)} · ${num(v.distance_km)} km<p class="sub">${dBR(v.trip_date)} ${esc(v.notes)}</p></div><div class="rod">${bt("trips", v.id, "approved", "Aprovar")}${bt("trips", v.id, "rejected", "Recusar", "bad")}</div>`)}
  ${box("Participações pendentes", pend(parts), p => `<div><b>${esc(D[p.driver_id]?.qra)}</b> · ${esc(C[p.convoy_id]?.title || "Comboio removido")}</div><div class="rod">${bt("event_participations", p.id, "approved", "Confirmar")}${bt("event_participations", p.id, "rejected", "Recusar", "bad")}</div>`)}`;
}

async function ponto() {
  const id = meu();
  const [hist, rank] = await Promise.all([DB.ponto.hist(), DB.ponto.rank()]);
  const aberto = hist.find(p => !p.ended_at), agora = Date.now();
  const meus = hist.filter(p => p.ended_at).slice(0, 8), secs = (a, b) => Math.max(0, (new Date(b || Date.now()) - new Date(a)) / 1000);
  view.innerHTML = `<p class="sub">Controle de jornada</p><h1>Bater ponto</h1><p class="sub">Registre entrada e saída de serviço. Os horários são gravados no servidor.</p>
  ${id || !DB.demo ? `<section class="card ponto"><p class="sub">Motorista identificado</p><h2>${esc(DB.sess.driver_qra || "—")}</h2><span class="status ${aberto ? "on" : ""}">${aberto ? "🟢 Em serviço desde " + hBR(aberto.started_at) : "⚪ Fora de serviço"}</span>
    <b class="relogio" id="rel">${aberto ? dur(agora - new Date(aberto.started_at)) : "00:00:00"}</b>
    ${id ? `<button class="btn" data-act="ponto">${aberto ? "■ Sair de serviço" : "▶ Entrar em serviço"}</button>` : ""}</section>` : ""}
  ${id ? "" : vazio("Cadastro de ponto pendente. Peça à administração para vincular seu login ao seu QRA.")}
  <div class="duas"><section><h2 class="sec">🏆 Ranking de horas</h2>${rank.length ? rank.map((r, i) => `<div class="card rk"><span class="pos">${i + 1}</span><span class="av" aria-hidden="true">${esc(ini(String(r.qra || "?").replace(/^RAV-/, "")))}</span><div class="gr"><b>${esc(r.qra)}</b></div><b class="val">${horas(+r.total_seconds)}</b></div>`).join("") : vazio("Ninguém bateu ponto ainda.")}</section>
  <section><h2 class="sec">Minhas jornadas</h2>${meus.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Dia</th><th>Entrada</th><th>Saída</th><th class="r">Total</th></tr></thead><tbody>${meus.map(p => `<tr><td>${dBR(p.started_at)}</td><td>${hBR(p.started_at)}</td><td>${hBR(p.ended_at)}</td><td class="r">${horas(secs(p.started_at, p.ended_at))}</td></tr>`).join("")}</tbody></table></div>` : vazio("Nenhum registro fechado ainda.")}</section></div>`;
  if (aberto) window.__t = setInterval(() => { const r = $("#rel"); if (r) r.textContent = dur(Date.now() - new Date(aberto.started_at)); }, 1000);
}

/* ---------------- ações e formulários ---------------- */
const quem = () => ({ created_by: DB.sess.uid });
const FORM = {
  async login(d) { await DB.login(d.email.trim(), d.senha); location.hash = "#/"; },
  async motorista(d, f) { await DB.set("drivers", f.dataset.id, { name: d.name.trim(), qra: d.qra.trim(), money: d.money.trim(), truck: d.truck.trim(), trailer: d.trailer.trim(), license: d.license.trim(), fines: d.fines.trim(), updated_at: new Date().toISOString(), updated_by: DB.sess.uid }); toast("Ficha atualizada."); route(); },
  async novoMotorista(d) { await DB.add("drivers", { name: d.name.trim(), qra: d.qra.trim(), money: "A definir", truck: "A definir", trailer: "A definir", license: "A definir", fines: "A definir" }); toast("Motorista cadastrado."); route(); },
  async comboio(d) { await DB.add("convoys", { title: d.title.trim(), event_date: d.event_date, event_time: d.event_time, map_name: d.map_name.trim(), server: d.server.trim(), trailer: d.trailer.trim(), organizer: d.organizer.trim(), status: d.status, description: d.description.trim() }); cal.sel = d.event_date; cal.y = +d.event_date.slice(0, 4); cal.m = +d.event_date.slice(5, 7) - 1; toast("Comboio salvo."); route(); },
  async mov(d) { await DB.add("wallet_entries", { driver_id: d.driver_id, kind: d.kind, amount: +d.amount, description: d.description.trim() }); toast("Movimentação salva."); route(); },
  async viagem(d) { await DB.add("trips", { driver_id: d.driver_id, trip_date: d.trip_date, origin: d.origin.trim(), destination: d.destination.trim(), distance_km: +d.distance_km, notes: d.notes.trim(), ...quem(), status: "pending" }); toast("Viagem enviada para aprovação."); route(); },
  async part(d) { if (!d.convoy_id) throw new Error("Escolha um comboio."); await DB.add("event_participations", { driver_id: d.driver_id, convoy_id: d.convoy_id, ...quem(), status: "pending" }); toast("Participação registrada. Aguarde a confirmação."); route(); },
  async aviso(d) { await DB.add("company_notices", { title: d.title.trim(), priority: d.priority, body: d.body.trim(), ...quem() }); toast("Aviso publicado."); route(); },
  async ingresso(d) { await DB.add("join_applications", { name: d.name.trim(), discord: d.discord.trim(), steam: d.steam.trim(), experience: d.experience, message: d.message.trim(), user_id: DB.sess.uid, status: "pending" }); toast("Solicitação enviada. Aguarde o contato da equipe."); location.hash = "#/"; }
};
const ACT = {
  sair() { DB.logout(); location.hash = "#/login"; },
  dia(el) { cal.sel = el.dataset.d; route(); },
  mes(el) { cal.m += +el.dataset.d; if (cal.m < 0) { cal.m = 11; cal.y--; } if (cal.m > 11) { cal.m = 0; cal.y++; } route(); },
  tab(el) { dash.tab = el.dataset.v; route(); },
  async st(el) { await DB.set(el.dataset.t, el.dataset.id, { status: el.dataset.v }); toast("Atualizado."); route(); },
  async del(el) { if (!confirm("Excluir este item?")) return; await DB.del(el.dataset.t, el.dataset.id); toast("Item excluído."); route(); },
  async part(el) {
    if (!meu()) throw new Error("Sua conta não está vinculada a um motorista. Use o formulário em Viagens ou peça vínculo à gerência.");
    const ja = (await DB.list("event_participations")).some(p => p.driver_id === meu() && p.convoy_id === el.dataset.id);
    if (ja) throw new Error("Você já registrou participação neste comboio.");
    await DB.add("event_participations", { driver_id: meu(), convoy_id: el.dataset.id, ...quem(), status: "pending" }); toast("Participação registrada.");
  },
  async solap(el) {
    const s = (await DB.list("join_applications")).find(x => String(x.id) === el.dataset.id);
    await DB.add("drivers", { name: s.name, qra: "RAV-" + s.name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 14), money: "A definir", truck: "A definir", trailer: "A definir", license: "A definir", fines: "A definir" });
    await DB.set("join_applications", s.id, { status: "approved" }); toast("Motorista cadastrado."); route();
  },
  async ponto() { const aberto = (await DB.ponto.hist()).find(p => !p.ended_at); if (aberto) await DB.ponto.stop(); else await DB.ponto.start(); toast(aberto ? "Saída registrada." : "Entrada registrada."); route(); },
  async csv() {
    const [ds, mv] = await ler("drivers", "wallet_entries"), M = by(ds), alvo = isG() ? cartF.m : meu(), q = s => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const l = mv.filter(x => !alvo || x.driver_id === alvo).map(x => [dBR(x.created_at), M[x.driver_id]?.qra, x.kind, x.amount, x.description].map(q).join(";"));
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + ["Data;Motorista;Tipo;Valor;Descrição", ...l].join("\n")], { type: "text/csv" })); a.download = "extrato-raviera.csv"; a.click(); URL.revokeObjectURL(a.href);
  }
};
document.addEventListener("click", async e => { const el = e.target.closest("[data-act]"); if (!el) return; try { await ACT[el.dataset.act](el); } catch (er) { toast(er.message, true); } });
document.addEventListener("submit", async e => {
  const f = e.target.closest("[data-form]"); if (!f) return; e.preventDefault();
  const b = $(".btn", f); b.disabled = true;
  try { await FORM[f.dataset.form](Object.fromEntries(new FormData(f)), f); } catch (er) { toast(er.message, true); b.disabled = false; }
});
document.addEventListener("input", e => {
  if (e.target.matches("[data-busca]")) { const q = e.target.value.toLowerCase(); $$("#lista .mc").forEach(c => c.hidden = !c.textContent.toLowerCase().includes(q)); }
  if (e.target.matches("[data-mes]") && e.target.value) { dash.mes = e.target.value; route(); }
  if (e.target.matches("[data-cartf]")) { cartF.m = e.target.value; route(); }
});

/* ---------------- roteador ---------------- */
const ROTAS = { "": home, motoristas, motorista: perfil, calendario, dashboard, carteira, viagens, avisos, ingresso, gerencia, ponto };
async function route() {
  clearInterval(window.__t);
  const [nome, arg] = location.hash.replace(/^#\/?/, "").split("/");
  $("#demo").hidden = !DB.demo;
  if (!DB.sess && nome !== "login") { location.hash = "#/login"; return; }
  if (DB.sess && nome === "login") { location.hash = "#/"; return; }
  $("#top").hidden = nome === "login";
  if (nome === "login") return login();
  $("#nav").innerHTML = MENU.filter(m => m[0] !== "gerencia" || isG()).map(m => `<a href="#/${m[0]}" ${m[0] === nome || (nome === "motorista" && m[0] === "motoristas") ? 'aria-current="page"' : ""}>${m[1]} ${m[2]}</a>`).join("");
  view.innerHTML = `<div class="skel"></div><div class="skel"></div>`;
  try { await (ROTAS[nome] || home)(arg); } catch (er) { view.innerHTML = vazio("Não foi possível carregar: " + esc(er.message)) + `<button class="btn sec" onclick="route()">Tentar de novo</button>`; }
  if (nome + arg !== window.__ult) window.scrollTo(0, 0);
  window.__ult = nome + arg;
}
addEventListener("hashchange", route);
route();
