# Clean Architecture Backend

A robust Node.js backend application built with TypeScript, following Clean Architecture principles and SOLID design patterns.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Error Handling](#error-handling)
- [Database](#database)
- [Authentication](#authentication)
- [Deployment](#deployment)

## Architecture Overview

This project implements Clean Architecture principles, separating concerns into distinct layers:

### Core Layer
- Contains business logic and domain entities
- Defines interfaces and use cases
- Independent of external frameworks and tools
- Houses DTOs (Data Transfer Objects) and business rules

### Application Layer
- Implements use cases defined in the core layer
- Orchestrates data flow between layers
- Contains application-specific business rules
- Manages transactions and coordinates responses

### Infrastructure Layer
- Implements interfaces defined in core layer
- Contains database implementations
- Handles external services and frameworks
- Manages technical concerns (caching, logging, etc.)

### Presentation Layer
- Express.js controllers and routes
- Request/Response handling
- Input validation
- Authentication middleware

## Technology Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: None- Custom SQL implementation
- **Dependency Injection**: InversifyJS
- **Authentication**: JWT (JSON Web Tokens)
- **Testing**: Jest
- **Validation**: class-validator and custom validation
- **File Upload**: Multer
- **Security**: bcrypt, CORS

## Project Structure

```
src/
├── Core/
│   ├── Application/
│   │   ├── DTOs/
│   │   ├── Entities/
│   │   ├── Enums/
│   │   ├── Error/
│   │   ├── Interface/
│   │   ├── Response/
│   │   └── UseCases/
│   ├── DIContainer.ts
│   ├── Services/
│   └── Types/
├── Infrastructure/
│   ├── Database/
│   ├── Repository/
│   │   ├── MongoDB/
│   │   └── SQL/
│   └── Services/
├── Middleware/
└── Controllers/
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd name-of-project
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
PORT=3000
NODE_ENV=development

# Database Configuration
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database
DB_SSL=false
DB_POOL_MAX=10
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000

# JWT Configuration
JWT_ACCESS_SECRET=your_access_token_secret
JWT_REFRESH_SECRET=your_refresh_token_secret
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
```

5. Start the development server:
```bash
npm run dev
```

## Configuration

### Database Configuration

The system uses PostgreSQL with connection pooling. Configure the following in `.env`:

- `DB_USER`: Database username
- `DB_PASSWORD`: Database password
- `DB_HOST`: Database host
- `DB_PORT`: Database port
- `DB_NAME`: Database name
- `DB_SSL`: Enable/disable SSL
- `DB_POOL_MAX`: Maximum pool connections
- `DB_IDLE_TIMEOUT`: Connection idle timeout
- `DB_CONNECTION_TIMEOUT`: Connection timeout

### JWT Configuration

JWT settings for authentication:

- `JWT_ACCESS_SECRET`: Secret for access tokens
- `JWT_REFRESH_SECRET`: Secret for refresh tokens
- `JWT_ACCESS_EXPIRATION`: Access token expiration
- `JWT_REFRESH_EXPIRATION`: Refresh token expiration

## API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "password": "string",
  "roles": ["string"]
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "string",
  "password": "string"
}
```

#### Get Profile
```http
GET /api/v1/auth/profile
Authorization: Bearer <token>
```

#### Update Profile
```http
PUT /api/v1/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "first_name": "string",
  "last_name": "string",
  "email": "string"
}
```

## Error Handling

The system implements a comprehensive error handling system:

- `AppError`: Base error class
- `ValidationError`: Input validation errors
- `AuthenticationError`: Authentication failures
- `AuthorizationError`: Permission issues
- `NotFoundError`: Resource not found
- `ConflictError`: Data conflicts
- `DatabaseError`: Database operation failures

## Database

### Transaction Management

The system implements a robust transaction management system:

- Connection pooling for optimal performance
- Transaction isolation levels
- Automatic rollback on errors
- Connection lifecycle management

### Repositories

Each entity has its own repository implementing:

- CRUD operations
- Custom queries
- Transaction support
- Error handling

## Authentication

The system uses a JWT-based authentication system:

- Access tokens for API authentication
- Refresh tokens for token renewal
- Role-based authorization
- Token blacklisting
- Secure password hashing

### Security Features

- Password hashing with bcrypt
- JWT token encryption
- CORS protection
- Rate limiting
- Input validation
- SQL injection protection

## Testing

Run tests using:

```bash
npm run test
```

### Test Categories

- Unit tests for business logic
- Integration tests for APIs
- Repository tests
- Authentication tests
- Error handling tests

## Scripts

- `npm run dev`: Start development server
- `npm run build`: Build production version
- `npm start`: Start production server
- `npm test`: Run tests
- `npm run lint`: Run linter
- `npm run lint:fix`: Fix linting issues

## Development Guidelines

1. Follow TypeScript best practices
2. Use dependency injection
3. Write unit tests for business logic
4. Document API endpoints
5. Handle errors appropriately
6. Use proper typing
7. Follow clean code principles

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Set production environment variables
3. Start the server:
```bash
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.