import { inject, injectable } from 'inversify';
import { BaseRepository } from '../BaseRepository';
import { TransactionManager } from '../Abstractions/TransactionManager';
import { IUser } from '../../../../Core/Application/Interface/Entities/auth-and-user/IUser';
import { TableNames } from '../../../../Core/Application/Enums/TableNames';
import { TYPES } from '../../../../Core/Types/Constants';

@injectable()
export class UserRepository extends BaseRepository<IUser> {
    constructor(
        @inject(TYPES.TransactionManager) transactionManager: TransactionManager
    ) {
        super(transactionManager, TableNames.USERS);
    }

    // async findById(id: number): Promise<IUser | null> {
    async findById(id: string): Promise<any> {
        const result = await this.executeQuery<IUser>(
            `SELECT * FROM ${this.tableName} WHERE id = $1`,
            [id]
        );
        return result.rows[0] || null;
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
        const { columns, values, placeholders } = this.getEntityColumns(entity);
        
        const query = `
            INSERT INTO ${this.tableName} (${columns.join(', ')})
            VALUES (${placeholders.join(', ')})
            RETURNING *
        `;

        const result = await this.executeQuery<IUser>(query, values);
        return result.rows[0];
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
        const result = await this.executeQuery<IUser>(
            `SELECT * FROM ${this.tableName} WHERE email = $1`,
            [email.toLowerCase()]
        );
        return result.rows[0] as any || null;
    }
}