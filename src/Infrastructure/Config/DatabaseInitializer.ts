import { inject, injectable } from 'inversify';
import { TYPES } from '../../Core/Types/Constants';
import { TableNames } from '../../Core/Application/Enums/TableNames';
import { TransactionManager } from '../Repository/SQL/Abstractions/TransactionManager';
import { User } from '../../Core/Application/Entities/User';
import { getEntityMetadata, getIndexMetadata } from '../../extensions/decorators';
import { DatabaseError } from '../../Core/Application/Error/AppError';
import { Verification } from '../../Core/Application/Entities/Verification';
import { Console } from '../Utils/Console';
import { LinkedAccounts } from '../../Core/Application/Entities/LinkedAccounts';

@injectable()
export class DatabaseInitializer {
    constructor(
        @inject(TYPES.TransactionManager) private transactionManager: TransactionManager,
    ) {}

    async initializeTables(): Promise<void> {
        try {
            await this.transactionManager.beginTransaction();
            Console.info("Database initialization started");
    
            const entityTableMap = new Map<
            typeof User 
            | typeof Verification 
            | typeof LinkedAccounts,
            TableNames>([                
                [User, TableNames.USERS],
                [Verification, TableNames.VERIFICATIONS],
                [LinkedAccounts, TableNames.LINKED_ACCOUNTS],
            ]);
    
            const errors: Error[] = [];
            
            for (const [Entity, tableName] of entityTableMap) {
                try {
                    Console.info(`Processing table`, { tableName });
                    const tableExists = await this.checkTableExists(tableName);
                    if (!tableExists) {
                        Console.info(`Table does not exist, creating`, { tableName });
                        await this.createTableIfNotExists(Entity, tableName);
                        // await this.seedDataToDatabase(tableName);
                    } else {
                        Console.info(`Table exists, updating schema`, { tableName });
                        await this.updateTableSchema(Entity, tableName);
                    }
                } catch (error: any) {
                    Console.error(error, { message: `Error processing table`, tableName });
                    errors.push(error);
                }
            }
    
            if (errors.length > 0) {
                Console.error(new Error(`Failed to initialize/update tables`), { errorCount: errors.length, errors: errors.map(e => e.message) });
                throw new DatabaseError(`Failed to initialize/update some tables: ${errors.map(e => e.message).join(', ')}`);
            } else {
                await this.transactionManager.commit();
                Console.info('All database tables initialized/updated successfully');
            }
        } catch (error) {
            await this.transactionManager.rollback();
            Console.error(error as Error, {message: 'Failed to initialize/update database tables:'});
            throw error;
        }
    }

    private async createTableIfNotExists(entity: Function, tableName: string): Promise<void> {
        try {
            const metadata = getEntityMetadata(entity);
            const indexMetaData = getIndexMetadata(entity, tableName);
            Console.info("Entity metadata retrieved", { tableName, columnsCount: metadata.columns.length, constraintsCount: metadata.constraints.length });
            Console.info("Index metadata retrieved", { tableName, indexCount: indexMetaData.length });
            
            // Check if table exists first
            const tableExistsQuery = `
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                );
            `;
            const { rows } = await this.transactionManager.getClient().query(tableExistsQuery, [tableName]);
            
            if (rows[0].exists) {
                Console.info(`Table already exists, skipping creation`, { tableName });
                return;
            }

            await this.dropExistingConstraints(tableName);

            const allDefinitions = [
                ...metadata.columns,
                ...metadata.constraints
            ].join(',\n');

            const query = `
                CREATE TABLE IF NOT EXISTS "${tableName}" (
                    ${allDefinitions}
                );`;
            

            console.log({ query });
            Console.info("Executing table creation query", { tableName });
            await this.transactionManager.getClient().query(query);
            Console.info(`Table initialized successfully`, { tableName });
            
            // Create indexes after table creation
            if (indexMetaData.length > 0) {
                Console.info(`Creating indexes`, { tableName, indexCount: indexMetaData.length });
                for (const indexStatement of indexMetaData) {
                    Console.info(`Executing index statement`, { indexStatement });
                    await this.transactionManager.getClient().query(indexStatement);
                }
                Console.info(`Indexes created successfully`, { tableName, indexCount: indexMetaData.length });
            }
        } catch (error: any) {
            Console.error(error, { message: `Failed to initialize table`, tableName });
            throw new DatabaseError(`Failed to create table ${tableName}: ${error.message}`);
        }
    }

