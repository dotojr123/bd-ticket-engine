import { cn } from "../src/lib/ui/utils";

// Mock da função interna de resolução de visibilidade/permissão do DynamicForm
function resolvePermissions(colDef: any, userRole: string): { isVisible: boolean; isEditable: boolean } {
  const isVisible = !colDef.metadata?.ui_control?.visible_in_views || 
    colDef.metadata.ui_control.visible_in_views.includes(userRole);

  const isEditable = !colDef.metadata?.permissions?.write || 
    colDef.metadata.permissions.write.includes(userRole);

  return { isVisible, isEditable };
}

describe("Dynamic UI Helpers and Logic Suite", () => {
  test("T004: cn utility should merge tailwind classes and resolve conflicts", () => {
    // Mesclar classes básicas
    expect(cn("px-2 py-1", "bg-red-500")).toBe("px-2 py-1 bg-red-500");
    // Resolver conflitos de padding do Tailwind
    expect(cn("p-4", "p-2")).toBe("p-2");
    // Condicionais
    expect(cn("px-2", false && "bg-blue-500", "text-white")).toBe("px-2 text-white");
  });

  test("T008: resolvePermissions should properly decide visibility and edit state based on metadata", () => {
    const colDefAdmin = {
      type: "varchar",
      metadata: {
        permissions: {
          write: ["admin"]
        },
        ui_control: {
          visible_in_views: ["admin", "parceiro"]
        }
      }
    };

    // Cenário 1: Usuário comum (user)
    const resUser = resolvePermissions(colDefAdmin, "user");
    expect(resUser.isVisible).toBe(false); // Omitido da view
    expect(resUser.isEditable).toBe(false);

    // Cenário 2: Parceiro
    const resParceiro = resolvePermissions(colDefAdmin, "parceiro");
    expect(resParceiro.isVisible).toBe(true);
    expect(resParceiro.isEditable).toBe(false); // Read-only

    // Cenário 3: Admin
    const resAdmin = resolvePermissions(colDefAdmin, "admin");
    expect(resAdmin.isVisible).toBe(true);
    expect(resAdmin.isEditable).toBe(true); // Total acesso
  });
});
