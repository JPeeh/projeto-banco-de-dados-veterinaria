const express   = require('express');
const cors      = require('cors');
const pool      = require('./db');
const adminPool = require('./db_admin');
const { conectarMongo } = require('./db_mongo');
const Log       = require('./models/Log');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3001;
app.use(cors());
app.use(express.json());

conectarMongo();



async function logMongo(evento, descricao, dados = {}) {
  try { await Log.create({ evento, descricao, dados }); }
  catch (e) { console.error('Log MongoDB:', e.message); }
}


(async () => {
  for (const sql of [
    'ALTER TABLE pet     ADD COLUMN ativo TINYINT(1) NOT NULL DEFAULT 1',
    'ALTER TABLE cliente ADD COLUMN ativo TINYINT(1) NOT NULL DEFAULT 1',
  ]) {
    try { await adminPool.query(sql); }
    catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') console.error('Migration:', e.message); }
  }
})();


const TOGGLE_MAP = {
  pets:         { table: 'pet',         pk: 'id_pet'      },
  clientes:     { table: 'cliente',     pk: 'id_pessoa'   },
  veterinarios: { table: 'veterinario', pk: 'id_pessoa'   },
  servicos:     { table: 'servico',     pk: 'id_servico'  },
};

Object.entries(TOGGLE_MAP).forEach(([ent, { table, pk }]) => {
  ['desativar', 'reativar'].forEach(acao => {
    app.patch(`/api/${ent}/:id/${acao}`, async (req, res) => {
      try {
        const ativo = acao === 'reativar' ? 1 : 0;
        await pool.query(`UPDATE ${table} SET ativo = ? WHERE ${pk} = ?`, [ativo, req.params.id]);
        logMongo(`${ent.slice(0, -1)}_${acao}do`, `ID ${req.params.id} ${acao}do`, { id: req.params.id });
        res.json({ success: true });
      } catch (e) { res.status(400).json({ success: false, error: e.message }); }
    });
  });
});


app.get('/api/agenda', async (req, res) => {
  try {
    const { status, data, busca } = req.query;
    let sql = 'SELECT * FROM vw_agenda_completa WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?';             params.push(status); }
    if (data)   { sql += ' AND DATE(data_hora) = ?';    params.push(data); }
    if (busca)  {
      sql += ' AND (nome_pet LIKE ? OR nome_cliente LIKE ? OR nome_veterinario LIKE ?)';
      const like = `%${busca}%`;
      params.push(like, like, like);
    }
    const [rows] = await pool.query(sql + ' ORDER BY data_hora DESC', params);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});



