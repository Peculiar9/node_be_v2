import { IRepository } from "../../../Core/Application/Interface/Persistence/Repository/IRepository";
import { TransactionManager } from "./Abstractions/TransactionManager";
import { QueryResult } from 'pg';
import { DatabaseError, InternalServerError } from "../../../Core/Application/Error/AppError";
import { TableNames } from "../../../Core/Application/Enums/TableNames";
import { getEntityMetadata } from "../../../extensions/decorators";
import { UtilityService } from "../../../Core/Services/UtilityService";
import { Console, LogLevel } from "../../Utils/Console";
import { DatabaseConnectionError, DatabaseConstraintError, DatabaseQueryError } from "../../../Core/Application/Error/DatabaseErrors";



/**
 * Base repository class implementing common database operations
 * @template T The entity type this repository manages
 */
export abstract class BaseRepository<T> implements IRepository<T> {
    protected readonly tableName: string;
    protected transactionManager: TransactionManager;

    /**
     * Creates a new repository instance
     * @param transactionManager Transaction manager for handling database transactions
     * @param tableName The name of the database table this repository manages
     */
    constructor(transactionManager: TransactionManager, tableName: TableNames) {
        this.transactionManager = transactionManager;
        this.tableName = tableName;
    }

    /**
     * Executes a database query with parameters
     * @param query SQL query string
     * @param params Query parameters
     * @returns Query result
     * @throws DatabaseError if query execution fails
     */
    protected async executeQuery<R = any>(query: string, params: any[] = []): Promise<QueryResult<QueryResult>> {
        const startTime = Date.now();
        try {
            const client = this.transactionManager.getClient();
            const result = await client.query(query, params);
            
            // Log successful query execution with timing
            Console.info('Query executed successfully', {
                operation: 'query',
                table: this.tableName,
                duration: Date.now() - startTime,
                rowCount: result.rowCount,
                transactionId: this.transactionManager.getTransactionId()
            });
            
            return result;
        } catch (error: any) {
            // Log detailed error information
            Console.error(error, {
                operation: 'query',
                table: this.tableName,
                query: query.replace(/\s+/g, ' ').trim(),
                params,
                duration: Date.now() - startTime,
                transactionId: this.transactionManager.getTransactionId(),
                errorCode: error.code,
                detail: error.detail,
                hint: error.hint,
                position: error.position
            });

            // Map database errors to specific error types
            switch (error.code) {
                case '23505': // unique_violation
                    throw new DatabaseConstraintError('Unique constraint violation', error.constraint);
                case '23503': // foreign_key_violation
                    throw new DatabaseConstraintError('Foreign key constraint violation', error.constraint);
                case '23502': // not_null_violation
                    throw new DatabaseConstraintError('Not null constraint violation', error.constraint);
                case '42P01': // undefined_table
                case '42703': // undefined_column
                    throw new DatabaseQueryError('Invalid query structure', query, params);
                case '08006': // connection_failure
                case '08001': // sqlclient_unable_to_establish_sqlconnection
                    throw new DatabaseConnectionError(error.message, { code: error.code });
                default:
                    // For unknown database errors, log but don't expose details
                    throw new InternalServerError('An unexpected database error occurred');
            }
        }
    }

    /**
     * Extracts column information from an entity for database operations
     * @param entity Partial entity object
     * @returns Object containing columns, values, and SQL placeholders
     */
    protected getEntityColumns(entity: Partial<T>): {
        columns: string[];
        values: any[];
        placeholders: string[];
    } {
        const columns: string[] = [];
        const values: any[] = [];
        const placeholders: string[] = [];
        let parameterIndex = 1;

        for (const [key, value] of Object.entries(entity)) {
            if (value === undefined) continue;
            
            // const columnName = UtilityService.toSnakeCase(key);
            columns.push(key);
            values.push(value);
            placeholders.push(`$${parameterIndex}`);
            parameterIndex++;
        }

        

        return { columns, values, placeholders };
    }

    /**
     * Builds a WHERE clause from a predicate object
     * @param predicate Conditions for the WHERE clause
     * @returns Object containing the WHERE clause and parameter values
     */
    protected buildWhereClause(predicate: Partial<T>): { 
        whereClause: string; 
        values: any[] 
    } {
        const conditions: string[] = [];
        const values: any[] = [];
        let parameterIndex = 1;

        for (const [key, value] of Object.entries(predicate)) {
            conditions.push(`${key} = $${parameterIndex}`);
            values.push(value);
            parameterIndex++;
        }

        return {
            whereClause: conditions.length > 0 
                ? `WHERE ${conditions.join(' AND ')}` 
                : '',
            values
        };
    }

