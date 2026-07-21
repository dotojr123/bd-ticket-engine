# Investigation: Dynamic Headless UI

> Identificador: `003-dynamic-headless-ui`
> Data: `2026-07-21`

---

## 1. Mapeamento de UI Component a partir do Metadado

O formulário deve verificar a propriedade `ui_control.component` nas colunas do `metadata.json` para renderizar o input HTML ideal:

| `ui_control.component` | Elemento HTML | Propriedades e opções |
|------------------------|---------------|-----------------------|
| `TextInput` | `<input type="text" />` | `placeholder`, `disabled` |
| `SelectInput` | `<select>` | Opções extraídas do `options` de validação |
| `NumberInput` | `<input type="number" />` | `min`, `max`, `step` |
| `CheckboxInput` | `<input type="checkbox" />` | Estado booleano |

Se `ui_control.component` estiver ausente, deve-se adotar como fallback padrão o `TextInput`.

---

## 2. Lógica de Resolução de Permissões (RBAC)

O controle de acesso de visualização de campos obedecerá às seguintes regras locais em tempo de montagem:

```typescript
const userRole = localRole || contextRole;

// Visibilidade (Omitir renderização)
const isVisible = !colDef.metadata?.ui_control?.visible_in_views || 
  colDef.metadata.ui_control.visible_in_views.includes(userRole);

// Escrita (Desabilitar input)
const isWriteAllowed = !colDef.metadata?.permissions?.write || 
  colDef.metadata.permissions.write.includes(userRole);
```

Se `isVisible` for falso, o input e a label do campo **não** serão renderizados no DOM.
Se `isWriteAllowed` for falso, o campo será renderizado com o atributo `disabled`.

---

## 3. Slot de Customização (Override API)

Para permitir campos customizados de terceiros no formulário sem quebrar o laço de estado do React Hook Form, o formulário proverá a propriedade `slots`:

```typescript
interface DynamicFormProps {
  schema: any;
  metadata: any;
  onSubmit: (data: any) => void;
  role?: string;
  className?: string;
  slots?: {
    [fieldName: string]: (props: {
      value: any;
      onChange: (val: any) => void;
      disabled?: boolean;
      error?: string;
    }) => React.ReactNode;
  };
}
```

O formulário usará o componente `<Controller>` do React Hook Form para injetar esses slots de forma limpa.
