export interface ResponseDataInterface {
  success: boolean;
  message: string;
  data: any;
  error_code?: number;
  meta?: any;
}

export class ResponseMessage {
  static readonly INVALID_PHONE_NUMBER = "Phone number is invalid";
  static readonly SUCCESSFUL_REQUEST_MESSAGE = 'Request processed successfully';
  static readonly INVALID_REQUEST_MESSAGE = 'Invalid request data provided';
  static readonly UNAUTHORIZED_MESSAGE = 'Unauthorized access';
  static readonly FORBIDDEN_MESSAGE = 'Access forbidden';
  static readonly NOT_FOUND_MESSAGE = 'Resource not found';
  static readonly VALIDATION_ERROR_MESSAGE = 'Validation failed';
  static readonly DATABASE_ERROR_MESSAGE = 'Database operation failed';
  static readonly FAILED_TOKEN_DESTRUCTURE = 'Failed to get user from token!!!';
  static readonly INTERNAL_SERVER_ERROR_MESSAGE = 'Internal server error';
  static readonly INVALID_CREDENTIALS_MESSAGE = 'Invalid email, phone or password';
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
  static readonly INVALID_FILE_TYPE = 'Invalid file type';
  static readonly FAILED_PHONE_VERIFICATION_MESSAGE = 'The phone number could not be verified';
  static readonly INVALID_VERIFICATION = 'The verification is invalid or expired, please contact admin';
  static readonly INVALID_OTP = 'The OTP is invalid';
  static readonly VERIFICATION_FAILED = 'Verification failed!!!';
  static readonly EMAIL_VERIFICATION_FAILED = 'Email verification failed. Please try again.';
  static readonly RATE_LIMIT_ERROR = "Too many requests - try again later.";
  static readonly VERIFICATION_ALREADY_COMPLETED = 'Verification already completed';
  static readonly BOOKMARK_SUCCESS = 'Successfully bookmarked station';
  static readonly BOOKMARK_ALREADY_EXISTS = 'Station already bookmarked';
  static readonly BOOKMARK_NOT_FOUND = 'Bookmark not found';
  static readonly REVIEW_SUCCESS = 'Successfully reviewed station';
  static readonly REVIEW_NOT_FOUND = 'Review not found';
  static readonly REVIEW_ALREADY_EXISTS = 'Review already exists';
  static readonly REVIEW_ALREADY_COMPLETED = 'Review already completed';
  static readonly PASSWORD_SETUP_SUCCESS = 'Password setup successful';
  static readonly USER_PASSWORD_SETUP_FAILED = 'User password setup failed';
  static readonly CHECKIN_SUCCESS = 'Successfully checked in';
  static readonly USER_YOURE_TRYING_TO_VERIFY_DOES_NOT_EXIST = 'You are trying to verify a user that does not exist';
  static readonly SUCCESSFUL_REGISTRATION = 'User registration completed successfully';
  static readonly USER_PASSWORD_RESET_SUCCESS = 'User password reset successfully';
  static readonly USER_PASSWORD_RESET_FAILED = 'User password reset failed';
  static readonly PHONE_VERIFICATION_FAILED = 'Phone verification failed';
  static readonly USER_VALIDATION_FAILED = 'System could not validate user';
  static readonly EMAIL_VERIFICATION_ALREADY_COMPLETED = 'Email verification already completed';
  static readonly INVALID_REFRESH_TOKEN = 'Invalid refresh token';
  static readonly PASSWORD_RESET_REQUEST_FAILED = 'Password reset request failed';
  static readonly PROFILE_IMAGE_UPDATE_FAILED = 'Profile image update failed';
  static readonly INVALID_VERIFICATION_CODE = 'Invalid or expired verification code';
  static readonly INVALID_VIN = 'Invalid VIN';
  
  
  // Additional error messages from controllers
  static readonly REVIEW_UPDATED_SUCCESS = 'Review updated successfully';
  static readonly REVIEW_DELETED_SUCCESS = 'Review deleted successfully';
  static readonly SERVICE_RUNNING = 'The service is running!!!';
  static readonly BOOKMARK_REMOVED_SUCCESS = 'Bookmark removed successfully';
  static readonly STATIONS_RETRIEVED_SUCCESS = 'Successfully retrieved charging stations';
  static readonly STATION_RETRIEVED_SUCCESS = 'Successfully retrieved station';
  static readonly BOOKMARKS_RETRIEVED_SUCCESS = 'Successfully retrieved bookmarked stations';
  static readonly STATION_REVIEWS_RETRIEVED_SUCCESS = 'Successfully retrieved station reviews';
  static readonly NREL_STATIONS_SYNCED = 'Successfully Synced NREL stations';
  
  // Method not implemented messages
  static readonly METHOD_NOT_IMPLEMENTED = 'Method not implemented';
  
  // Database related messages
  static readonly UNABLE_TO_EXTRACT_TABLE_SCHEMA = 'Unable to extract table schema';
  static readonly FAILED_TO_INITIALIZE_TABLES = 'Failed to initialize/update tables';
  
  // AWS related messages
  static readonly FAILED_TO_SEND_SMS = 'Failed to send SMS';
  static readonly INVALID_EMAIL_TYPE = 'Invalid email type';
  static readonly FAILED_TO_GET_EMAIL_TEMPLATE = 'Failed to get email template';
  static readonly FAILED_TO_UPLOAD_TO_S3 = 'Failed to upload to S3';
  
  // Authentication related messages
  static readonly VERIFICATION_RESTART_ERROR = 'An unexpected error occurred while restarting verification. Please try again later.';
  
  // Station related messages
  static readonly STATION_WITH_ID_NOT_FOUND = 'Station with ID {0} not found';
  static readonly USER_NOT_AUTHORIZED_TO_UPDATE_REVIEW = 'User not authorized to update this review';
  static readonly REVIEW_WITH_ID_NOT_FOUND = 'Review with ID {0} not found';
  // Payment related messages
  static readonly PAYMENT_METHOD_ADDED_SUCCESS = 'Payment method added successfully';
  static readonly PAYMENT_METHOD_REMOVED_SUCCESS = 'Payment method removed successfully';
  static readonly DEFAULT_PAYMENT_METHOD_SET_SUCCESS = 'Default payment method set successfully';
  static readonly PAYMENT_METHODS_RETRIEVED_SUCCESS = 'Payment methods retrieved successfully';
  static readonly SETUP_INTENT_CREATED_SUCCESS = 'Setup intent created successfully';
}
