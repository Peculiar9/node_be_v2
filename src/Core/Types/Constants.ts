export const TYPES = {
    UtilityService: Symbol.for('UtilityService'),
    AWSFileFormatterHelper: Symbol.for('AWSFileFormatterHelper'),
    ConnectionPoolManager: Symbol.for("ConnectionPoolManager"),
    UserRepository: Symbol.for('UserRepository'),

    AccountUseCase: Symbol.for('AccountUseCae'),
    AuthUseCase: Symbol.for('AuthUseCase'),

    AuthService: Symbol.for('AuthService'),
    AuthenticationService: Symbol.for('AuthenticationService'),
    RegistrationService: Symbol.for('RegistrationService'),
    UserProfileService: Symbol.for('UserProfileService'),
    TransactionManager: Symbol.for('TransactionManager'),
    AuthMiddleware: Symbol.for('AuthMiddleware'),
    UserService: Symbol.for('UserService'),

    SMSService: Symbol.for('SMSService'),
    OTPService: Symbol.for('OTPService'),
    FileService: Symbol.for('FileService'),

    AWSHelper: Symbol.for('AWSHelper'),
    AuthServiceHelper: Symbol.for('AuthServiceHelper'),
    TokenService: Symbol.for('TokenService'),
    BaseService: Symbol.for('BaseService'),
    AuthHelpers: Symbol.for('AuthHelpers'),
    EmailService: Symbol.for('EmailService'),
    DatabaseInitializer: Symbol.for('DatanaseInitializer'),

    VerificationRepository: Symbol.for('VerificationRepository'),
    FileManagerRepository: Symbol.for('FileManagerRepository'),
    LinkedAccountsRepository: Symbol.for('LinkedAccountsRepository'),
    UserKYCRepository: Symbol.for('UserKYCRepository'),

    PaymentController: Symbol.for('PaymentController'),
    StripeWebhookController: Symbol.for('StripeWebhookController'),

    GOOGLE_CLIENT_ID: Symbol.for('GoogleClientId'),
    GOOGLE_CLIENT_SECRET: Symbol.for('GoogleClientSecret'),
    GOOGLE_REDIRECT_URI: Symbol.for('GoogleRedirectUri'),

    CryptoService: Symbol.for('CryptoService'),

    // Payment Service
    PaymentService: Symbol.for('PaymentService'),
    STRIPE_SECRET_KEY: Symbol.for('STRIPE_SECRET_KEY'),
    STRIPE_PRE_AUTH_AMOUNT: Symbol.for('STRIPE_PRE_AUTH_AMOUNT'),

    // Verification and Credentials Repositories
    CertificateRepository: Symbol.for('CertificateRepository'),
    DocumentRepository: Symbol.for('DocumentRepository'),

    // Media Services
    MediaService: Symbol.for('MediaService'),
    CloudinaryService: Symbol.for('CloudinaryService'),
    CLOUDINARY_CLOUD_NAME: Symbol.for('CLOUDINARY_CLOUD_NAME'),
    CLOUDINARY_API_KEY: Symbol.for('CLOUDINARY_API_KEY'),
    CLOUDINARY_API_SECRET: Symbol.for('CLOUDINARY_API_SECRET'),

    // Twilio Services
    TwilioService: Symbol.for('TwilioService'),
    TWILIO_ACCOUNT_SID: Symbol.for('TWILIO_ACCOUNT_SID'),
    TWILIO_AUTH_TOKEN: Symbol.for('TWILIO_AUTH_TOKEN'),
    TWILIO_VERIFY_SERVICE_SID: Symbol.for('TWILIO_VERIFY_SERVICE_SID'),
    TWILIO_PHONE_NUMBER: Symbol.for('TWILIO_PHONE_NUMBER'),
    TWILIO_WHATSAPP_NUMBER: Symbol.for('TWILIO_WHATSAPP_NUMBER'),

    // Twilio SendGrid Services
    TwilioEmailService: Symbol.for('TwilioEmailService'),
    SENDGRID_API_KEY: Symbol.for('SENDGRID_API_KEY'),
    SENDGRID_FROM_EMAIL: Symbol.for('SENDGRID_FROM_EMAIL'),

    // Contact
    ContactMessageRepository: Symbol.for('ContactMessageRepository'),
    ContactService: Symbol.for('ContactService'),

    // Services
    HttpClientFactory: Symbol.for('HttpClientFactory'),

    // Webhooks
    StripeWebhookService: Symbol.for('StripeWebhookService'),

    // File
    FileUseCase: Symbol.for('FileUseCase'),

    // Repositories
    NewsletterSubscriptionRepository: Symbol.for('NewsletterSubscriptionRepository'),


    // KYC
    QuickVerifyService: Symbol.for('QuickVerifyService'),
    VerifyMeService: Symbol.for('VerifyMeService'),
} as const;

export const APP_VERSION = 'v1';
export const API_PATH = `api/${APP_VERSION}`;
export const BASE_PATH = `api/${APP_VERSION}`;
export const APP_NAME = 'clean_architecture_backend';
export const API_DOC_URL = '/';

export const delimeter = {
    S3_FileKey: '_',
    Directory: '/',
}

export const FileFormat: { [key: string]: string } = {
    JPEG: 'image/jpeg',
    JPG: 'image/jpg',
    PNG: 'image/png',
    GIF: 'image/gif',
    WEBP: 'image/webp',
    BMP: 'image/bmp',
    TIFF: 'image/tiff',
    ICO: 'image/ico',
    SVG: 'image/svg+xml',
    HTML: 'text/html',
    MP4: 'video/mp4',
    MOV: 'video/quicktime',
    AVI: 'video/x-msvideo',
    WMV: 'video/x-ms-wmv',
    FLV: 'video/x-flv',
    MPEG: 'video/mpeg',
    MP3: 'audio/mpeg',
    WAV: 'audio/wav',
    AAC: 'audio/aac',
    FLAC: 'audio/flac',
    OGG: 'audio/ogg',
    PDF: 'application/pdf',
    DOC: 'application/msword',
    DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    XLS: 'application/vnd.ms-excel',
    XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    PPT: 'application/vnd.ms-powerpoint',
    PPTX: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    TXT: 'text/plain',
    CSV: 'text/csv',
    ZIP: 'application/zip',
    RAR: 'application/x-rar-compressed',
    TAR: 'application/x-tar',
    GZ: 'application/gzip',
    SEVENZ: 'application/x-7z-compressed',
}