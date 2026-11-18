package dev.antro.todos.hello

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

data class HelloResponse(
    val message: String,
)

@RestController
@RequestMapping("/api/v1/hello")
class HelloController {
    @GetMapping
    fun hello(): HelloResponse = HelloResponse("Hello World!")
}
