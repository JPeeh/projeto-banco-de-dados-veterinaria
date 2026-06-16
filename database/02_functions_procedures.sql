
USE clinica_veterinaria;

DELIMITER $$

DROP FUNCTION IF EXISTS fn_gerar_id_consulta$$
CREATE FUNCTION fn_gerar_id_consulta()
RETURNS CHAR(16)
READS SQL DATA
DETERMINISTIC
BEGIN
  DECLARE v_data CHAR(8);
  DECLARE v_seq  INT;
  DECLARE v_id   CHAR(16);

  SET v_data = DATE_FORMAT(NOW(), '%Y%m%d');

  SELECT COUNT(*) + 1
    INTO v_seq
    FROM consulta
   WHERE id_consulta LIKE CONCAT('CON-', v_data, '%') COLLATE utf8mb4_0900_ai_ci;

  SET v_id = CONCAT('CON-', v_data, '-', LPAD(v_seq, 3, '0'));
  RETURN v_id;
END$$

DROP FUNCTION IF EXISTS fn_gerar_id_prontuario$$
CREATE FUNCTION fn_gerar_id_prontuario()
RETURNS CHAR(16)
READS SQL DATA
DETERMINISTIC
BEGIN
  DECLARE v_data CHAR(8);
  DECLARE v_seq  INT;
  DECLARE v_id   CHAR(16);

  SET v_data = DATE_FORMAT(NOW(), '%Y%m%d');

  SELECT COUNT(*) + 1
    INTO v_seq
    FROM prontuario
   WHERE id_prontuario LIKE CONCAT('PRN-', v_data, '%') COLLATE utf8mb4_0900_ai_ci;

  SET v_id = CONCAT('PRN-', v_data, '-', LPAD(v_seq, 3, '0'));
  RETURN v_id;
END$$

DROP FUNCTION IF EXISTS fn_gerar_id_usuario$$
CREATE FUNCTION fn_gerar_id_usuario()
RETURNS CHAR(12)
READS SQL DATA
DETERMINISTIC
BEGIN
  DECLARE v_seq INT;
  SELECT COUNT(*) + 1 INTO v_seq FROM usuarios;
  RETURN CONCAT('USR-', LPAD(HEX(v_seq), 8, '0'));
END$$


DROP FUNCTION IF EXISTS fn_total_consulta$$
CREATE FUNCTION fn_total_consulta(p_id_consulta CHAR(16))
RETURNS DECIMAL(10,2)
READS SQL DATA
DETERMINISTIC
BEGIN
  DECLARE v_total DECIMAL(10,2) DEFAULT 0.00;

  SELECT COALESCE(SUM(s.preco * cs.quantidade), 0.00)
    INTO v_total
    FROM consulta_servico cs
    JOIN servico s ON s.id_servico = cs.id_servico
   WHERE cs.id_consulta = p_id_consulta COLLATE utf8mb4_0900_ai_ci;

  RETURN v_total;
END$$


DROP FUNCTION IF EXISTS fn_idade_pet$$
CREATE FUNCTION fn_idade_pet(p_id_pet INT)
RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
  DECLARE v_nasc DATE;
  SELECT data_nasc INTO v_nasc FROM pet WHERE id_pet = p_id_pet;
  IF v_nasc IS NULL THEN RETURN NULL; END IF;
  RETURN TIMESTAMPDIFF(YEAR, v_nasc, CURDATE());
END$$


DROP PROCEDURE IF EXISTS sp_registrar_consulta$$
CREATE PROCEDURE sp_registrar_consulta(
  IN  p_data_hora      DATETIME,
  IN  p_id_pet         INT,
  IN  p_id_veterinario INT,
  OUT p_id_gerado      CHAR(16)
)
BEGIN
  SET p_id_gerado = fn_gerar_id_consulta();

  INSERT INTO consulta (id_consulta, data_hora, status, id_pet, id_veterinario)
  VALUES (p_id_gerado, p_data_hora, 'agendada', p_id_pet, p_id_veterinario);
END$$


DROP PROCEDURE IF EXISTS sp_historico_pet$$
CREATE PROCEDURE sp_historico_pet(IN p_id_pet INT)
BEGIN
  SELECT
    c.id_consulta,
    c.data_hora,
    c.status,
    c.diagnostico,
    p.nome      AS nome_pet,
    ps.nome     AS nome_veterinario,
    v.crmv,
    pr.detalhes AS prontuario,
    fn_total_consulta(c.id_consulta) AS valor_total
  FROM consulta c
  JOIN pet         p  ON p.id_pet        = c.id_pet
  JOIN veterinario v  ON v.id_pessoa     = c.id_veterinario
  JOIN pessoa      ps ON ps.id_pessoa    = v.id_pessoa
  LEFT JOIN prontuario pr ON pr.id_consulta = c.id_consulta
  WHERE c.id_pet = p_id_pet
  ORDER BY c.data_hora DESC;
END$$


DROP PROCEDURE IF EXISTS sp_realizar_consulta$$
CREATE PROCEDURE sp_realizar_consulta(
  IN p_id_consulta  CHAR(16),
  IN p_diagnostico  TEXT,
  IN p_detalhes_prn TEXT
)
BEGIN
  UPDATE consulta
     SET status      = 'realizada',
         diagnostico = p_diagnostico
   WHERE id_consulta = p_id_consulta COLLATE utf8mb4_0900_ai_ci;

  IF NOT EXISTS (
    SELECT 1 FROM prontuario
     WHERE id_consulta = p_id_consulta COLLATE utf8mb4_0900_ai_ci
  ) THEN
    INSERT INTO prontuario (id_prontuario, id_consulta, detalhes)
    VALUES (fn_gerar_id_prontuario(), p_id_consulta, p_detalhes_prn);
  END IF;
END$$

DELIMITER ;
