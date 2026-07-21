# Onboarding: Metadata Extractor

> Identificador: `001-metadata-extractor`
> Data: `2026-07-21`

---

## 1. Configuração do Ambiente Local

Para executar e validar a CLI do Extrator de Metadados localmente, siga os passos abaixo:

### Passo 1: Dependências
Certifique-se de que os pacotes necessários estão instalados no projeto de desenvolvimento:
```bash
npm install pg better-sqlite3 dotenv commander
npm install -D @types/pg @types/node typescript
```

### Passo 2: Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto contendo a URL de conexão do PostgreSQL de testes:
```env
DATABASE_URL=postgres://usuario:senha@localhost:5432/bd_ticket_test
```

### Passo 3: Executar a Extração
Compile e rode o utilitário CLI localmente apontando para a sua base:
```bash
# Compilar TypeScript
npx tsc

# Executar extrator padrão
node dist/bin/extractor.js

# Executar em modo estrito (Fail-Fast ativo)
node dist/bin/extractor.js --strict

# Executar contra D1 local (SQLite) especificando binding
node dist/bin/extractor.js --d1-binding DB --config wrangler.toml
```

---

## 2. Roteiro de Teste (Validação)

### Teste A: JSON de Metadados Válido (Postgres)
1. Crie uma tabela `test_pedidos` no banco de dados.
2. Adicione o comentário na tabela:
   ```sql
   COMMENT ON COLUMN test_pedidos.status IS '{"metadata": {"label": "Status do Pedido", "ui_control": {"component": "Select"}, "validation": {"required": true}}}';
   ```
3. Execute o extrator: `node dist/bin/extractor.js`.
4. Verifique que o arquivo `_reversa_sdd/metadata.json` foi criado, ordenado alfabeticamente e contém as chaves `"label": "Status do Pedido"`.

### Teste B: JSON Inválido no Comentário (Fail-Fast)
1. Altere o comentário no banco de dados para um JSON quebrado (ex: `{"metadata": {invalid_json`).
2. Execute o extrator em modo estrito: `node dist/bin/extractor.js --strict`.
3. Verifique que a ferramenta encerra a execução exibindo erro de parse estrutural e retorna o Exit Code 1.
