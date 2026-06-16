

USE clinica_veterinaria;


INSERT INTO grupos_usuarios (id_grupo, nome, descricao, nivel_acesso) VALUES
(1, 'administrador', 'Acesso total ao sistema',                   4),
(2, 'veterinario',   'Atendimento, prontuários e histórico',      3),
(3, 'recepcao',      'Agendamentos e cadastro de clientes/pets',   2),
(4, 'financeiro',    'Consulta de relatórios e faturamento',       1);




CREATE USER IF NOT EXISTS 'vet_admin'@'localhost'     IDENTIFIED BY 'Admin@Vet2024!';
GRANT ALL PRIVILEGES ON clinica_veterinaria.* TO 'vet_admin'@'localhost';


CREATE USER IF NOT EXISTS 'vet_app'@'localhost'       IDENTIFIED BY 'App@Vet2024!';
GRANT SELECT, INSERT, UPDATE ON clinica_veterinaria.* TO 'vet_app'@'localhost';

GRANT DELETE ON clinica_veterinaria.pet               TO 'vet_app'@'localhost';
GRANT DELETE ON clinica_veterinaria.pessoa             TO 'vet_app'@'localhost';
GRANT DELETE ON clinica_veterinaria.cliente            TO 'vet_app'@'localhost';
GRANT DELETE ON clinica_veterinaria.veterinario        TO 'vet_app'@'localhost';

GRANT EXECUTE ON clinica_veterinaria.*               TO 'vet_app'@'localhost';


CREATE USER IF NOT EXISTS 'vet_medico'@'localhost'    IDENTIFIED BY 'Med@Vet2024!';
GRANT SELECT ON clinica_veterinaria.*                TO 'vet_medico'@'localhost';
GRANT INSERT, UPDATE ON clinica_veterinaria.consulta  TO 'vet_medico'@'localhost';
GRANT INSERT, UPDATE ON clinica_veterinaria.prontuario TO 'vet_medico'@'localhost';
GRANT EXECUTE ON clinica_veterinaria.*               TO 'vet_medico'@'localhost';


CREATE USER IF NOT EXISTS 'vet_recepcao'@'localhost'  IDENTIFIED BY 'Rec@Vet2024!';
GRANT SELECT ON clinica_veterinaria.*                TO 'vet_recepcao'@'localhost';
GRANT INSERT, UPDATE ON clinica_veterinaria.pessoa    TO 'vet_recepcao'@'localhost';
GRANT INSERT, UPDATE ON clinica_veterinaria.cliente   TO 'vet_recepcao'@'localhost';
GRANT INSERT, UPDATE ON clinica_veterinaria.pet       TO 'vet_recepcao'@'localhost';
GRANT INSERT, UPDATE ON clinica_veterinaria.consulta  TO 'vet_recepcao'@'localhost';
GRANT EXECUTE ON clinica_veterinaria.*               TO 'vet_recepcao'@'localhost';


CREATE USER IF NOT EXISTS 'vet_financeiro'@'localhost' IDENTIFIED BY 'Fin@Vet2024!';
GRANT SELECT ON clinica_veterinaria.vw_faturamento_cliente TO 'vet_financeiro'@'localhost';
GRANT SELECT ON clinica_veterinaria.vw_agenda_completa     TO 'vet_financeiro'@'localhost';
GRANT SELECT ON clinica_veterinaria.servico                TO 'vet_financeiro'@'localhost';
GRANT SELECT ON clinica_veterinaria.consulta_servico       TO 'vet_financeiro'@'localhost';

FLUSH PRIVILEGES;


INSERT INTO usuarios (id_usuario, login, senha_hash, id_grupo)
VALUES
  (fn_gerar_id_usuario(), 'admin',      '$2b$10$placeholder_admin_hash',      1),
  (fn_gerar_id_usuario(), 'dr.roberto', '$2b$10$placeholder_medico_hash',     2),
  (fn_gerar_id_usuario(), 'recepcao1',  '$2b$10$placeholder_recepcao_hash',   3),
  (fn_gerar_id_usuario(), 'financeiro', '$2b$10$placeholder_financeiro_hash', 4);
