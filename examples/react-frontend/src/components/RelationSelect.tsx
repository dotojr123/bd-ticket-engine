import React, { useEffect, useState } from "react";
import { useBDTicket } from "../lib/ui/provider";

export interface RelationSelectProps {
  /** Nome da tabela relacionada (usado para montar o endpoint /<table> gerado pelo router). */
  relatedTable: string;
  /** Campo do registro relacionado exibido como label (default: "id"). */
  labelField?: string;
  /** Campo do registro relacionado usado como valor (default: "id"). */
  valueField?: string;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
  error?: string;
}

interface RelatedRecord {
  [key: string]: any;
}

/**
 * Select assíncrono headless que busca as opções na API real gerada para a tabela relacionada,
 * eliminando a necessidade do usuário digitar manualmente um ID de chave estrangeira.
 */
export const RelationSelect: React.FC<RelationSelectProps> = ({
  relatedTable,
  labelField = "id",
  valueField = "id",
  value,
  onChange,
  disabled,
  error
}) => {
  const { apiBaseUrl, getAuthToken } = useBDTicket();
  const [options, setOptions] = useState<RelatedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      setLoading(true);
      setLoadError(null);
      try {
        const token = getAuthToken();
        const res = await fetch(`${apiBaseUrl}/${relatedTable}?pageSize=100`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined
        });
        if (!res.ok) throw new Error(`Falha ao carregar opções de '${relatedTable}' (HTTP ${res.status})`);
        const body = await res.json();
        if (!cancelled) setOptions(body.data || []);
      } catch (err: any) {
        if (!cancelled) setLoadError(err.message || "Erro ao carregar opções relacionadas");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, relatedTable]);

  return (
    <div className="flex flex-col gap-1">
      <select
        disabled={disabled || loading}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? e.target.value : null)}
        className="w-full border rounded px-3 py-2 bg-transparent text-inherit disabled:opacity-50"
      >
        <option value="">{loading ? "Carregando..." : "Selecione..."}</option>
        {options.map((opt) => (
          <option key={opt[valueField]} value={opt[valueField]}>
            {opt[labelField] ?? opt[valueField]}
          </option>
        ))}
      </select>
      {(loadError || error) && <span className="text-xs text-red-500">{loadError || error}</span>}
    </div>
  );
};
