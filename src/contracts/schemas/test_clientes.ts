import { z } from "zod";

export const test_clientesSelectSchema = z.object({
  deleted_at: z.string().nullable().optional(),
  email: z.string(),
  id: z.number().nullable().optional(),
  nome: z.string(),
});

export const test_clientesInsertSchema = z.object({
  deleted_at: z.string().nullable().optional(),
  email: z.string(),
  nome: z.string(),
});

export const test_clientesUpdateSchema = test_clientesInsertSchema.partial();
