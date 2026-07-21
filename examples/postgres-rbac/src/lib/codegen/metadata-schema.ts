import { z } from "zod";

/**
 * Schema de validação estrutural do metadata.json. Roda antes do codegen consumir o arquivo,
 * garantindo mensagens de erro acionáveis em vez de exceptions genéricas de runtime.
 */
const columnDefinitionSchema = z.object({
  type: z.string(),
  isNullable: z.boolean(),
  isPrimaryKey: z.boolean(),
  isForeignKey: z.boolean(),
  references: z.string().nullable().optional(),
  onDelete: z.string().nullable().optional(),
  cardinality: z.enum(["one-to-one", "many-to-one"]).nullable().optional(),
  metadata: z.record(z.string(), z.any()).optional().default({})
});

const tableOptionsSchema = z.object({
  soft_delete: z.boolean().optional(),
  owner_field: z.string().optional()
});

const tableDefinitionSchema = z.object({
  columns: z.record(z.string(), columnDefinitionSchema),
  options: tableOptionsSchema.optional()
});

export const metadataSchema = z.object({
  project: z.string(),
  version: z.string(),
  tables: z.record(z.string(), tableDefinitionSchema)
});

export type ValidatedMetadata = z.infer<typeof metadataSchema>;

export interface MetadataValidationResult {
  success: boolean;
  data?: ValidatedMetadata;
  errors: string[];
}

/**
 * Valida o conteúdo bruto do metadata.json contra o schema estrutural esperado.
 * Retorna uma lista de erros legíveis com o caminho exato do campo problemático.
 */
export function validateMetadata(raw: unknown): MetadataValidationResult {
  const result = metadataSchema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data, errors: [] };
  }

  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join(".") || "(raiz)";
    return `[METADATA INVÁLIDO] Campo '${path}': ${issue.message}`;
  });

  return { success: false, errors };
}
