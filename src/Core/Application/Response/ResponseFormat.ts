export interface ResponseDataInterface {
  success: boolean;
  message: string;
  data: any;
  error_code?: number;
  meta?: any;
}

export class ResponseMessage {
  static readonly SUCCESSFUL_REQUEST_MESSAGE = 'Request processed successfully';
  static readonly INVALID_REQUEST_MESSAGE = 'Invalid request data provided';
  static readonly UNAUTHORIZED_MESSAGE = 'Unauthorized access';
  static readonly FORBIDDEN_MESSAGE = 'Access forbidden';
  static readonly NOT_FOUND_MESSAGE = 'Resource not found';
  static readonly VALIDATION_ERROR_MESSAGE = 'Validation failed';
  static readonly DATABASE_ERROR_MESSAGE = 'Database operation failed';
  static readonly FAILED_TOKEN_DESTRUCTURE = 'Failed to get user from token!!!';
  static readonly INTERNAL_SERVER_ERROR_MESSAGE = 'Internal server error';
  static readonly INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';
  static readonly INVALID_TOKEN_MESSAGE = 'Invalid or expired token';
  static readonly INVALID_TOKEN_PAYLOAD_MESSAGE = 'Invalid token payload';
  static readonly EMAIL_PASSWORD_REQUIRED = 'Email and password are required';
  static readonly INVALID_TOKEN_TYPE_MESSAGE = 'Invalid token type';
  static readonly INVALID__REFRESH_TOKEN_MESSAGE = 'Invalid or expired refresh token';
  static readonly USER_EXISTS_MESSAGE = 'User already exists';
  static readonly USER_NOT_FOUND_MESSAGE = 'User not found';
  static readonly INVALID_PASSWORD_MESSAGE = 'Invalid password';
  static readonly MISSING_REQUIRED_FIELDS = 'Missing required fields';
  static readonly INSUFFICIENT_PRIVILEDGES_MESSAGE = 'User does not have sufficient priviledges to access this function';
  static readonly INVALID_AUTH_HEADER_MESSAGE = 'Invalid auth header';
  static readonly USER_CREATION_FAILED = 'User creation failed';
  static readonly EMAIL_ALREADY_EXISTS = 'Email already exists';
  static readonly EMAIL_REQUIRED_MESSAGE = 'Email is required';
  static readonly PASSWORD_REQUIRED_MESSAGE = 'Password is required';
  static readonly USER_ID_REQUIRED_MESSAGE = 'User ID is required';
  static readonly EMAIL_VERIFICATION_REQUIRED = 'Email verification is required';
  static readonly PASSWORD_RESET_EMAIL_SENT = 'Password reset email has been sent';
  static readonly PASSWORD_RESET_SUCCESS = 'Password has been reset successfully';
  static readonly TOKEN_REFRESH_SUCCESS = 'Token refreshed successfully';
  static readonly LOGOUT_SUCCESS = 'Logged out successfully';
  static readonly INVALID_UPDATE_REQUEST = 'Invalid update request';
  static readonly VERIFICATION_TOKEN_REQUIRED = 'Verification token is required';
  static readonly TOKEN_PASSWORD_REQUIRED = 'Token and new password are required';
}
