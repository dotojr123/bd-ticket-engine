import { useMutation, useQuery, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import type { Test_clientesSelect, Test_clientesInsert, Test_clientesUpdate } from "../types/test_clientes";

const RESOURCE_PATH = "/test_clientes";
const QUERY_KEY = "test_clientes";

export interface Test_clientesListParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  [filterColumn: string]: string | number | undefined;
}

export interface Test_clientesListResponse {
  data: Test_clientesSelect[];
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
  const res = await fetch(`${opts.apiBaseUrl || ""}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(opts.authToken ? { Authorization: `Bearer ${opts.authToken}` } : {}),
      ...(init.headers || {})
    }
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro HTTP ${res.status} em ${path}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

/** Lista registros de test_clientes com paginação/ordenação/filtro, tipado ponta a ponta. */
export function useTest_clientesList(
  params: Test_clientesListParams = {},
  opts: ApiClientOptions & Omit<UseQueryOptions<Test_clientesListResponse>, "queryKey" | "queryFn"> = {}
) {
  const { apiBaseUrl, authToken, ...queryOptions } = opts;
  const search = new URLSearchParams(params as Record<string, string>).toString();
  return useQuery({
    queryKey: [QUERY_KEY, "list", params],
    queryFn: () => apiFetch<Test_clientesListResponse>(`${RESOURCE_PATH}?${search}`, {}, { apiBaseUrl, authToken }),
    ...queryOptions
  });
}

/** Busca um único registro de test_clientes por id. */
export function useTest_clientesGet(id: string | number | undefined, opts: ApiClientOptions = {}) {
  return useQuery({
    queryKey: [QUERY_KEY, "get", id],
    queryFn: () => apiFetch<Test_clientesSelect>(`${RESOURCE_PATH}/${id}`, {}, opts),
    enabled: id !== undefined && id !== null
  });
}

/** Cria um novo registro de test_clientes e invalida a listagem em cache. */
export function useTest_clientesCreate(opts: ApiClientOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Test_clientesInsert) =>
      apiFetch<Test_clientesSelect>(RESOURCE_PATH, { method: "POST", body: JSON.stringify(data) }, opts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, "list"] });
    }
  });
}

/** Atualiza um registro existente de test_clientes e invalida cache de listagem + detalhe. */
export function useTest_clientesUpdate(opts: ApiClientOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Test_clientesUpdate }) =>
      apiFetch<Test_clientesSelect>(`${RESOURCE_PATH}/${id}`, { method: "PUT", body: JSON.stringify(data) }, opts),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, "list"] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, "get", variables.id] });
    }
  });
}

/** Remove um registro de test_clientes e invalida a listagem em cache. */
export function useTest_clientesDelete(opts: ApiClientOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => apiFetch<void>(`${RESOURCE_PATH}/${id}`, { method: "DELETE" }, opts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, "list"] });
    }
  });
}
