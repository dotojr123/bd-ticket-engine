# Exemplo: postgres-rbac

Demonstra RBAC com múltiplos papéis, **permissão em nível de linha** (`owner_field`) e **rate
limiting** — os três pilares de segurança do runtime gerado pelo motor.

Roda com SQLite por padrão (zero infraestrutura externa), mas o router gerado é **idêntico**
independente do dialeto — troque `DB_DRIVER`/`DATABASE_URL` no `.env` para rodar contra Postgres de
verdade. Essa equivalência é o que `tests/integration-postgres.test.ts` no repositório do motor
comprova (mesmo router, mesmos cenários, Postgres real via `pg-mem`).

## Rodando

```bash
npm install
cp .env.example .env
npm run setup      # cria local.db (tabela tasks), extrai metadata, gera contratos, valida
npm run dev         # sobe o servidor em http://localhost:3001
```

Em outro terminal:

```bash
npm run demo
```

O `demo.ts` roda o roteiro inteiro sozinho: cria tarefas como dois usuários diferentes, mostra que
cada um só vê a própria (isolamento por linha), mostra que `admin` vê tudo, e dispara mais de 100
requisições seguidas para acionar o rate limit (429).

## O que este exemplo prova

- **`options.owner_field: "owner_id"`** em `bd-ticket.config.json` faz o roteador filtrar
  automaticamente `GET /tasks` e `GET /tasks/:id` por `owner_id = <sub do JWT>` — sem uma linha de
  SQL escrita à mão.
- Quando o `owner_id` não é informado no `POST`, o motor atribui automaticamente o `sub` de quem
  está autenticado (ver `crud-engine.ts::createRecord`).
- Apenas o papel `admin` ignora esse filtro (`bypassOwnerFilter`) — é assim que o "admin vê tudo"
  funciona.
- Rate limiting (100 requisições/minuto por chamador, por padrão) protege qualquer rota gerada, sem
  configuração adicional.

## Limitação conhecida (documentada, não escondida)

A permissão **em nível de coluna** (`permissions.write` por campo, ex.: só `admin` pode escrever em
`owner_id`) hoje só é aplicada na camada de UI (`<DynamicForm />` desabilita o campo). O roteador
gerado autoriza escrita em nível de **tabela** (união dos papéis de todas as colunas) — ou seja, uma
chamada de API direta feita por um usuário comum, informando um `owner_id` diferente do seu próprio
`sub`, não é bloqueada pelo roteador hoje. Se isso importa para o seu caso de uso, valide/normalize
esse campo no cliente antes de confiar nele, ou trate isso como um item de hardening adicional antes
de ir para produção com dados sensíveis — está listado como gap conhecido no checklist do motor.
