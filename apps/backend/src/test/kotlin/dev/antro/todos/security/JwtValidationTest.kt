package dev.antro.todos.security

import com.nimbusds.jose.JOSEObjectType
import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.JWSHeader
import com.nimbusds.jose.crypto.ECDSASigner
import com.nimbusds.jose.jwk.Curve
import com.nimbusds.jose.jwk.ECKey
import com.nimbusds.jose.jwk.JWKSet
import com.nimbusds.jose.jwk.gen.ECKeyGenerator
import com.nimbusds.jwt.JWTClaimsSet
import com.nimbusds.jwt.SignedJWT
import com.sun.net.httpserver.HttpServer
import dev.antro.todos.TestcontainersConfiguration
import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import java.net.InetSocketAddress
import java.time.Instant
import java.util.Date
import java.util.UUID

/**
 * Sends real signed tokens through the real JwtDecoder, against a fake issuer that serves
 * OIDC discovery and JWKS. Checks the token settings beyond Spring's defaults:
 * ES384 signatures, `typ: at+jwt`, issuer and audience.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration::class)
class JwtValidationTest(
    @Autowired private val mockMvc: MockMvc,
) {
    @Test
    fun `accepts a valid access token`() {
        mockMvc
            .get("/api/v1/hello") { header("Authorization", "Bearer ${token()}") }
            .andExpect {
                status { isOk() }
                jsonPath("$.subject") { value("user-123") }
            }
    }

    @Test
    fun `rejects a token for another audience`() {
        expectUnauthorized(token(audience = "https://other.api"))
    }

    @Test
    fun `rejects a token from another issuer`() {
        expectUnauthorized(token(issuer = "https://evil.example.test/oidc"))
    }

    @Test
    fun `rejects an ID token`() {
        expectUnauthorized(token(type = JOSEObjectType.JWT))
    }

    @Test
    fun `rejects a token without a subject`() {
        expectUnauthorized(token(subject = null))
    }

    @Test
    fun `rejects a token signed with an unknown key`() {
        expectUnauthorized(token(key = ECKeyGenerator(Curve.P_384).keyID(KEY_ID).generate()))
    }

    private fun expectUnauthorized(token: String) {
        mockMvc
            .get("/api/v1/hello") { header("Authorization", "Bearer $token") }
            .andExpect { status { isUnauthorized() } }
    }

    private fun token(
        subject: String? = "user-123",
        audience: String = AUDIENCE,
        issuer: String = issuerUri,
        type: JOSEObjectType = JOSEObjectType("at+jwt"),
        key: ECKey = signingKey,
    ): String {
        val now = Instant.now()
        val claims =
            JWTClaimsSet
                .Builder()
                .issuer(issuer)
                .subject(subject)
                .audience(audience)
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plusSeconds(TOKEN_LIFETIME_SECONDS)))
                .jwtID(UUID.randomUUID().toString())
                .claim("client_id", "test-client")
                .build()
        val header =
            JWSHeader
                .Builder(JWSAlgorithm.ES384)
                .type(type)
                .keyID(key.keyID)
                .build()
        return SignedJWT(header, claims).apply { sign(ECDSASigner(key)) }.serialize()
    }

    companion object {
        private const val AUDIENCE = "https://api.todos.local"
        private const val KEY_ID = "test-key"
        private const val TOKEN_LIFETIME_SECONDS = 300L

        private val signingKey: ECKey = ECKeyGenerator(Curve.P_384).keyID(KEY_ID).generate()
        private val server: HttpServer = HttpServer.create(InetSocketAddress("localhost", 0), 0)
        private val issuerUri = "http://localhost:${server.address.port}/oidc"

        init {
            val discovery = """{"issuer":"$issuerUri","jwks_uri":"$issuerUri/jwks"}"""
            val jwks = JWKSet(signingKey.toPublicJWK()).toString()
            mapOf("/oidc/.well-known/openid-configuration" to discovery, "/oidc/jwks" to jwks).forEach { (path, body) ->
                server.createContext(path) { exchange ->
                    val bytes = body.toByteArray()
                    exchange.responseHeaders.add("Content-Type", "application/json")
                    exchange.sendResponseHeaders(200, bytes.size.toLong())
                    exchange.responseBody.use { it.write(bytes) }
                }
            }
            server.start()
        }

        @JvmStatic
        @DynamicPropertySource
        fun issuer(registry: DynamicPropertyRegistry) {
            registry.add("spring.security.oauth2.resourceserver.jwt.issuer-uri") { issuerUri }
        }

        @JvmStatic
        @AfterAll
        fun stopServer() {
            server.stop(0)
        }
    }
}
