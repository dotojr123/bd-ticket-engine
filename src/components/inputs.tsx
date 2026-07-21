import React, { useEffect, useRef, useState } from "react";
import { cn } from "../lib/ui/utils";

/**
 * Campos adicionais para o `<DynamicForm />`, seguindo o mesmo princípio headless do resto da
 * biblioteca (ver CONTRIBUTING.md): cada componente expõe comportamento/estado real (validação,
 * debounce, acessibilidade via ARIA) e uma renderização estrutural mínima sem opinião visual fixa
 * (sem cores, sombras, temas). Personalização de aparência é sempre via `className` — e, quando o
 * comportamento por si só não é suficiente (ex.: preview de arquivo, chips), via um slot de render
 * (`render*`) em vez de um componente visualmente pronto embutido na biblioteca.
 */

interface BaseFieldProps {
  disabled?: boolean;
  error?: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// DateInput
// ---------------------------------------------------------------------------
export interface DateInputProps extends BaseFieldProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  minDate?: string;
  maxDate?: string;
}

export const DateInput: React.FC<DateInputProps> = ({ value, onChange, minDate, maxDate, disabled, error, className }) => (
  <div className="flex flex-col gap-1">
    <input
      type="date"
      value={value ?? ""}
      min={minDate}
      max={maxDate}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value || null)}
      className={cn("w-full border rounded px-3 py-2 bg-transparent text-inherit disabled:opacity-50", className)}
    />
    {error && <span className="text-xs text-red-500">{error}</span>}
  </div>
);

// ---------------------------------------------------------------------------
// DateTimeInput (com conversão de timezone explícita, não escondida)
// ---------------------------------------------------------------------------
export interface DateTimeInputProps extends BaseFieldProps {
  /** Valor em ISO 8601 UTC (ex.: "2026-07-21T14:30:00.000Z"). */
  value: string | null | undefined;
  onChange: (isoUtc: string | null) => void;
  /** Timezone IANA usada apenas para exibir/coletar o valor local (ex.: "America/Sao_Paulo"). Default: timezone do navegador. */
  timezone?: string;
  minDateTime?: string;
  maxDateTime?: string;
}

