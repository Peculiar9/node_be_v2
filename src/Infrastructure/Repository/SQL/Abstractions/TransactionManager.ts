import { PoolClient } from 'pg';
import { ConnectionPoolManager } from './ConnectionPoolManager';
import { InternalServerError } from '../../../../Core/Application/Error/AppError';
import { DatabaseIsolationLevel } from '../../../../Core/Application/Enums/DatabaseIsolationLevel';
import { inject, injectable } from 'inversify';
import { TYPES } from '../../../../Core/Types/Constants';

interface TransactionOptions {
  isolationLevel?: DatabaseIsolationLevel;
  readOnly?: boolean;
}

@injectable()
export class TransactionManager {
  private client: PoolClient | null = null;
  private isTransactionActive = false;
  private poolManager: ConnectionPoolManager;

  constructor(@inject(TYPES.ConnectionPoolManager) poolManager: ConnectionPoolManager) {
    this.poolManager = poolManager;
  }

  public async beginTransaction(options?: TransactionOptions): Promise<void> {
    if (this.isTransactionActive) {
      throw new InternalServerError('Transaction already in progress');
    }
    this.client = await this.poolManager.getConnection(options);
    await this.client.query('BEGIN');
    
    if (options?.isolationLevel) {
      await this.client.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`);
    }
    
    if (options?.readOnly) {
      await this.client.query('SET TRANSACTION READ ONLY');
    }

    this.isTransactionActive = true;
  }

  public async commit(): Promise<void> {
    if (!this.isTransactionActive || !this.client) {
      throw new InternalServerError('No active transaction to commit');
    }

    try {
      await this.client.query('COMMIT');
    } finally {
      this.releaseClient();
    }
  }

  public async rollback(): Promise<void> {
    if (!this.isTransactionActive || !this.client) {
      throw new InternalServerError('No active transaction to rollback');
    }

    try {
      await this.client.query('ROLLBACK');
    } finally {
      this.releaseClient();
    }
  }

  public getClient(): PoolClient {
    if (!this.client || !this.isTransactionActive) {
      throw new InternalServerError('No active transaction client');
    }
    return this.client;
  }

  private releaseClient(): void {
    if (this.client) {
      this.client.release();
      this.client = null;
      this.isTransactionActive = false;
    }
  }
}