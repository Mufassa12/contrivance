# Build stage
FROM rustlang/rust:nightly-slim as builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace files
COPY Cargo.toml Cargo.lock ./
COPY shared/ ./shared/
COPY services/ ./services/

# Build the application
ENV SQLX_OFFLINE=true
RUN cargo build --release --bin contrivance-service

# Runtime stage
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libpq5 \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Copy the binary from builder stage
COPY --from=builder /app/target/release/contrivance-service /app/contrivance-service

# Expose port
EXPOSE 8003

# Run the application
CMD ["./contrivance-service"]