    /**
     * Builds SET clause for UPDATE operations
     * @param entity Entity with fields to update
     * @returns Object containing the SET clause and parameter values
     */
    protected buildUpdateSet(entity: Partial<T>): {
        setClause: string;
        values: any[];
    } {
        const updates: string[] = [];
        const values: any[] = [];
        let parameterIndex = 1;

        for (const [key, value] of Object.entries(entity)) {
            if (key !== 'id' && value !== undefined) {
                updates.push(`${key} = $${parameterIndex}`);
                values.push(value);
                parameterIndex++;
            }
        }

        return {
            setClause: updates.join(', '),
            values
        };
    }

    /**
     * Builds VALUES clause for bulk insert operations
     * @param entities Array of entities to insert
     * @returns Object containing the VALUES clause, flattened values array, and column names
     */
    protected buildBulkInsertClause(entities: T[]): {
        valuesClause: string;
        values: any[];
        columns: string[];
    } {
        if (entities.length === 0) {
            return { valuesClause: '', values: [], columns: [] };
        }

        const firstEntity = entities[0];
        const { columns } = this.getEntityColumns(firstEntity);
        const values: any[] = [];
        const valueSets: string[] = [];
        
        entities.forEach((entity, entityIndex) => {
            const entityValues: any[] = [];
            columns.forEach(column => {
                const value = (entity as any)[column];
                entityValues.push(value);
                values.push(value);
            });
            
            const placeholders = entityValues
                .map((_, i) => `$${entityIndex * columns.length + i + 1}`)
                .join(', ');
            valueSets.push(`(${placeholders})`);
        });

        return {
            valuesClause: valueSets.join(', '),
            values,
            columns
        };
    }

    /**
     * Builds bulk update query parts
     * @param entities Array of entities with their IDs and update data
     * @returns Object containing the update query parts and values
     */
    protected buildBulkUpdateClause(entities: Partial<T>[]): {
        updateClause: string;
        values: any[];
    } {
        const values: any[] = [];
        const cases: string[] = [];
        let parameterIndex = 1;

        // Assuming each entity has an 'id' field
        const updateFields = Object.keys(entities[0])
            .filter(key => key !== 'id');

        updateFields.forEach(field => {
            const caseStatements: string[] = [];
            
            entities.forEach(entity => {
                if ((entity as any)._id !== undefined && entity[field as keyof T] !== undefined) {
                    caseStatements.push(`WHEN _id = $${parameterIndex} THEN $${parameterIndex + 1}`);
                    values.push((entity as any)._id, entity[field as keyof T]);
                    parameterIndex += 2;
                }
            });

            if (caseStatements.length > 0) {
                cases.push(`${field} = (CASE ${caseStatements.join(' ')} ELSE ${field} END)`);
            }
        });

        return {
            updateClause: cases.join(', '),
            values
        };
    }

    /**
     * Builds WHERE IN clause for bulk operations
     * @param ids Array of IDs
     * @param startIndex Starting index for parameters
     * @returns Object containing the WHERE clause and values
     */
    protected buildWhereInClause(ids: string[], startIndex: number = 1): {
        whereClause: string;
        values: any[];
    } {
        const placeholders = ids.map((_, index) => `$${startIndex + index}`).join(', ');
        return {
            whereClause: `WHERE id IN (${placeholders})`,
            values: ids
        };
    }

    async ensureTableExists(entity: Function, tableName: string): Promise<void> {
        try {
            // Attempt to get metadata
            const columns = getEntityMetadata(entity);
            
            // Fallback if no metadata found
            if (!columns || Object.keys(columns).length === 0) {
                console.error('No column metadata found for entity');
                throw new Error('Unable to extract table schema');
            }
    
            // Convert metadata to column definitions
            const columnDefinitions = Object.entries(columns)
                .map(([name, type]) => `"${name}" ${type}`)
                .join(',\n    ');
    
            const query = `
                CREATE TABLE IF NOT EXISTS "${tableName}" (
                    ${columnDefinitions}
                );
            `;
    
            console.log('Generated Table Creation Query:', query);
    
            // Execute the query
            const result = await this.executeQuery(query);
            console.log('Table Creation Result:', result);
        } catch (error: any) {
            console.error('Table Creation Error:', {
                message: error.message,
                stack: error.stack
            });
            throw new InternalServerError(`Failed to create table ${tableName}: ${error.message}`);
        }
    }

    // Abstract methods to be implemented by specific repositories
    abstract findById(id: string): Promise<T | null>;
    abstract findAll(): Promise<T[]>;
    abstract findByCondition(condition: Partial<T>): Promise<T[]>;
    abstract create(entity: T): Promise<T>;
    abstract update(id: string, entity: Partial<T>): Promise<T | null>;
    abstract delete(id: string): Promise<boolean>;
    abstract executeRawQuery(query: string, params: any[]): Promise<any>;
    abstract count(condition?: Partial<T>): Promise<number>;
    abstract bulkCreate(entities: T[]): Promise<T[]>;
    abstract bulkUpdate(entities: Partial<T>[]): Promise<T[]>;
    abstract bulkDelete(ids: string[]): Promise<number>;
}