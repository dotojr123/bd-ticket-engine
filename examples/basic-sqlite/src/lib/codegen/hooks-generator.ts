/**
 * Gera hooks React Query tipados que consomem a API real gerada pelo router, eliminando a
 * necessidade de escrever fetch/axios manualmente no frontend. Invalidação de cache é feita
 * automaticamente após cada mutação (create/update/delete).
 */
export function generateHooksString(tableName: string): string {
  const camelTableName = tableName.charAt(0).toUpperCase() + tableName.slice(1);
  const resourcePath = `/${tableName}`;

  return `import { useMutation, useQuery, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import type { ${camelTableName}Select, ${camelTableName}Insert, ${camelTableName}Update } from "../types/${tableName}";

const RESOURCE_PATH = "${resourcePath}";
const QUERY_KEY = "${tableName}";

export interface ${camelTableName}ListParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  [filterColumn: string]: string | number | undefined;
}

export interface ${camelTableName}ListResponse {
  data: ${camelTableName}Select[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiClientOptions {
  /** URL base da API (default: mesma origem). */
  apiBaseUrl?: string;
  /** JWT atual para anexar como Authorization: Bearer <token>. */
  authToken?: string | null;
}

async function apiFetch<T>(path: string, init: RequestInit, opts: ApiClientOptions): Promise<T> {
  const res = await fetch(\`\${opts.apiBaseUrl || ""}\${path}\`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(opts.authToken ? { Authorization: \`Bearer \${opts.authToken}\` } : {}),
      ...(init.headers || {})
    }
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || \`Erro HTTP \${res.status} em \${path}\`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

/** Lista registros de ${tableName} com paginação/ordenação/filtro, tipado ponta a ponta. */
export function use${camelTableName}List(
  params: ${camelTableName}ListParams = {},
  opts: ApiClientOptions & Omit<UseQueryOptions<${camelTableName}ListResponse>, "queryKey" | "queryFn"> = {}
) {
  const { apiBaseUrl, authToken, ...queryOptions } = opts;
  const search = new URLSearchParams(params as Record<string, string>).toString();
  return useQuery({
    queryKey: [QUERY_KEY, "list", params],
    queryFn: () => apiFetch<${camelTableName}ListResponse>(\`\${RESOURCE_PATH}?\${search}\`, {}, { apiBaseUrl, authToken }),
    ...queryOptions
  });
}

/** Busca um único registro de ${tableName} por id. */
export function use${camelTableName}Get(id: string | number | undefined, opts: ApiClientOptions = {}) {
  return useQuery({
    queryKey: [QUERY_KEY, "get", id],
    queryFn: () => apiFetch<${camelTableName}Select>(\`\${RESOURCE_PATH}/\${id}\`, {}, opts),
    enabled: id !== undefined && id !== null
  });
}

/** Cria um novo registro de ${tableName} e invalida a listagem em cache. */
export function use${camelTableName}Create(opts: ApiClientOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ${camelTableName}Insert) =>
      apiFetch<${camelTableName}Select>(RESOURCE_PATH, { method: "POST", body: JSON.stringify(data) }, opts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, "list"] });
    }
  });
}

/** Atualiza um registro existente de ${tableName} e invalida cache de listagem + detalhe. */
export function use${camelTableName}Update(opts: ApiClientOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: ${camelTableName}Update }) =>
      apiFetch<${camelTableName}Select>(\`\${RESOURCE_PATH}/\${id}\`, { method: "PUT", body: JSON.stringify(data) }, opts),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, "list"] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, "get", variables.id] });
    }
  });
}

/** Remove um registro de ${tableName} e invalida a listagem em cache. */
export function use${camelTableName}Delete(opts: ApiClientOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => apiFetch<void>(\`\${RESOURCE_PATH}/\${id}\`, { method: "DELETE" }, opts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, "list"] });
    }
  });
}
`;
}
