# Contrivance Architecture

## Overview

Contrivance is a microservices-based sales pipeline management platform built with Rust backends, React frontend, and PostgreSQL database. The architecture emphasizes scalability, maintainability, and real-time collaboration.

## System Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Browser   │────│   Nginx     │────│  Frontend   │
│             │    │   (Port 80) │    │   (React)   │
└─────────────┘    └─────────────┘    └─────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────┐
│                API Gateway                          │
│              (Port 8080)                           │
│  • Request routing                                 │
│  • Rate limiting                                   │
│  • Authentication middleware                       │
│  • CORS handling                                   │
└─────────────────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│Auth Service │  │User Service │  │Core Service │
│ (Port 3001) │  │ (Port 3002) │  │ (Port 3003) │
│             │  │             │  │             │
│• JWT auth   │  │• User CRUD  │  │• Spreadsheet│
│• Login/Reg  │  │• Profiles   │  │  operations │
│• Token mgmt │  │• Permissions│  │• WebSocket  │
└─────────────┘  └─────────────┘  └─────────────┘
          │                │                │
          └────────────────┼────────────────┘
                           ▼
                  ┌─────────────┐
                  │ PostgreSQL  │
                  │ (Port 5432) │
                  │             │
                  │• Users      │
                  │• Spreadshts │
                  │• Rows/Cols  │
                  └─────────────┘
