import { inject, injectable } from 'inversify';
import { BaseRepository } from '../BaseRepository';
import { TransactionManager } from '../Abstractions/TransactionManager';
import { IUser } from '../../../../Core/Application/Interface/Entities/auth-and-user/IUser';
import { TableNames } from '../../../../Core/Application/Enums/TableNames';
import { TYPES } from '../../../../Core/Types/Constants';
import { getEntityMetadata } from '../../../../extensions/decorators';
import { InternalServerError } from '../../../../Core/Application/Error/AppError';

@injectable()
export class UserRepository extends BaseRepository<IUser> {
    constructor(
        @inject(TYPES.TransactionManager) transactionManager: TransactionManager
    ) {
        super(transactionManager, TableNames.USERS);
    }

    // async findById(id: number): Promise<IUser | null> {
    async findById(id: string): Promise<any> {
        try{

            const result = await this.executeQuery<IUser>(
                `SELECT * FROM ${this.tableName} WHERE id = $1`,
                [id]
            );
            return result.rows[0] || null;
        }catch(error: any){
            console.error('UserRepository::findById(): ', {
                message: error.message,
                stack: error.stack
            });
        }
    }

    // async findAll(): Promise<IUser[]> {
    async findAll(): Promise<any> {
        const result = await this.executeQuery<IUser>(
            `SELECT * FROM ${this.tableName} ORDER BY created_at DESC`
        );
        return result.rows;
    }

    // async create(entity: IUser): Promise<IUser> {
    async create(entity: IUser): Promise<any> {
        try{

            const { columns, values, placeholders } = this.getEntityColumns(entity);
            
            const query = `INSERT INTO ${this.tableName} (${columns.join(', ')})
            VALUES (${placeholders.join(', ')})
            RETURNING *
            `;
            
            console.log({query});
            console.log({values});
            const result = await this.executeQuery<IUser>(query, values);
            return result.rows[0];
        }catch(error: any){
            console.error('UserRepository::create(): ', {
                message: error.message,
                stack: error.stack
            });
        }
    }

    // async findByCondition(condition: Partial<IUser>): Promise<IUser[]> {
    async findByCondition(condition: Partial<IUser>): Promise<any> {
        const { whereClause, values } = this.buildWhereClause(condition);
        const result = await this.executeQuery<IUser>(
            `SELECT * FROM ${this.tableName} ${whereClause}`,
            values
        );
        return result.rows;
    }

    // async update(id: number, entity: Partial<IUser>): Promise<IUser | null> {
    async update(id: string, entity: Partial<IUser>): Promise<any> {
        // Add updated_at to the entity
        entity.updated_at = new Date().toISOString();

        const { setClause, values } = this.buildUpdateSet(entity);
        const result = await this.executeQuery<IUser>(
            `UPDATE ${this.tableName} 
            SET ${setClause} 
            WHERE id = $${values.length + 1}
            RETURNING *`,
            [...values, id]
        );
        return result.rows[0] || null;
    }

    // async delete(id: number): Promise<boolean> {
    async delete(id: string): Promise<boolean> {
        const result = await this.executeQuery(
            `DELETE FROM ${this.tableName} WHERE id = $1`,
            [id]
        );
        return result.rowCount as number > 0;
    }

    // async executeRawQuery(query: string, params: any[]): Promise<any> {
    async executeRawQuery(query: string, params: any[]): Promise<any> {
        const result = await this.executeQuery(query, params);
        return result.rows;
    }

    // async count(condition?: Partial<IUser>): Promise<number> {
    async count(condition?: Partial<IUser>): Promise<number> {
        if (condition) {
            const { whereClause, values } = this.buildWhereClause(condition);
            const result = await this.executeQuery<{ count: string }>(
                `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`,
                values
            );
            return parseInt((result.rows[0] as any).count);
        }

        const result = await this.executeQuery<{ count: string }>(
            `SELECT COUNT(*) as count FROM ${this.tableName}`
        );
        return parseInt((result.rows[0] as any).count);
    }

    // async findByEmail(email: string): Promise<IUser | null> {
    async findByEmail(email: string): Promise<IUser | null> {
        const query = `SELECT * FROM ${this.tableName} WHERE email = $1`;
        console.log({query})
        const result = await this.executeQuery<IUser>(
            query,
            [email.toLowerCase()]
        );
        console.log({result})
        return result.rows[0] as any || null;
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

  
    
}