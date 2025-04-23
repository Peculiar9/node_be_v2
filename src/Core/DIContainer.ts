import { Container } from 'inversify';
import { TYPES } from './Types/Constants';
import { UserRepository } from '../Infrastructure/Repository/SQL/users/UserRepository';
import { TransactionManager } from '../Infrastructure/Repository/SQL/Abstractions/TransactionManager';
import { ConnectionPoolManager } from '../Infrastructure/Repository/SQL/Abstractions/ConnectionPoolManager';
import { AuthService } from '../Infrastructure/Services/AuthService';
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
import { GoogleService } from '../Infrastructure/Services/external-api-services/GoogleService';
import { IGoogleService } from '../Core/Application/Interface/Services/IGoogleService';
import { IEmailService } from './Application/Interface/Services/IEmailService';
import { EmailService } from '../Infrastructure/Services/EmailService';
import { LinkedAccountsRepository } from '../Infrastructure/Repository/SQL/auth/LinkedAccountsRepository';

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


        // Load database config
        const config = getDatabaseConfig();
        console.log("Got here!!! -> ", {config});
        const connectionString = config.connectionString;
        console.log("Got here!!! -> ", {connectionString});
        // Create PoolOptions
        const poolOptions: PoolOptions = {
            user: config.user,
            password: config.password,
            host: config.host,
            port: config.port,
            database: config.database,
            max: config.max,
            connectionString: connectionString,
            idleTimeoutMillis: config.idleTimeoutMillis,
            connectionTimeoutMillis: config.connectionTimeoutMillis,
            ssl: config.ssl,
            maxUses: 7500,
            allowExitOnIdle: true,
            maxLifetimeSeconds: 3600
        };

        // Infrastructure layer
        //this singleton instance is scoped to the request and is used through out the app lifecycle
        container.bind<ConnectionPoolManager>(TYPES.ConnectionPoolManager)
            .toDynamicValue(() => new ConnectionPoolManager(poolOptions))
            .inSingletonScope();

        // TransactionManager binding
        container.bind<TransactionManager>(TYPES.TransactionManager)
            .toDynamicValue((context) => {
                const poolManager = context.container.get<ConnectionPoolManager>(TYPES.ConnectionPoolManager);
                return new TransactionManager(poolManager);
            }).inRequestScope();

        container.bind<DatabaseInitializer>(TYPES.DatabaseInitializer).to(DatabaseInitializer).inRequestScope();    
        
        // Repository bindings
        container.bind<UserRepository>(TYPES.UserRepository).to(UserRepository).inRequestScope();
        container.bind<VerificationRepository>(TYPES.VerificationRepository).to(VerificationRepository).inRequestScope();
        container.bind<LinkedAccountsRepository>(TYPES.LinkedAccountsRepository).to(LinkedAccountsRepository).inRequestScope();

        // Middleware layer binding
        container.bind<AuthMiddleware>(TYPES.AuthMiddleware).to(AuthMiddleware).inRequestScope();

        // Use case layer binding
        container.bind<IAccountUseCase>(TYPES.AccountUseCase).to(AccountUseCase).inRequestScope();
      
        // Service layer binding
        container.bind<UserService>(TYPES.UserService).to(UserService).inRequestScope();
        container.bind<SMSService>(TYPES.SMSService)
            .to(SMSService)
            .inRequestScope();
        container.bind<OTPService>(TYPES.OTPService)
            .to(OTPService)
            .inRequestScope();
        container.bind<IAuthService>(TYPES.AuthService)
            .to(AuthService)
            .inRequestScope();
        container.bind<IAWSHelper>(TYPES.AWSHelper).to(AWSHelper).inRequestScope();
        container.bind<IEmailService>(TYPES.EmailService).to(EmailService).inRequestScope();
        
        // Google OAuth Configuration bindings
        container.bind<string>(TYPES.GOOGLE_CLIENT_ID)
            .toConstantValue(process.env.GOOGLE_CLIENT_ID || '');
        
        container.bind<string>(TYPES.GOOGLE_CLIENT_SECRET)
            .toConstantValue(process.env.GOOGLE_CLIENT_SECRET || '');
        
        container.bind<string>(TYPES.GOOGLE_REDIRECT_URI)
            .toConstantValue(process.env.GOOGLE_REDIRECT_URI || '');

        // Google Service binding
        container.bind<IGoogleService>(TYPES.GoogleService)
            .to(GoogleService)
            .inSingletonScope();

        container.bind<HttpClientFactory>(TYPES.HttpClientFactory)
            .to(HttpClientFactory)
            .inSingletonScope();

        console.log("All dependencies bound!!")
    }
}
