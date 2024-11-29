import { injectable } from 'inversify';
import { ConnectionPoolManager } from '../Repository/SQL/Abstractions/ConnectionPoolManager';
import { getDatabaseConfig } from './DatabaseConfig';
import { DatabaseError } from '../../Core/Application/Error/AppError';

@injectable()
export class DatabaseService {
    private static poolManager: ConnectionPoolManager;

    static async initialize(): Promise<void> {
        try {
            const config = getDatabaseConfig();
            console.log("Connection Pool manager before initialization: ", this.poolManager);
            console.log({config});
            this.poolManager = ConnectionPoolManager.getInstance({
                ...config,
                connectionString: this.buildConnectionString(config) as string
            });
            console.log("Connection Pool manager after initialization: ", this.poolManager);

            // Test connection
            const client = await this.poolManager.getConnection();
            await client.query('SELECT NOW()');
            await this.poolManager.releaseConnection(client);
            
            console.log('Database connection established successfully');
        } catch (error: any) {
            throw new DatabaseError(`Failed to initialize database: ${error.message}`);
        }
    }

    static async shutdown(): Promise<void> {
        if (this.poolManager) {
            await this.poolManager.dispose();
            console.log('Database connections closed');
        }
    }

    private static buildConnectionString(config: any): string {
        const { user, password, host, port, database, ssl } = config;
        let connectionString = `postgresql://${user}:${password}@${host}:${port}/${database}`;
        console.log({connectionString});
        if (ssl) {
            connectionString += '?sslmode=require';
        }
        
        return connectionString;
    }
}