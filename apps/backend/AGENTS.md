# AGENTS.md – backend

Spring Boot 4 + Kotlin (JDK 25) REST API for todos. Package root: `dev.antro.todos`.

## Commands

- `./gradlew bootRun` – run the API on :8080 (start Postgres first: `mise run db:up`)
- `./gradlew test` – tests; use Testcontainers Postgres, so Docker must be running
- `./gradlew spotlessCheck detekt` – format check (ktlint) + static analysis (`./gradlew spotlessApply` to format)
- Swagger UI: `/swagger-ui.html`, OpenAPI: `/v3/api-docs`

## Stack

- Spring Web MVC on virtual threads, Spring Data JPA, Postgres
- Flyway migrations in `src/main/resources/db/migration` (`V<n>__<description>.sql`); Hibernate only validates (`ddl-auto=validate`)
- Spring Security OAuth2 resource server; JWTs issued by Logto (`JWT_ISSUER_URI`)
- Errors as RFC 9457 problem details

## Conventions

- Organize by feature (e.g. `todo/` with controller, service, repository, entity, DTOs).
- REST endpoints under `/api`, e.g. `/api/todos` (GET list, POST) and `/api/todos/{id}` (GET, PATCH/PUT, DELETE).
- Every todo belongs to a user (JWT `sub`); always filter by owner and return 404 for other users' todos.
- Don't expose entities from controllers; use request/response DTOs with Bean Validation.
- Never edit an applied migration; add a new one.
- Kotlin style: ktlint_official (4-space indent), set in `.editorconfig`; keep detekt passing rather than suppressing rules.
- Use constructor injection; prefer Kotlin data classes and immutability for DTOs.
- Cover endpoints with `@SpringBootTest`/MockMvc tests using mocked JWTs (`jwt()` post-processor).
