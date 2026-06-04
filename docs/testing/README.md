# Testing

Area dedicada a testes.

Documentos relacionados:

- [Testing Strategy](../TESTING_STRATEGY.md)
- [Tech Debt](../TECH_DEBT.md)

Resumo: ha testes unitarios com Vitest e cobertura Playwright publica/autenticada. O fluxo autenticado usa seed controlado quando as variaveis E2E estao presentes.

## Playwright Autenticado

Detalhes operacionais:

```text
docs/testing/E2E_AUTHENTICATED.md
```

Comandos:

```powershell
npm run test:e2e:seed
npm run test:e2e
```

Sem `E2E_USER_EMAIL` e `E2E_USER_PASSWORD`, os testes autenticados sao marcados como skip explicito e os testes publicos continuam rodando.
