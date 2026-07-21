import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useBDTicket } from "../lib/ui/provider";
import { cn } from "../lib/ui/utils";

export interface DynamicFormProps {
  schema: any; // Zod schema gerado pelo codegen
  metadata: any; // Metadados da tabela do metadata.json
  onSubmit: (data: any) => void;
  role?: string; // Role local override
  className?: string; // Classes CSS externas
  slots?: {
    [fieldName: string]: (props: {
      value: any;
      onChange: (val: any) => void;
      disabled?: boolean;
      error?: string;
    }) => React.ReactNode;
  };
}

/**
 * Componente Headless de Formulário Dinâmico Guiado por Metadados.
 */
export const DynamicForm: React.FC<DynamicFormProps> = ({
  schema,
  metadata,
  onSubmit,
  role: localRole,
  className,
  slots = {}
}) => {
  const globalAuth = useBDTicket();
  const activeRole = localRole || globalAuth.role;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(schema)
  });

  const columns = metadata.columns || {};

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn("space-y-4", className)}>
      {Object.entries(columns).map(([colName, colDef]: [string, any]) => {
        // 1. Verificar Visibilidade (permissions.read ou ui_control.visible_in_views)
        const visibleViews = colDef.metadata?.ui_control?.visible_in_views;
        const isVisible = !visibleViews || visibleViews.includes(activeRole);
        if (!isVisible) return null;

        // 2. Verificar Habilitação de Escrita (permissions.write)
        const allowedWrite = colDef.metadata?.permissions?.write;
        const isWriteAllowed = !allowedWrite || allowedWrite.includes(activeRole);
        const isDisabled = !isWriteAllowed;

        // Obter tipo do controle
        const componentType = colDef.metadata?.ui_control?.component || "TextInput";
        const labelText = colDef.metadata?.ui_control?.label || colName;
        const fieldError = errors[colName]?.message as string | undefined;

        // 3. Renderizar Slot Customizado se fornecido
        if (slots[colName]) {
          return (
            <div key={colName} className="flex flex-col gap-1">
              <label className="text-sm font-medium">{labelText}</label>
              <Controller
                name={colName}
                control={control}
                render={({ field }) => (
                  <>
                    {slots[colName]({
                      value: field.value,
                      onChange: field.onChange,
                      disabled: isDisabled,
                      error: fieldError
                    })}
                  </>
                )}
              />
              {fieldError && <span className="text-xs text-red-500">{fieldError}</span>}
            </div>
          );
        }

        // 4. Renderização Headless Fallback dos Componentes Nativos
        return (
          <div key={colName} className="flex flex-col gap-1">
            <label className="text-sm font-medium">{labelText}</label>

            {componentType === "SelectInput" && colDef.metadata?.validation?.options ? (
              <select
                disabled={isDisabled}
                {...register(colName)}
                className="w-full border rounded px-3 py-2 bg-transparent text-inherit disabled:opacity-50"
              >
                <option value="">Selecione...</option>
                {colDef.metadata.validation.options.map((opt: string) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : componentType === "CheckboxInput" ? (
              <input
                type="checkbox"
                disabled={isDisabled}
                {...register(colName)}
                className="rounded border disabled:opacity-50"
              />
            ) : (
              <input
                type="text"
                disabled={isDisabled}
                {...register(colName)}
                className="w-full border rounded px-3 py-2 bg-transparent text-inherit disabled:opacity-50"
              />
            )}

            {fieldError && <span className="text-xs text-red-500">{fieldError}</span>}
          </div>
        );
      })}

      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded py-2 transition-colors"
      >
        Submeter
      </button>
    </form>
  );
};
