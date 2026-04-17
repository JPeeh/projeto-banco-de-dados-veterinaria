1. CRIAÇÃO DO BANCO DE DADOS
CREATE DATABASE IF NOT EXISTS clinica_veterinaria;
USE clinica_veterinaria;

2. SCRIPTS DE CRIAÇÃO (DDL)

CREATE TABLE PESSOA (
    id_pessoa INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    data_nasc DATE
) ENGINE=InnoDB;

CREATE TABLE CLIENTE (
    id_pessoa INT PRIMARY KEY,
    CONSTRAINT fk_cliente_pessoa FOREIGN KEY (id_pessoa) REFERENCES PESSOA(id_pessoa) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE VETERINARIO (
    id_pessoa INT PRIMARY KEY,
    crmv VARCHAR(20) NOT NULL UNIQUE,
    CONSTRAINT fk_vet_pessoa FOREIGN KEY (id_pessoa) REFERENCES PESSOA(id_pessoa) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE PET (
    id_pet INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    especie VARCHAR(30),
    raca VARCHAR(30),
    id_cliente INT NOT NULL,
    CONSTRAINT fk_pet_cliente FOREIGN KEY (id_cliente) REFERENCES CLIENTE(id_pessoa)
) ENGINE=InnoDB;

CREATE TABLE SERVICO (
    id_servico INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    preco DECIMAL(10,2) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE CONSULTA (
    id_consulta INT AUTO_INCREMENT PRIMARY KEY,
    data_hora DATETIME NOT NULL,
    status ENUM('agendada', 'realizada', 'cancelada') DEFAULT 'agendada',
    id_pet INT NOT NULL,
    id_veterinario INT NOT NULL,
    CONSTRAINT fk_consulta_pet FOREIGN KEY (id_pet) REFERENCES PET(id_pet),
    CONSTRAINT fk_consulta_vet FOREIGN KEY (id_veterinario) REFERENCES VETERINARIO(id_pessoa)
) ENGINE=InnoDB;

CREATE TABLE CONSULTA_SERVICO (
    id_consulta INT,
    id_servico INT,
    quantidade INT DEFAULT 1,
    PRIMARY KEY (id_consulta, id_servico),
    CONSTRAINT fk_cs_consulta FOREIGN KEY (id_consulta) REFERENCES CONSULTA(id_consulta),
    CONSTRAINT fk_cs_servico FOREIGN KEY (id_servico) REFERENCES SERVICO(id_servico)
) ENGINE=InnoDB;

CREATE TABLE PRONTUARIO (
    id_prontuario INT AUTO_INCREMENT PRIMARY KEY,
    detalhes TEXT,
    id_consulta INT UNIQUE NOT NULL, -- Relação 1:1
    CONSTRAINT fk_prontuario_consulta FOREIGN KEY (id_consulta) REFERENCES CONSULTA(id_consulta)
) ENGINE=InnoDB;

3. SCRIPTS DE INSERÇÃO (DML - POPULAÇÃO)

INSERT INTO PESSOA (nome, data_nasc) VALUES ('Carlos Silva', '1985-05-20'), ('Dra. Ana Costa', '1990-03-15');
INSERT INTO CLIENTE (id_pessoa) VALUES (1);
INSERT INTO VETERINARIO (id_pessoa, crmv) VALUES (2, 'CRMV-SP12345');

INSERT INTO PET (nome, especie, raca, id_cliente) VALUES ('Thor', 'Cão', 'Golden Retriever', 1);

INSERT INTO SERVICO (nome, preco) VALUES ('Consulta Geral', 150.00), ('Vacina Antirrábica', 80.00);

INSERT INTO CONSULTA (data_hora, status, id_pet, id_veterinario) VALUES (NOW(), 'realizada', 1, 2);

INSERT INTO CONSULTA_SERVICO (id_consulta, id_servico, quantidade) VALUES (1, 1, 1), (1, 2, 1);

INSERT INTO PRONTUARIO (detalhes, id_consulta) VALUES ('Animal saudável, vacinação em dia.', 1);

4. SCRIPTS DE MANIPULAÇÃO (SELECTS E UPDATES)

Consulta Geral: Ver histórico do Pet com nome do Dono e Veterinário
SELECT 
    P.nome AS Pet, 
    Cli_Pess.nome AS Dono, 
    Vet_Pess.nome AS Veterinario, 
    C.data_hora
FROM CONSULTA C
JOIN PET P ON C.id_pet = P.id_pet
JOIN PESSOA Cli_Pess ON P.id_cliente = Cli_Pess.id_pessoa
JOIN PESSOA Vet_Pess ON C.id_veterinario = Vet_Pess.id_pessoa;

Atualização: Alterar preço de um serviço
UPDATE SERVICO SET preco = 165.00 WHERE nome = 'Consulta Geral';

Atualização: Mudar status de uma consulta
UPDATE CONSULTA SET status = 'cancelada' WHERE id_consulta = 1;
