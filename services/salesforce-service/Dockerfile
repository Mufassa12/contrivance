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
RUN cargo build --release --bin salesforce-service

# Runtime stage
FROM debian:bookworm-slim

# Install necessary system dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the binary from builder stage
COPY --from=builder /app/target/release/salesforce-service /app/salesforce-service

# Create a non-root user
RUN useradd -r -s /bin/false appuser
RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 8004

CMD ["./salesforce-service"]