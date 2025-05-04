export const TYPES = {
    ConnectionPoolManager: Symbol.for("ConnectionPoolManager"),
    UserRepository: Symbol.for('UserRepository'),
    AccountUseCase: Symbol.for('AccountUseCase'),
    AuthService: Symbol.for('AuthService'),
    TransactionManager: Symbol.for('TransactionManager'),
    AuthMiddleware: Symbol.for('AuthMiddleware'),
    UserService: Symbol.for('UserService'),
    SMSService: Symbol.for('SMSService'),
    OTPService: Symbol.for('OTPService'),
    AWSHelper: Symbol.for('AWSHelper'),
    EmailService: Symbol.for('EmailService'),
    DatabaseInitializer: Symbol.for('DatabaseInitializer'),
    HttpClientFactory: Symbol.for('HttpClientFactory'),
    UserController: Symbol.for('UserController'),
    VerificationRepository: Symbol.for('VerificationRepository'),
    LinkedAccountsRepository: Symbol.for('LinkedAccountsRepository'),
    GOOGLE_CLIENT_ID: Symbol.for('GoogleClientId'),
    GOOGLE_CLIENT_SECRET: Symbol.for('GoogleClientSecret'),
    GOOGLE_REDIRECT_URI: Symbol.for('GoogleRedirectUri'),
    GoogleService: Symbol.for('GoogleService'),
    CryptoService: Symbol.for('CryptoService')
} as const;

export const API_PATH = 'api/v1';
export const APP_NAME = 'backend_template';
export const APP_VERSION = 'v1';
export const API_DOC_URL = '/';