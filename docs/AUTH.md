# 🔐 Authentication System

The template provides a complete, secure authentication system out of the box.

## 🔑 Key Features

- **JWT (JSON Web Tokens)**: Stateless authentication.
- **Refresh Tokens**: Secure mechanism to rotate access tokens without forcing re-login.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions (e.g., `admin`, `user`).
- **OTP Verification**: Email and Phone verification support.
- **Password Hashing**: Industry-standard `bcrypt` (via `bcryptjs`).

## 🔄 Auth Flow

### 1. Registration
1.  User submits generic details (`email`, `password`, `first_name`).
2.  System hashes password using `bcryptjs`.
3.  Generic User account created with status `PENDING`.
4.  Generic OTP (4-digit) generated and sent via configured Email Service.

### 2. Verification
1.  User submits OTP + Reference ID.
2.  System verifies hash matches.
3.  User status updated to `ACTIVE`.
4.  Access & Refresh tokens issued.

### 3. Login
1.  User submits credentials.
2.  System validates password hash.
3.  Access Token (short-lived, e.g., 15m) and Refresh Token (long-lived, e.g., 7d) issued.

### 4. Protected Routes
Middleware (`AuthMiddleware`) intercepts requests:
- Checks `Authorization: Bearer <token>` header.
- Decodes generic JWT.
- Attaches `user` object to `req`.
- Optionally checks `user.role` against required roles.

## ⚙️ Configuration

Configure via `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_ACCESS_SECRET` | Secret key for signing access tokens | - |
| `JWT_REFRESH_SECRET` | Secret key for signing refresh tokens | - |
| `JWT_ACCESS_EXPIRATION` | Duration (e.g., '15m') | 1h |
| `JWT_REFRESH_EXPIRATION` | Duration (e.g., '7d') | 7d |

## 🛡️ Security Best Practices

- **Never commit .env files**.
- **Rotate Secrets** periodically in production.
- **HTTPS** is required for secure token transmission in production.
