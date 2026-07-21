# Onboarding: Dynamic Headless UI

> Identificador: `003-dynamic-headless-ui`
> Data: `2026-07-21`

---

## 1. Configuração e Dependências

Para utilizar os componentes React reativos, instale as dependências de gerenciamento de formulário e utilitários de CSS:

```bash
npm install react-hook-form @hookform/resolvers clsx tailwind-merge
npm install -D @types/react @types/react-dom
```

---

## 2. Exemplo de Integração na Aplicação

### Configurar o Provider global na raiz (`src/main.tsx`):
```tsx
import React from "react";
import { BDTicketProvider } from "./lib/ui/provider";
import App from "./App";

export function Root() {
  return (
    <BDTicketProvider role="parceiro">
      <App />
    </BDTicketProvider>
  );
}
```

### Consumir o Formulário dinâmico em uma Página (`src/App.tsx`):
```tsx
import React from "react";
import { DynamicForm } from "./components/DynamicForm";
import { test_pedidosInsertSchema } from "./contracts/schemas/test_pedidos";
import metadata from "../_reversa_sdd/metadata.json";

export default function App() {
  const handleSubmit = (data: any) => {
    console.log("Submit:", data);
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Novo Pedido</h1>
      <DynamicForm 
        schema={test_pedidosInsertSchema}
        metadata={metadata.tables.test_pedidos}
        onSubmit={handleSubmit}
        className="space-y-4"
      />
    </div>
  );
}
```
---

## 3. Roteiro de Teste (Validação)

1. **Teste A: Validação Reativa:** Tente submeter o formulário sem selecionar o status e verifique se a mensagem de erro aparece em tempo real.
2. **Teste B: Sobrescrita de Slots:** Passe um input customizado para o campo `status` via propriedade `slots` do formulário e certifique-se de que ele é usado em substituição ao componente padrão.
