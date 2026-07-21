import { z } from "zod";
import { test_pedidosSelectSchema, test_pedidosInsertSchema, test_pedidosUpdateSchema } from "../schemas/test_pedidos";

export type Test_pedidosSelect = z.infer<typeof test_pedidosSelectSchema>;
export type Test_pedidosInsert = z.infer<typeof test_pedidosInsertSchema>;
export type Test_pedidosUpdate = z.infer<typeof test_pedidosUpdateSchema>;
