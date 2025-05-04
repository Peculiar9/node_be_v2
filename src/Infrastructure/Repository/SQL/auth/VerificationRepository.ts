import { inject, injectable } from 'inversify';
import { BaseRepository } from '../BaseRepository';
import { TransactionManager } from '../Abstractions/TransactionManager';
import { IVerification } from '../../../../Core/Application/Interface/Entities/auth-and-user/IVerification';
import { TableNames } from '../../../../Core/Application/Enums/TableNames';
import { TYPES } from '../../../../Core/Types/Constants';
import { DatabaseError } from '../../../../Core/Application/Error/AppError';
import { VerificationStatus } from '../../../../Core/Application/Interface/Entities/auth-and-user/IUser';
import { OTP } from '../../../../Core/Application/Types/OTP';

@injectable()
export class VerificationRepository extends BaseRepository<IVerification> {
    constructor(@inject(TYPES.TransactionManager) transactionManager: TransactionManager) {
        // console.log("VerificationRepository::constructor -> ", {transactionManager});
        super(transactionManager, TableNames.VERIFICATIONS);
    }

    async create(data: IVerification): Promise<any> {
        try {
            const { columns, values, placeholders } = this.getEntityColumns(data);
            
            const query = `
                INSERT INTO ${this.tableName} (${columns.join(', ')})
                VALUES (${placeholders.join(', ')})
                RETURNING *
            `;
            
            const result = await this.executeQuery<IVerification>(query, values);
            return result.rows[0];
        } catch (error: any) {
            throw error;
        }
    }


    async findById(id: string): Promise<any | null> {
        try {
            const result = await this.executeQuery<any>(
                `SELECT * FROM ${this.tableName} WHERE _id = $1`,
                [id]
            );
            return result.rows[0] || null;
        } catch (error: any) {
            throw error;
        }   
    }

    async countByCondition(condition: Partial<IVerification>): Promise<number> {
        try {
            const { columns, values, placeholders } = this.getEntityColumns(condition);
            const result = await this.executeQuery<any>(
                `SELECT COUNT(*) FROM ${this.tableName} WHERE ${columns.join(' = $')}`,
                values
            );
            return (result.rows[0] as any).count as unknown as number;
        } catch (error: any) {
            throw error;
        }
    }


    async findByReference(reference: string): Promise<any | null> {
        try {
            const result = await this.executeQuery<IVerification>(
                `SELECT * FROM ${this.tableName} WHERE reference = $1`,
                [reference]
            );
            return result.rows[0] || null;
        } catch (error: any) {
            throw error;
        }
    }

    async findByToken(token: string): Promise<any | null> {
        try {
            const result = await this.executeQuery<IVerification>(
                `SELECT * FROM ${this.tableName} WHERE token = $1`,
                [token]
            );
            return result.rows[0] || null;
        } catch (error: any) {
            throw error;
        }
    }

    async updateVerification(id: string, data: Partial<any>): Promise<any | null> {
        try {
            const { setClause, values } = this.buildUpdateSet(data);
            const result = await this.executeQuery<IVerification>(
                `UPDATE ${this.tableName} 
                SET ${setClause} 
                WHERE _id = $${values.length + 1}
                RETURNING *`,
                [...values, id]
            );
            return result.rows[0] || null;
        } catch (error: any) {
            throw error;
        }
    }

    async deleteExpired(): Promise<void> {
        try {
            const currentTime = Date.now();
            await this.executeQuery(
                `DELETE FROM ${this.tableName} WHERE expiry < $1`,
                [currentTime]
            );
        } catch (error: any) {
            throw new DatabaseError('Failed to delete expired verifications');
        }
    }

    async findAll(): Promise<IVerification[]> {
        try {
            const result = await this.executeQuery<IVerification>(
                `SELECT * FROM ${this.tableName}`,
                []
            );
            return result.rows as unknown as IVerification[];
        } catch (error: any) {
            throw new DatabaseError(`Failed to fetch all verifications: ${error.message}`);
        }
    }

    async findByCondition(condition: Partial<IVerification>): Promise<IVerification[]> {
        try {
            const { whereClause, values } = this.buildWhereClause(condition);
            const sortBy ='created_at';
            const sortOrder = 'DESC';
            const query = `SELECT * FROM ${this.tableName} ${whereClause} ORDER BY ${sortBy} ${sortOrder}`;
            const result = await this.executeQuery<IVerification>(query, values);
            return result.rows as unknown as IVerification[];
        } catch (error: any) {
            throw new DatabaseError(`Failed to fetch verifications by condition: ${error.message}`);
        }
    }

    async update(id: string, entity: Partial<IVerification>): Promise<any | null> {
        try {
            const { setClause, values } = this.buildUpdateSet(entity);
            console.log("VerificationRepository::update()-> ",{setClause, values});
            const result = await this.executeQuery<IVerification>(
                `UPDATE ${this.tableName} SET ${setClause} WHERE _id = $${values.length + 1} RETURNING *`,
                [...values, id]
            );
            return result.rows[0] || null;
        } catch (error: any) {
            throw error;
        }
    }

    async updateOtpInstance(verificationId: string, data: Partial<OTP>): Promise<any | null> {
        try {
            const query = `
                UPDATE ${this.tableName}
                SET otp = COALESCE(otp, '{}'::jsonb) || 
                    jsonb_build_object(
                        'code', $1::text,
                        'attempts', COALESCE((otp->>'attempts')::int, 0) + 1,
                         expiry, $2::bigint,
                        'last_attempt', $3::bigint,
                        'verified', $4::boolean
                    )::jsonb,
                    updated_at = NOW()
                WHERE _id = $5
                RETURNING *
            `;
    
            const result = await this.executeQuery<IVerification>(
                query,
                [data.code, data.expiry, data.last_attempt, data.verified, verificationId]
            );
    
            if (!result.rows[0]) {
                throw new DatabaseError('Failed to update OTP instance');
            }
            return result.rows[0];
        } catch (error: any) {
            throw new DatabaseError(`Failed to update OTP instance: ${error.message}`);
        }
    }

