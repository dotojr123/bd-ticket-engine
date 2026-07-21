import { TableDefinition } from "./postgres";

/**
 * Contrato público que qualquer driver de extração de schema deve implementar para plugar no
 * BD-Ticket Engine. `extractPostgresSchema` (postgres.ts) e `extractD1Schema` (d1.ts) já seguem
 * esta assinatura na prática; formalizá-la aqui é o que permite que a comunidade adicione outros
 * bancos (MySQL, MongoDB, etc.) como um novo módulo em `src/lib/db/` sem tocar no núcleo do
 * extractor/codegen — desde que a função final devolva `{ [tableName]: TableDefinition }`.
 *
 * Um novo driver precisa:
 *   1. Ler o catálogo físico do banco (tabelas, colunas, tipos, PK/FK, regras de ON DELETE).
 *   2. Decodificar as etiquetas de metadados de negócio (comentário de coluna/tabela, ou um
 *      arquivo de configuração local, como faz o driver D1/SQLite).
 *   3. Popular `cardinality` e `onDelete` nas colunas de FK quando o banco expuser essa
 *      informação, para que a UI e o roteador gerado se comportem corretamente.
 *   4. Devolver um objeto plano `{ [tableName]: TableDefinition }` — o restante do pipeline
 *      (sort determinístico, validação de schema, codegen) é agnóstico de driver.
 */
export type SchemaExtractorFn = (...args: any[]) => Promise<{ [tableName: string]: TableDefinition }>;

export interface SchemaExtractorModule {
  /** Nome curto do driver, usado em `--driver` no CLI do extractor (ex.: "postgres", "mysql"). */
  driverName: string;
  extract: SchemaExtractorFn;
}
