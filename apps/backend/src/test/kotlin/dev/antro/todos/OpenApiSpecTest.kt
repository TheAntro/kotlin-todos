package dev.antro.todos

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import java.nio.file.Files
import java.nio.file.Path
import kotlin.test.assertEquals

/**
 * Keeps the committed `openapi.json` (the API contract the frontend client is generated from)
 * in sync with the code. Run `mise run api:generate` after changing the API to update it.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration::class)
class OpenApiSpecTest(
    @Autowired private val mockMvc: MockMvc,
) {
    private val specFile = Path.of("openapi.json")

    @Test
    fun `committed openapi json matches the API`() {
        val actual =
            mockMvc
                .get("/v3/api-docs")
                .andReturn()
                .response.contentAsString
                .trimEnd() + "\n"

        if (System.getenv("UPDATE_OPENAPI_SPEC") == "true") {
            Files.writeString(specFile, actual)
            return
        }

        val committed = if (Files.exists(specFile)) Files.readString(specFile) else ""
        assertEquals(
            committed,
            actual,
            "openapi.json is out of date; run `mise run api:generate` and commit the result",
        )
    }
}
