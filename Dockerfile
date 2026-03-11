# ========================================
# 构建阶段：编译 Spring Boot 应用
# ========================================
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /build

# 复制 pom.xml 并下载依赖（利用 Docker 缓存层）
COPY pom.xml .
RUN mvn dependency:go-offline -B

# 复制源码并构建
COPY src ./src
RUN mvn clean package -DskipTests -B

# ========================================
# 运行阶段：最小化运行时镜像
# ========================================
FROM eclipse-temurin:17-jre-alpine

# 设置时区为上海时间
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo Asia/Shanghai > /etc/timezone && \
    apk del tzdata

WORKDIR /app

# 从构建阶段复制 JAR 包
COPY --from=build /build/target/diet-0.0.1-SNAPSHOT.jar app.jar

# 腾讯云托管要求端口必须是 80
EXPOSE 80

# 启动应用，指定端口 80 和 prod 环境
CMD ["java", \
     "-Xmx1024m", \
     "-512", \
     "-jar", \
     "-Dserver.port=80", \
     "-Dspring.profiles.active=${SPRING_PROFILES_ACTIVE:-prod}", \
     "app.jar"]
