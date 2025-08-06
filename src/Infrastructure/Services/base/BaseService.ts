import { inject, injectable } from "inversify";
import { TransactionManager } from "../../Repository/SQL/Abstractions/TransactionManager";
import { DatabaseIsolationLevel } from "../../../Core/Application/Enums/DatabaseIsolationLevel";
import { Console, LogLevel } from "../../Utils/Console";

/**
 * Base service class that provides transaction management functionality
 * All services that require database transactions should extend this class
 */
@injectable()
export abstract class BaseService {
    constructor(
        protected readonly transactionManager: TransactionManager
    ) {}

    /**
     * Begins a transaction with proper error handling
     * @param isolationLevel Optional isolation level for the transaction
     * @param readOnlyFlag Optional flag to indicate if the transaction is read-only
     * @returns True if transaction started successfully, false otherwise
     */
    protected async beginTransaction(
        isolationLevel: DatabaseIsolationLevel = DatabaseIsolationLevel.READ_COMMITTED, 
        readOnlyFlag: boolean = false
    ): Promise<boolean> {
        try {
            await this.transactionManager.beginTransaction({ 
                isolationLevel, 
                readOnly: readOnlyFlag 
            });
            return true;
        } catch (error: any) {
            Console.error(error, {
                message: `Failed to begin transaction: ${error.message}`,
                level: LogLevel.ERROR
            });
            return false;
        }
    }

    /**
     * Commits a transaction with proper error handling
     * @returns True if commit was successful, false otherwise
     */
    protected async commitTransaction(): Promise<boolean> {
        try {
            await this.transactionManager.commit();
            return true;
        } catch (error: any) {
            Console.error(error, {
                message: `Failed to commit transaction: ${error.message}`,
                level: LogLevel.ERROR
            });
            return false;
        }
    }

    /**
     * Rolls back a transaction with proper error handling
     * @returns True if rollback was successful, false otherwise
     */
    protected async rollbackTransaction(): Promise<boolean> {
        try {
            await this.transactionManager.rollback();
            return true;
        } catch (error: any) {
            Console.error(error, {
                message: `Failed to rollback transaction: ${error.message}`,
                level: LogLevel.ERROR
            });
            return false;
        }
    }

    /**
     * Checks if a transaction is currently active
     * @returns True if a transaction is active
     */
    protected isTransactionActive(): boolean {
        return this.transactionManager.isActive();
    }
}