    private async updateTableSchema(entity: Function, tableName: string): Promise<void> {
        try {
            const metadata = getEntityMetadata(entity);
            const indexMetaData = getIndexMetadata(entity, tableName);
            Console.info("Schema update started", { tableName });
            
            // Get current table schema
            const currentSchemaQuery = `
                SELECT 
                    column_name, 
                    data_type,
                    is_nullable,
                    column_default
                FROM information_schema.columns 
                WHERE table_name = $1 AND table_schema = 'public';
            `;
            const { rows: currentColumns } = await this.transactionManager.getClient().query(currentSchemaQuery, [tableName]);
            Console.info("Current schema retrieved", { tableName, columnCount: currentColumns.length });
            
            // Get current indexes
            const currentIndexesQuery = `
                SELECT 
                    i.relname as index_name,
                    a.attname as column_name,
                    ix.indisunique as is_unique
                FROM pg_class t
                JOIN pg_index ix ON t.oid = ix.indrelid
                JOIN pg_class i ON i.oid = ix.indexrelid
                JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
                WHERE t.relname = $1
                AND i.relname NOT LIKE 'pg_%';
            `;
            const { rows: currentIndexes } = await this.transactionManager.getClient().query(currentIndexesQuery, [tableName]);
            Console.info("Current indexes retrieved", { tableName, indexCount: currentIndexes.length });
            
            // Process each column from metadata
            for (const column of metadata.columns) {
                const columnName = column.split(' ')[0].replace(/"/g, '');
                const columnType = column.split(' ').slice(1).join(' ');
                
                // Check if column exists
                const existingColumn = currentColumns.find(c => c.column_name === columnName);
                
                if (!existingColumn) {
                    // Add new column
                    const addColumnQuery = `ALTER TABLE "${tableName}" ADD COLUMN ${column};`;
                    Console.info(`Adding new column`, { tableName, columnName, columnType });
                    await this.transactionManager.getClient().query(addColumnQuery);
                    Console.info(`Column added successfully`, { tableName, columnName });
                }
                // Note: We're not modifying existing columns to avoid data loss
            }
            
            // Create or update indexes
            if (indexMetaData.length > 0) {
                Console.info(`Updating indexes`, { tableName, indexCount: indexMetaData.length });
                for (const indexStatement of indexMetaData) {
                    Console.info(`Executing index statement`, { indexStatement });
                    await this.transactionManager.getClient().query(indexStatement);
                }
                Console.info(`Indexes updated successfully`, { tableName });
            }
            
            Console.info(`Schema update completed`, { tableName });
        } catch (error: any) {
            Console.error(error, { message: `Failed to update schema`, tableName });
            throw new DatabaseError(`Failed to update schema for ${tableName}: ${error.message}`);
        }
    }

    private async dropExistingConstraints(tableName: string): Promise<void> {
        try {
            // Get all constraints for the table
            const constraintsQuery = `
                SELECT conname, contype
                FROM pg_constraint
                JOIN pg_namespace ON pg_constraint.connamespace = pg_namespace.oid
                JOIN pg_class ON pg_constraint.conrelid = pg_class.oid
                WHERE relname = $1 AND nspname = 'public';
            `;
            
            const { rows: constraints } = await this.transactionManager.getClient()
                .query(constraintsQuery, [tableName]);

            // Drop each constraint
            for (const constraint of constraints) {
                const dropQuery = `
                    ALTER TABLE "${tableName}"
                    DROP CONSTRAINT IF EXISTS "${constraint.conname}" CASCADE;
                `;
                await this.transactionManager.getClient().query(dropQuery);
                console.log(`Dropped constraint ${constraint.conname} from ${tableName}`);
            }
        } catch (error: any) {
            console.error(`Failed to drop constraints for ${tableName}:`, error);
            throw new DatabaseError(`Failed to drop constraints: ${error.message}`);
        }
    }

   

    private async checkTableExists(tableName: string): Promise<boolean> {
        try {
            Console.info(`Checking if table exists`, { tableName });
            const query = `
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                );
            `;
            const { rows } = await this.transactionManager.getClient().query(query, [tableName]);
            const exists = rows[0].exists;
            Console.info(`Table existence check result`, { tableName, exists });
            return exists;
        } catch (error: any) {
            Console.error(error, { message: `Failed to check if table exists`, tableName });
            throw new DatabaseError(`Failed to check if table ${tableName} exists: ${error.message}`);
        }
    }
}