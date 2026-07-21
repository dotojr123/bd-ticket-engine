# Investigation: Metadata Extractor

> Identificador: `001-metadata-extractor`
> Data: `2026-07-21`

---

## 1. Pesquisa de Catálogos de Banco de Dados

### 1.1 PostgreSQL (Supabase)
Para obter tabelas, colunas, tipos físicos, restrições e comentários estruturados no PostgreSQL, utilizaremos consultas SQL diretas às tabelas de catálogo do `information_schema` e `pg_catalog`:

#### Query para Tabelas e Comentários (PostgreSQL):
```sql
SELECT 
    t.table_name,
    obj_description(c.oid, 'pg_class') as table_comment
FROM 
    information_schema.tables t
JOIN 
    pg_catalog.pg_class c ON c.relname = t.table_name
WHERE 
    t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE';
```

#### Query para Colunas, Tipos e Comentários (PostgreSQL):
```sql
SELECT 
    cols.column_name,
    cols.data_type,
    cols.is_nullable,
    pg_catalog.col_description(c.oid, cols.ordinal_position::int) as column_comment
FROM 
    information_schema.columns cols
JOIN 
    pg_catalog.pg_class c ON c.relname = cols.table_name
JOIN 
    pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE 
    cols.table_schema = 'public' 
    AND n.nspname = 'public'
    AND cols.table_name = $1;
```

---

### 1.2 Cloudflare D1 (SQLite)
No SQLite/D1, a extração física baseia-se em comandos `PRAGMA` nativos executados pela conexão do Wrangler ou SQLite local.

#### Listagem de Tabelas (SQLite):
```sql
SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';
```

#### Estrutura de Colunas e Chaves (SQLite):
```sql
PRAGMA table_info(nome_tabela);
PRAGMA foreign_key_list(nome_tabela);
```

Como o SQLite não possui suporte nativo confiável para comentários descritivos de tabelas/colunas (etiquetas) no mesmo nível do PostgreSQL, o extrator lerá o esquema físico e buscará as regras e labels correspondentes mesclando com o arquivo local de configuração `bd-ticket.config.json`.

---

## 2. Algoritmo de Ordenação Determinística

Para garantir diffs limpos no git e idempotência no `metadata.json`, usaremos uma função utilitária de ordenação profunda de chaves recursiva:

```typescript
function sortObjectDeep(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortObjectDeep);
  }
  return Object.keys(obj)
    .sort()
    .reduce((sorted: any, key: string) => {
      sorted[key] = sortObjectDeep(obj[key]);
      return sorted;
    }, {});
}
```
Todos os metadados gerados (project, version, tables, columns, tags) serão passados por essa função antes da gravação em disco.
