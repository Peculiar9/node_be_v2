export interface ResponseDataInterface {
  success: boolean;
  message: string;
  data: any;
  error_code?: number;
  meta?: any;
}

export class ResponseMessage {
  static readonly SUCCESSFUL_REQUEST_MESSAGE = 'Request processed successfully';
  static readonly INVALID_REQUEST_MESSAGE = 'Invalid request';
  static readonly UNAUTHORIZED_MESSAGE = 'Unauthorized access';
  static readonly FORBIDDEN_MESSAGE = 'Access forbidden';
  static readonly NOT_FOUND_MESSAGE = 'Resource not found';
  static readonly VALIDATION_ERROR_MESSAGE = 'Validation failed';
  static readonly DATABASE_ERROR_MESSAGE = 'Database operation failed';
  static readonly INTERNAL_SERVER_ERROR_MESSAGE = 'Internal server error';
  static readonly INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';
  static readonly INVALID_TOKEN_MESSAGE = 'Invalid or expired token';
  static readonly USER_EXISTS_MESSAGE = 'User already exists';
  static readonly USER_NOT_FOUND_MESSAGE = 'User not found';
  static readonly INVALID_PASSWORD_MESSAGE = 'Invalid password';
  static readonly MISSING_REQUIRED_FIELDS = 'Missing required fields';
  static readonly INSUFFICIENT_PRIVILEDGES_MESSAGE = 'User does not have sufficient priviledges to access this function';
  static readonly INVALID_AUTH_HEADER_MESSAGE = 'Invalid auth header';
}