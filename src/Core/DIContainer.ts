import { Container } from 'inversify';
import { TYPES } from './Types/Constants';
import { UserRepository } from '../Infrastructure/Repository/SQL/users/UserRepository';
import { TransactionManager } from '../Infrastructure/Repository/SQL/Abstractions/TransactionManager';
import { ConnectionPoolManager } from '../Infrastructure/Repository/SQL/Abstractions/ConnectionPoolManager';
import { PaymentController } from '../Controllers/payment/PaymentController';
import { MockPaymentController } from '../Controllers/payment/MockPaymentController';
import { StripeWebhookController } from '../Controllers/payment/StripeWebhookController';
import { StripeWebhookService } from '../Infrastructure/Services/payment/StripeWebhookService';
import { AuthService } from '../Infrastructure/Services/AuthService';
import { AuthenticationService } from '../Infrastructure/Services/AuthenticationService';
import { RegistrationService } from '../Infrastructure/Services/RegistrationService';
import { UserProfileService } from '../Infrastructure/Services/UserProfileService';
import { BaseService } from '../Infrastructure/Services/base/BaseService';
import { TokenService } from '../Infrastructure/Services/TokenService';
import { AuthHelpers } from '../Infrastructure/Services/helpers/AuthHelpers';
import { ITokenService } from './Application/Interface/Services/ITokenService';
import { AccountUseCase } from './Application/UseCases/AccountUseCase';
import { IAccountUseCase } from './Application/Interface/UseCases/IAccountUseCase';
import { AuthMiddleware } from '../Middleware/AuthMiddleware';
import { getDatabaseConfig } from '../Infrastructure/Database/DatabaseConfig';
import { PoolOptions } from 'pg';
import { UserService } from '../Infrastructure/Services/UserService';
import { SMSService } from '../Infrastructure/Services/SMSService';
import { IAWSHelper } from './Application/Interface/Services/IAWSHelper';
import { AWSHelper } from '../Infrastructure/Services/external-api-services/AWSHelper';
import { VerificationRepository } from '../Infrastructure/Repository/SQL/auth/VerificationRepository';
import { OTPService } from '../Infrastructure/Services/OTPService';
import { HttpClientFactory } from '../Infrastructure/Http/HttpClientFactory';
import { DatabaseInitializer } from '../Infrastructure/Config/DatabaseInitializer';
import { IAuthService } from './Application/Interface/Services/IAuthService';
import { IAuthenticationService } from './Application/Interface/Services/IAuthenticationService';
import { IRegistrationService } from './Application/Interface/Services/IRegistrationService';
import { IUserProfileService } from './Application/Interface/Services/IUserProfileService';
import { IEmailService } from './Application/Interface/Services/IEmailService';
import { EmailService } from '../Infrastructure/Services/EmailService';
import { LinkedAccountsRepository } from '../Infrastructure/Repository/SQL/auth/LinkedAccountsRepository';
import { FileManagerRepository } from '../Infrastructure/Repository/SQL/files/FileManagerRepository';
import { FileService } from '../Infrastructure/Services/FileService';
import { IFileService } from './Application/Interface/Services/IFileService';
import { ISMSService } from './Application/Interface/Services/ISMSService';
import { IOTPService } from './Application/Interface/Services/IOTPService';
import { AuthServiceHelper } from '../Infrastructure/Services/helpers/AuthServiceHelper';
import { AWSFileFormatterHelper } from '../Infrastructure/Services/external-api-services/AWSFileFormatterHelper';
import { IAuthUseCase } from './Application/Interface/UseCases/IAuthUseCase';
import { AuthUseCase } from './Application/UseCases/AuthUseCase';
import { IPaymentService } from './Application/Interface/Services/IPaymentService';
import { StripePaymentService } from '../Infrastructure/Services/payment/StripePaymentService';
import { UserKYCRepository } from '../Infrastructure/Repository/SQL/auth/UserKYCRepository';
import { IStripeWebhookService } from './Application/Interface/Services/IStripeWebhookService';
import { IGoogleService } from './Application/Interface/Services/IGoogleService';
import { GoogleService } from '../Infrastructure/Services/external-api-services/GoogleService';

