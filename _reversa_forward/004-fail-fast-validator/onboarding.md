# Onboarding: Fail-Fast Validator

> Identificador: `004-fail-fast-validator`
> Data: `2026-07-21`

---

## 1. Executar a Auditoria Localmente

Para rodar a varredura e verificar drifts de contrato ou chaves inválidas nos arquivos locais do projeto, use os comandos a seguir:

```bash
# Execução padrão (MANDATÓRIA)
npx tsx src/bin/validator.ts

# Execução informativa (Apenas warnings)
npx tsx src/bin/validator.ts --warn-only
```

---

## 2. Integração no Pipeline de CI/CD (GitHub Actions / GitLab)

Adicione a chamada ao pipeline de pré-requisitos de build para impedir deploys de código quebrado:

```yaml
- name: Verificar integridade de metadados e contratos
  run: npm run db:validate
```

---

## 3. Roteiro de Teste (Validação)

1. **Teste A: Validação Limpa:** Rode a CLI em condições normais e verifique se retorna Exit Code 0.
2. **Teste B: Drift em Contrato:** Altere manualmente um arquivo em `src/contracts/schemas/` e rode a CLI, certificando-se de que o processo é abortado com Exit Code 1.
3. **Teste C: Referência Inválida em Componentes:** Crie um arquivo `src/components/TestBroken.tsx` importando um schema de uma tabela fictícia (ex: `tabela_inexistenteInsertSchema`) e verifique se o validador aponta o arquivo e encerra com erro.
