const API = 'http://localhost:3001/api';

const $ = id => document.getElementById(id);
const fmt = {
  date:  s => s ? new Date(s).toLocaleString('pt-BR') : '—',
  money: v => v != null ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—',
};
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');

async function api(method, path, body) {
  const opts = { method };
  if (body !== undefined) {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(API + path, opts);
  if (method === 'GET' && !res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
const apiFetch  = path         => api('GET',    path);
const apiPost   = (path, body) => api('POST',   path, body);
const apiPatch  = (path, body) => api('PATCH',  path, body);
const apiDelete = path         => api('DELETE',  path);

async function checkHealth() {
  const el = $('db-status');
  try {
    const { status } = await apiFetch('/health');
    el.textContent = status === 'ok' ? 'BD conectado' : 'BD com erro';
    el.className   = 'db-status ' + (status === 'ok' ? 'ok' : 'err');
  } catch {
    el.textContent = 'BD offline';
    el.className   = 'db-status err';
  }
}

const pages = ['agenda', 'faturamento', 'pets', 'nova-consulta', 'cadastros', 'logs'];

function navigate(page) {
  pages.forEach(p => {
    $(`page-${p}`).classList.toggle('active', p === page);
    $(`page-${p}`).classList.toggle('hidden',  p !== page);
  });
  document.querySelectorAll('.nav-item').forEach(b =>
    b.classList.toggle('active', b.dataset.page === page)
  );
  ({
    agenda:          loadAgenda,
    faturamento:     loadFaturamento,
    pets:            loadPets,
    'nova-consulta': loadFormData,
    cadastros:       loadCadastros,
    logs:            carregarLogs,
  })[page]?.();
}

document.querySelectorAll('.nav-item').forEach(btn =>
  btn.addEventListener('click', () => navigate(btn.dataset.page))
);

async function loadAgenda() {
  const tbody = $('tbody-agenda'), table = $('tabela-agenda');
  const loading = $('agenda-loading'), errEl = $('agenda-error'), empty = $('agenda-empty');
  show(loading); hide(table); hide(errEl); hide(empty);
  tbody.innerHTML = '';

  const params = new URLSearchParams();
  const busca  = $('busca').value.trim();
  const status = $('filtro-status').value;
  const data   = $('filtro-data').value;
  if (busca)  params.set('busca',  busca);
  if (status) params.set('status', status);
  if (data)   params.set('data',   data);

  try {
    const { data: rows } = await apiFetch('/agenda?' + params);
    hide(loading);
    if (!rows?.length) { show(empty); return; }

    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><code style="font-size:.72rem;color:var(--text-muted)">${r.id_consulta}</code></td>
        <td style="white-space:nowrap">${fmt.date(r.data_hora)}</td>
        <td><strong>${r.nome_pet}</strong></td>
        <td>${r.especie}${r.raca ? '<br><small style="color:var(--text-muted)">' + r.raca + '</small>' : ''}</td>
        <td>${r.nome_cliente}<br><small style="color:var(--text-muted)">${r.telefone_cliente || ''}</small></td>
        <td>${r.nome_veterinario}<br><small style="color:var(--text-muted)">${r.crmv}</small></td>
        <td style="max-width:180px;white-space:normal;font-size:.78rem;color:var(--text-muted)">${r.servicos || '—'}</td>
        <td style="white-space:nowrap;font-weight:600">${fmt.money(r.valor_total)}</td>
        <td><span class="badge badge-${r.status}">${r.status}</span></td>
        <td>
          <div class="actions">
            ${r.status === 'agendada' ? `
              <button class="btn-sm btn-info"    onclick="abrirModalEditar('${r.id_consulta}')">Editar</button>
              <button class="btn-sm btn-success" onclick="abrirModalRealizar('${r.id_consulta}')">Realizar</button>
              <button class="btn-sm btn-danger"  onclick="abrirModalCancelar('${r.id_consulta}')">Cancelar</button>
            ` : ''}
          </div>
        </td>`;
      tbody.appendChild(tr);
    });
    show(table);
  } catch (err) {
    hide(loading);
    errEl.textContent = 'Erro ao carregar agenda: ' + err.message;
    show(errEl);
  }
}

$('btn-buscar').addEventListener('click', loadAgenda);
$('btn-limpar').addEventListener('click', () => {
  $('busca').value = ''; $('filtro-status').value = ''; $('filtro-data').value = '';
  loadAgenda();
});

function toDatetimeLocal(d) {
  const dt = new Date(d);
  const pad = n => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

async function abrirModalEditar(id) {
  $('editar-id').value = id;
  hide($('editar-msg'));
  $('editar-pet').innerHTML  = '<option value="">Carregando...</option>';
  $('editar-vet').innerHTML  = '<option value="">Carregando...</option>';
  $('editar-servicos-lista').innerHTML = '';
  show($('modal-editar'));

  try {
    const [{ data: detalhe }, { data: pets }, { data: vets }, { data: servicos }] = await Promise.all([
      apiFetch(`/consultas/${id}/detalhes`),
      apiFetch('/pets'),
      apiFetch('/veterinarios'),
      apiFetch('/servicos'),
    ]);

    $('editar-data').value = toDatetimeLocal(detalhe.data_hora);
    $('editar-pet').innerHTML = '<option value="">Selecione o pet...</option>' +
      pets.map(p => `<option value="${p.id_pet}" ${p.id_pet == detalhe.id_pet ? 'selected' : ''}>${p.nome} (${p.especie}) — ${p.nome_dono}</option>`).join('');
    $('editar-vet').innerHTML = '<option value="">Selecione o veterinário...</option>' +
      vets.map(v => `<option value="${v.id_pessoa}" ${v.id_pessoa == detalhe.id_veterinario ? 'selected' : ''}>${v.nome} — ${v.especialidade || 'Clínica Geral'}</option>`).join('');

    const selecionados = new Set((detalhe.servicos_ids || []).map(s => s.id_servico));
    $('editar-servicos-lista').innerHTML = servicos.map(s => `
      <label class="servico-item">
        <input type="checkbox" name="editar-servico" value="${s.id_servico}" ${selecionados.has(s.id_servico) ? 'checked' : ''} />
        ${s.nome} — ${fmt.money(s.preco)}
      </label>`).join('');
  } catch {
    $('editar-pet').innerHTML = '<option value="">Erro ao carregar</option>';
  }
}

function fecharModalEditar() { hide($('modal-editar')); }
$('modal-editar').addEventListener('click', e => { if (e.target === $('modal-editar')) fecharModalEditar(); });

$('form-editar-consulta').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('editar-msg');
  hide(msg);

  const id        = $('editar-id').value;
  const data_hora = $('editar-data').value.replace('T', ' ') + ':00';
  const id_pet    = parseInt($('editar-pet').value);
  const id_vet    = parseInt($('editar-vet').value);
  const servicos  = Array.from(document.querySelectorAll('input[name="editar-servico"]:checked'))
                        .map(c => ({ id_servico: parseInt(c.value), quantidade: 1 }));

  const res = await apiPatch(`/consultas/${id}/editar`, { data_hora, id_pet, id_veterinario: id_vet, servicos });

  if (res.success) { fecharModalEditar(); loadAgenda(); }
  else {
    msg.className = 'form-msg err';
    msg.textContent = 'Erro: ' + res.error;
    show(msg);
  }
});

function abrirModalRealizar(id) {
  $('realizar-id').value = id;
  $('realizar-diag').value = '';
  $('realizar-detalhes').value = '';
  show($('modal-realizar'));
}
function fecharModalRealizar() { hide($('modal-realizar')); }
$('modal-realizar').addEventListener('click', e => { if (e.target === $('modal-realizar')) fecharModalRealizar(); });

$('form-realizar-consulta').addEventListener('submit', async e => {
  e.preventDefault();
  const res = await apiPatch(`/consultas/${$('realizar-id').value}/realizar`, {
    diagnostico:         $('realizar-diag').value,
    detalhes_prontuario: $('realizar-detalhes').value,
  });
  fecharModalRealizar();
  if (res.success) loadAgenda();
  else alert('Erro: ' + res.error);
});


let _cancelarId = null;

function abrirModalCancelar(id) {
  _cancelarId = id;
  $('cancelar-id').textContent = id;
  show($('modal-cancelar'));
}
function fecharModalCancelar() { hide($('modal-cancelar')); _cancelarId = null; }
$('modal-cancelar').addEventListener('click', e => { if (e.target === $('modal-cancelar')) fecharModalCancelar(); });

async function confirmarCancelamento() {
  const res = await apiPatch(`/consultas/${_cancelarId}/cancelar`);
  fecharModalCancelar();
  if (res.success) loadAgenda();
  else alert('Erro: ' + res.error);
}

async function loadFaturamento() {
  const tbody = $('tbody-fat'), table = $('tabela-fat');
  const cards = $('fat-cards'), loading = $('fat-loading');
  const errEl = $('fat-error'), empty = $('fat-empty');
  show(loading); hide(table); hide(errEl); hide(empty);
  tbody.innerHTML = ''; cards.innerHTML = '';

  try {
    const { data: rows } = await apiFetch('/faturamento');
    hide(loading);
    if (!rows?.length) { show(empty); return; }

    const totalGeral     = rows.reduce((s, r) => s + Number(r.receita_total),   0);
    const totalConsultas = rows.reduce((s, r) => s + Number(r.total_consultas), 0);

    cards.innerHTML = `
      <div class="stat-card"><div class="value">${fmt.money(totalGeral)}</div><div class="label">Receita Total</div></div>
      <div class="stat-card"><div class="value">${totalConsultas}</div><div class="label">Consultas Realizadas</div></div>
      <div class="stat-card"><div class="value">${rows.length}</div><div class="label">Clientes Ativos</div></div>
      <div class="stat-card"><div class="value">${fmt.money(totalGeral / rows.length)}</div><div class="label">Ticket Médio</div></div>
    `;
    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${r.nome_cliente}</strong></td>
        <td style="color:var(--text-muted)">${r.email || '—'}</td>
        <td style="color:var(--text-muted)">${r.telefone || '—'}</td>
        <td style="text-align:center">${r.total_consultas}</td>
        <td><strong>${fmt.money(r.receita_total)}</strong></td>`;
      tbody.appendChild(tr);
    });
    show(table);
  } catch (err) {
    hide(loading);
    errEl.textContent = 'Erro: ' + err.message;
    show(errEl);
  }
}


async function loadPets() {
  const tbody = $('tbody-pets'), table = $('tabela-pets');
  const loading = $('pets-loading'), errEl = $('pets-error'), empty = $('pets-empty');
  show(loading); hide(table); hide(errEl); hide(empty);
  tbody.innerHTML = '';

  try {
    const { data: rows } = await apiFetch('/pets');
    hide(loading);
    if (!rows?.length) { show(empty); return; }
    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.id = `row-pets-${r.id_pet}`;
      tr.innerHTML = `
        <td><strong>${r.nome}</strong></td>
        <td>${r.especie}</td>
        <td style="color:var(--text-muted)">${r.raca || '—'}</td>
        <td>${r.idade != null ? r.idade + ' anos' : '—'}</td>
        <td>${r.nome_dono}</td>
        <td style="color:var(--text-muted)">${r.telefone || '—'}</td>
        <td>
          <div class="actions">
            <button class="btn-sm btn-info"  onclick="verHistorico(${r.id_pet},'${r.nome}')">Histórico</button>
            <button class="btn-sm btn-danger" onclick="remover('pets',${r.id_pet},'${r.nome}',loadPets)">Remover</button>
          </div>
        </td>`;
      tbody.appendChild(tr);
    });
    show(table);
  } catch (err) {
    hide(loading);
    errEl.textContent = 'Erro: ' + err.message;
    show(errEl);
  }
}

