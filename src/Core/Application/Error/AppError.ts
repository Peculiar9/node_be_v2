export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public errorCode: number = 0
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 100); // Validation errors: 100-199
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string) {
    super(message, 401, 200); // Authentication errors: 200-299
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string) {
    super(message, 403, 300); // Authorization errors: 300-399
    this.name = 'AuthorizationError';
  }
}

export class HttpClientError extends AppError {
  constructor(message: string, statusCode: number) {
    super(message, statusCode, 400); // Client errors: 400-499
    this.name = 'HttpClientError';
  }

  static fromAxiosError(error: any): HttpClientError {
    const message = error.response?.data?.message || 'An error occurred';
    const statusCode = error.response?.status || 400;
    return new HttpClientError(message, statusCode);
  }
}

// 403 Forbidden
export class ForbiddenError extends AppError {
  constructor(message: string) {
      super(message, 403, 10);
  }
}

// 422 Unprocessable Entity
export class UnprocessableEntityError extends AppError {
  constructor(message: string) {
      super(message, 422, 11);
      this.name = 'UnprocessableEntityError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, 400); // Not Found errors: 400-499
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 500); // Conflict errors: 500-599
    this.name = 'ConflictError';
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal Server Error') {
    super(message, 500, 600); // Server errors: 600-699
    this.name = 'InternalServerError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(message, 500, 700); // Database errors: 700-799
    this.name = 'DatabaseError';
  }
}