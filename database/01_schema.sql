

CREATE DATABASE IF NOT EXISTS clinica_veterinaria
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE clinica_veterinaria;

CREATE TABLE IF NOT EXISTS grupos_usuarios (
  id_grupo      INT          NOT NULL,
  nome          VARCHAR(50)  NOT NULL,
  descricao     TEXT,
  nivel_acesso  TINYINT      NOT NULL COMMENT '1=leitura, 2=operacional, 3=gerencial, 4=admin',
  CONSTRAINT pk_grupos PRIMARY KEY (id_grupo),
  CONSTRAINT uq_grupos_nome UNIQUE (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario    CHAR(12)     NOT NULL COMMENT 'ID gerado pela fn_gerar_id_usuario()',
  login         VARCHAR(50)  NOT NULL,
  senha_hash    VARCHAR(255) NOT NULL,
  id_grupo      INT          NOT NULL,
  ativo         TINYINT(1)   NOT NULL DEFAULT 1,
  data_criacao  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_usuarios  PRIMARY KEY (id_usuario),
  CONSTRAINT uq_login     UNIQUE (login),
  CONSTRAINT fk_usr_grupo FOREIGN KEY (id_grupo) REFERENCES grupos_usuarios(id_grupo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pessoa (
  id_pessoa  INT          NOT NULL AUTO_INCREMENT,
  cpf        CHAR(11)     NOT NULL,
  nome       VARCHAR(100) NOT NULL,
  data_nasc  DATE,
  telefone   VARCHAR(20),
  email      VARCHAR(100),
  CONSTRAINT pk_pessoa  PRIMARY KEY (id_pessoa),
  CONSTRAINT uq_cpf     UNIQUE (cpf)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS cliente (
  id_pessoa  INT NOT NULL,
  endereco   VARCHAR(200),
  CONSTRAINT pk_cliente  PRIMARY KEY (id_pessoa),
  CONSTRAINT fk_cli_pes  FOREIGN KEY (id_pessoa) REFERENCES pessoa(id_pessoa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS veterinario (
  id_pessoa   INT          NOT NULL,
  crmv        VARCHAR(20)  NOT NULL,
  especialidade VARCHAR(100),
  ativo       TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT pk_vet      PRIMARY KEY (id_pessoa),
  CONSTRAINT uq_crmv     UNIQUE (crmv),
  CONSTRAINT fk_vet_pes  FOREIGN KEY (id_pessoa) REFERENCES pessoa(id_pessoa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pet (
  id_pet      INT          NOT NULL AUTO_INCREMENT,
  nome        VARCHAR(50)  NOT NULL,
  especie     VARCHAR(30)  NOT NULL,
  raca        VARCHAR(30),
  data_nasc   DATE,
  id_cliente  INT          NOT NULL,
  CONSTRAINT pk_pet      PRIMARY KEY (id_pet),
  CONSTRAINT fk_pet_cli  FOREIGN KEY (id_cliente) REFERENCES cliente(id_pessoa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS servico (
  id_servico  INT              NOT NULL AUTO_INCREMENT,
  nome        VARCHAR(50)      NOT NULL,
  descricao   VARCHAR(200),
  preco       DECIMAL(10,2)    NOT NULL,
  ativo       TINYINT(1)       NOT NULL DEFAULT 1,
  CONSTRAINT pk_servico PRIMARY KEY (id_servico)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS consulta (
  id_consulta    CHAR(16)     NOT NULL COMMENT 'Formato: CON-YYYYMMDD-NNN',
  data_hora      DATETIME     NOT NULL,
  status         ENUM('agendada','realizada','cancelada') NOT NULL DEFAULT 'agendada',
  diagnostico    TEXT,
  id_pet         INT          NOT NULL,
  id_veterinario INT          NOT NULL,
  CONSTRAINT pk_consulta    PRIMARY KEY (id_consulta),
  CONSTRAINT fk_con_pet     FOREIGN KEY (id_pet)         REFERENCES pet(id_pet),
  CONSTRAINT fk_con_vet     FOREIGN KEY (id_veterinario) REFERENCES veterinario(id_pessoa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS consulta_servico (
  id_consulta  CHAR(16)  NOT NULL,
  id_servico   INT       NOT NULL,
  quantidade   INT       NOT NULL DEFAULT 1,
  CONSTRAINT pk_con_srv  PRIMARY KEY (id_consulta, id_servico),
  CONSTRAINT fk_cs_con   FOREIGN KEY (id_consulta) REFERENCES consulta(id_consulta),
  CONSTRAINT fk_cs_srv   FOREIGN KEY (id_servico)  REFERENCES servico(id_servico)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS prontuario (
  id_prontuario  CHAR(16)   NOT NULL COMMENT 'Formato: PRN-YYYYMMDD-NNN',
  id_consulta    CHAR(16)   NOT NULL,
  detalhes       TEXT       NOT NULL,
  data_registro  DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_prontuario  PRIMARY KEY (id_prontuario),
  CONSTRAINT uq_prn_con     UNIQUE (id_consulta),
  CONSTRAINT fk_prn_con     FOREIGN KEY (id_consulta) REFERENCES consulta(id_consulta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS log_auditoria (
  id_log       INT          NOT NULL AUTO_INCREMENT,
  tabela       VARCHAR(50)  NOT NULL,
  operacao     ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  descricao    TEXT         NOT NULL,
  usuario_bd   VARCHAR(100) NOT NULL DEFAULT (CURRENT_USER()),
  data_hora    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_log PRIMARY KEY (id_log)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
