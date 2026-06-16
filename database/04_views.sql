

USE clinica_veterinaria;


CREATE OR REPLACE VIEW vw_agenda_completa AS
SELECT
  c.id_consulta,
  c.data_hora,
  c.status,
  c.diagnostico,

  -- Pet
  p.id_pet,
  p.nome        AS nome_pet,
  p.especie,
  p.raca,

  -- Dono (cliente)
  cli_ps.nome   AS nome_cliente,
  cli_ps.telefone AS telefone_cliente,
  cli_ps.email  AS email_cliente,

  -- Veterinário
  vet_ps.nome   AS nome_veterinario,
  v.crmv,
  v.especialidade,

  -- Serviços da consulta (concatenados)
  GROUP_CONCAT(
    CONCAT(s.nome, ' (x', cs.quantidade, ')')
    ORDER BY s.nome
    SEPARATOR ', '
  )             AS servicos,

  -- Total financeiro via function
  fn_total_consulta(c.id_consulta) AS valor_total

FROM consulta c
JOIN pet          p      ON p.id_pet          = c.id_pet
JOIN cliente      cli    ON cli.id_pessoa      = p.id_cliente
JOIN pessoa       cli_ps ON cli_ps.id_pessoa   = cli.id_pessoa
JOIN veterinario  v      ON v.id_pessoa        = c.id_veterinario
JOIN pessoa       vet_ps ON vet_ps.id_pessoa   = v.id_pessoa
LEFT JOIN consulta_servico cs ON cs.id_consulta = c.id_consulta
LEFT JOIN servico           s  ON s.id_servico  = cs.id_servico
GROUP BY
  c.id_consulta, c.data_hora, c.status, c.diagnostico,
  p.id_pet, p.nome, p.especie, p.raca,
  cli_ps.nome, cli_ps.telefone, cli_ps.email,
  vet_ps.nome, v.crmv, v.especialidade;


CREATE OR REPLACE VIEW vw_faturamento_cliente AS
SELECT
  cli_ps.id_pessoa                 AS id_cliente,
  cli_ps.nome                      AS nome_cliente,
  cli_ps.email,
  cli_ps.telefone,
  COUNT(DISTINCT c.id_consulta)    AS total_consultas,
  SUM(fn_total_consulta(c.id_consulta)) AS receita_total
FROM cliente      cli
JOIN pessoa       cli_ps ON cli_ps.id_pessoa   = cli.id_pessoa
JOIN pet          p      ON p.id_cliente        = cli.id_pessoa
JOIN consulta     c      ON c.id_pet            = p.id_pet
WHERE c.status = 'realizada'
GROUP BY cli_ps.id_pessoa, cli_ps.nome, cli_ps.email, cli_ps.telefone
ORDER BY receita_total DESC;


CREATE OR REPLACE VIEW vw_historico_pet AS
SELECT
  p.id_pet,
  p.nome        AS nome_pet,
  p.especie,
  p.raca,
  fn_idade_pet(p.id_pet) AS idade_anos,
  cli_ps.nome   AS nome_dono,
  cli_ps.telefone,

  c.id_consulta,
  c.data_hora,
  c.status,
  c.diagnostico,
  vet_ps.nome   AS veterinario_responsavel,
  pr.detalhes   AS prontuario,
  pr.data_registro

FROM pet          p
JOIN cliente      cli    ON cli.id_pessoa      = p.id_cliente
JOIN pessoa       cli_ps ON cli_ps.id_pessoa   = cli.id_pessoa
JOIN consulta     c      ON c.id_pet           = p.id_pet
JOIN veterinario  v      ON v.id_pessoa        = c.id_veterinario
JOIN pessoa       vet_ps ON vet_ps.id_pessoa   = v.id_pessoa
LEFT JOIN prontuario pr  ON pr.id_consulta     = c.id_consulta
ORDER BY p.id_pet, c.data_hora DESC;


CREATE OR REPLACE VIEW vw_veterinarios_ativos AS
SELECT
  v.id_pessoa,
  ps.nome,
  v.crmv,
  v.especialidade,
  ps.telefone,
  ps.email
FROM veterinario v
JOIN pessoa ps ON ps.id_pessoa = v.id_pessoa
WHERE v.ativo = 1
ORDER BY ps.nome;