/**
 * Container for dependency injection configuration
 * Uses interface bindings for better decoupling and testability
 */
export class DIContainer {
    private static containerInstance: Container;

    private constructor() {
        // Private constructor to prevent instantiation
    }
    public static getInstance(): Container {
        if (!DIContainer.containerInstance) {
            DIContainer.containerInstance = new Container();
            DIContainer.resolveDependencies();
        }
        console.log("Got here!!! -> ", 1);
        return DIContainer.containerInstance;
    }

    private static resolveDependencies(): void {
        const container = DIContainer.containerInstance;

        // Load database config - do this ONCE at container initialization
        const config = getDatabaseConfig();
        console.info('Initializing database configuration', {
            context: 'DIContainer.resolveDependencies',
            host: config.host,
            database: config.database,
            maxPool: config.max,
            nodeEnv: process.env.NODE_ENV
        });

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
        // Application-scoped singleton that manages the database connection pool
        container.bind<ConnectionPoolManager>(TYPES.ConnectionPoolManager)
            .toDynamicValue(() => new ConnectionPoolManager(poolOptions))
            .inSingletonScope();

        // AWSFileFormatterHelper binding
        container.bind<AWSFileFormatterHelper>(TYPES.AWSFileFormatterHelper).to(AWSFileFormatterHelper).inSingletonScope();

        // TransactionManager binding
        container.bind<TransactionManager>(TYPES.TransactionManager)
            .toDynamicValue((context) => {
                const poolManager = context.container.get<ConnectionPoolManager>(TYPES.ConnectionPoolManager);
                return new TransactionManager(poolManager);
            }).inRequestScope();

        container.bind<DatabaseInitializer>(TYPES.DatabaseInitializer).to(DatabaseInitializer).inRequestScope();    
        
        // Register repositories
        container.bind<UserRepository>(TYPES.UserRepository).to(UserRepository);
        container.bind<UserKYCRepository>(TYPES.UserKYCRepository).to(UserKYCRepository).inRequestScope();
        container.bind<LinkedAccountsRepository>(TYPES.LinkedAccountsRepository).to(LinkedAccountsRepository).inRequestScope();
        container.bind<FileManagerRepository>(TYPES.FileManagerRepository).to(FileManagerRepository).inRequestScope();
        container.bind<VerificationRepository>(TYPES.VerificationRepository).to(VerificationRepository).inRequestScope();
        container.bind<AuthServiceHelper>(TYPES.AuthServiceHelper).to(AuthServiceHelper).inRequestScope();
        container.bind<IAuthUseCase>(TYPES.AuthUseCase).to(AuthUseCase).inRequestScope();

        // Middleware layer binding
        container.bind<AuthMiddleware>(TYPES.AuthMiddleware).to(AuthMiddleware).inRequestScope();

        // Use case layer binding
        container.bind<IAccountUseCase>(TYPES.AccountUseCase).to(AccountUseCase).inRequestScope();

      
        // Service layer binding
        container.bind<UserService>(TYPES.UserService).to(UserService).inRequestScope();
        container.bind<IFileService>(TYPES.FileService).to(FileService).inRequestScope();
        container.bind<ISMSService>(TYPES.SMSService).to(SMSService).inRequestScope();
        container.bind<IOTPService>(TYPES.OTPService).to(OTPService).inRequestScope();
        container.bind<IAuthService>(TYPES.AuthService).to(AuthService).inRequestScope();
        container.bind<IEmailService>(TYPES.EmailService).to(EmailService).inRequestScope();
        // Base service and helpers
        // container.bind<BaseService>(TYPES.BaseService).to(BaseService).inRequestScope();
        container.bind<ITokenService>(TYPES.TokenService).to(TokenService).inRequestScope();
        container.bind<AuthHelpers>(TYPES.AuthHelpers).to(AuthHelpers).inRequestScope();
            
        // New specialized auth services
        container.bind<IAuthenticationService>(TYPES.AuthenticationService).to(AuthenticationService).inRequestScope();
        container.bind<IRegistrationService>(TYPES.RegistrationService).to(RegistrationService).inRequestScope();
        container.bind<IUserProfileService>(TYPES.UserProfileService).to(UserProfileService).inRequestScope();
        container.bind<IAWSHelper>(TYPES.AWSHelper).to(AWSHelper).inRequestScope();
       

        // Register payment services
        container.bind<IPaymentService>(TYPES.PaymentService).to(StripePaymentService);
        
        // // Register payment controllers
        // container.bind<PaymentController>(TYPES.PaymentController).to(PaymentController).inRequestScope();
        // container.bind<MockPaymentController>(TYPES.MockPaymentController).to(MockPaymentController).inRequestScope();
        // container.bind<StripeWebhookController>(TYPES.StripeWebhookController).to(StripeWebhookController).inRequestScope();
        container.bind<IStripeWebhookService>(TYPES.StripeWebhookService).to(StripeWebhookService).inSingletonScope();

        // Google OAuth Configuration bindings
        container.bind<string>(TYPES.GOOGLE_CLIENT_ID).toConstantValue(process.env.GOOGLE_CLIENT_ID || '');
        container.bind<string>(TYPES.GOOGLE_CLIENT_SECRET).toConstantValue(process.env.GOOGLE_CLIENT_SECRET || '');
        container.bind<string>(TYPES.GOOGLE_REDIRECT_URI).toConstantValue(process.env.GOOGLE_REDIRECT_URI || '');

        // Google Service binding
        container.bind<IGoogleService>(TYPES.GoogleService).to(GoogleService).inSingletonScope();

        // NREL API Configuration bindings
        container.bind<string>(TYPES.NREL_API_BASE_URL).toConstantValue(process.env.NREL_API_BASE_URL || 'https://developer.nrel.gov');
        container.bind<string>(TYPES.NREL_API_KEY).toConstantValue(process.env.NREL_API_KEY || '');

        // OpenChargeMap API Configuration bindings
        container.bind<string>(TYPES.OPEN_CHARGE_MAP_API_BASE_URL).toConstantValue(process.env.OPEN_CHARGE_MAP_API_BASE_URL || 'https://api.openchargemap.io');
        container.bind<string>(TYPES.OPEN_CHARGE_MAP_API_KEY).toConstantValue(process.env.OPEN_CHARGE_MAP_API_KEY || '');
        
        // Chargetrip API Configuration bindings
        container.bind<string>(TYPES.CHARGETRIP_CLIENT_ID).toConstantValue(process.env.CHARGETRIP_CLIENT_ID || '');
        container.bind<string>(TYPES.CHARGETRIP_APP_ID).toConstantValue(process.env.CHARGETRIP_APP_ID || '');
        
        // TomTom API Configuration bindings
        // container.bind<string>(TYPES.TOMTOM_API_BASE_URL).toConstantValue(process.env.TOMTOM_API_BASE_URL || 'https://api.tomtom.com');
        container.bind<string>(TYPES.TOMTOM_API_KEY).toConstantValue(process.env.TOMTOM_API_KEY || '');

        // NHTSA Vehicle API Configuration binding
        container.bind<string>(TYPES.NHTSA_API_BASE_URL).toConstantValue(process.env.NHTSA_API_BASE_URL || 'https://vpic.nhtsa.dot.gov/api');

        // SmartCar API configuration
        container.bind<string>(TYPES.SMARTCAR_API_BASE_URL).toConstantValue(process.env.SMARTCAR_API_BASE_URL || 'https://api.smartcar.com/v2.0');
        container.bind<string>(TYPES.SMARTCAR_CLIENT_ID).toConstantValue(process.env.SMARTCAR_CLIENT_ID || 'test-client-id');
        container.bind<string>(TYPES.SMARTCAR_CLIENT_SECRET).toConstantValue(process.env.SMARTCAR_CLIENT_SECRET || 'test-client-secret');

        // Stripe configuration
        container.bind<string>(TYPES.STRIPE_SECRET_KEY).toConstantValue(process.env.STRIPE_SECRET_KEY || '');
        container.bind<number>(TYPES.STRIPE_PRE_AUTH_AMOUNT).toConstantValue(Number(process.env.STRIPE_PRE_AUTH_AMOUNT) || 2000);

      
        console.log("All dependencies bound!!")
    }
}
