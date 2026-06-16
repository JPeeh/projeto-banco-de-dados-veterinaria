

USE clinica_veterinaria;

CREATE INDEX idx_pet_cliente    ON pet (id_cliente);

CREATE INDEX idx_consulta_pet   ON consulta (id_pet);
CREATE INDEX idx_consulta_vet   ON consulta (id_veterinario);
CREATE INDEX idx_consulta_data  ON consulta (data_hora);

CREATE INDEX idx_consulta_status ON consulta (status);

CREATE INDEX idx_cs_servico     ON consulta_servico (id_servico);

CREATE INDEX idx_pessoa_cpf     ON pessoa (cpf);

CREATE INDEX idx_pessoa_nome    ON pessoa (nome);

CREATE INDEX idx_usuario_login  ON usuarios (login);

CREATE INDEX idx_prn_consulta   ON prontuario (id_consulta);