async function verHistorico(id, nome) {
  $('modal-title').textContent = `Histórico — ${nome}`;
  $('modal-content').innerHTML = '<div class="state-msg">Carregando...</div>';
  show($('modal'));
  try {
    const { data: rows } = await apiFetch(`/pets/${id}/historico`);
    if (!rows?.length) {
      $('modal-content').innerHTML = '<div class="state-msg">Nenhuma consulta registrada.</div>';
      return;
    }
    $('modal-content').innerHTML = rows.map(r => `
      <div class="hist-item">
        <div class="hist-item-header">
          <span><strong>${fmt.date(r.data_hora)}</strong> &mdash; ${r.nome_veterinario} <span style="color:var(--text-muted);font-size:.8rem">(${r.crmv})</span></span>
          <span class="badge badge-${r.status}">${r.status}</span>
        </div>
        <div class="hist-item-body">
          <p><strong>Diagnóstico:</strong> ${r.diagnostico || '—'}</p>
          ${r.prontuario ? `<p><strong>Prontuário:</strong> ${r.prontuario}</p>` : ''}
          <p><strong>Total:</strong> ${fmt.money(r.valor_total)}</p>
        </div>
      </div>`).join('');
  } catch (err) {
    $('modal-content').innerHTML = `<div class="state-msg state-error">Erro: ${err.message}</div>`;
  }
}

