import { Container, injectable } from 'inversify';
import { ConnectionPoolManager } from '../Repository/SQL/Abstractions/ConnectionPoolManager';
import { getDatabaseConfig } from './DatabaseConfig';
import { DatabaseError } from '../../Core/Application/Error/AppError';
import { TYPES } from '../../Core/Types/Constants';

@injectable()
export class DatabaseService {

    static async initialize(container: Container): Promise<void> {
        try {
            const poolManager = container.get<ConnectionPoolManager>(TYPES.ConnectionPoolManager);

            // Test connection
            const client = await poolManager.getConnection();
            await client.query('SELECT NOW()');
            await poolManager.releaseConnection(client);
            
            console.log('Database connection established successfully');
        } catch (error: any) {
            throw new DatabaseError(`Failed to initialize database: ${error.message}`);
        }
    }

    static async shutdown(container: Container): Promise<void> {
        try {
          const poolManager = container.get<ConnectionPoolManager>(TYPES.ConnectionPoolManager);
          await poolManager.dispose();
          console.log('Database connections closed');
        } catch (error: any) {
          console.error('Error during shutdown:', error);
        }
      }
}