import { Container } from 'inversify';
import { APP_NAME, TYPES } from '../Types/Constants';
import { UserRepository } from '@Infrastructure/Repository/SQL/users/UserRepository';
import { TransactionManager } from '@Infrastructure/Repository/SQL/Abstractions/TransactionManager';
import { ConnectionPoolManager } from '@Infrastructure/Repository/SQL/Abstractions/ConnectionPoolManager';
import { AuthenticationService } from '@Infrastructure/Services/AuthenticationService';
import { RegistrationService } from '@Infrastructure/Services/RegistrationService';
import { UserProfileService } from '@Infrastructure/Services/UserProfileService';
import { TokenService } from '@Infrastructure/Services/TokenService';
import { AuthHelpers } from '@Infrastructure/Services/helpers/AuthHelpers';
import { ITokenService } from '../Application/Interface/Services/ITokenService';
import { AuthMiddleware } from '@Presentation/Http/APIs/Middleware/AuthMiddleware';
import { getDatabaseConfig } from '@Infrastructure/Database/DatabaseConfig';
import { PoolOptions } from 'pg';
import { UserService } from '@Infrastructure/Services/UserService';
import { SMSService } from '@Infrastructure/Services/SMSService';
import { IAWSHelper } from '../Application/Interface/Services/IAWSHelper';
import { AWSHelper } from '@Infrastructure/Services/external-api-services/AWSHelper';
import { VerificationRepository } from '@Infrastructure/Repository/SQL/auth/VerificationRepository';
import { OTPService } from '@Infrastructure/Services/OTPService';
import { DatabaseInitializer } from '@Infrastructure/Config/DatabaseInitializer';
import { IAuthService } from '../Application/Interface/Services/IAuthService';
import { IAuthenticationService } from '../Application/Interface/Services/IAuthenticationService';
import { IRegistrationService } from '../Application/Interface/Services/IRegistrationService';
import { IUserProfileService } from '../Application/Interface/Services/IUserProfileService';
import { IEmailService } from '../Application/Interface/Services/IEmailService';
import { EmailService } from '@Infrastructure/Services/EmailService';
import { LinkedAccountsRepository } from '@Infrastructure/Repository/SQL/auth/LinkedAccountsRepository';
import { FileManagerRepository } from '@Infrastructure/Repository/SQL/files/FileManagerRepository';
import { FileService } from '@Infrastructure/Services/FileService';
import { IFileService } from '../Application/Interface/Services/IFileService';
import { ISMSService } from '../Application/Interface/Services/ISMSService';
import { IOTPService } from '../Application/Interface/Services/IOTPService';
import { AuthServiceHelper } from '@Infrastructure/Services/helpers/AuthServiceHelper';
import { AWSFileFormatterHelper } from '@Infrastructure/Services/external-api-services/AWSFileFormatterHelper';
import { IAuthUseCase } from '../Application/Interface/UseCases/IAuthUseCase';
import { AuthUseCase } from '../Application/UseCases/AuthUseCase';
import { UserKYCRepository } from '@Infrastructure/Repository/SQL/auth/UserKYCRepository';
import { IMediaService } from '../Application/Interface/Services/IMediaService';
import { CloudinaryService } from '@Infrastructure/Services/media/CloudinaryService';
import { ITwilioService } from '../Application/Interface/Services/ITwilioService';
import { TwilioService } from '@Infrastructure/Services/TwilioService';
import { ITwilioEmailService } from '../Application/Interface/Services/ITwilioEmailService';
import { TwilioEmailService } from '@Infrastructure/Services/TwilioEmailService';


/**
 * Container for dependency injection configuration
 * Uses interface bindings for better decoupling and testability
 */
export class DIContainer {
    private static containerInstance: Container;

    private constructor() { }

    public static getInstance(): Container {
        if (!DIContainer.containerInstance) {
            DIContainer.containerInstance = new Container();
            DIContainer.resolveDependencies();
        }
        return DIContainer.containerInstance;
    }

