package dev.antro.todos.hello

import dev.antro.todos.TestcontainersConfiguration
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration::class)
class HelloControllerTest(
    @Autowired private val mockMvc: MockMvc,
) {
    @Test
    fun `returns greeting for authenticated user`() {
        mockMvc
            .get("/api/v1/hello") {
                accept = MediaType.APPLICATION_JSON
                with(jwt())
            }.andExpect {
                status { isOk() }
                content { contentType(MediaType.APPLICATION_JSON) }
                jsonPath("$.message") { value("Hello World!") }
            }
    }

    @Test
    fun `rejects unauthenticated request`() {
        mockMvc
            .get("/api/v1/hello") {
                accept = MediaType.APPLICATION_JSON
            }.andExpect {
                status { isUnauthorized() }
            }
    }
}
