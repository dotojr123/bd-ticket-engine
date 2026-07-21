import { useMutation, useQuery, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import type { Test_pedidosSelect, Test_pedidosInsert, Test_pedidosUpdate } from "../types/test_pedidos";

const RESOURCE_PATH = "/test_pedidos";
const QUERY_KEY = "test_pedidos";

export interface Test_pedidosListParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  [filterColumn: string]: string | number | undefined;
}

export interface Test_pedidosListResponse {
  data: Test_pedidosSelect[];
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

/** Lista registros de test_pedidos com paginação/ordenação/filtro, tipado ponta a ponta. */
export function useTest_pedidosList(
  params: Test_pedidosListParams = {},
  opts: ApiClientOptions & Omit<UseQueryOptions<Test_pedidosListResponse>, "queryKey" | "queryFn"> = {}
) {
  const { apiBaseUrl, authToken, ...queryOptions } = opts;
  const search = new URLSearchParams(params as Record<string, string>).toString();
  return useQuery({
    queryKey: [QUERY_KEY, "list", params],
    queryFn: () => apiFetch<Test_pedidosListResponse>(`${RESOURCE_PATH}?${search}`, {}, { apiBaseUrl, authToken }),
    ...queryOptions
  });
}

/** Busca um único registro de test_pedidos por id. */
export function useTest_pedidosGet(id: string | number | undefined, opts: ApiClientOptions = {}) {
  return useQuery({
    queryKey: [QUERY_KEY, "get", id],
    queryFn: () => apiFetch<Test_pedidosSelect>(`${RESOURCE_PATH}/${id}`, {}, opts),
    enabled: id !== undefined && id !== null
  });
}

/** Cria um novo registro de test_pedidos e invalida a listagem em cache. */
export function useTest_pedidosCreate(opts: ApiClientOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Test_pedidosInsert) =>
      apiFetch<Test_pedidosSelect>(RESOURCE_PATH, { method: "POST", body: JSON.stringify(data) }, opts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, "list"] });
    }
  });
}

/** Atualiza um registro existente de test_pedidos e invalida cache de listagem + detalhe. */
export function useTest_pedidosUpdate(opts: ApiClientOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Test_pedidosUpdate }) =>
      apiFetch<Test_pedidosSelect>(`${RESOURCE_PATH}/${id}`, { method: "PUT", body: JSON.stringify(data) }, opts),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, "list"] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, "get", variables.id] });
    }
  });
}

/** Remove um registro de test_pedidos e invalida a listagem em cache. */
export function useTest_pedidosDelete(opts: ApiClientOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => apiFetch<void>(`${RESOURCE_PATH}/${id}`, { method: "DELETE" }, opts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, "list"] });
    }
  });
}