export function isoToLocalInputValue(isoUtc: string, timezone?: string): string {
  const date = new Date(isoUtc);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export const DateTimeInput: React.FC<DateTimeInputProps> = ({
  value,
  onChange,
  timezone,
  minDateTime,
  maxDateTime,
  disabled,
  error,
  className
}) => {
  const localValue = value ? isoToLocalInputValue(value, timezone) : "";

  return (
    <div className="flex flex-col gap-1">
      <input
        type="datetime-local"
        value={localValue}
        min={minDateTime}
        max={maxDateTime}
        disabled={disabled}
        onChange={(e) => {
          if (!e.target.value) return onChange(null);
          // O input local não carrega timezone; interpretamos como horário local e convertemos
          // para um Date real via construção de string ISO local, deixando o motor do navegador
          // resolver para UTC de acordo com a timezone do próprio sistema (limitação conhecida:
          // para converter de uma timezone ARBITRÁRIA — diferente da do navegador — para UTC de
          // forma exata, use uma lib de datas no `onChange` do consumidor; aqui expomos o valor
          // local cru para não fingir uma precisão que o Date nativo do browser não garante).
          onChange(new Date(e.target.value).toISOString());
        }}
        className={cn("w-full border rounded px-3 py-2 bg-transparent text-inherit disabled:opacity-50", className)}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// TextareaInput
// ---------------------------------------------------------------------------
export interface TextareaInputProps extends BaseFieldProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  maxLength?: number;
  minLength?: number;
  rows?: number;
  showCounter?: boolean;
}

export const TextareaInput: React.FC<TextareaInputProps> = ({
  value,
  onChange,
  maxLength,
  minLength,
  rows = 4,
  showCounter = true,
  disabled,
  error,
  className
}) => (
  <div className="flex flex-col gap-1">
    <textarea
      value={value ?? ""}
      minLength={minLength}
      maxLength={maxLength}
      rows={rows}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={cn("w-full border rounded px-3 py-2 bg-transparent text-inherit disabled:opacity-50", className)}
    />
    <div className="flex justify-between text-xs">
      {error ? <span className="text-red-500">{error}</span> : <span />}
      {showCounter && maxLength && (
        <span className="text-inherit opacity-60">
          {(value ?? "").length}/{maxLength}
        </span>
      )}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// NumberInput
// ---------------------------------------------------------------------------
export interface NumberInputProps extends BaseFieldProps {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
}

export const NumberInput: React.FC<NumberInputProps> = ({ value, onChange, min, max, step, disabled, error, className }) => (
  <div className="flex flex-col gap-1">
    <input
      type="number"
      value={value ?? ""}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className={cn("w-full border rounded px-3 py-2 bg-transparent text-inherit disabled:opacity-50", className)}
    />
    {error && <span className="text-xs text-red-500">{error}</span>}
  </div>
);

// ---------------------------------------------------------------------------
// ToggleSwitch — comportamento/acessibilidade de switch (role, aria-checked, teclado),
// sem visual de "pílula" embutido — a aparência de switch é responsabilidade do CSS do consumidor.
// ---------------------------------------------------------------------------
export interface ToggleSwitchProps extends BaseFieldProps {
  value: boolean | null | undefined;
  onChange: (value: boolean) => void;
  label?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ value, onChange, label, disabled, error, className }) => (
  <div className="flex flex-col gap-1">
    <button
      type="button"
      role="switch"
      aria-checked={!!value}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!value)}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onChange(!value);
        }
      }}
      className={cn("border rounded px-3 py-2 text-left disabled:opacity-50", className)}
    >
      {value ? "Ativado" : "Desativado"}
    </button>
    {error && <span className="text-xs text-red-500">{error}</span>}
  </div>
);

// ---------------------------------------------------------------------------
// MultiSelectInput — estado de seleção múltipla real; renderização de "chips" é um slot opcional,
// não um visual fixo embutido.
// ---------------------------------------------------------------------------
export interface MultiSelectOption {
  value: string;
  label: string;
}

export interface MultiSelectInputProps extends BaseFieldProps {
  value: string[] | null | undefined;
  onChange: (value: string[]) => void;
  options: MultiSelectOption[];
  maxSelections?: number;
  renderChip?: (option: MultiSelectOption, onRemove: () => void) => React.ReactNode;
}

