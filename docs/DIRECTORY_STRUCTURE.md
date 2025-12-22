# 📂 Directory Structure

A quick reference to where things live in this Clean Architecture template.

## `src/` Root

| Directory | Purpose |
|-----------|---------|
| `Core/` | **The "Why"**. Business logic, interfaces, types. No external dependencies. |
| `Infrastructure/` | **The "How"**. Implementations (DB, Email, SMS). Dependencies on libraries. |
| `Controllers/` | **The "Where"**. HTTP Routing and Request Handling. |
| `Middleware/` | Express Middleware (Auth checks, Logging). |

## `src/Core/`

| Directory | Purpose |
|-----------|---------|
| `Application/DTOs` | Data Transfer Objects (Validation classes). |
| `Application/Entities` | Domain objects representing business data. |
| `Application/UseCases` | Business flows (e.g., "Register User", "Process Payment"). |
| `Application/Interface` | Contracts (Ports) that Infrastructure must implement. |

## `src/Infrastructure/`

| Directory | Purpose |
|-----------|---------|
| `Repository/SQL` | Database queries and ORM logic. |
| `Services` | Implementations of Core Services (e.g., `EmailService`, `AuthService`). |
| `Config` | Database, Environment, and tool configuration. |
