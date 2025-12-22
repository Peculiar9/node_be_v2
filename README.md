# Universal Enterprise Node.js Backend Template

A robust, production-ready Node.js backend starter kit built with TypeScript, following Clean Architecture principles (SOLID, Dependency Injection). Designed to be the solid foundation for enterprise-grade applications.

## 🚀 Features

- **Clean Architecture**: Separation of concerns logic (Core/Application, Infrastructure, Interface Adapters).
- **Dependency Injection**: Powered by InversifyJS for loose coupling and testability.
- **Repository Pattern**: Abstracted data access layer using generic repositories with a Pseudo-ORM -> Not an ORM just near raw SQL query generator (or custom generic SQL implementation).
- **Authentication**: Complete JWT-based auth flow (Login, Register, OTP Verification, Password Reset).
- **Security**: 
  - `bcryptjs` for password hashing.
  - `helmet` for HTTP header security.
  - `cors` for Cross-Origin Resource Sharing.
- **Validation**: Decorator-based validation using `class-validator` and `class-transformer`.
- **Media Handling**: Service abstractions for Cloudinary/AWS S3 (built-in support).
- **Communication**: 
  - Email (SendGrid/Mailgun abstraction).
  - SMS/WhatsApp (Twilio abstraction).
- **Database**: PostgreSQL with connection pooling and transaction management.

## 🛠 Technology Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **DI Container**: InversifyJS
- **Testing**: Jest
- **Linting**: ESLint

## 📦 Project Structure

```bash
src/
├── Controllers/        # Request handlers (Express Controllers)
├── Core/
│   ├── Application/    # Application Business Rules
│   │   ├── DTOs/       # Data Transfer Objects
│   │   ├── Entities/   # Domain Entities
│   │   ├── Enums/      # Domain Enumerations
│   │   ├── Interface/  # Interfaces (Ports)
│   │   └── UseCases/   # Application Flows (Interactors)
│   ├── DIContainer.ts  # Dependency Injection Setup
│   └── Types/          # DI Symbols & Constants
├── Infrastructure/     # Frameworks & Drivers
│   ├── Config/         # Environment & App Config
│   ├── Database/       # Database Connection Logic
│   ├── Repository/     # Data Access Implementations
│   └── Services/       # External Services (Email, SMS, Payment)
├── Middleware/         # Express Middleware (Auth, Error Handling)
└── index.ts            # Entry Point
```

## 🏁 Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL (v14+)
- pnpm (recommended) or npm/yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd <project-name>
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```
   *(Or `npm install` / `yarn install`)*

3. **Configure Environment**
   Duplicate `.env.example` to `.env` and fill in your credentials.
   ```bash
   cp .env.example .env
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Start the server**
   ```bash
   npm start
   ```

## 🧪 Testing

Run almost 0-config unit tests with Jest:

```bash
npm test
```

## 📖 Documentation

Detailed documentation is available in the [`docs/`](./docs) directory:

- [**Quick Start Guide**](./docs/api/QUICK_START.md): Step-by-step API usage.
- [**Architecture Guide**](./docs/ARCHITECTURE.md): Deep dive into the design patterns.
- [**Authentication**](./docs/AUTH.md): How the auth flows work.

## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.