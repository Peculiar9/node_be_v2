import { Container, injectable } from 'inversify';
import { ConnectionPoolManager } from 'peculiar-orm';
import { DatabaseError } from '@Core/Application/Error/AppError';
import { TYPES } from '@Core/Types/Constants';
import { DatabaseInitializer } from '../Config/DatabaseInitializer';
import { Console } from '../Utils/Console';

@injectable()
export class DatabaseService {
    static async initialize(container: Container): Promise<void> {
        try {
            // Get the pool manager from the container
            // DIContainer has already configured this with proper database config
            const poolManager = container.get<ConnectionPoolManager>(TYPES.ConnectionPoolManager);
            
            // Test connection
            const client = await poolManager.getConnection();
            await client.query('SELECT NOW()');
            await poolManager.releaseConnection(client);

            // Initialize tables
            const databaseInitializer = container.get<DatabaseInitializer>(TYPES.DatabaseInitializer);
            await databaseInitializer.initializeTables();
            
        } catch (error: any) {
            Console.error(error, { 
                message: 'Database initialization error:', 
                context: 'DatabaseService.initialize',
                error: error instanceof Error ? error.stack : String(error)
            });
            throw new DatabaseError(`Failed to initialize database: ${error.message}`);
        }
    }

    static async shutdown(container: Container): Promise<void> {
        try {
            Console.info('Starting database shutdown...', {
                context: 'DatabaseService.shutdown'
            });

            const poolManager = container.get<ConnectionPoolManager>(TYPES.ConnectionPoolManager);

            // Get current pool metrics before shutdown
            const metrics = poolManager.getMetricsSummary();
            Console.info('Pool metrics before shutdown:', {
                context: 'DatabaseService.shutdown',
                activeConnections: metrics.activeLeasedConnections,
                totalConnections: metrics.totalConnectionsCreated
            });

            // Wait up to 10 seconds for active connections to finish
            const maxWaitTime = 10000;
            const startTime = Date.now();
            
            while (metrics.activeLeasedConnections > 0 && (Date.now() - startTime) < maxWaitTime) {
                await new Promise(resolve => setTimeout(resolve, 500));
                const updatedMetrics = poolManager.getMetricsSummary();
                if (updatedMetrics.activeLeasedConnections !== metrics.activeLeasedConnections) {
                    Console.info('Active connections changed during shutdown:', {
                        context: 'DatabaseService.shutdown',
                        activeConnections: updatedMetrics.activeLeasedConnections
                    });
                }
            }

            // Final dispose of the pool
            await poolManager.dispose();
            
            Console.info('Database connections closed successfully', {
                context: 'DatabaseService.shutdown',
                shutdownDurationMs: Date.now() - startTime  
            });
        } catch (error: any) {
            Console.error(error, {
                context: 'DatabaseService.shutdown',
                message: 'Error during database shutdown'
            });
            throw error;
        }
    }
}