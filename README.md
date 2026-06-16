# Sistema de Gestão para Clínicas Veterinárias

Autor: João Pedro Holanda de Souza — UC2100355 — Grupo 10  
Orientador: Jefferson Salomão Rodrigues  
Universidade Católica de Brasília — Laboratório de Banco de Dados — 2026

---

## Visão Geral

Aplicação web completa para gestão de clínicas veterinárias, com:

- **MySQL 8.0** — banco relacional com 11 tabelas, 4 triggers, 4 views, 5 functions, 3 stored procedures, 10 índices e 5 usuários com controle de acesso
- **MongoDB 7.0** — banco NoSQL para logs de auditoria da API
- **Node.js + Express.js** — API RESTful com duplo pool de conexão MySQL
- **HTML5 + CSS3 + JavaScript** — interface SPA sem frameworks

---

## Estrutura do Projeto

```
projeto/
├── database/
│   ├── 01_schema.sql                # Tabelas, PKs, FKs e constraints
│   ├── 02_functions_procedures.sql  # 5 functions + 3 stored procedures
│   ├── 03_triggers.sql              # 4 triggers de integridade e auditoria
│   ├── 04_views.sql                 # 4 views operacionais e financeiras
│   ├── 05_indexes.sql               # 10 índices justificados
│   ├── 06_users_access.sql          # 5 usuários e perfis de acesso
│   ├── 07_seed.sql                  # Dados iniciais de exemplo
│   └── 08_add_ativo.sql             # Migração: coluna ativo em pet e cliente
├── backend/
│   ├── server.js                    # API Express — 25+ endpoints REST
│   ├── db.js                        # Pool MySQL — usuário vet_app
│   ├── db_admin.js                  # Pool MySQL — usuário vet_admin (DELETE)
│   ├── db_mongo.js                  # Conexão MongoDB via Mongoose
│   ├── models/
│   │   └── Log.js                   # Schema Mongoose para logs de auditoria
│   ├── package.json
│   └── .env.example                 # Variáveis de ambiente necessárias
└── frontend/
    ├── index.html                   # SPA com 6 seções
    ├── style.css                    # Design com CSS custom properties
    └── app.js                       # Lógica da interface
```

---

## Como Rodar

### Pré-requisitos

- MySQL 8.0 rodando localmente
- MongoDB 7.0 rodando localmente (`mongod`)
- Node.js 18+ instalado

### 1. Banco de Dados (MySQL)

Execute os scripts **na ordem** no MySQL Workbench ou CLI:

```sql
source database/01_schema.sql
source database/02_functions_procedures.sql
source database/03_triggers.sql
source database/04_views.sql
source database/05_indexes.sql
source database/06_users_access.sql
source database/07_seed.sql
source database/08_add_ativo.sql
```

> **Nota:** O script `06_users_access.sql` cria os usuários `vet_app`, `vet_admin`, `vet_medico`, `vet_recepcao` e `vet_financeiro`. Execute-o como root ou com privilégios de GRANT.

### 2. Backend

```bash
cd backend
copy .env.example .env   # Windows
# cp .env.example .env   # Mac/Linux
# Edite .env com suas credenciais se necessário
npm install
node server.js           # API em http://localhost:3001
```

### 3. Frontend

Abra `frontend/index.html` diretamente no navegador, ou use o Live Server do VS Code.

---

## Endpoints da API

### Agenda
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/agenda` | View `vw_agenda_completa` (filtros: status, data, busca) |
| GET | `/api/consultas/:id/detalhes` | Detalhes de uma consulta |
| POST | `/api/consultas` | Proc `sp_registrar_consulta` |
| PATCH | `/api/consultas/:id/editar` | Edita consulta agendada |
| PATCH | `/api/consultas/:id/realizar` | Proc `sp_realizar_consulta` |
| PATCH | `/api/consultas/:id/cancelar` | Cancela consulta |

### Faturamento
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/faturamento` | View `vw_faturamento_cliente` |

### Pets
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/pets` | Pets ativos (para dropdowns) |
| GET | `/api/pets?todos=1` | Todos os pets incluindo inativos |
| GET | `/api/pets/:id/historico` | Proc `sp_historico_pet` |
| POST | `/api/pets` | Cadastra pet |
| PATCH | `/api/pets/:id/desativar` | Soft delete |
| PATCH | `/api/pets/:id/reativar` | Reativa pet |
| DELETE | `/api/pets/:id` | Exclusão permanente |

### Clientes
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/clientes` | Clientes ativos |
| GET | `/api/clientes/todos` | Todos os clientes |
| POST | `/api/clientes` | Cadastra cliente |
| PATCH | `/api/clientes/:id/desativar` | Soft delete |
| PATCH | `/api/clientes/:id/reativar` | Reativa cliente |
| DELETE | `/api/clientes/:id` | Exclusão permanente |

