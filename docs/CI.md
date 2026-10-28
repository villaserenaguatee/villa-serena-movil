# Integración continua

Los workflows corren en cada PR hacia `main` y en sus pushes. Sus resultados aparecen en la sección de checks de la PR. Conservan el contenido funcional de `main` (huésped, reservas/pagos y personal); esta entrega agrega únicamente CI y su diagnóstico.

| Workflow | Qué comprueba |
|---|---|
| Verificación | Guarda del checkout fijo de Docs y tipos (`pnpm check:api`), única variable pública `EXPO_PUBLIC_API_URL`, TypeScript, lint y pruebas de API, acceso/reservas, cuenta, servicios, notificaciones y personal. |
| Seguridad y calidad · Trivy | Vulnerabilidades `HIGH` y `CRITICAL` corregibles en `pnpm-lock.yaml`, incluidas dependencias de desarrollo. Publica SARIF y falla si encuentra alguna. También corre los lunes para detectar CVE nuevas. |
| Seguridad y calidad · SonarQube | Análisis estático de TypeScript/React Native; espera y exige el Quality Gate. |

Las actions de terceros están fijadas por SHA de commit; para actualizarlas, cambia el SHA y su comentario de versión.

## Configurar SonarQube

1. En SonarQube Cloud (o el servidor del equipo) importa `villaserenaguatee/villa-serena-movil` y desactiva el análisis automático, porque lo hace el workflow.
2. Revisa `sonar.projectKey` y `sonar.organization` en `sonar-project.properties`.
3. En GitHub, *Settings → Secrets and variables → Actions*:
   - Secreto `SONAR_TOKEN`: token de análisis del proyecto. No lo pegues en el código ni en issues.
   - Variable `SONAR_HOST_URL`, solo si se usa un servidor propio (por defecto `https://sonarcloud.io`).
   - Variables opcionales `SONAR_PROJECT_KEY` y `SONAR_ORGANIZATION` para sobrescribir las claves del archivo.

Sin `SONAR_TOKEN` el job falla: un análisis omitido no se presenta como aprobado.
En PR de forks el job se omite porque GitHub no entrega secretos; las pruebas y
Trivy siguen ejecutándose. No se usa `pull_request_target` para ejecutar código
de la PR con credenciales. Revisa los checks independientes de SonarCloud además
del workflow; desactiva su análisis automático al adoptar el análisis por CI.

## Diagnóstico del contrato

`api-contract.json` fija el SHA de Docs; el workflow instala sus herramientas con
el lockfile de ese checkout mediante `corepack pnpm`, que usa su `packageManager`.
El cambio automático desde el binario de pnpm de la app agregaba `@pnpm/exe`
al lockfile de Docs incluso con `--frozen-lockfile`; ejecutar su versión mediante
Corepack evita ese cambio de instalador. El workflow exige un diff vacío del
lockfile después de instalar. Si `check:api` falla, el diagnóstico distingue un SHA
distinto de archivos modificados y muestra las rutas afectadas. Investiga la
causa; no omitas la guarda ni regeneres contra un `main` cambiante para poner el
check verde. La guarda mantiene la comprobación del SHA y los bytes del contrato.

## Reglas sugeridas para `main`

En *Settings → Branches* exige «Contrato, tipos, lint y pruebas», «Dependencias (Trivy)» y «Análisis estático (SonarQube)» antes de integrar PR del repositorio. La protección de ramas se configura por separado; este cambio no la modifica. Los hallazgos de dependencias/código se resuelven sin desactivar los checks ni ampliar incidentalmente el alcance de esta PR de CI.