export const MultiSelectInput: React.FC<MultiSelectInputProps> = ({
  value,
  onChange,
  options,
  maxSelections,
  renderChip,
  disabled,
  error,
  className
}) => {
  const selected = value ?? [];

  function toggle(optionValue: string) {
    if (selected.includes(optionValue)) {
      onChange(selected.filter((v) => v !== optionValue));
      return;
    }
    if (maxSelections && selected.length >= maxSelections) return;
    onChange([...selected, optionValue]);
  }

  return (
    <div className="flex flex-col gap-2">
      <select
        multiple
        disabled={disabled}
        value={selected}
        onChange={(e) => {
          const values = Array.from(e.target.selectedOptions).map((o) => o.value);
          onChange(maxSelections ? values.slice(0, maxSelections) : values);
        }}
        className={cn("w-full border rounded px-3 py-2 bg-transparent text-inherit disabled:opacity-50", className)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((v) => {
            const option = options.find((o) => o.value === v) ?? { value: v, label: v };
            return renderChip ? (
              <React.Fragment key={v}>{renderChip(option, () => toggle(v))}</React.Fragment>
            ) : (
              <span key={v} className="text-xs border rounded px-2 py-0.5">
                {option.label}
              </span>
            );
          })}
        </div>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// AutocompleteSelect — busca assíncrona com debounce, renderização mínima.
// ---------------------------------------------------------------------------
export interface AutocompleteOption {
  value: string;
  label: string;
}

export interface AutocompleteSelectProps extends BaseFieldProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  /** Recebe o termo digitado e retorna as opções encontradas. */
  search: (term: string) => Promise<AutocompleteOption[]>;
  minChars?: number;
  debounceMs?: number;
  placeholder?: string;
}

export const AutocompleteSelect: React.FC<AutocompleteSelectProps> = ({
  value,
  onChange,
  search,
  minChars = 2,
  debounceMs = 300,
  placeholder,
  disabled,
  error,
  className
}) => {
  const [term, setTerm] = useState("");
  const [options, setOptions] = useState<AutocompleteOption[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (term.length < minChars) {
      setOptions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const results = await search(term);
      setOptions(results);
    }, debounceMs);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, minChars, debounceMs]);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value ?? "";

  return (
    <div className="relative flex flex-col gap-1">
      <input
        type="text"
        disabled={disabled}
        placeholder={placeholder}
        value={open ? term : selectedLabel}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => setTerm(e.target.value)}
        className={cn("w-full border rounded px-3 py-2 bg-transparent text-inherit disabled:opacity-50", className)}
      />
      {open && options.length > 0 && (
        <ul className="absolute top-full left-0 right-0 z-10 border rounded max-h-48 overflow-auto bg-inherit">
          {options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                className="w-full text-left px-3 py-2"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt.value);
                  setTerm("");
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// FileUploadInput — seleção + validação real; preview é um slot opcional.
// ---------------------------------------------------------------------------
export interface FileUploadInputProps extends BaseFieldProps {
  value: File[] | null | undefined;
  onChange: (files: File[], validationErrors: string[]) => void;
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  renderFile?: (file: File, onRemove: () => void) => React.ReactNode;
}

export function validateFiles(files: File[], accept: string | undefined, maxSize: number | undefined, maxFiles: number | undefined): string[] {
  const errors: string[] = [];
  if (maxFiles && files.length > maxFiles) {
    errors.push(`No máximo ${maxFiles} arquivo(s) permitido(s).`);
  }
  if (maxSize) {
    files.forEach((f) => {
      if (f.size > maxSize) errors.push(`'${f.name}' excede o tamanho máximo de ${Math.round(maxSize / 1024)}KB.`);
    });
  }
  if (accept) {
    const acceptedTypes = accept.split(",").map((t) => t.trim());
    files.forEach((f) => {
      const matches = acceptedTypes.some((type) => (type.startsWith(".") ? f.name.endsWith(type) : f.type.match(type.replace("*", ".*"))));
      if (!matches) errors.push(`'${f.name}' não é um tipo de arquivo aceito (${accept}).`);
    });
  }
  return errors;
}

export const FileUploadInput: React.FC<FileUploadInputProps> = ({
  value,
  onChange,
  accept,
  maxSize,
  maxFiles,
  renderFile,
  disabled,
  error,
  className
}) => {
  const files = value ?? [];

  return (
    <div className="flex flex-col gap-2">
      <input
        type="file"
        accept={accept}
        multiple={!maxFiles || maxFiles > 1}
        disabled={disabled}
        onChange={(e) => {
          const selected = Array.from(e.target.files ?? []);
          const validationErrors = validateFiles(selected, accept, maxSize, maxFiles);
          onChange(selected, validationErrors);
        }}
        className={cn("w-full border rounded px-3 py-2 bg-transparent text-inherit disabled:opacity-50", className)}
      />
      {files.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {files.map((f, i) =>
            renderFile ? (
              <li key={`${f.name}-${i}`}>{renderFile(f, () => onChange(files.filter((_, idx) => idx !== i), []))}</li>
            ) : (
              <li key={`${f.name}-${i}`}>
                {f.name} ({Math.round(f.size / 1024)}KB)
              </li>
            )
          )}
        </ul>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
};
