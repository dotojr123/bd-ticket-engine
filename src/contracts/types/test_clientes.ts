import { z } from "zod";
import { test_clientesSelectSchema, test_clientesInsertSchema, test_clientesUpdateSchema } from "../schemas/test_clientes";

export type Test_clientesSelect = z.infer<typeof test_clientesSelectSchema>;
export type Test_clientesInsert = z.infer<typeof test_clientesInsertSchema>;
export type Test_clientesUpdate = z.infer<typeof test_clientesUpdateSchema>;