$('modal-close').addEventListener('click', () => hide($('modal')));
$('modal').addEventListener('click', e => { if (e.target === $('modal')) hide($('modal')); });


async function loadFormData() {
  const selPet = $('sel-pet'), selVet = $('sel-vet'), lista = $('servicos-lista');
  selPet.innerHTML = '<option value="">Carregando...</option>';
  selVet.innerHTML = '<option value="">Carregando...</option>';
  lista.innerHTML  = '';
  try {
    const [{ data: pets }, { data: vets }, { data: servicos }] = await Promise.all([
      apiFetch('/pets'), apiFetch('/veterinarios'), apiFetch('/servicos'),
    ]);
    selPet.innerHTML = '<option value="">Selecione o pet...</option>' +
      pets.map(p => `<option value="${p.id_pet}">${p.nome} (${p.especie}) — ${p.nome_dono}</option>`).join('');
    selVet.innerHTML = '<option value="">Selecione o veterinário...</option>' +
      vets.map(v => `<option value="${v.id_pessoa}">${v.nome} — ${v.especialidade || 'Clínica Geral'}</option>`).join('');
    renderServicos(servicos);
  } catch {
    selPet.innerHTML = '<option value="">Erro ao carregar</option>';
  }
}

function renderServicos(servicos) {
  $('servicos-lista').innerHTML = servicos.map(s => `
    <label class="servico-item">
      <input type="checkbox" name="servico" value="${s.id_servico}" />
      ${s.nome} — ${fmt.money(s.preco)}
    </label>`).join('');
}

