# Container image for Cloud Run.
# JDK matches mise.toml (Temurin 25) and the Gradle toolchain (Java 25).

# ---- Build stage ----
FROM eclipse-temurin:25-jdk AS build
WORKDIR /workspace

# Resolve Gradle and dependencies in their own layer so source edits don't re-download them
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle gradle
RUN ./gradlew --no-daemon dependencies > /dev/null

COPY src src
RUN ./gradlew --no-daemon bootJar \
 && cp "$(find build/libs -name '*.jar' ! -name '*-plain.jar')" application.jar \
 && java -Djarmode=tools -jar application.jar extract --layers --destination extracted

# ---- Runtime stage ----
FROM eclipse-temurin:25-jre
WORKDIR /app

RUN groupadd --system spring && useradd --system --gid spring --no-create-home spring

# Spring Boot layers, least to most frequently changing
COPY --from=build /workspace/extracted/dependencies/ ./
COPY --from=build /workspace/extracted/spring-boot-loader/ ./
COPY --from=build /workspace/extracted/snapshot-dependencies/ ./
COPY --from=build /workspace/extracted/application/ ./

USER spring

# Cloud Run injects PORT (default 8080); application.properties reads it
EXPOSE 8080

# Size the heap from the Cloud Run memory limit; crash fast on OOM so the instance gets replaced.
# -XX:-UseBASE64Intrinsics: Java4Shell (CVE-2026-114938) mitigation, disables the vulnerable
# AVX-512 Base64 decoder intrinsic. Remove once the base image ships a fixed JDK (>= 25.0.5.1).
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError -XX:-UseBASE64Intrinsics"

ENTRYPOINT ["java", "-jar", "application.jar"]
