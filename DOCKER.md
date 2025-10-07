# Docker Best Practices for Contrivance

## Overview
This document outlines Docker best practices and build instructions for the Contrivance project.

## Multi-stage Builds
All Dockerfiles use multi-stage builds to minimize image size:
- **Builder stage**: Compiles Rust binaries with all development dependencies
- **Runtime stage**: Contains only the binary and runtime dependencies

## Build Instructions

### Individual Services
```bash
# Auth Service
docker build -f Dockerfile.auth-service -t contrivance/auth-service .

# User Service  
docker build -f Dockerfile.user-service -t contrivance/user-service .

# Contrivance Service
docker build -f Dockerfile.contrivance-service -t contrivance/contrivance-service .

# Gateway Service
docker build -f Dockerfile.gateway-service -t contrivance/gateway-service .

# Frontend
cd frontend && docker build -t contrivance/frontend .
```

### All Services
Use the provided script:
```bash
./scripts/docker-build.sh
```

## Image Optimization

### Rust Services
- Use `rust:1.70-slim` as builder base
- Use `debian:bookworm-slim` as runtime base
- Strip debug symbols from binaries
- Use `--release` builds for production
- Copy only necessary files

### Frontend
- Use `node:18-alpine` for building
- Use `nginx:alpine` for serving
- Multi-stage build to exclude node_modules
- Optimize nginx configuration

## Security Best Practices

### Non-root User
All containers run as non-root users:
- Create dedicated user for each service
- Use USER directive in Dockerfile
- Set appropriate file permissions

### Minimal Base Images
- Use Alpine or slim variants when possible
- Remove unnecessary packages
- Use specific version tags (not latest)

### Secret Management
- Use Docker secrets for sensitive data
- Environment variables for configuration
- Never embed secrets in images

## Development vs Production

### Development
- Mount source code as volumes for hot reload
- Use development dependencies
- Enable debug logging
- Expose additional ports for debugging

### Production
- Use optimized builds
- Minimal runtime dependencies
- Security scanning before deployment
- Resource limits and health checks

## Health Checks
All services include health check endpoints:
- `/health` for service availability
- Database connection verification
- Dependency service checks

## Resource Management

### Memory Limits
- Auth Service: 256MB
- User Service: 256MB  
- Contrivance Service: 512MB
- Gateway Service: 256MB
- Frontend: 128MB
- PostgreSQL: 1GB

### CPU Limits
- Services: 0.5 CPU cores each
- Database: 1 CPU core
- Adjust based on load testing

## Networking
- Use Docker Compose networks
- Service discovery via service names
- Expose only necessary ports
- Use internal networks for service communication

## Volumes
- Named volumes for persistent data
- Bind mounts for development
- Proper volume cleanup in scripts

## Logging
- Use JSON structured logging
- Log to stdout/stderr
- Use log drivers for centralized logging
- Implement log rotation

## Monitoring
- Health check endpoints
- Metrics collection
- Container resource monitoring
- Application performance monitoring

## Build Optimization

### Layer Caching
- Order Dockerfile instructions by change frequency
- Copy dependency files before source code
- Use .dockerignore to exclude unnecessary files

### Build Arguments
- Use ARG for build-time configuration
- Default values for common arguments
- Environment-specific builds

## Registry Management
- Tag images with version numbers
- Use semantic versioning
- Automated builds on CI/CD
- Regular image vulnerability scanning

## Troubleshooting

### Common Issues
1. **Build failures**: Check Rust version compatibility
2. **Runtime errors**: Verify environment variables
3. **Network issues**: Check service discovery
4. **Database connections**: Verify credentials and connectivity

### Debugging Commands
```bash
# Service logs
docker-compose logs -f [service-name]

# Execute shell in container
docker-compose exec [service-name] /bin/bash

# Check network connectivity
docker-compose exec [service-name] ping [other-service]

# Database connection test
docker-compose exec postgres psql -U postgres -d contrivance
```

## Performance Tuning

### Build Performance
- Use build cache effectively
- Parallel builds where possible
- Remove unnecessary dependencies
- Optimize Cargo.toml dependencies

### Runtime Performance
- Appropriate resource allocation
- Connection pooling configuration
- Cache frequently accessed data
- Monitor and optimize slow queries

## Maintenance

### Regular Tasks
- Update base images regularly
- Security patches for dependencies
- Clean up unused images and volumes
- Monitor disk usage

### Backup Strategies
- Database backup automation
- Configuration backup
- Image registry backup
- Recovery testing procedures