$('form-consulta').addEventListener('submit', async e => {
  e.preventDefault();
  const msg    = $('form-msg');
  const id_pet = $('sel-pet').value;
  const id_vet = $('sel-vet').value;
  const data_h = $('inp-data').value;
  hide(msg);

  const servicos = Array.from(document.querySelectorAll('input[name="servico"]:checked'))
                       .map(c => ({ id_servico: parseInt(c.value), quantidade: 1 }));

  const res = await apiPost('/consultas', {
    data_hora:      data_h.replace('T', ' ') + ':00',
    id_pet:         parseInt(id_pet),
    id_veterinario: parseInt(id_vet),
    servicos,
  });

  msg.className = 'form-msg ' + (res.success ? 'ok' : 'err');
  msg.textContent = res.success ? `Consulta agendada! ID: ${res.id_consulta}` : 'Erro: ' + res.error;
  show(msg);
  if (res.success) { e.target.reset(); await loadFormData(); }
});


function abrirModalNovoServico() {
  ['srv-nome', 'srv-desc', 'srv-preco'].forEach(id => $(id).value = '');
  hide($('srv-msg'));
  show($('modal-servico'));
}
function fecharModalNovoServico() { hide($('modal-servico')); }
$('modal-servico').addEventListener('click', e => { if (e.target === $('modal-servico')) fecharModalNovoServico(); });

