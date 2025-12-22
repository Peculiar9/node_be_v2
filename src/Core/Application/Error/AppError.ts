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
  constructor(message: string, errorCode?: number) {
    super(message, 400, errorCode || 100); // Validation errors: 100-199
    this.name = 'ValidationError';
  }
}
export class PaymentError extends AppError {
  constructor(message: string, errorCode?: number) {
    super(message, 402, errorCode || 200); // Payment errors: 200-299
    this.name = 'PaymentError';
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
  protected details?: any;

  constructor(message: string) {
    super(message, 500, 700); // Database errors: 700-799
    this.name = 'DatabaseError';
  }

  public getDetails(): any | undefined {
    return this.details;
  }
}

export class RegistrationError extends AppError {
  constructor(message: string) {
    // Choose an appropriate status code and error code; for example, 422 Unprocessable Entity
    super(message, 422, 120); // Error code 120 (for example) could be reserved for registration errors.
    this.name = 'RegistrationError';
  }
}

export class ServiceError extends AppError {
    constructor(message: string) {
        super(message, 503, 13); // 503 Service Unavailable
        this.name = 'ServiceError';
    }
}

export enum ErrorCode {
    // Validation errors (1000-1999)
  INVALID_INPUT = 1001,
  MISSING_REQUIRED_FIELD = 1002,
  INVALID_FORMAT = 1003,
  
  // Authentication errors (2000-2999)
  INVALID_CREDENTIALS = 2001,
  EXPIRED_TOKEN = 2002,
  INVALID_TOKEN = 2003,
  ACCOUNT_LOCKED = 2004,
  
  // Payment errors (6000-6099)
  REQUIRE_PAYMENT_METHOD = 6001,
  PAYMENT_METHOD_NOT_FOUND = 6002,
  PAYMENT_DECLINED = 6003,
  INSUFFICIENT_FUNDS = 6004,
  
  // Database errors (8000-8999)
  CONNECTION_ERROR = 8001,
  QUERY_ERROR = 8002,
  CONSTRAINT_VIOLATION = 8003,
  TRANSACTION_ERROR = 8004,
  

}

