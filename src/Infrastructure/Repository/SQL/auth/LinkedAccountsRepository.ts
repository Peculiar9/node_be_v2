import { inject, injectable } from 'inversify';
import { BaseRepository } from '../BaseRepository';
import { TransactionManager } from '../Abstractions/TransactionManager';
import { TYPES } from '../../../../Core/Types/Constants';
import { TableNames } from '../../../../Core/Application/Enums/TableNames';
import { ILinkedAccounts } from '../../../../Core/Application/Interface/Entities/auth-and-user/ILinkedAcounts';
import { DatabaseError } from '../../../../Core/Application/Error/AppError';
import { IRepository } from '../../../../Core/Application/Interface/Persistence/Repository/IRepository';
import { AuthMethod, OAuthProvider } from '../../../../Core/Application/Interface/Entities/auth-and-user/IUser';
import { QueryResult, QueryResultRow } from 'pg';

export interface LinkedAccountsRow extends ILinkedAccounts, QueryResultRow {}

@injectable()
export class LinkedAccountsRepository extends BaseRepository<ILinkedAccounts> implements IRepository<ILinkedAccounts> {
    constructor(
        @inject(TYPES.TransactionManager) protected transactionManager: TransactionManager,
    ) {
        super(transactionManager, TableNames.LINKED_ACCOUNTS);
    }

    protected async executeQuery<T extends QueryResultRow>(query: string, params: any[] = []): Promise<QueryResult<T>> {
        try {
            const client = this.transactionManager.getClient();
            return await client.query<T>(query, params);
        } catch (error: any) {
            throw new DatabaseError(`Query execution failed: ${error.message}`);
        }
    }

    async findById(id: string): Promise<ILinkedAccounts | null> {
        try {
            const result = await this.executeQuery<LinkedAccountsRow>(
                `SELECT * FROM ${this.tableName} WHERE _id = $1`,
                [id]
            );
            return result.rows[0] || null;
        } catch (error: any) {
            throw new DatabaseError(`Failed to find linked account by ID: ${error.message}`);
        }
    }

    async findAll(): Promise<ILinkedAccounts[]> {
        try {
            const result = await this.executeQuery<LinkedAccountsRow>(`SELECT * FROM ${this.tableName}`);
            return result.rows;
        } catch (error: any) {
            throw new DatabaseError(`Failed to find all linked accounts: ${error.message}`);
        }
    }

    async findByUserId(userId: string): Promise<ILinkedAccounts[]> {
        try {
            const result = await this.executeQuery<LinkedAccountsRow>(
                `SELECT * FROM ${this.tableName} WHERE user_id = $1`,
                [userId]
            );
            return result.rows;
        } catch (error: any) {
            throw new DatabaseError(`Failed to find linked accounts by user ID: ${error.message}`);
        }
    }

    async findByOAuth(provider: OAuthProvider, oauthId: string): Promise<ILinkedAccounts | null> {
        try {
            const result = await this.executeQuery<LinkedAccountsRow>(
                `SELECT * FROM ${this.tableName} 
                WHERE oauth_provider = $1 
                AND oauth_id = $2 
                AND auth_method = $3`,
                [provider, oauthId, AuthMethod.OAUTH]
            );
            return result.rows[0] || null;
        } catch (error: any) {
            throw new DatabaseError(`Failed to find linked account by OAuth details: ${error.message}`);
        }
    }

    async findByEmail(email: string): Promise<ILinkedAccounts | null> {
        try {
            const result = await this.executeQuery<LinkedAccountsRow>(
                `SELECT * FROM ${this.tableName} WHERE email = $1`,
                [email]
            );
            return result.rows[0] || null;
        } catch (error: any) {
            throw new DatabaseError(`Failed to find linked account by email: ${error.message}`);
        }
    }

    async findByCondition(condition: Partial<ILinkedAccounts>): Promise<ILinkedAccounts[]> {
        try {
            // Special case for the common user_id + auth_method lookup
            if (condition.user_id && condition.auth_method) {
                const query = `SELECT * FROM ${this.tableName} WHERE user_id = $1 AND auth_method = $2`;
                const values = [condition.user_id, condition.auth_method];
                const result = await this.executeQuery<LinkedAccountsRow>(query, values);
                return result.rows.map(row => row as unknown as ILinkedAccounts);
            }
            
            // Default case using buildWhereClause for other conditions
            const { whereClause, values } = this.buildWhereClause(condition);
            const query = `SELECT * FROM ${this.tableName} ${whereClause}`;
            const result = await this.executeQuery<LinkedAccountsRow>(query, values);
            return result.rows.map(row => row as unknown as ILinkedAccounts);
        } catch (error: any) {
            throw new DatabaseError(`Failed to fetch linked accounts by condition: ${error.message}`);
        }
    }