$('form-novo-servico').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('srv-msg');
  hide(msg);
  const res = await apiPost('/servicos', {
    nome:      $('srv-nome').value.trim(),
    descricao: $('srv-desc').value.trim() || null,
    preco:     $('srv-preco').value,
  });
  if (!res.success) {
    msg.className = 'form-msg err'; msg.textContent = 'Erro: ' + res.error; show(msg); return;
  }
  fecharModalNovoServico();
  const item = document.createElement('label');
  item.className = 'servico-item';
  item.innerHTML = `<input type="checkbox" name="servico" value="${res.id_servico}" checked />
    ${res.nome} — ${fmt.money(res.preco)}`;
  $('servicos-lista').appendChild(item);
});


function abrirModalNovoVet() {
  ['vet-nome','vet-cpf','vet-crmv','vet-especialidade','vet-telefone','vet-email','vet-nasc']
    .forEach(id => $(id).value = '');
  hide($('vet-msg'));
  show($('modal-vet'));
}
function fecharModalNovoVet() { hide($('modal-vet')); }
$('modal-vet').addEventListener('click', e => { if (e.target === $('modal-vet')) fecharModalNovoVet(); });

$('form-novo-vet').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('vet-msg');
  hide(msg);
  const res = await apiPost('/veterinarios', {
    nome:          $('vet-nome').value.trim(),
    cpf:           $('vet-cpf').value.replace(/\D/g, ''),
    crmv:          $('vet-crmv').value.trim(),
    especialidade: $('vet-especialidade').value.trim() || null,
    telefone:      $('vet-telefone').value.trim() || null,
    email:         $('vet-email').value.trim() || null,
    data_nasc:     $('vet-nasc').value || null,
  });
  if (!res.success) {
    msg.className = 'form-msg err'; msg.textContent = 'Erro: ' + res.error; show(msg); return;
  }
  fecharModalNovoVet();
  const { data: vets } = await apiFetch('/veterinarios');
  const sel = $('sel-vet');
  sel.innerHTML = '<option value="">Selecione o veterinário...</option>' +
    vets.map(v => `<option value="${v.id_pessoa}">${v.nome} — ${v.especialidade || 'Clínica Geral'}</option>`).join('');
  sel.value = String(res.id_veterinario);
});


function abrirModalNovoDono() {
  ['dono-nome','dono-cpf','dono-telefone','dono-email','dono-nasc','dono-endereco']
    .forEach(id => $(id).value = '');
  hide($('dono-msg'));
  show($('modal-dono'));
}
function fecharModalNovoDono() { hide($('modal-dono')); }
$('modal-dono').addEventListener('click', e => { if (e.target === $('modal-dono')) fecharModalNovoDono(); });

$('form-novo-dono').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('dono-msg');
  hide(msg);
  const res = await apiPost('/clientes', {
    nome:      $('dono-nome').value.trim(),
    cpf:       $('dono-cpf').value.replace(/\D/g, ''),
    telefone:  $('dono-telefone').value.trim() || null,
    email:     $('dono-email').value.trim() || null,
    data_nasc: $('dono-nasc').value || null,
    endereco:  $('dono-endereco').value.trim() || null,
  });
  if (!res.success) {
    msg.className = 'form-msg err'; msg.textContent = 'Erro: ' + res.error; show(msg); return;
  }
  fecharModalNovoDono();
  const { data: clientes } = await apiFetch('/clientes');
  const sel = $('pet-dono');
  sel.innerHTML = '<option value="">Selecione o dono...</option>' +
    clientes.map(c => `<option value="${c.id_pessoa}">${c.nome}${c.telefone ? ' — ' + c.telefone : ''}</option>`).join('');
  sel.value = String(res.id_cliente);
});


