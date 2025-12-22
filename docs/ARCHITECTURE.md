# 🏛 Architecture Guide

This project follows **Clean Architecture** principles to ensure scalability, maintainability, and testability.

## 🌟 Core Principles

1.  **Independence of Frameworks**: The architecture does not depend on the existence of some library of feature laden software.
2.  **Testability**: The business rules can be tested without the UI, Database, Web Server, or any other external element.
3.  **Independence of UI**: The UI can change easily, without changing the rest of the system.
4.  **Independence of Database**: You can swap out PostgreSQL for MongoDB, for example, without binding the business rules to the database.

## 📂 Layer Breakdown

### 1. **Core (The Heart)**
`src/Core/`
*   Contains **Business Logic** and **Interfaces**.
*   **Entities**: Enterprise-wide business rules (e.g., `User` entity logic, validation).
*   **Use Cases**: Application-specific business rules (e.g., `AuthUseCase`, `AccountUseCase`).
*   **Interfaces**: Abstractions (Ports) that define *what* needs to be done, but not *how*. (e.g., `IUserRepository`, `IEmailService`).
*   **DTOs**: Data Transfer Objects to explicitly define inputs/outputs.

> 🚫 **Rule**: The Core layer **NEVER** processes HTTP requests directly and **NEVER** imports from Infrastructure.

### 2. **Infrastructure (The Adapter)**
`src/Infrastructure/`
*   Implementations of the interfaces defined in Core.
*   **Database**: Concrete SQL/ORM logic.
*   **Services**: External API integrations (SendGrid, Twilio, AWS).
*   **Config**: Environment variables and setup.

### 3. **Presentation / Interface Adapters**
`src/Controllers/` & `src/Middleware/`
*   **Controllers**: Receive Requests -> Call Use Cases -> Return Responses.
*   **Middleware**: Express interceptors (Auth checks, Error handling).

## 🔄 Dependency Injection (DI)

We use **InversifyJS** to manage dependencies.

- **DI Container** (`src/Core/DIContainer.ts`): Binds Interfaces (`symbols`) to Concrete Implementations (`classes`).
- **Injectable Classes**: Services and Use Cases are marked with `@injectable()`.
- **Injection**: Dependencies are injected via constructor using `@inject(TYPES.SymbolName)`.

### Example Flow

1.  **Controller** (`AccountController`) asks for `IAccountUseCase`.
2.  **Container** provides `AccountUseCase`.
3.  **AccountUseCase** asks for `IUserRepository` and `IEmailService`.
4.  **Container** provides `UserRepository ` (SQL) and `EmailService` (SendGrid).
5.  All components are loosely coupled.

## 🛠 Adding a New Feature

1.  **Define Interface**: Create `IMyFeatureService` in `Core/Application/Interface`.
2.  **Implement Logic**: Create `MyFeatureService` in `Infrastructure/Services`.
3.  **Bind in Container**: Add binding in `DIContainer.ts`.
4.  **Create Use Case**: Orchestrate the logic in `MyFeatureUseCase`.
5.  **Expose**: Create a `Controller` and add route.
