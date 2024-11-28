import { IRepository } from "../../../Core/Application/Interface/Persistence/Repository/IRepository";
import { TransactionManager } from "./Abstractions/TransactionManager";
import { QueryResult } from 'pg';
import { DatabaseError } from "../../../Core/Application/Error/AppError";
import { TableNames } from "../../../Core/Application/Enums/TableNames";



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
        console.log({tableName})
    }

    /**
     * Executes a database query with parameters
     * @param query SQL query string
     * @param params Query parameters
     * @returns Query result
     * @throws DatabaseError if query execution fails
     */
    protected async executeQuery<R = any>(query: string, params: any[] = []): Promise<QueryResult<QueryResult>> {
        try {
            const client = this.transactionManager.getClient();
            return await client.query(query, params);
        } catch (error: any) {
            throw new DatabaseError(`Query execution failed: ${error.message}`);
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
            
            const columnName = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            columns.push(columnName);
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

    // Abstract methods to be implemented by specific repositories
    abstract findById(id: string): Promise<T | null>;
    abstract findAll(): Promise<T[]>;
    abstract findByCondition(condition: Partial<T>): Promise<T[]>;
    abstract create(entity: T): Promise<T>;
    abstract update(id: string, entity: Partial<T>): Promise<T | null>;
    abstract delete(id: string): Promise<boolean>;
    abstract executeRawQuery(query: string, params: any[]): Promise<any>;
    abstract count(condition?: Partial<T>): Promise<number>;
}