let _novoPetOrigem = null;

async function abrirModalNovoPet(origem = null) {
  _novoPetOrigem = origem;
  ['pet-nome','pet-especie','pet-raca','pet-nasc'].forEach(id => $(id).value = '');
  hide($('pet-msg'));
  const sel = $('pet-dono');
  sel.innerHTML = '<option value="">Carregando...</option>';
  show($('modal-pet'));
  try {
    const { data: clientes } = await apiFetch('/clientes');
    sel.innerHTML = '<option value="">Selecione o dono...</option>' +
      clientes.map(c => `<option value="${c.id_pessoa}">${c.nome}${c.telefone ? ' — ' + c.telefone : ''}</option>`).join('');
  } catch {
    sel.innerHTML = '<option value="">Erro ao carregar clientes</option>';
  }
}
function fecharModalNovoPet() { hide($('modal-pet')); }
$('modal-pet').addEventListener('click', e => { if (e.target === $('modal-pet')) fecharModalNovoPet(); });

$('form-novo-pet').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('pet-msg');
  hide(msg);
  const res = await apiPost('/pets', {
    nome:       $('pet-nome').value.trim(),
    especie:    $('pet-especie').value,
    raca:       $('pet-raca').value.trim() || null,
    data_nasc:  $('pet-nasc').value || null,
    id_cliente: $('pet-dono').value,
  });
  if (!res.success) {
    msg.className = 'form-msg err'; msg.textContent = 'Erro: ' + res.error; show(msg); return;
  }
  fecharModalNovoPet();
  if (_novoPetOrigem === 'consulta' || _novoPetOrigem === 'editar') {
    const { data: pets } = await apiFetch('/pets');
    const selId = _novoPetOrigem === 'editar' ? 'editar-pet' : 'sel-pet';
    const sel = $(selId);
    sel.innerHTML = '<option value="">Selecione o pet...</option>' +
      pets.map(p => `<option value="${p.id_pet}">${p.nome} (${p.especie}) — ${p.nome_dono}</option>`).join('');
    sel.value = String(res.id_pet);
  } else {
    loadPets();
  }
});


async function loadCadastros() {
  await Promise.all([loadCadPets(), loadCadClientes(), loadCadVets(), loadCadServicos()]);
}

async function loadCadTable({ tbodyId, tableId, loadingId, emptyId, endpoint, renderRow }) {
  const [tbody, table, loading, empty] = [$(tbodyId), $(tableId), $(loadingId), $(emptyId)];
  show(loading); hide(table); hide(empty); tbody.innerHTML = '';
  try {
    const { data: rows } = await apiFetch(endpoint);
    hide(loading);
    if (!rows?.length) { show(empty); return; }
    rows.forEach(r => tbody.appendChild(renderRow(r)));
    show(table);
  } catch { hide(loading); }
}

async function toggleStatus(entidade, id, acao, reloadFn) {
  const res = await apiPatch(`/${entidade}/${id}/${acao}`);
  if (res.success) reloadFn();
  else alert('Erro: ' + res.error);
}

function _cadRow(idField, entidade, r, extraCells) {
  const tr = document.createElement('tr');
  tr.id = `row-${entidade}-${r[idField]}`;
  if (!r.ativo) tr.style.opacity = '0.55';
  const badgeClass = r.ativo ? 'badge-realizada' : 'badge-cancelada';
  const statusBadge = `<span class="badge ${badgeClass}">${r.ativo ? 'Ativo' : 'Inativo'}</span>`;
  const reloadMap = { pets: 'loadCadPets', clientes: 'loadCadClientes', veterinarios: 'loadCadVets', servicos: 'loadCadServicos' };
  const reloadName = reloadMap[entidade];
  const toggleBtn = r.ativo
    ? `<button class="btn-sm btn-warning" onclick="toggleStatus('${entidade}',${r[idField]},'desativar',${reloadName})">Desativar</button>`
    : `<button class="btn-sm btn-success" onclick="toggleStatus('${entidade}',${r[idField]},'reativar',${reloadName})">Ativar</button>`;
  const trashOnclick = entidade === 'servicos'
    ? `removerServicoPermanente(${r[idField]},'${r.nome}')`
    : `remover('${entidade}',${r[idField]},'${r.nome}',${reloadName})`;
  const acoesBtns = `<div class="actions">${toggleBtn}<button class="btn-sm btn-danger" title="Excluir permanentemente" onclick="${trashOnclick}">🗑️</button></div>`;
  tr.innerHTML = extraCells(r) + `<td>${statusBadge}</td><td>${acoesBtns}</td>`;
  return tr;
}

