package dev.antro.todos.security

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.invoke
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.oauth2.jwt.JwtClaimNames
import org.springframework.security.oauth2.jwt.JwtClaimValidator
import org.springframework.security.oauth2.jwt.JwtTypeValidator
import org.springframework.security.web.SecurityFilterChain

@Configuration
class SecurityConfig {
    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http {
            authorizeHttpRequests {
                authorize("/actuator/health/**", permitAll)
                authorize("/swagger-ui.html", permitAll)
                authorize("/swagger-ui/**", permitAll)
                authorize("/v3/api-docs/**", permitAll)
                authorize(anyRequest, authenticated)
            }
            oauth2ResourceServer { jwt { } }
            sessionManagement { sessionCreationPolicy = SessionCreationPolicy.STATELESS }
            // Stateless bearer-token API: no cookies, so no CSRF risk
            csrf { disable() }
        }
        return http.build()
    }

    /**
     * JWT access tokens have the `typ: at+jwt` header (RFC 9068), but Spring Security's
     * default validator only accepts `JWT`. Spring Boot adds this bean to the JwtDecoder's
     * validators, and it replaces the default type check.
     */
    @Bean
    fun accessTokenTypeValidator(): JwtTypeValidator = JwtTypeValidator("at+jwt", "application/at+jwt")

    /** All user data is scoped to `sub`, so a token without one is useless. */
    @Bean
    fun subjectValidator() = JwtClaimValidator(JwtClaimNames.SUB) { sub: String? -> !sub.isNullOrBlank() }
}
