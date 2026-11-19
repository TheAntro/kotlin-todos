package dev.antro.todos

import io.swagger.v3.oas.annotations.OpenAPIDefinition
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType
import io.swagger.v3.oas.annotations.info.Info
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.security.SecurityScheme
import io.swagger.v3.oas.annotations.servers.Server
import org.springframework.context.annotation.Configuration

/**
 * OpenAPI metadata. Every endpoint needs a bearer token, so the spec says so, and both
 * Swagger UI and the generated frontend client know to send one.
 * The spec is committed as `openapi.json`; see `OpenApiSpecTest`.
 */
@Configuration
@OpenAPIDefinition(
    info = Info(title = "Todos API", version = "v1"),
    // Relative, so the spec doesn't depend on where it was generated; clients set their own base URL
    servers = [Server(url = "/")],
    security = [SecurityRequirement(name = "bearerAuth")],
)
@SecurityScheme(name = "bearerAuth", type = SecuritySchemeType.HTTP, scheme = "bearer", bearerFormat = "JWT")
class OpenApiConfig