async function loadCadPets() {
  await loadCadTable({
    tbodyId: 'cad-tbody-pets', tableId: 'cad-tabela-pets',
    loadingId: 'cad-pets-loading', emptyId: 'cad-pets-empty',
    endpoint: '/pets?todos=1',
    renderRow: r => _cadRow('id_pet', 'pets', r, r => `
      <td><strong>${r.nome}</strong></td>
      <td>${r.especie}</td>
      <td style="color:var(--text-muted)">${r.raca || '—'}</td>
      <td>${r.nome_dono}</td>`),
  });
}

async function loadCadClientes() {
  await loadCadTable({
    tbodyId: 'cad-tbody-clientes', tableId: 'cad-tabela-clientes',
    loadingId: 'cad-clientes-loading', emptyId: 'cad-clientes-empty',
    endpoint: '/clientes/todos',
    renderRow: r => {
      const cpfFmt = r.cpf ? r.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '—';
      return _cadRow('id_pessoa', 'clientes', r, r => `
        <td><strong>${r.nome}</strong></td>
        <td style="color:var(--text-muted)">${cpfFmt}</td>
        <td>${r.telefone || '—'}</td>
        <td style="color:var(--text-muted)">${r.email || '—'}</td>
        <td style="color:var(--text-muted)">${r.endereco || '—'}</td>`);
    },
  });
}

async function loadCadVets() {
  await loadCadTable({
    tbodyId: 'cad-tbody-vets', tableId: 'cad-tabela-vets',
    loadingId: 'cad-vets-loading', emptyId: 'cad-vets-empty',
    endpoint: '/veterinarios/todos',
    renderRow: r => _cadRow('id_pessoa', 'veterinarios', r, r => `
      <td><strong>${r.nome}</strong></td>
      <td>${r.crmv}</td>
      <td style="color:var(--text-muted)">${r.especialidade || '—'}</td>
      <td style="color:var(--text-muted)">${r.telefone || '—'}</td>`),
  });
}

async function loadCadServicos() {
  await loadCadTable({
    tbodyId: 'cad-tbody-servicos', tableId: 'cad-tabela-servicos',
    loadingId: 'cad-servicos-loading', emptyId: 'cad-servicos-empty',
    endpoint: '/servicos/todos',
    renderRow: r => _cadRow('id_servico', 'servicos', r, r => `
      <td><strong>${r.nome}</strong></td>
      <td style="color:var(--text-muted)">${r.descricao || '—'}</td>
      <td style="font-weight:600">${fmt.money(r.preco)}</td>`),
  });
}


let _pendingDelete = null;

function _mostrarToast(mensagem, onConfirm, onUndo) {
  if (_pendingDelete) {
    clearTimeout(_pendingDelete.timer);
    clearInterval(_pendingDelete.interval);
    _pendingDelete.onConfirm();
  }
  const countEl = $('toast-countdown');
  $('toast-msg').textContent = mensagem;
  show($('toast-desfazer'));

  let seg = 5;
  countEl.textContent = seg;
  const interval = setInterval(() => { countEl.textContent = --seg; }, 1000);
  const timer = setTimeout(async () => {
    clearInterval(interval);
    hide($('toast-desfazer'));
    _pendingDelete = null;
    await onConfirm();
  }, 5000);

  _pendingDelete = { timer, interval, onConfirm, onUndo };
}