app.get('/api/faturamento', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM vw_faturamento_cliente');
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/pets', async (req, res) => {
  try {
    const filtro = req.query.todos === '1' ? '' : 'AND p.ativo = 1';
    const [rows] = await pool.query(
      `SELECT p.id_pet, p.nome, p.especie, p.raca, p.data_nasc, p.ativo,
              fn_idade_pet(p.id_pet) AS idade,
              ps.nome AS nome_dono, ps.telefone
       FROM pet p
       JOIN cliente cli ON cli.id_pessoa = p.id_cliente
       JOIN pessoa  ps  ON ps.id_pessoa  = cli.id_pessoa
       WHERE 1=1 ${filtro}
       ORDER BY p.ativo DESC, p.nome`
    );
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/pets/:id/historico', async (req, res) => {
  try {
    const [rows] = await pool.query('CALL sp_historico_pet(?)', [req.params.id]);
    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/pets', async (req, res) => {
  const { nome, especie, raca, data_nasc, id_cliente } = req.body;
  if (!nome || !especie || !id_cliente)
    return res.status(400).json({ success: false, error: 'Campos obrigatórios: nome, especie, id_cliente' });
  try {
    const [r] = await pool.query(
      'INSERT INTO pet (nome, especie, raca, data_nasc, id_cliente) VALUES (?, ?, ?, ?, ?)',
      [nome, especie, raca || null, data_nasc || null, parseInt(id_cliente)]
    );
    logMongo('pet_cadastrado', `Pet ${nome} cadastrado`, { id_pet: r.insertId, nome, especie });
    res.status(201).json({ success: true, id_pet: r.insertId });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.delete('/api/pets/:id', async (req, res) => {
  try {
    await adminPool.query('DELETE FROM pet WHERE id_pet = ?', [req.params.id]);
    logMongo('pet_removido', `Pet ID ${req.params.id} removido`, { id_pet: req.params.id });
    res.json({ success: true });
  } catch (e) {
    const msg = e.code === 'ER_ROW_IS_REFERENCED_2'
      ? 'Este pet possui consultas registradas. Desative-o em vez de remover.'
      : e.message;
    res.status(400).json({ success: false, error: msg });
  }
});


app.get('/api/veterinarios', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM vw_veterinarios_ativos');
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/veterinarios/todos', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT v.id_pessoa, ps.nome, ps.telefone, v.crmv, v.especialidade, v.ativo
       FROM veterinario v JOIN pessoa ps ON ps.id_pessoa = v.id_pessoa
       ORDER BY v.ativo DESC, ps.nome`
    );
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/veterinarios', async (req, res) => {
  const { nome, cpf, telefone, email, data_nasc, crmv, especialidade } = req.body;
  if (!nome || !cpf || !crmv)
    return res.status(400).json({ success: false, error: 'Campos obrigatórios: nome, cpf, crmv' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      'INSERT INTO pessoa (cpf, nome, data_nasc, telefone, email) VALUES (?, ?, ?, ?, ?)',
      [cpf.replace(/\D/g, ''), nome, data_nasc || null, telefone || null, email || null]
    );
    await conn.query('INSERT INTO veterinario (id_pessoa, crmv, especialidade) VALUES (?, ?, ?)',
      [r.insertId, crmv, especialidade || null]);
    await conn.commit();
    logMongo('veterinario_cadastrado', `Veterinário ${nome} cadastrado`, { id: r.insertId, crmv });
    res.status(201).json({ success: true, id_veterinario: r.insertId, nome });
  } catch (e) {
    await conn.rollback();
    const msg = e.code === 'ER_DUP_ENTRY'
      ? (e.message.includes('crmv') ? 'CRMV já cadastrado.' : 'CPF já cadastrado.')
      : e.message;
    res.status(400).json({ success: false, error: msg });
  } finally { conn.release(); }
});

app.delete('/api/veterinarios/:id', async (req, res) => {
  const conn = await adminPool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM veterinario WHERE id_pessoa = ?', [req.params.id]);
    await conn.query('DELETE FROM pessoa      WHERE id_pessoa = ?', [req.params.id]);
    await conn.commit();
    logMongo('veterinario_removido', `Veterinário ID ${req.params.id} removido`, { id: req.params.id });
    res.json({ success: true });
  } catch (e) {
    await conn.rollback();
    const msg = e.code === 'ER_ROW_IS_REFERENCED_2'
      ? 'Este veterinário possui consultas. Desative-o em vez de remover.'
      : e.message;
    res.status(400).json({ success: false, error: msg });
  } finally { conn.release(); }
});


app.get('/api/clientes', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id_pessoa, ps.nome, ps.telefone
       FROM cliente c JOIN pessoa ps ON ps.id_pessoa = c.id_pessoa
       WHERE c.ativo = 1 ORDER BY ps.nome`
    );
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/clientes/todos', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id_pessoa, ps.nome, ps.cpf, ps.telefone, ps.email, c.endereco, c.ativo
       FROM cliente c JOIN pessoa ps ON ps.id_pessoa = c.id_pessoa
       ORDER BY c.ativo DESC, ps.nome`
    );
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/clientes', async (req, res) => {
  const { nome, cpf, telefone, email, data_nasc, endereco } = req.body;
  if (!nome || !cpf)
    return res.status(400).json({ success: false, error: 'Campos obrigatórios: nome, cpf' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      'INSERT INTO pessoa (cpf, nome, data_nasc, telefone, email) VALUES (?, ?, ?, ?, ?)',
      [cpf.replace(/\D/g, ''), nome, data_nasc || null, telefone || null, email || null]
    );
    await conn.query('INSERT INTO cliente (id_pessoa, endereco) VALUES (?, ?)', [r.insertId, endereco || null]);
    await conn.commit();
    logMongo('cliente_cadastrado', `Cliente ${nome} cadastrado`, { id: r.insertId });
    res.status(201).json({ success: true, id_cliente: r.insertId, nome });
  } catch (e) {
    await conn.rollback();
    const msg = e.code === 'ER_DUP_ENTRY' ? 'CPF já cadastrado.' : e.message;
    res.status(400).json({ success: false, error: msg });
  } finally { conn.release(); }
});

app.delete('/api/clientes/:id', async (req, res) => {
  const conn = await adminPool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM cliente WHERE id_pessoa = ?', [req.params.id]);
    await conn.query('DELETE FROM pessoa  WHERE id_pessoa = ?', [req.params.id]);
    await conn.commit();
    logMongo('cliente_removido', `Cliente ID ${req.params.id} removido`, { id: req.params.id });
    res.json({ success: true });
  } catch (e) {
    await conn.rollback();
    const msg = e.code === 'ER_ROW_IS_REFERENCED_2'
      ? 'Este cliente possui pets ou consultas. Desative-o em vez de remover.'
      : e.message;
    res.status(400).json({ success: false, error: msg });
  } finally { conn.release(); }
});


app.get('/api/servicos', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM servico WHERE ativo = 1 ORDER BY nome');
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/servicos/todos', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM servico ORDER BY ativo DESC, nome');
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/servicos', async (req, res) => {
  const { nome, descricao, preco } = req.body;
  if (!nome || !preco)
    return res.status(400).json({ success: false, error: 'Campos obrigatórios: nome, preco' });
  try {
    const [r] = await pool.query(
      'INSERT INTO servico (nome, descricao, preco, ativo) VALUES (?, ?, ?, 1)',
      [nome, descricao || null, parseFloat(preco)]
    );
    logMongo('servico_cadastrado', `Serviço "${nome}" cadastrado`, { id: r.insertId, preco: parseFloat(preco) });
    res.status(201).json({ success: true, id_servico: r.insertId, nome, preco: parseFloat(preco) });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.delete('/api/servicos/:id/permanente', async (req, res) => {
  try {
    await adminPool.query('DELETE FROM servico WHERE id_servico = ?', [req.params.id]);
    logMongo('servico_removido', `Serviço ID ${req.params.id} removido permanentemente`, { id: req.params.id });
    res.json({ success: true });
  } catch (e) {
    const msg = e.code === 'ER_ROW_IS_REFERENCED_2'
      ? 'Este serviço está vinculado a consultas. Desative-o em vez de remover.'
      : e.message;
    res.status(400).json({ success: false, error: msg });
  }
});


app.post('/api/consultas', async (req, res) => {
  const { data_hora, id_pet, id_veterinario, servicos } = req.body;
  if (!data_hora || !id_pet || !id_veterinario)
    return res.status(400).json({ success: false, error: 'Campos obrigatórios: data_hora, id_pet, id_veterinario' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('CALL sp_registrar_consulta(?, ?, ?, @id)', [data_hora, id_pet, id_veterinario]);
    const [[{ id_gerado }]] = await conn.query('SELECT @id AS id_gerado');
    if (servicos?.length) {
      await conn.query(
        'INSERT INTO consulta_servico (id_consulta, id_servico, quantidade) VALUES ?',
        [servicos.map(s => [id_gerado, s.id_servico, s.quantidade || 1])]
      );
    }
    await conn.commit();
    logMongo('consulta_criada', `Consulta ${id_gerado} agendada`, { id_consulta: id_gerado, id_pet, id_veterinario });
    res.status(201).json({ success: true, id_consulta: id_gerado });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ success: false, error: e.message });
  } finally { conn.release(); }
});

app.get('/api/consultas/:id/detalhes', async (req, res) => {
  try {
    const [[consulta]] = await pool.query(
      'SELECT * FROM vw_agenda_completa WHERE id_consulta = ?', [req.params.id]
    );
    if (!consulta) return res.status(404).json({ success: false, error: 'Consulta não encontrada' });
    const [servicos] = await pool.query(
      'SELECT id_servico, quantidade FROM consulta_servico WHERE id_consulta = ?', [req.params.id]
    );
    res.json({ success: true, data: { ...consulta, servicos_ids: servicos } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.patch('/api/consultas/:id/editar', async (req, res) => {
  const { data_hora, id_pet, id_veterinario, servicos } = req.body;
  if (!data_hora || !id_pet || !id_veterinario)
    return res.status(400).json({ success: false, error: 'Campos obrigatórios: data_hora, id_pet, id_veterinario' });
  const conn = await adminPool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      "UPDATE consulta SET data_hora=?, id_pet=?, id_veterinario=? WHERE id_consulta=? AND status='agendada'",
      [data_hora, id_pet, id_veterinario, req.params.id]
    );
    if (!r.affectedRows) throw new Error('Consulta não encontrada ou já não está agendada.');
    await conn.query('DELETE FROM consulta_servico WHERE id_consulta = ?', [req.params.id]);
    if (servicos?.length) {
      await conn.query(
        'INSERT INTO consulta_servico (id_consulta, id_servico, quantidade) VALUES ?',
        [servicos.map(s => [req.params.id, s.id_servico, s.quantidade || 1])]
      );
    }
    await conn.commit();
    logMongo('consulta_editada', `Consulta ${req.params.id} editada`, { id_consulta: req.params.id });
    res.json({ success: true });
  } catch (e) {
    await conn.rollback();
    res.status(400).json({ success: false, error: e.message });
  } finally { conn.release(); }
});

app.patch('/api/consultas/:id/realizar', async (req, res) => {
  const { diagnostico, detalhes_prontuario } = req.body;
  try {
    await pool.query('CALL sp_realizar_consulta(?, ?, ?)',
      [req.params.id, diagnostico || '', detalhes_prontuario || '']);
    logMongo('consulta_realizada', `Consulta ${req.params.id} realizada`, { id_consulta: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

app.patch('/api/consultas/:id/cancelar', async (req, res) => {
  try {
    await pool.query("UPDATE consulta SET status='cancelada' WHERE id_consulta=?", [req.params.id]);
    logMongo('consulta_cancelada', `Consulta ${req.params.id} cancelada`, { id_consulta: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});


app.get('/api/logs', async (req, res) => {
  try {
    const { evento, limite = 50 } = req.query;
    const logs = await Log.find(evento ? { evento } : {}).sort({ timestamp: -1 }).limit(parseInt(limite));
    res.json({ success: true, data: logs });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});


app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, status: 'ok', db: 'connected' });
  } catch (e) { res.status(503).json({ success: false, status: 'error', db: e.message }); }
});

app.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT}`));
