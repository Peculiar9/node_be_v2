import { DatabaseError } from './AppError';

export class DatabaseConnectionError extends DatabaseError {
    constructor(message: string, details?: any) {
        super(`Database connection failed: ${message}`);
        this.name = 'DatabaseConnectionError';
        if (details) this.details = details;
    }
}

export class DatabaseQueryError extends DatabaseError {
    constructor(message: string, query?: string, params?: any[]) {
        super(`Query execution failed: ${message}`);
        this.name = 'DatabaseQueryError';
        if (query || params) this.details = { query, params };
    }
}

export class DatabaseTransactionError extends DatabaseError {
    constructor(message: string, operation: 'BEGIN' | 'COMMIT' | 'ROLLBACK', details?: any) {
        super(`Transaction ${operation.toLowerCase()} failed: ${message}`);
        this.name = 'DatabaseTransactionError';
        if (details) this.details = details;
    }
}

export class DatabaseConstraintError extends DatabaseError {
    constructor(message: string, constraint?: string) {
        super(`Constraint violation: ${message}`);
        this.name = 'DatabaseConstraintError';
        if (constraint) this.details = { constraint };
    }
}