```

## Service Responsibilities

### Gateway Service (Port 8080)
- **Purpose**: API Gateway and reverse proxy
- **Technology**: Rust (Actix-web)
- **Responsibilities**:
  - Route requests to appropriate services
  - JWT authentication middleware
  - Rate limiting and abuse prevention
  - CORS handling
  - Request/response logging
- **Endpoints**: All `/api/*` and `/auth/*` routes

### Auth Service (Port 3001)
- **Purpose**: Authentication and authorization
- **Technology**: Rust (Actix-web)
- **Responsibilities**:
  - User registration and login
  - JWT token generation and validation
  - Password hashing and verification
  - Token refresh mechanisms
- **Endpoints**:
  - `POST /auth/register`
  - `POST /auth/login` 
  - `POST /auth/refresh`
  - `GET /auth/validate`

### User Service (Port 3002)
- **Purpose**: User management and profiles
- **Technology**: Rust (Actix-web)  
- **Responsibilities**:
  - User profile CRUD operations
  - User preferences and settings
  - Role and permission management
  - User search and listing
- **Endpoints**:
  - `GET /api/users`
  - `GET /api/users/:id`
  - `PUT /api/users/:id`
  - `DELETE /api/users/:id`

### Contrivance Service (Port 3003)
- **Purpose**: Core spreadsheet and business logic
- **Technology**: Rust (Actix-web + WebSockets)
- **Responsibilities**:
  - Spreadsheet CRUD operations
  - Row and column management
  - Real-time collaboration via WebSockets
  - Data validation and business rules
  - Sales pipeline specific logic
- **Endpoints**:
  - `GET /api/spreadsheets`
  - `POST /api/spreadsheets`
  - `GET /api/spreadsheets/:id`
  - `PUT /api/spreadsheets/:id`
  - `DELETE /api/spreadsheets/:id`
  - `WebSocket /ws/spreadsheet/:id`

### Frontend (Port 80)
- **Purpose**: User interface and visualization
- **Technology**: React + TypeScript + D3.js
- **Responsibilities**:
  - Spreadsheet grid interface (ag-Grid)
  - Data visualizations (D3.js charts)
  - User authentication UI
  - Real-time updates via WebSocket
  - Responsive design
- **Key Components**:
  - `SpreadsheetGrid`: Main editable grid
  - `ChartVisualizer`: D3.js chart components
  - `AuthProvider`: Authentication context
  - `WebSocketProvider`: Real-time updates

## Data Flow

### Authentication Flow
1. User submits credentials to Frontend
2. Frontend sends request to Gateway (`/auth/login`)
3. Gateway forwards to Auth Service
4. Auth Service validates credentials against PostgreSQL
5. Auth Service generates JWT token
6. Token returned through Gateway to Frontend
7. Frontend stores token and includes in subsequent requests

### Spreadsheet Operations Flow
1. Frontend requests spreadsheet data (`/api/spreadsheets/:id`)
2. Gateway validates JWT token with Auth Service
3. Gateway forwards authenticated request to Contrivance Service
4. Contrivance Service queries PostgreSQL for spreadsheet data
5. Data returned through Gateway to Frontend
6. Frontend renders spreadsheet grid and visualizations

### Real-time Updates Flow
1. Frontend establishes WebSocket connection to Gateway
2. Gateway proxies WebSocket to Contrivance Service
3. User makes edit in spreadsheet
4. Frontend sends update via WebSocket
5. Contrivance Service processes update and saves to PostgreSQL
6. Contrivance Service broadcasts update to all connected clients
7. Other clients receive and apply updates in real-time

## Database Schema

### Core Tables
- **users**: User accounts and authentication data
- **spreadsheets**: Spreadsheet metadata and ownership
- **spreadsheet_columns**: Column definitions and types
- **spreadsheet_rows**: Flexible row data using JSONB
- **user_sessions**: JWT token management

### Data Relationships
```sql
users (1) ──→ (N) spreadsheets
spreadsheets (1) ──→ (N) spreadsheet_columns  
spreadsheets (1) ──→ (N) spreadsheet_rows
```

## Technology Decisions

### Backend: Rust
- **Performance**: Near C++ performance with memory safety
- **Concurrency**: Excellent async/await support via Tokio
- **Type Safety**: Compile-time error prevention
- **Ecosystem**: Mature web frameworks (Actix-web) and DB tools (SQLx)

### Frontend: React + TypeScript
- **Developer Experience**: Excellent tooling and debugging
- **Type Safety**: Compile-time type checking
- **Ecosystem**: Rich library ecosystem for grids and charts
- **Performance**: Virtual DOM and modern optimization

### Database: PostgreSQL
- **JSONB Support**: Flexible schema for dynamic spreadsheet columns
- **ACID Compliance**: Data consistency and reliability
- **Performance**: Excellent query optimization and indexing
- **Ecosystem**: Mature tooling and monitoring

### Containerization: Docker
- **Consistency**: Identical environments across dev/prod
- **Scalability**: Easy horizontal scaling of services
- **Isolation**: Service independence and fault tolerance
- **Deployment**: Simplified deployment and rollbacks

## Security Considerations

### Authentication
- JWT tokens with configurable expiration
- Secure password hashing with bcrypt
- Token refresh mechanism
- HTTPS enforcement in production

### Authorization
- Role-based access control (RBAC)
- Service-to-service authentication
- Input validation and sanitization
- SQL injection prevention via SQLx

### Network Security
- CORS configuration
- Rate limiting per IP/user
- Request size limits
- Security headers

## Performance Considerations

### Backend Performance
- Connection pooling for database access
- Async/await for non-blocking I/O
- Efficient serialization with serde
- Response caching where appropriate

### Frontend Performance
- Virtual scrolling for large datasets
- Lazy loading of visualizations
- WebSocket connection management
- Component memoization

### Database Performance
- Proper indexing on query columns
- JSONB GIN indexes for flexible queries
- Connection pooling
- Query optimization

## Monitoring and Observability

### Logging
- Structured logging with tracing
- Centralized log aggregation
- Request/response logging
- Error tracking and alerting

### Metrics
- Service health endpoints
- Performance metrics
- Business metrics (active users, spreadsheets)
- Database performance metrics

### Monitoring
- Container health checks
- Service dependency monitoring
- Database connection monitoring
- WebSocket connection tracking

## Development Workflow

### Local Development
- Docker Compose for consistent environment
- Hot reload for both frontend and backend
- Automated database migrations
- Test data seeding

### Testing Strategy
- Unit tests for each service
- Integration tests for API endpoints
- End-to-end tests for critical workflows
- Load testing for performance validation

### Deployment
- Multi-stage Docker builds
- Environment-specific configurations
- Blue-green deployment strategy
- Automated rollback capabilities

## Scalability Considerations

### Horizontal Scaling
- Stateless service design
- Load balancing via reverse proxy
- Database read replicas
- WebSocket connection distribution

### Vertical Scaling
- Efficient resource utilization
- Memory management
- CPU optimization
- Database query optimization

### Future Enhancements
- Microservice decomposition
- Event-driven architecture
- Caching layer (Redis)
- Message queue integration