    async updateStatus(verificationId: string, status: VerificationStatus | string): Promise<any>{
        try {
            const query = `
                UPDATE ${this.tableName}
                SET status = $1, updated_at = NOW()
                WHERE _id = $2
                RETURNING *
            `;
            const result = await this.executeQuery<IVerification>(query, [status, verificationId]);
            return result.rows[0];
        } catch (error: any) {
            console.error(
                'VerificationRepository::updateStatus(): ', {
                message: error.message,
                stack: error.stack
            }
            );
            throw new DatabaseError(`Failed to update verification status: ${error.message}`);
        }
    }

    async updateStatusByReference(reference: string, status: VerificationStatus | string): Promise<IVerification>{
        try {
            const query = `
                UPDATE ${this.tableName}
                SET status = $1, updated_at = NOW()
                WHERE reference = $2
                RETURNING *
            `;
            const result = await this.executeQuery<IVerification>(query, [status, reference]);
            return result.rows[0] as unknown as IVerification;
        } catch (error: any) {
            console.error(
                'VerificationRepository::updateStatus(): ', {
                message: error.message,
                stack: error.stack
            }
            );
            throw new DatabaseError(`Failed to update verification status: ${error.message}`);
        }
    }

    async incrementAttempts(verificationId: string): Promise<any> {
        try {
            const query = `
                UPDATE ${this.tableName}
                SET otp = jsonb_set(
                    COALESCE(otp, '{}'::jsonb),
                    '{attempts}',
                    (COALESCE((otp->>'attempts')::int, 0) + 1)::text::jsonb
                ),
                updated_at = NOW()
                WHERE _id = $1
                RETURNING *
            `;

            const result = await this.executeQuery<IVerification>(query, [verificationId]);
            return result.rows[0];
        } catch (error: any) {
            console.error(
                'VerificationRepository::incrementAttempts(): ', {
                message: error.message,
                stack: error.stack
            });
            throw new DatabaseError('Failed to increment Verification attempts')
        }
    }

    async delete(id: string): Promise<boolean> {
        try {
            const result = await this.executeQuery(
                `DELETE FROM ${this.tableName} WHERE _id = $1 RETURNING *`,
                [id]
            );
            return (result.rowCount ?? 0) > 0;
        } catch (error: any) {
            throw new DatabaseError(`Failed to delete verification: ${error.message}`);
        }
    }

    async count(condition?: Partial<IVerification>): Promise<number> {
        try {
            let query = `SELECT COUNT(*) as total FROM ${this.tableName}`;
            let values: any[] = [];

            if (condition) {
                const { whereClause, values: conditionValues } = this.buildWhereClause(condition);
                query += whereClause;
                values = conditionValues;
            }

            type CountResult = {
                total: string;
            }
            const result = await this.executeQuery<CountResult>(query, values);
            const total = (result.rows[0] as any)?.total;
            console.log("VerificationRepository::count()", { query, values, result, total });
            return parseInt(total ?? '0', 10);
        } catch (error: any) {
            throw new DatabaseError(`Failed to count verifications: ${error.message}`);
        }
    }

    async bulkCreate(entities: IVerification[]): Promise<IVerification[]> {
        try {
            if (!entities.length) return [];

            const { valuesClause, values, columns } = this.buildBulkInsertClause(entities);
            const query = `
                INSERT INTO ${this.tableName} (${columns.join(', ')})
                VALUES ${valuesClause}
                RETURNING *
            `;

            const result = await this.executeQuery<IVerification>(query, values);
            return result.rows as unknown as IVerification[];
        } catch (error: any) {
            throw new DatabaseError(`Failed to bulk create verifications: ${error.message}`);
        }
    }

    async bulkUpdate(entities: Partial<IVerification>[]): Promise<IVerification[]> {
        try {
            if (!entities.length) return [];

            await this.transactionManager.beginTransaction();

            try {
                const { updateClause, values } = this.buildBulkUpdateClause(entities);
                const query = `
                    UPDATE ${this.tableName}
                    SET ${updateClause}
                    WHERE _id IN (${entities.map((_, i) => `$${values.length + i + 1}`).join(', ')})
                    RETURNING *
                `;

                const allValues = [...values, ...entities.map(e => e._id)];
                const result = await this.executeQuery<IVerification>(query, allValues);
                await this.transactionManager.commit();
                return result.rows as unknown as IVerification[];
            } catch (error) {
                await this.transactionManager.rollback();
                throw error;
            }
        } catch (error: any) {
            throw new DatabaseError(`Failed to bulk update verifications: ${error.message}`);
        }
    }

    async bulkDelete(ids: string[]): Promise<number> {
        try {
            if (!ids.length) return 0;

            const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
            const query = `
                DELETE FROM ${this.tableName}
                WHERE _id IN (${placeholders})
                RETURNING *
            `;

            const result = await this.executeQuery(query, ids);
            return result.rowCount ?? 0;
        } catch (error: any) {
            throw new DatabaseError(`Failed to bulk delete verifications: ${error.message}`);
        }
    }

    executeRawQuery(query: string, params: any[]): Promise<any> {
        return this.executeQuery(query, params);
    }
}