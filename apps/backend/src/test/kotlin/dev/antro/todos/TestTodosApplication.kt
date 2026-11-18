package dev.antro.todos

import org.springframework.boot.fromApplication
import org.springframework.boot.with

fun main(args: Array<String>) {
    fromApplication<TodosApplication>().with(TestcontainersConfiguration::class).run(*args)
}
