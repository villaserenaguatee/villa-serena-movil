# Integración continua

Los workflows corren en cada PR hacia `main` o `develop`. Sus resultados aparecen en la sección de checks de la PR.

| Workflow | Qué comprueba |
|---|---|
| Verificación | Tipos generados desde el contrato de docs fijado en `api-contract.json` (`pnpm check:api`), que la única variable `EXPO_PUBLIC_*` sea `EXPO_PUBLIC_API_URL`, TypeScript, lint y pruebas. |
| Seguridad y calidad · Trivy | Vulnerabilidades `HIGH` y `CRITICAL` con corrección disponible en las dependencias (`pnpm-lock.yaml`). Publica el reporte en *Security → Code scanning* y falla si encuentra alguna. También corre los lunes para detectar CVE nuevas. |
| Seguridad y calidad · SonarQube | Análisis estático de TypeScript/React Native: patrones inseguros, *code smells* y duplicación. |

Las actions de terceros están fijadas por SHA de commit; para actualizarlas, cambia el SHA y su comentario de versión.

## Configurar SonarQube

1. En SonarQube Cloud (o el servidor del equipo) importa `villaserenaguatee/villa-serena-movil` y desactiva el análisis automático, porque lo hace el workflow.
2. Revisa `sonar.projectKey` y `sonar.organization` en `sonar-project.properties`.
3. En GitHub, *Settings → Secrets and variables → Actions*:
   - Secreto `SONAR_TOKEN`: token de análisis del proyecto. No lo pegues en el código ni en issues.
   - Variable `SONAR_HOST_URL`, solo si se usa un servidor propio (por defecto `https://sonarcloud.io`).

Sin `SONAR_TOKEN` el job termina con un aviso y no bloquea la PR.

## Reglas sugeridas para `main`

En *Settings → Branches* exige los checks «Contrato, tipos, lint y pruebas» y «Dependencias (Trivy)» antes de integrar. Agrega «Análisis estático (SonarQube)» cuando el secreto esté configurado.
