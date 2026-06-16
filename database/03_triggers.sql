

USE clinica_veterinaria;

DELIMITER $$

CREATE TRIGGER trg_log_status_consulta
AFTER UPDATE ON consulta
FOR EACH ROW
BEGIN
  IF OLD.status <> NEW.status THEN
    INSERT INTO log_auditoria (tabela, operacao, descricao)
    VALUES (
      'consulta',
      'UPDATE',
      CONCAT(
        'Consulta ', NEW.id_consulta,
        ' mudou de status: ', OLD.status, ' → ', NEW.status,
        ' | Pet: ', NEW.id_pet,
        ' | Vet: ', NEW.id_veterinario
      )
    );
  END IF;
END$$


CREATE TRIGGER trg_impede_cancelar_realizada
BEFORE UPDATE ON consulta
FOR EACH ROW
BEGIN
  IF OLD.status = 'realizada' AND NEW.status = 'cancelada' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Não é possível cancelar uma consulta já realizada.';
  END IF;
END$$


CREATE TRIGGER trg_log_novo_cliente
AFTER INSERT ON pessoa
FOR EACH ROW
BEGIN
  INSERT INTO log_auditoria (tabela, operacao, descricao)
  VALUES (
    'pessoa',
    'INSERT',
    CONCAT('Nova pessoa cadastrada — ID: ', NEW.id_pessoa, ' | Nome: ', NEW.nome)
  );
END$$

CREATE TRIGGER trg_valida_servico_ativo
BEFORE INSERT ON consulta_servico
FOR EACH ROW
BEGIN
  DECLARE v_ativo TINYINT;
  SELECT ativo INTO v_ativo FROM servico WHERE id_servico = NEW.id_servico;
  IF v_ativo = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Serviço inativo não pode ser adicionado a uma consulta.';
  END IF;
END$$

DELIMITER ;
