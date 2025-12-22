import { injectable, inject } from 'inversify';
import { TYPES } from '../../../../Core/Types/Constants';
import { PaymentTransaction, PaymentTransactionStatus, PaymentTransactionType } from '../../../../Core/Types/PaymentTransaction';
import { BaseRepository } from '../BaseRepository';
import { TransactionManager } from '../Abstractions/TransactionManager';
import { TableNames } from '../../../../Core/Application/Enums/TableNames';
import { Console } from '../../../Utils/Console';
import { DatabaseError } from '../../../../Core/Application/Error/AppError';

/**
 * Repository implementation for payment transactions
 */
@injectable()   
export class PaymentTransactionRepository extends BaseRepository<PaymentTransaction>{
    
    /**
     * Creates a new PaymentTransactionRepository
     * @param transactionManager Transaction manager for database operations
     */
    constructor(
        @inject(TYPES.TransactionManager) transactionManager: TransactionManager
    ) {
        super(transactionManager, TableNames.PAYMENTS);
    }
    
    /**
     * Find a payment transaction by ID
     * @param id Payment transaction ID
     * @returns Payment transaction or null if not found
     */
    async findById(id: string): Promise<PaymentTransaction | null> {
        try {
            const result = await this.executeQuery<PaymentTransaction>(
                `SELECT * FROM ${this.tableName} WHERE _id = $1`,
                [id]
            );
            return result.rows[0] as unknown as PaymentTransaction || null;
        } catch (error: any) {
            Console.error(error, {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
    
    /**
     * Find all payment transactions
     * @returns Array of all payment transactions
     */
    async findAll(): Promise<PaymentTransaction[]> {
        try {
            const result = await this.executeQuery<PaymentTransaction>(
                `SELECT * FROM ${this.tableName} ORDER BY created_at DESC`
            );
            return result.rows as unknown as PaymentTransaction[];
        } catch (error: any) {
            Console.error(error, {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
    
    /**
     * Find payment transactions by condition
     * @param condition Partial payment transaction to match
     * @returns Array of payment transactions matching the condition
     */
    async findByCondition(condition: Partial<PaymentTransaction>): Promise<PaymentTransaction[]> {
        try {
            const { whereClause, values } = this.buildWhereClause(condition);
            const result = await this.executeQuery<PaymentTransaction>(
                `SELECT * FROM ${this.tableName} ${whereClause} ORDER BY created_at DESC`,
                values
            );
            return result.rows as unknown as PaymentTransaction[];
        } catch (error: any) {
            Console.error(error, {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
    
    /**
     * Execute a raw SQL query
     * @param query SQL query
     * @param params Query parameters
     * @returns Query result
     */
    async executeRawQuery(query: string, params: any[] = []): Promise<any> {
        try {
            const result = await this.executeQuery(query, params);
            return result.rows as unknown as any[];
        } catch (error: any) {
            Console.error(error, {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
    
    /**
     * Count payment transactions
     * @param condition Optional condition to filter transactions
     * @returns Count of payment transactions
     */
    async count(condition?: Partial<PaymentTransaction>): Promise<number> {
        try {
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
        } catch (error: any) {
            Console.error(error, {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
    
    /**
     * Find payment transactions by user ID
     * @param userId User ID
     * @param limit Maximum number of transactions to return
     * @param offset Number of transactions to skip
     * @returns Array of payment transactions
     */
    async findByUserId(userId: string, limit?: number, offset?: number): Promise<PaymentTransaction[]> {
        try {
            let query = `SELECT * FROM ${this.tableName} WHERE user_id = $1 ORDER BY created_at DESC`;
            const params: any[] = [userId];
            
            if (limit !== undefined && offset !== undefined) {
                query += ` LIMIT $2 OFFSET $3`;
                params.push(limit, offset);
            } else if (limit !== undefined) {
                query += ` LIMIT $2`;
                params.push(limit);
            } else if (offset !== undefined) {
                query += ` OFFSET $2`;
                params.push(offset);
            }
            
            const result = await this.executeQuery<PaymentTransaction>(query, params);
            return result.rows as unknown as PaymentTransaction[];
        } catch (error: any) {
            Console.error(error, {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
    
    /**
     * Find payment transactions by session ID
     * @param sessionId Charging session ID
     * @returns Array of payment transactions
     */
    async findBySessionId(sessionId: string): Promise<PaymentTransaction[]> {
        try {
            const result = await this.executeQuery<PaymentTransaction>(
                `SELECT * FROM ${this.tableName} WHERE session_id = $1 ORDER BY created_at DESC`,
                [sessionId]
            );
            return result.rows as unknown as PaymentTransaction[];
        } catch (error: any) {
            Console.error(error, {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
    
    /**
     * Find payment transaction by payment intent ID
     * @param paymentIntentId Payment intent ID
     * @returns Payment transaction or null if not found
     */
    async findByPaymentIntentId(paymentIntentId: string): Promise<PaymentTransaction | null> {
        try {
            const result = await this.executeQuery<PaymentTransaction>(
                `SELECT * FROM ${this.tableName} WHERE payment_intent_id = $1`,
                [paymentIntentId]
            );
            return result.rows[0] as unknown as PaymentTransaction || null;
        } catch (error: any) {
            Console.error(error, {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
    
    /**
     * Find payment transactions by type
     * @param type Payment transaction type
     * @param limit Maximum number of transactions to return
     * @param offset Number of transactions to skip
     * @returns Array of payment transactions
     */
    async findByType(type: PaymentTransactionType, limit?: number, offset?: number): Promise<PaymentTransaction[]> {
        try {
            let query = `SELECT * FROM ${this.tableName} WHERE type = $1 ORDER BY created_at DESC`;
            const params: any[] = [type];
            
            if (limit !== undefined && offset !== undefined) {
                query += ` LIMIT $2 OFFSET $3`;
                params.push(limit, offset);
            } else if (limit !== undefined) {
                query += ` LIMIT $2`;
                params.push(limit);
            } else if (offset !== undefined) {
                query += ` OFFSET $2`;
                params.push(offset);
            }
            
            const result = await this.executeQuery<PaymentTransaction>(query, params);
            return result.rows as unknown as PaymentTransaction[];
        } catch (error: any) {
            Console.error(error, {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
    
    /**
     * Find payment transactions by status
     * @param status Payment transaction status
     * @param limit Maximum number of transactions to return
     * @param offset Number of transactions to skip
     * @returns Array of payment transactions
     */
    async findByStatus(status: PaymentTransactionStatus, limit?: number, offset?: number): Promise<PaymentTransaction[]> {
        try {
            let query = `SELECT * FROM ${this.tableName} WHERE status = $1 ORDER BY created_at DESC`;
            const params: any[] = [status];
            
            if (limit !== undefined && offset !== undefined) {
                query += ` LIMIT $2 OFFSET $3`;
                params.push(limit, offset);
            } else if (limit !== undefined) {
                query += ` LIMIT $2`;
                params.push(limit);
            } else if (offset !== undefined) {
                query += ` OFFSET $2`;
                params.push(offset);
            }
            
            const result = await this.executeQuery<PaymentTransaction>(query, params);
            return result.rows as unknown as PaymentTransaction[];
        } catch (error: any) {
            Console.error(error, {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
    
    /**
     * Bulk create payment transactions
     * @param entities Payment transactions to create
     * @returns Created payment transactions
     */
    async bulkCreate(entities: PaymentTransaction[]): Promise<PaymentTransaction[]> {
        let transactionSuccessfullyStarted = false;
        try {
            await this.transactionManager.beginTransaction();
            transactionSuccessfullyStarted = true;
            
            if (entities.length === 0) {
                return [];
            }
            
            const { valuesClause, values, columns } = this.buildBulkInsertClause(entities);
            
            const query = `
                INSERT INTO ${this.tableName} (${columns.join(', ')})
                VALUES ${valuesClause}
                RETURNING *
            `;
            
            const result = await this.executeQuery<PaymentTransaction>(query, values);
            await this.transactionManager.commit();
            
            return result.rows as unknown as PaymentTransaction[];
        } catch (error: any) {
            Console.error(error, {
                message: error.message,
                stack: error.stack
            });
            
            if (transactionSuccessfullyStarted) {
                try {
                    await this.transactionManager.rollback();
                    Console.info('Transaction rolled back successfully');
                } catch (rollbackError: any) {
                    Console.error(rollbackError, {
                        message: 'Failed to rollback transaction',
                        stack: rollbackError.stack
                    });
                }
            }
            
            throw new DatabaseError(`Bulk payment transaction creation failed: ${error.message}`);
        }
    }
    
    /**
     * Bulk update payment transactions
     * @param entities Payment transactions to update
     * @returns Updated payment transactions
     */
    async bulkUpdate(entities: Partial<PaymentTransaction>[]): Promise<PaymentTransaction[]> {
        let transactionSuccessfullyStarted = false;
        try {
            await this.transactionManager.beginTransaction();
            transactionSuccessfullyStarted = true;
            
            if (entities.length === 0) {
                return [];
            }
            
            const { updateClause, values } = this.buildBulkUpdateClause(entities);
            const transactionIds = entities.map(transaction => (transaction as any)._id);
            
            const query = `
                UPDATE ${this.tableName}
                SET ${updateClause}, updated_at = NOW()
                WHERE _id = ANY($${values.length + 1}::uuid[])
                RETURNING *
            `;
            
            const result = await this.executeQuery<PaymentTransaction>(query, [...values, transactionIds]);
            await this.transactionManager.commit();
            
            return result.rows as unknown as PaymentTransaction[];
        } catch (error: any) {
            Console.error(error, {
                message: error.message,
                stack: error.stack
            });
            
            if (transactionSuccessfullyStarted) {
                try {
                    await this.transactionManager.rollback();
                    Console.info('Transaction rolled back successfully');
                } catch (rollbackError: any) {
                    Console.error(rollbackError, {
                        message: 'Failed to rollback transaction',
                        stack: rollbackError.stack
                    });
                }
            }
            
            throw new DatabaseError(`Bulk payment transaction update failed: ${error.message}`);
        }
    }
    
    /**
     * Bulk delete payment transactions
     * @param ids IDs of payment transactions to delete
     * @returns Number of deleted payment transactions
     */
    async bulkDelete(ids: string[]): Promise<number> {
        let transactionSuccessfullyStarted = false;
        try {
            await this.transactionManager.beginTransaction();
            transactionSuccessfullyStarted = true;
            
            if (ids.length === 0) {
                return 0;
            }
            
            const query = `
                DELETE FROM ${this.tableName}
                WHERE _id = ANY($1::uuid[])
                RETURNING _id
            `;
            
            const result = await this.executeQuery(query, [ids]);
            await this.transactionManager.commit();
            
            return result.rowCount as number;
        } catch (error: any) {
            Console.error(error, {
                message: error.message,
                stack: error.stack
            });
            
            if (transactionSuccessfullyStarted) {
                try {
                    await this.transactionManager.rollback();
                    Console.info('Transaction rolled back successfully');
                } catch (rollbackError: any) {
                    Console.error(rollbackError, {
                        message: 'Failed to rollback transaction',
                        stack: rollbackError.stack
                    });
                }
            }
            
            throw new DatabaseError(`Bulk payment transaction deletion failed: ${error.message}`);
        }
    }
    
    /**
     * Create a new payment transaction
     * @param transaction Payment transaction data
     * @returns Created payment transaction with ID
     */
    async create(transaction: PaymentTransaction): Promise<PaymentTransaction> {
        let transactionSuccessfullyStarted = false;
        try {
            await this.transactionManager.beginTransaction();
            transactionSuccessfullyStarted = true;
            
            const { columns, values, placeholders } = this.getEntityColumns(transaction);
            
            const query = `
                INSERT INTO ${this.tableName} (${columns.join(', ')})
                VALUES (${placeholders.join(', ')})
                RETURNING *
            `;
            
            const result = await this.executeQuery<PaymentTransaction>(query, values);
            await this.transactionManager.commit();
            
            return result.rows[0] as unknown as PaymentTransaction;
        } catch (error: any) {
            Console.error(error, {
                message: error.message,
                stack: error.stack
            });
            
            if (transactionSuccessfullyStarted) {
                try {
                    await this.transactionManager.rollback();
                    Console.info('Transaction rolled back successfully');
                } catch (rollbackError: any) {
                    Console.error(rollbackError, {
                        message: 'Failed to rollback transaction',
                        stack: rollbackError.stack
                    });
                }
            }
            
            throw new DatabaseError(`Payment transaction creation failed: ${error.message}`);
        }
    }
    
    /**
     * Update a payment transaction
     * @param id Payment transaction ID
     * @param data Partial payment transaction data to update
     * @returns Updated payment transaction
     */
    async update(id: string, data: Partial<PaymentTransaction>): Promise<PaymentTransaction> {
        let transactionSuccessfullyStarted = false;
        try {
            await this.transactionManager.beginTransaction();
            transactionSuccessfullyStarted = true;
            
            // Always update the updated_at timestamp
            data.updated_at = new Date();
            
            const { setClause, values } = this.buildUpdateSet(data);
            
            const query = `
                UPDATE ${this.tableName}
                SET ${setClause}, updated_at = NOW()
                WHERE _id = $${values.length + 1}
                RETURNING *
            `;
            
            const result = await this.executeQuery<PaymentTransaction>(query, [...values, id]);
            await this.transactionManager.commit();
            
            if (result.rowCount === 0) {
                throw new Error(`Payment transaction with ID ${id} not found`);
            }
            
            return result.rows[0] as unknown as PaymentTransaction;
        } catch (error: any) {
            Console.error(error, {
                message: error.message,
                stack: error.stack
            });
            
            if (transactionSuccessfullyStarted) {
                try {
                    await this.transactionManager.rollback();
                    Console.info('Transaction rolled back successfully');
                } catch (rollbackError: any) {
                    Console.error(rollbackError, {
                        message: 'Failed to rollback transaction',
                        stack: rollbackError.stack
                    });
                }
            }
            
            throw new DatabaseError(`Payment transaction update failed: ${error.message}`);
        }
    }
    
    /**
     * Delete a payment transaction
     * @param id Payment transaction ID
     * @returns True if deleted, false if not found
     */
    async delete(id: string): Promise<boolean> {
        let transactionSuccessfullyStarted = false;
        try {
            await this.transactionManager.beginTransaction();
            transactionSuccessfullyStarted = true;
            
            const result = await this.executeQuery(
                `DELETE FROM ${this.tableName} WHERE _id = $1`,
                [id]
            );
            
            await this.transactionManager.commit();
            return (result.rowCount as number) > 0;
        } catch (error: any) {
            Console.error(error, {
                message: error.message,
                stack: error.stack
            });
            
            if (transactionSuccessfullyStarted) {
                try {
                    await this.transactionManager.rollback();
                    Console.info('Transaction rolled back successfully');
                } catch (rollbackError: any) {
                    Console.error(rollbackError, {
                        message: 'Failed to rollback transaction',
                        stack: rollbackError.stack
                    });
                }
            }
            
            throw new DatabaseError(`Payment transaction deletion failed: ${error.message}`);
        }
    }
}
