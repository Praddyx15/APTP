# Stage 1: Build environment
FROM ubuntu:22.04 AS builder

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    libssl-dev \
    libpq-dev \
    libboost-all-dev \
    libjsoncpp-dev \
    uuid-dev \
    libhiredis-dev \
    pkg-config \
    libcurl4-openssl-dev \
    libz-dev \
    python3-dev \
    python3-pip \
    wget \
    unzip \
    ninja-build \
    doxygen \
    && rm -rf /var/lib/apt/lists/*

# Install vcpkg for C++ package management
WORKDIR /opt
RUN git clone https://github.com/Microsoft/vcpkg.git && \
    cd vcpkg && \
    ./bootstrap-vcpkg.sh && \
    ./vcpkg integrate install

# Install C++ dependencies with vcpkg
RUN /opt/vcpkg/vcpkg install \
    drogon \
    libpqxx \
    jwt-cpp \
    argon2 \
    nlohmann-json \
    spdlog \
    opencv \
    openssl \
    cpprestsdk \
    pybind11 \
    redis-plus-plus \
    grpc \
    protobuf \
    opentelemetry-cpp \
    gtest \
    --triplet x64-linux

# Set working directory for the application
WORKDIR /app

# Copy CMakeLists.txt and source code
COPY . .

# Create and navigate to build directory
RUN mkdir -p build && cd build

# Configure and build the application
WORKDIR /app/build
RUN cmake .. \
    -DCMAKE_TOOLCHAIN_FILE=/opt/vcpkg/scripts/buildsystems/vcpkg.cmake \
    -DCMAKE_BUILD_TYPE=Release \
    -G Ninja && \
    ninja

# Stage 2: Runtime environment
FROM ubuntu:22.04 AS runtime

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libssl3 \
    libpq5 \
    ca-certificates \
    libcurl4 \
    libstdc++6 \
    libboost-system1.74.0 \
    libboost-filesystem1.74.0 \
    libz1 \
    python3 \
    python3-pip \
    libhiredis0.14 \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user to run the application
RUN groupadd -r ptpuser && useradd -r -g ptpuser ptpuser

# Set working directory
WORKDIR /app

# Copy built artifacts from builder stage
COPY --from=builder /app/build/bin /app/bin
COPY --from=builder /app/build/lib /app/lib
COPY --from=builder /app/config /app/config
COPY --from=builder /app/resources /app/resources

# Copy any Python scripts and their requirements
COPY --from=builder /app/scripts /app/scripts
COPY --from=builder /app/requirements.txt /app/requirements.txt

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# Set up library path
ENV LD_LIBRARY_PATH=/app/lib:/usr/local/lib

# Set environment variables
ENV PILOT_TRAINING_CONFIG_PATH=/app/config
ENV PILOT_TRAINING_ENV=production

# Expose ports for different services
EXPOSE 8080 8081 8082 8083 8084 8085 8086

# Change ownership of the application directory
RUN chown -R ptpuser:ptpuser /app

# Switch to non-root user
USER ptpuser

# Command to run the application
CMD ["/app/bin/pilot_training_api_gateway"]

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1