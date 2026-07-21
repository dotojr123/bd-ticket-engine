import { z } from "zod";

export const test_pedidosSelectSchema = z.object({
  cliente_id: z.number().nullable().optional(),
  id: z.number().nullable().optional(),
  status: z.enum(["pendente", "em_processamento", "concluido", "cancelado"]),
});

export const test_pedidosInsertSchema = z.object({
  cliente_id: z.number().nullable().optional(),
  status: z.enum(["pendente", "em_processamento", "concluido", "cancelado"]),
});

export const test_pedidosUpdateSchema = test_pedidosInsertSchema.partial();