function desfazerRemocao() {
  if (!_pendingDelete) return;
  clearTimeout(_pendingDelete.timer);
  clearInterval(_pendingDelete.interval);
  hide($('toast-desfazer'));
  _pendingDelete.onUndo();
  _pendingDelete = null;
}

async function remover(entidade, id, nome, reloadFn) {
  const tr = document.getElementById(`row-${entidade}-${id}`);
  if (tr) tr.style.display = 'none';
  const labels = { pets: 'Pet', clientes: 'Cliente', veterinarios: 'Veterinário', servicos: 'Serviço' };
  _mostrarToast(
    `${labels[entidade] || entidade} "${nome}" removido.`,
    async () => {
      const res = await apiDelete(`/${entidade}/${id}`);
      if (!res.success) { alert('Erro ao remover: ' + res.error); reloadFn(); }
    },
    () => reloadFn()
  );
}

async function removerServicoPermanente(id, nome) {
  const tr = document.getElementById(`row-servicos-${id}`);
  if (tr) tr.style.display = 'none';
  _mostrarToast(
    `Serviço "${nome}" excluído permanentemente.`,
    async () => {
      const res = await apiDelete(`/servicos/${id}/permanente`);
      if (!res.success) { alert('Erro: ' + res.error); loadCadServicos(); }
    },
    () => loadCadServicos()
  );
}

const EVENTOS = {
  consulta_criada:        { label: 'Consulta agendada',      badge: 'badge-agendada'  },
  consulta_realizada:     { label: 'Consulta realizada',     badge: 'badge-realizada' },
  consulta_cancelada:     { label: 'Consulta cancelada',     badge: 'badge-cancelada' },
  consulta_editada:       { label: 'Consulta editada',       badge: 'badge-agendada'  },
  cliente_cadastrado:     { label: 'Cliente cadastrado',     badge: 'badge-info'      },
  veterinario_cadastrado: { label: 'Veterinário cadastrado', badge: 'badge-info'      },
  pet_cadastrado:         { label: 'Pet cadastrado',         badge: 'badge-info'      },
  servico_cadastrado:     { label: 'Serviço cadastrado',     badge: 'badge-info'      },
};

async function carregarLogs() {
  const tbody = $('tbody-logs'), table = $('tabela-logs');
  const loading = $('logs-loading'), errEl = $('logs-error'), empty = $('logs-empty');
  show(loading); hide(table); hide(errEl); hide(empty);
  tbody.innerHTML = '';

  const evento = $('filtro-log-evento').value;
  try {
    const { data: logs } = await apiFetch('/logs' + (evento ? `?evento=${evento}` : ''));
    hide(loading);
    if (!logs?.length) { show(empty); return; }

    logs.forEach(l => {
      const { label = l.evento, badge = 'badge-agendada' } = EVENTOS[l.evento] || {};
      const dadosStr = l.dados && Object.keys(l.dados).length
        ? Object.entries(l.dados)
            .filter(([k]) => k !== '__v')
            .map(([k, v]) => {
              const val = Array.isArray(v)
                ? v.map(i => typeof i === 'object' ? Object.values(i).join('/') : i).join(', ')
                : (typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
              return `<span style="color:var(--text-muted)">${k}:</span> ${val}`;
            }).join(' &nbsp;|&nbsp; ')
        : '—';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="white-space:nowrap;font-size:.8rem">${fmt.date(l.timestamp)}</td>
        <td><span class="badge ${badge}">${label}</span></td>
        <td>${l.descricao}</td>
        <td style="font-size:.75rem;color:var(--text-muted);max-width:260px;white-space:normal">${dadosStr}</td>`;
      tbody.appendChild(tr);
    });
    show(table);
  } catch (err) {
    hide(loading);
    errEl.textContent = 'Erro ao carregar logs: ' + err.message;
    show(errEl);
  }
}

checkHealth();
loadAgenda();