### Veterinários
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/veterinarios` | View `vw_veterinarios_ativos` |
| GET | `/api/veterinarios/todos` | Todos os veterinários |
| POST | `/api/veterinarios` | Cadastra veterinário |
| PATCH | `/api/veterinarios/:id/desativar` | Soft delete |
| PATCH | `/api/veterinarios/:id/reativar` | Reativa |
| DELETE | `/api/veterinarios/:id` | Exclusão permanente |

### Serviços
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/servicos` | Serviços ativos (para dropdowns) |
| GET | `/api/servicos/todos` | Todos os serviços |
| POST | `/api/servicos` | Cadastra serviço |
| PATCH | `/api/servicos/:id/desativar` | Desativa serviço |
| PATCH | `/api/servicos/:id/reativar` | Reativa serviço |
| DELETE | `/api/servicos/:id/permanente` | Exclusão permanente |

### Outros
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/logs` | Logs de auditoria do MongoDB (filtro: ?evento=...) |
| GET | `/api/health` | Status da conexão com o banco |

---

## Recursos do Banco de Dados

### Tabelas (11)
`grupos_usuarios` · `usuarios` · `pessoa` · `cliente` · `veterinario` · `pet` · `servico` · `consulta` · `consulta_servico` · `prontuario` · `log_auditoria`

### Functions (5)
| Function | Descrição |
|----------|-----------|
| `fn_gerar_id_consulta()` | ID formato `CON-YYYYMMDD-NNN` |
| `fn_gerar_id_prontuario()` | ID formato `PRN-YYYYMMDD-NNN` |
| `fn_gerar_id_usuario()` | ID formato `USR-XXXXXXXX` |
| `fn_total_consulta(id)` | Valor total de uma consulta |
| `fn_idade_pet(id)` | Idade do pet em anos |

### Stored Procedures (3)
| Procedure | Descrição |
|-----------|-----------|
| `sp_registrar_consulta` | Cria consulta com ID gerado pela function |
| `sp_historico_pet` | Histórico completo de um pet |
| `sp_realizar_consulta` | Realiza consulta e cria prontuário |

### Triggers (4)
| Trigger | Evento | Função |
|---------|--------|--------|
| `trg_log_status_consulta` | AFTER UPDATE | Registra mudanças de status na auditoria |
| `trg_impede_cancelar_realizada` | BEFORE UPDATE | Impede cancelar consulta já realizada |
| `trg_log_novo_cliente` | AFTER INSERT | Audita criação de pessoas |
| `trg_valida_servico_ativo` | BEFORE INSERT | Impede serviço inativo em consulta |

### Views (4)
| View | Usada em |
|------|---------|
| `vw_agenda_completa` | Tela Agenda — `/api/agenda` |
| `vw_faturamento_cliente` | Tela Faturamento — `/api/faturamento` |
| `vw_historico_pet` | Referência interna |
| `vw_veterinarios_ativos` | Dropdowns de agendamento |

### Índices (10)
`idx_pet_cliente` · `idx_consulta_pet` · `idx_consulta_vet` · `idx_consulta_data` · `idx_consulta_status` · `idx_cs_servico` · `idx_pessoa_cpf` · `idx_pessoa_nome` · `idx_usuario_login` · `idx_prn_consulta`

### Usuários (5)
| Usuário | Perfil | Acesso |
|---------|--------|--------|
| `vet_admin` | Administrador | ALL PRIVILEGES |
| `vet_app` | Aplicação web | SELECT, INSERT, UPDATE + DELETE seletivo + EXECUTE |
| `vet_medico` | Veterinário | SELECT + INSERT/UPDATE em consulta/prontuário |
| `vet_recepcao` | Recepção | SELECT + INSERT/UPDATE em cadastros |
| `vet_financeiro` | Financeiro | SELECT em views financeiras |

---

## Tecnologias

| Camada | Tecnologia | Versão |
|--------|------------|--------|
| SGBD Relacional | MySQL | 8.0 |
| SGBD NoSQL | MongoDB | 7.0 |
| Runtime | Node.js | 20+ |
| Framework API | Express.js | 4.x |
| ODM NoSQL | Mongoose | 9.x |
| Driver MySQL | mysql2 | 3.x |
| Frontend | HTML5 + CSS3 + JS | — |
