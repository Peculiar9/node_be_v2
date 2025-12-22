/**
 * Interface for database transaction management
 * Provides methods to begin, commit, and rollback transactions
 */
export interface ITransactionManager {
    /**
     * Begin a new database transaction
     * @returns Promise resolving when transaction has started
     */
    beginTransaction(): Promise<void>;
    
    /**
     * Commit the current transaction
     * @returns Promise resolving when transaction has been committed
     */
    commit(): Promise<void>;
    
    /**
     * Rollback the current transaction
     * @returns Promise resolving when transaction has been rolled back
     */
    rollback(): Promise<void>;
    
    /**
     * Check if a transaction is currently active
     * @returns Boolean indicating if a transaction is active
     */
    isTransactionActive(): boolean;
    
    /**
     * Get the current transaction client if available
     * @returns The transaction client object or null if no transaction is active
     */
    getTransactionClient(): any;
}
