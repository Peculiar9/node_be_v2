import { Container } from 'inversify';
import { TYPES } from './Types/Constants';
import { UserRepository } from '../Infrastructure/Repository/SQL/users/UserRepository';
import { TransactionManager } from '../Infrastructure/Repository/SQL/Abstractions/TransactionManager';
import { ConnectionPoolManager } from '../Infrastructure/Repository/SQL/Abstractions/ConnectionPoolManager';
import { AuthService } from '../Infrastructure/Services/AuthService';
import { AccountUseCase } from './Application/UseCases/AccountUseCase';
import { IAccountUseCase } from './Application/Interface/UseCases/IAccountUseCase';
import { IAuthService } from './Application/Interface/Services/IAuthService';
import { AuthMiddleware } from '../Middleware/AuthMiddleware';
import { getDatabaseConfig } from '../Infrastructure/Database/DatabaseConfig';
import { PoolOptions } from 'pg';
import { UserService } from '../Infrastructure/Services/UserService';
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
        const connectionString = this.buildConnectionString(config);
        // Create PoolOptions
        const poolOptions: PoolOptions = {
            ...config,
            connectionString: connectionString as string,
        } as any;

        // Infrastructure layer
        //this singleton instance is scoped to the request and is used through out the app lifecycle
        container.bind<ConnectionPoolManager>(TYPES.ConnectionPoolManager)
            .toDynamicValue(() => new ConnectionPoolManager(poolOptions as any))
            .inSingletonScope();

        // TransactionManager binding
        container.bind<TransactionManager>(TYPES.TransactionManager)
            .toDynamicValue((context) => {
                const poolManager = context.container.get<ConnectionPoolManager>(TYPES.ConnectionPoolManager);
                return new TransactionManager(poolManager);
            }).inRequestScope();

        // UserRepository binding with TYPES symbol
        container.bind<UserRepository>(TYPES.UserRepository).to(UserRepository).inRequestScope();

        // Service layer binding with TYPES symbol
        container.bind<IAuthService>(TYPES.AuthService).to(AuthService).inRequestScope();

        // Middleware layer binding
        container.bind<AuthMiddleware>(TYPES.AuthMiddleware).to(AuthMiddleware).inRequestScope();

        // Use case layer binding
        container.bind<IAccountUseCase>(TYPES.AccountUseCase).to(AccountUseCase).inRequestScope();

        container.bind<UserService>(TYPES.UserService).to(UserService).inRequestScope();
        console.log("All dependencies bound!!")
    }

    private static buildConnectionString(config: any): string {
        const { user, password, host, port, database, ssl } = config;
        let connectionString = `postgresql://${user}:${password}@${host}:${port}/${database}`;
        if (ssl) {
            connectionString += '?sslmode=require';
        }

        return connectionString;
    }

}
