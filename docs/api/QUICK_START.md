# 🚀 Quick Start Guide - Generic Backend API

**Get started with the generic Clean Architecture backend in 5 minutes!**

---

## 📋 Prerequisites

- **Base URL**: `http://localhost:3000/api/v1` (Default local)
- **Content-Type**: `application/json`

---

## 🎯 Authentication Flow

### **1. Register User**

Create a new user account. This will trigger a verification email (or SMS depending on config).

```bash
POST /api/v1/auth/register
```

**Payload:**
```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "email": "jane.doe@example.com",
  "password": "StrongPassword123!",
  "phone": "+1234567890",
  "country_code": "+1"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User created successfully. Please verify your email/phone.",
  "data": {
    "reference": "d04e4c...",
    "email": "jane.doe@example.com",
    "expiry": 1735467890
  }
}
```

---

### **2. Verify Email/Phone**

Use the OTP sent to the user (generic `1234` in `development` mode if configured).

```bash
POST /api/v1/auth/verify-email
```

**Payload:**
```json
{
  "email": "jane.doe@example.com",
  "code": "1234",
  "reference": "d04e4c..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Verification successful.",
  "data": {
    "accessToken": "ey...",
    "refreshToken": "ey...",
    "user": { ... }
  }
}
```

---

### **3. Login**

Authenticate an existing user.

```bash
POST /api/v1/auth/login
```

**Payload:**
```json
{
  "email": "jane.doe@example.com",
  "password": "StrongPassword123!"
}
```

---

## 👤 Profile Management

### **Get User Profile**

Get details of the currently authenticated user.

```bash
GET /api/v1/auth/me
Authorization: Bearer <your_access_token>
```

### **Update Profile**

Update user details.

```bash
PATCH /api/v1/auth/profile
Authorization: Bearer <your_access_token>
```

**Payload:**
```json
{
  "first_name": "Janet",
  "phone": "+1987654321"
}
```

---

## Common Errors

- **400 Bad Request**: Validation failed (e.g., weak password, missing field).
- **401 Unauthorized**: Invalid or missing JWT token.
- **403 Forbidden**: User verified but does not have the required role (e.g., admin routes).
- **409 Conflict**: Email already exists.

---

## Troubleshooting

- **Database Connection**: Ensure your `.env` DB credentials match your local PostgreSQL setup.
- **JWT Errors**: Check that `JWT_ACCESS_SECRET` is set in your `.env`.
- **OTP Not Received**: Check server logs. In development, the OTP is often printed to the console: `🔑 OTP CODE: 1234`.
