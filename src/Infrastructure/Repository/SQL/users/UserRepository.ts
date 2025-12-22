import { inject, injectable } from 'inversify';
import { BaseRepository } from '../BaseRepository';
import { TransactionManager } from '../Abstractions/TransactionManager';
import { IUser } from '../../../../Core/Application/Interface/Entities/auth-and-user/IUser';
import { TableNames } from '../../../../Core/Application/Enums/TableNames';
import { TYPES } from '../../../../Core/Types/Constants';
import { DatabaseError } from '../../../../Core/Application/Error/AppError';

@injectable()
export class UserRepository extends BaseRepository<IUser> {

    constructor(
        @inject(TYPES.TransactionManager) transactionManager: TransactionManager
    ) {
        super(transactionManager, TableNames.USERS);
    }

    async findById(id: string): Promise<any> {
        try {
            const result = await this.executeQuery<IUser>(
                `SELECT * FROM ${this.tableName} WHERE _id = $1`,
                [id]
            );
            return result.rows[0] || null;
        } catch (error: any) {
            console.error('UserRepository::findById(): ', {
                message: error.message,
                stack: error.stack
            });
        }
    }

    async findByPhone(phone: string): Promise<IUser | undefined | null> {
        try {
            const result = await this.executeQuery<IUser>(
                `SELECT * FROM ${this.tableName} WHERE phone = $1`,
                [phone]
            );
            return (result.rows[0] as unknown as IUser) || null;
        } catch (error: any) {
            console.error('UserRepository::findByPhone(): ', {
                message: error.message,
                stack: error.stack
            });
            return null;
        }
    }

    async findAll(): Promise<any> {
        const result = await this.executeQuery<IUser>(
            `SELECT * FROM ${this.tableName} ORDER BY created_at DESC`
        );
        return result.rows;
    }

    // async create(entity: IUser): Promise<IUser> {
    async create(entity: IUser): Promise<any> {
        try {
            const { columns, values, placeholders } = this.getEntityColumns(entity);
            const query = `INSERT INTO ${this.tableName} (${columns.join(', ')})
            VALUES (${placeholders.join(', ')})
            RETURNING *
            `;

            const result = await this.executeQuery<IUser>(query, values);
            return result.rows[0];
        } catch (error: any) {
            console.error('UserRepository::create(): ', {
                message: error.message,
                stack: error.stack
            });
        }
    }

    async findByCondition(condition: Partial<IUser>): Promise<any> {
        const { whereClause, values } = this.buildWhereClause(condition);
        const result = await this.executeQuery<IUser>(
            `SELECT * FROM ${this.tableName} ${whereClause}`,
            values
        );
        return result.rows;
    }

    async update(id: string, entity: Partial<IUser>): Promise<any> {
        const { setClause, values } = this.buildUpdateSet(entity);
        const result = await this.executeQuery<IUser>(
            `UPDATE ${this.tableName} 
            SET ${setClause}, updated_at = NOW()
            WHERE _id = $${values.length + 1}
            RETURNING *`,
            [...values, id]
        );
        return result.rows[0] || null;
    }

    async updateByPhone(phone: string, entity: Partial<IUser>): Promise<any> {
        const { setClause, values } = this.buildUpdateSet(entity);
        const result = await this.executeQuery<IUser>(
            `UPDATE ${this.tableName} 
            SET ${setClause}, updated_at = NOW()
            WHERE phone = $2
            RETURNING *`,
            [...values, phone]
        );
        return result.rows[0] || null;
    }

    async delete(id: string): Promise<boolean> {
        const result = await this.executeQuery(
            `DELETE FROM ${this.tableName} WHERE _id = $1`,
            [id]
        );
        return result.rowCount as number > 0;
    }

    async deleteByEmail(email: string): Promise<boolean> {
        const result = await this.executeQuery(
            `DELETE FROM ${this.tableName} WHERE email = $1`,
            [email]
        );
        return result.rowCount as number > 0;
    }

    async executeRawQuery(query: string, params: any[]): Promise<any> {
        const result = await this.executeQuery(query, params);
        return result.rows;
    }

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

    async findByEmail(email: string): Promise<IUser | null> {
        const query = `SELECT * FROM ${this.tableName} WHERE email = $1`;
        const result = await this.executeQuery<IUser>(
            query,
            [email.toLowerCase()]
        );
        return result.rows[0] as any || null;
    }



    /**
     * Creates multiple users in a single transaction
     * @param users Array of users to create
     * @returns Array of created users
     */
    async bulkCreate(users: IUser[]): Promise<any> {
        const { valuesClause, values, columns } = this.buildBulkInsertClause(users);

        if (users.length === 0) {
            return [];
        }

        const query = `
            INSERT INTO ${this.tableName} (${columns.join(', ')})
            VALUES ${valuesClause}
            RETURNING *
        `;

        try {
            const result = await this.executeQuery<IUser>(query, values);
            return result.rows;
        } catch (error: any) {
            throw new DatabaseError(`Bulk user creation failed: ${error.message}`);
        }
    }

    /**
     * Updates multiple users in a single transaction
     * @param users Array of users with their IDs and update data
     * @returns Array of updated users
     */
    async bulkUpdate(users: Partial<IUser>[]): Promise<any> {
        if (users.length === 0) {
            return [];
        }

        const { updateClause, values } = this.buildBulkUpdateClause(users);
        const userIds = users.map(user => (user as any)._id);

        const query = `
            UPDATE ${this.tableName}
            SET ${updateClause} 
            WHERE _id = ANY($${values.length + 1}::uuid[])
            RETURNING *
        `;

        try {
            const result = await this.executeQuery<IUser>(query, [...values, userIds]);
            return result.rows;
        } catch (error: any) {
            throw new DatabaseError(`Bulk user update failed: ${error.message}`);
        }
    }

    /**
     * Deletes multiple users by their IDs
     * @param ids Array of user IDs to delete
     * @returns Number of deleted users
     */
    async bulkDelete(ids: string[]): Promise<any> {
        if (ids.length === 0) {
            return 0;
        }

        const query = `
            DELETE FROM ${this.tableName}
            WHERE _id = ANY($1::uuid[])
            RETURNING _id
        `;

        try {
            const result = await this.executeQuery(query, [ids]);
            return result.rowCount;
        } catch (error: any) {
            throw new DatabaseError(`Bulk user deletion failed: ${error.message}`);
        }
    }
}