    private static resolveDependencies(): void {
        const container = DIContainer.containerInstance;

        // Load database config
        const config = getDatabaseConfig();

        // Create PoolOptions
        const poolOptions: PoolOptions = {
            user: config.user,
            password: config.password,
            host: config.host,
            port: config.port,
            database: config.database,
            max: config.max,
            connectionString: config.connectionString,
            idleTimeoutMillis: config.idleTimeoutMillis,
            connectionTimeoutMillis: config.connectionTimeoutMillis,
            ssl: config.ssl,
            maxUses: 7500,
            allowExitOnIdle: true,
            maxLifetimeSeconds: 3600
        };

        // Infrastructure layer
        container.bind<ConnectionPoolManager>(TYPES.ConnectionPoolManager)
            .toDynamicValue(() => new ConnectionPoolManager(poolOptions))
            .inSingletonScope();

        // Helpers
        container.bind<AWSFileFormatterHelper>(TYPES.AWSFileFormatterHelper).to(AWSFileFormatterHelper).inSingletonScope();

        container.bind<TransactionManager>(TYPES.TransactionManager)
            .toDynamicValue((context) => {
                const poolManager = context.container.get<ConnectionPoolManager>(TYPES.ConnectionPoolManager);
                return new TransactionManager(poolManager);
            }).inRequestScope();

        container.bind<DatabaseInitializer>(TYPES.DatabaseInitializer).to(DatabaseInitializer).inRequestScope();

        // Repositories
        container.bind<UserRepository>(TYPES.UserRepository).to(UserRepository);
        container.bind<UserKYCRepository>(TYPES.UserKYCRepository).to(UserKYCRepository).inRequestScope();
        container.bind<LinkedAccountsRepository>(TYPES.LinkedAccountsRepository).to(LinkedAccountsRepository).inRequestScope();
        container.bind<FileManagerRepository>(TYPES.FileManagerRepository).to(FileManagerRepository).inRequestScope();
        container.bind<VerificationRepository>(TYPES.VerificationRepository).to(VerificationRepository).inRequestScope();
        container.bind<AuthServiceHelper>(TYPES.AuthServiceHelper).to(AuthServiceHelper).inRequestScope();

        // Use Cases
        container.bind<IAuthUseCase>(TYPES.AuthUseCase).to(AuthUseCase).inRequestScope();

        // Middleware
        container.bind<AuthMiddleware>(TYPES.AuthMiddleware).to(AuthMiddleware).inRequestScope();

        // Services
        container.bind<UserService>(TYPES.UserService).to(UserService).inRequestScope();
        container.bind<IFileService>(TYPES.FileService).to(FileService).inRequestScope();
        container.bind<ISMSService>(TYPES.SMSService).to(SMSService).inRequestScope();
        container.bind<IOTPService>(TYPES.OTPService).to(OTPService).inRequestScope();

        container.bind<IEmailService>(TYPES.EmailService).to(EmailService).inRequestScope();

        container.bind<ITokenService>(TYPES.TokenService).to(TokenService).inRequestScope();
        container.bind<AuthHelpers>(TYPES.AuthHelpers).to(AuthHelpers).inRequestScope();

        // Specialized Auth Services
        container.bind<IAuthenticationService>(TYPES.AuthenticationService).to(AuthenticationService).inRequestScope();
        container.bind<IRegistrationService>(TYPES.RegistrationService).to(RegistrationService).inRequestScope();
        container.bind<IUserProfileService>(TYPES.UserProfileService).to(UserProfileService).inRequestScope();
        container.bind<IAWSHelper>(TYPES.AWSHelper).to(AWSHelper).inRequestScope();

        // Configuration bindings
        // Google
        container.bind<string>(TYPES.GOOGLE_CLIENT_ID).toConstantValue(process.env.GOOGLE_CLIENT_ID || '');
        container.bind<string>(TYPES.GOOGLE_CLIENT_SECRET).toConstantValue(process.env.GOOGLE_CLIENT_SECRET || '');
        container.bind<string>(TYPES.GOOGLE_REDIRECT_URI).toConstantValue(process.env.GOOGLE_REDIRECT_URI || '');

        // Cloudinary
        container.bind<string>(TYPES.CLOUDINARY_CLOUD_NAME).toConstantValue(process.env.CLOUDINARY_CLOUD_NAME || '');
        container.bind<string>(TYPES.CLOUDINARY_API_KEY).toConstantValue(process.env.CLOUDINARY_API_KEY || '');
        container.bind<string>(TYPES.CLOUDINARY_API_SECRET).toConstantValue(process.env.CLOUDINARY_API_SECRET || '');
        container.bind<IMediaService>(TYPES.MediaService).to(CloudinaryService).inRequestScope();

        // Twilio
        container.bind<string>(TYPES.TWILIO_ACCOUNT_SID).toConstantValue(process.env.TWILIO_ACCOUNT_SID || '');
        container.bind<string>(TYPES.TWILIO_AUTH_TOKEN).toConstantValue(process.env.TWILIO_AUTH_TOKEN || '');
        container.bind<string>(TYPES.TWILIO_VERIFY_SERVICE_SID).toConstantValue(process.env.TWILIO_VERIFY_SERVICE_SID || '');
        container.bind<string>(TYPES.TWILIO_PHONE_NUMBER).toConstantValue(process.env.TWILIO_PHONE_NUMBER || '');
        container.bind<string>(TYPES.TWILIO_WHATSAPP_NUMBER).toConstantValue(process.env.TWILIO_WHATSAPP_NUMBER || '');
        container.bind<ITwilioService>(TYPES.TwilioService).to(TwilioService).inRequestScope();

        // SendGrid
        container.bind<string>(TYPES.SENDGRID_API_KEY).toConstantValue(process.env.SENDGRID_API_KEY || '');
        container.bind<string>(TYPES.SENDGRID_FROM_EMAIL).toConstantValue(process.env.SENDGRID_FROM_EMAIL || `noreply@${APP_NAME}.com`);
        container.bind<ITwilioEmailService>(TYPES.TwilioEmailService).to(TwilioEmailService).inRequestScope();

        console.log("All dependencies bound!!")
    }
}
