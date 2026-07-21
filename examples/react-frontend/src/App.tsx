import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BDTicketProvider } from "./lib/ui/provider";
import { DynamicForm } from "./components/DynamicForm";
// Reaproveita os contratos gerados pelo exemplo basic-sqlite (rode `npm run setup` lá primeiro) —
// prova que os hooks/schemas gerados são diretamente consumíveis por um app React de verdade,
// sem nenhuma camada extra escrita à mão.
import { usersInsertSchema } from "../../basic-sqlite/src/contracts/schemas/users";
import { useUsersList, useUsersCreate } from "../../basic-sqlite/src/contracts/hooks/users";

const queryClient = new QueryClient();
const API_BASE_URL = "http://localhost:3000";

// Mesmas etiquetas de bd-ticket.config.json do exemplo basic-sqlite, num formato consumível
// diretamente pelo <DynamicForm />. Num app real, isso viria de fato do metadata.json gerado
// (ex.: servido por um endpoint /metadata, ou empacotado em build-time) — aqui está inline só
// para manter este exemplo livre de mais uma peça móvel.
const usersMetadata = {
  columns: {
    nome: {
      isForeignKey: false,
      metadata: { label: "Nome", permissions: { write: ["admin"] }, ui_control: { component: "TextInput" } }
    },
    email: {
      isForeignKey: false,
      metadata: { label: "E-mail", permissions: { write: ["admin"] }, ui_control: { component: "TextInput" } }
    },
    status: {
      isForeignKey: false,
      metadata: {
        label: "Status",
        permissions: { write: ["admin"] },
        ui_control: { component: "SelectInput" },
        validation: { options: ["ativo", "inativo"] }
      }
    }
  }
};

function UsersPage({ token }: { token: string }) {
  const { data, isLoading, error } = useUsersList({}, { apiBaseUrl: API_BASE_URL, authToken: token, enabled: !!token });
  const createUser = useUsersCreate({ apiBaseUrl: API_BASE_URL, authToken: token });

  return (
    <div style={{ maxWidth: 480, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h2>Criar usuário</h2>
      <DynamicForm
        schema={usersInsertSchema}
        metadata={usersMetadata}
        role="admin"
        onSubmit={(values) => createUser.mutate(values)}
      />
      {createUser.isSuccess && <p style={{ color: "green" }}>Usuário criado!</p>}
      {createUser.isError && <p style={{ color: "red" }}>Erro: {String(createUser.error)}</p>}

      <h2>Usuários</h2>
      {isLoading && <p>Carregando...</p>}
      {error && (
        <p style={{ color: "red" }}>
          Erro ao carregar: {String(error)}. O backend (basic-sqlite) está rodando em :3000 e o token é válido?
        </p>
      )}
      <ul>
        {data?.data.map((u: any) => (
          <li key={u.id}>
            {u.nome} — {u.email} ({u.status})
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState("");

  return (
    <QueryClientProvider client={queryClient}>
      <BDTicketProvider role="admin" apiBaseUrl={API_BASE_URL} getAuthToken={() => token || null}>
        <div style={{ maxWidth: 480, margin: "2rem auto", fontFamily: "sans-serif" }}>
          <h1>BD-Ticket Engine — exemplo react-frontend</h1>
          <p>
            Backend gerado pelo motor (exemplo <code>basic-sqlite</code>), consumido aqui só via os
            hooks React Query e o <code>&lt;DynamicForm /&gt;</code> — zero <code>fetch</code>
            escrito à mão.
          </p>
          <label style={{ display: "block", marginBottom: "1rem" }}>
            Token JWT (rode <code>npm run token</code> em <code>examples/basic-sqlite</code> e cole
            aqui):
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
              placeholder="eyJhbGciOi..."
            />
          </label>
        </div>
        {token && <UsersPage token={token} />}
      </BDTicketProvider>
    </QueryClientProvider>
  );
}