    async create(linkedAccount: ILinkedAccounts): Promise<ILinkedAccounts> {
        try {
            const { columns, values, placeholders } = this.getEntityColumns(linkedAccount);
            const query = `
                INSERT INTO ${this.tableName} (${columns.join(', ')})
                VALUES (${placeholders.join(', ')})
                RETURNING *`;
            const result = await this.executeQuery<LinkedAccountsRow>(query, values);
            return result.rows[0];
        } catch (error: any) {
            throw new DatabaseError(`Failed to create linked account: ${error.message}`);
        }
    }

    async update(id: string, linkedAccount: Partial<ILinkedAccounts>): Promise<ILinkedAccounts | null> {
        try {
            const { setClause, values } = this.buildUpdateSet(linkedAccount);
            if (!setClause) return null;

            const query = `
                UPDATE ${this.tableName} 
                SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
                WHERE _id = $${values.length + 1} 
                RETURNING *`;

            const result = await this.executeQuery<LinkedAccountsRow>(query, [...values, id]);
            return result.rows[0] || null;
        } catch (error: any) {
            throw new DatabaseError(`Failed to update linked account: ${error.message}`);
        }
    }

    async delete(id: string): Promise<boolean> {
        try {
            const result = await this.executeQuery(
                `DELETE FROM ${this.tableName} WHERE _id = $1`,
                [id]
            );
            return (result.rowCount ?? 0) > 0;
        } catch (error: any) {
            throw new DatabaseError(`Failed to delete linked account: ${error.message}`);
        }
    }

    async bulkCreate(entities: ILinkedAccounts[]): Promise<ILinkedAccounts[]> {
        try {
            if (entities.length === 0) return [];

            const { columns, values, valuesClause } = this.buildBulkInsertClause(entities);
            const query = `
                INSERT INTO ${this.tableName} (${columns.join(', ')})
                VALUES ${valuesClause}
                RETURNING *`;

            const result = await this.executeQuery<LinkedAccountsRow>(query, values);
            return result.rows;
        } catch (error: any) {
            throw new DatabaseError(`Failed to bulk create linked accounts: ${error.message}`);
        }
    }

    async bulkUpdate(updates: Partial<ILinkedAccounts>[]): Promise<ILinkedAccounts[]> {
        try {
            if (updates.length === 0) return [];

            const { updateClause, values } = this.buildBulkUpdateClause(updates);
            if (!updateClause) return [];

            const query = `
                UPDATE ${this.tableName} 
                SET ${updateClause}
                WHERE _id = ANY($${values.length + 1})
                RETURNING *`;

            const ids = updates
                .map(e => e._id)
                .filter((id): id is string => id !== undefined);

            if (ids.length === 0) return [];

            const result = await this.executeQuery<LinkedAccountsRow>(query, [...values, ids]);
            return result.rows;
        } catch (error: any) {
            throw new DatabaseError(`Failed to bulk update linked accounts: ${error.message}`);
        }
    }

    async bulkDelete(ids: string[]): Promise<number> {
        try {
            const result = await this.executeQuery(
                `DELETE FROM ${this.tableName} WHERE _id = ANY($1)`,
                [ids]
            );
            return result.rowCount ?? 0;
        } catch (error: any) {
            throw new DatabaseError(`Failed to bulk delete linked accounts: ${error.message}`);
        }
    }

    async count(condition?: Partial<ILinkedAccounts>): Promise<number> {
        try {
            let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
            const values: any[] = [];
            
            if (condition) {
                const { whereClause, values: conditionValues } = this.buildWhereClause(condition);
                query += ` ${whereClause}`;
                values.push(...conditionValues);
            }
            
            const result = await this.executeQuery<{ count: string }>(query, values);
            return parseInt(result.rows[0].count, 10);
        } catch (error: any) {
            throw new DatabaseError(`Failed to count linked accounts: ${error.message}`);
        }
    }

    async executeRawQuery<T extends QueryResultRow>(query: string, values: any[] = []): Promise<QueryResult<T>> {
        try {
            return await this.executeQuery<T>(query, values);
        } catch (error: any) {
            throw new DatabaseError(`Failed to execute raw query: ${error.message}`);
        }
    }
}
