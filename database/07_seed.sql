

USE clinica_veterinaria;

INSERT INTO pessoa (cpf, nome, data_nasc, telefone, email) VALUES
('11122233344', 'Carlos Andrade',   '1985-03-15', '61991110001', 'carlos@email.com'),
('22233344455', 'Mariana Silva',    '1990-07-22', '61991110002', 'mariana@email.com'),
('33344455566', 'Ana Costa',        '1978-11-05', '61991110003', 'ana@email.com'),   -- veterinária
('44455566677', 'Roberto Souza',    '1975-06-30', '61991110004', 'roberto@email.com'), -- veterinário
('55566677788', 'Fernanda Lima',    '1992-01-10', '61991110005', 'fernanda@email.com');


INSERT INTO cliente (id_pessoa, endereco) VALUES
(1, 'Rua das Flores, 100 - Asa Norte'),
(2, 'SQN 304, Bloco B Ap 201'),
(5, 'QI 15 Lt 8 - Guará II');


INSERT INTO veterinario (id_pessoa, crmv, especialidade) VALUES
(3, 'CRMV-DF12345', 'Clínica Geral'),
(4, 'CRMV-DF67890', 'Dermatologia');


INSERT INTO pet (nome, especie, raca, data_nasc, id_cliente) VALUES
('Rex',     'Cão',  'Labrador',        '2020-05-10', 1),
('Mia',     'Gato', 'Siamês',          '2021-08-14', 2),
('Thor',    'Cão',  'Golden Retriever', '2019-02-20', 1),
('Belinha', 'Cão',  'Poodle',          '2022-11-01', 5);


INSERT INTO servico (nome, descricao, preco) VALUES
('Consulta Geral',    'Avaliação clínica completa',          150.00),
('Vacina Antirrábica','Vacina anual obrigatória',             80.00),
('Banho e Tosa',      'Banho, tosa e higiene',               70.00),
('Exame de Sangue',   'Hemograma completo',                  120.00),
('Raio-X',            'Radiografia digital',                 200.00),
('Vacinação V10',     'Polivalente canina 10 doenças',        90.00);

CALL sp_registrar_consulta('2026-06-10 09:00:00', 1, 3, @id1);
CALL sp_registrar_consulta('2026-06-10 10:30:00', 2, 4, @id2);
CALL sp_registrar_consulta('2026-06-12 14:00:00', 3, 3, @id3);
CALL sp_registrar_consulta('2026-06-15 09:00:00', 4, 3, @id4);
CALL sp_registrar_consulta('2026-06-15 11:00:00', 1, 4, @id5);


INSERT INTO consulta_servico (id_consulta, id_servico, quantidade) VALUES
(@id1, 1, 1), (@id1, 2, 1),
(@id2, 1, 1), (@id2, 4, 1),
(@id3, 1, 1), (@id3, 6, 2),
(@id4, 1, 1),
(@id5, 5, 1);

CALL sp_realizar_consulta(@id1, 'Animal saudável. Vacinação em dia.', 'Exame físico sem alterações. Vacina antirrábica aplicada. Próxima consulta em 12 meses.');
CALL sp_realizar_consulta(@id2, 'Dermatite alérgica leve. Prescrição de pomada antifúngica.', 'Animal apresentou lesões na região abdominal. Prescrito Hibiclens 2x/dia por 10 dias. Retorno em 15 dias.');
CALL sp_realizar_consulta(@id3, 'Animal em ótimas condições. Vacinação V10 aplicada 2 doses.', 'Sem alterações clínicas. Peso: 28kg. Vacinação polivalente em dia.');
