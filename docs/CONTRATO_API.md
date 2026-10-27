# Contrato del API en la app

El único contrato es `openapi.yaml` de [villa-serena-docs](https://github.com/villaserenaguatee/villa-serena-docs). La app no guarda una copia: genera `lib/api/schema.d.ts` desde un checkout de docs en el commit fijado por `api-contract.json`. Consulta la [guía del contrato](https://github.com/villaserenaguatee/villa-serena-docs/blob/main/03-arquitectura/contrato-api.md).

## Preparar docs

Clona docs con finales de línea LF, ubícalo en el commit fijado e instala sus herramientas (Node.js 24, pnpm 12):

```sh
git clone -c core.autocrlf=false https://github.com/villaserenaguatee/villa-serena-docs.git
cd villa-serena-docs
git checkout <revision de api-contract.json>
pnpm install --frozen-lockfile
```

En Windows, si `pnpm install` modifica `pnpm-lock.yaml` de docs, descarta ese cambio (`git checkout -- pnpm-lock.yaml`): el adaptador rechaza un checkout con cambios en contrato o herramientas.

## Generar y comprobar tipos

Desde la app, indica la ruta de docs con `API_CONTRACT_DOCS_DIR` o `--docs-dir`:

```sh
pnpm generate:api --docs-dir ../villa-serena-docs
pnpm check:api --docs-dir ../villa-serena-docs
```

`check:api` falla si los tipos versionados no corresponden al contrato fijado. No edites `schema.d.ts` a mano.

## Actualizar la revisión

1. Revisa el cambio de contrato integrado en docs.
2. Cambia `revision` en `api-contract.json` por el SHA completo del commit.
3. Ubica tu checkout de docs en ese commit, ejecuta `pnpm generate:api` y `pnpm check`.
4. Ajusta las pantallas o adaptadores afectados en la misma PR.

## Uso en el código

`lib/api/index.ts` expone `apiRequest` (Bearer, renovación con `POST /api/v1/auth/renovar` y un reintento), `apiJson` (JSON tipado; lanza `ApiError` con `codigo` y `mensaje` del contrato) y el alias `Schemas`. `lib/api/huesped.ts` agrupa las operaciones del huésped. Los tipos HTTP no implementan el WebSocket descrito en `x-websocket`.
