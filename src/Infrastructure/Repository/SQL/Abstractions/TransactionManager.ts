import { PoolClient } from 'pg';
import { ConnectionPoolManager } from './ConnectionPoolManager';
import { InternalServerError } from '@Core/Application/Error/AppError';
import { DatabaseIsolationLevel } from '@Core/Application/Enums/DatabaseIsolationLevel';
import { inject, injectable } from 'inversify';
import { TYPES } from '@Core/Types/Constants';
import { Console, LogLevel } from '@Infrastructure/Utils/Console';

interface TransactionOptions {
  isolationLevel?: DatabaseIsolationLevel;
  readOnly?: boolean;
}

interface TransactionMetrics {
  totalTransactions: number;
  activeTransactions: number;
  completedTransactions: number;
  committedTransactions: number;
  rolledBackTransactions: number;
  failedTransactions: number;
  transactionDurations: number[]; // in milliseconds
  lastMetricsResetTime: Date;
  transactionHistory: Array<{
    transactionId: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    status: 'active' | 'committed' | 'rolled_back' | 'failed';
    isolationLevel?: DatabaseIsolationLevel;
    readOnly?: boolean;
    error?: string;
  }>;
}

@injectable()
export class TransactionManager {
  private client: PoolClient | null = null;
  private isTransactionActive = false;
  private poolManager: ConnectionPoolManager;
  private requestId: string;
  private metrics: TransactionMetrics = {
    totalTransactions: 0,
    activeTransactions: 0,
    completedTransactions: 0,
    committedTransactions: 0,
    rolledBackTransactions: 0,
    failedTransactions: 0,
    transactionDurations: [],
    lastMetricsResetTime: new Date(),
    transactionHistory: []
  };

  public getTransactionId(): string {
    return this.requestId;
  }

  /**
   * Gets a standalone client from the connection pool that is not associated with any transaction.
   * This is useful for operations that need to be performed outside of a transaction context,
   * such as checking database extension status or performing maintenance tasks.
   * 
   * @returns Promise<PoolClient> A client from the connection pool
   * @throws {InternalServerError} If unable to acquire a client
   */
  public async getStandaloneClient(): Promise<PoolClient> {
    try {
      const client = await this.poolManager.getConnection();
      return client;
    } catch (error: unknown) {
      Console.error(error as Error, { 
        message: 'Failed to acquire standalone client',
        requestId: this.requestId
      });
      throw new InternalServerError('Failed to acquire database client');
    }
  }
  private transactionStartTime: Date | null = null;
  private currentTransactionOptions?: TransactionOptions;
  private metricsLoggingInterval: NodeJS.Timeout | null = null;

  constructor(@inject(TYPES.ConnectionPoolManager) poolManager: ConnectionPoolManager) {
    this.poolManager = poolManager;
    this.requestId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.startMetricsLogging();
  }
  
  private startMetricsLogging(): void {
    // Generate a unique ID for metrics logging
    const metricsId = `metric_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    
    // Log transaction metrics every minute
    this.metricsLoggingInterval = setInterval(() => {
      const summary = this.getMetricsSummary();
      
      // Console.write(`[${metricsId}] Transaction manager metrics`, LogLevel.INFO, summary);
      
      // Alert if there are long-running transactions (> 5 minutes)
      const longRunningTransactions = this.metrics.transactionHistory
        .filter(txn => txn.status === 'active' && 
          new Date().getTime() - txn.startTime.getTime() > 5 * 60 * 1000);
      
      if (longRunningTransactions.length > 0) {
        Console.write(`[${metricsId}] WARNING: ${longRunningTransactions.length} long-running transactions detected`, 
          LogLevel.WARNING, {
            transactions: longRunningTransactions.map(txn => ({
              transactionId: txn.transactionId,
              durationMinutes: Math.round((new Date().getTime() - txn.startTime.getTime()) / (1000 * 60)),
              isolationLevel: txn.isolationLevel,
              readOnly: txn.readOnly
            }))
          });
      }
    }, 60000); // Every minute
  }

  public isActive(): boolean {
    return this.isTransactionActive;
  }

  public async beginTransaction(options?: TransactionOptions): Promise<void> {
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.requestId = transactionId;
    this.currentTransactionOptions = options;
    
    // Console.write(`Attempting to begin transaction`, LogLevel.INFO, {
    //   transactionId,
    //   isolationLevel: options?.isolationLevel,
    //   readOnly: options?.readOnly
    // });
    
    if (this.isTransactionActive) {
      const err = new InternalServerError('Transaction already in progress');
      // Console.write(`ERROR - beginTransaction called when already active`, LogLevel.ERROR, { 
      //   transactionId,
      //   stack: err.stack,
      //   activeTransactionId: this.requestId
      // });
      
      // Track failed transaction
      this.metrics.failedTransactions++;
      this.metrics.transactionHistory.push({
        transactionId,
        startTime: new Date(),
        status: 'failed',
        isolationLevel: options?.isolationLevel,
        readOnly: options?.readOnly,
        error: 'Transaction already in progress'
      });
      
      // Trim history if needed
      if (this.metrics.transactionHistory.length > 100) {
        this.metrics.transactionHistory = this.metrics.transactionHistory.slice(-100);
      }
      
      throw err;
    }

    this.transactionStartTime = new Date();
    this.metrics.totalTransactions++;
    
    try {
      // Console.write(`Attempting to get connection from pool manager`, LogLevel.INFO, { transactionId });
      this.client = await this.poolManager.getConnection(options);
      // Console.write(`Successfully acquired database connection`, LogLevel.INFO, { transactionId });

      // Console.write(`Executing BEGIN statement`, LogLevel.INFO, { transactionId });
      await this.client.query('BEGIN');

      if (options?.isolationLevel) {
        await this.client.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`);
        // Console.write(`Set isolation level: ${options.isolationLevel}`, LogLevel.INFO, { transactionId });
      }

      if (options?.readOnly !== undefined) {
        await this.client.query(options.readOnly ? 'SET TRANSACTION READ ONLY' : 'SET TRANSACTION READ WRITE');
        // Console.write(`Set transaction mode: ${options.readOnly ? 'READ ONLY' : 'READ WRITE'}`, LogLevel.INFO, { transactionId });
      }

      this.isTransactionActive = true;
      this.metrics.activeTransactions++;
      
      // Record transaction start in history
      this.metrics.transactionHistory.push({
        transactionId,
        startTime: this.transactionStartTime,
        status: 'active',
        isolationLevel: options?.isolationLevel,
        readOnly: options?.readOnly
      });
      
      // Trim history if needed
      if (this.metrics.transactionHistory.length > 100) {
        this.metrics.transactionHistory = this.metrics.transactionHistory.slice(-100);
      }
      
      // Console.write(`Transaction successfully begun`, LogLevel.INFO, {
      //   transactionId,
      //   activeTransactions: this.metrics.activeTransactions,
      //   totalTransactions: this.metrics.totalTransactions
      // });
    } catch (error: any) {
      // Console.write(`ERROR DURING beginTransaction`, LogLevel.ERROR, { 
      //   transactionId,
      //   message: error.message,
      //   stack: error.stack
      // });
      
      // Update metrics for failed transaction
      this.metrics.failedTransactions++;
      
      // Update transaction history
      const historyEntry = this.metrics.transactionHistory.find(t => t.transactionId === transactionId);
      if (historyEntry) {
        historyEntry.status = 'failed';
        historyEntry.endTime = new Date();
        historyEntry.duration = historyEntry.endTime.getTime() - historyEntry.startTime.getTime();
        historyEntry.error = error.message;
      }
      
      // Ensure client is released if obtained but 'BEGIN' failed.
      if (this.client) {
        try {
          // Console.write(`Releasing client due to error in beginTransaction`, LogLevel.INFO, { transactionId });
          await this.releaseClient();
        } catch (releaseError: any) {
          // Console.write(`Error releasing client during beginTransaction failure`, LogLevel.ERROR, { 
          //   transactionId,
          //   error: releaseError.message,
          //   stack: releaseError.stack
          // });
        }
      }
      throw error;
    }
  }

  public async commit(): Promise<void> {
    if (!this.isTransactionActive || !this.client) {
      const err = new InternalServerError('No active transaction to commit');
      // Console.write(`Attempted to commit inactive transaction`, LogLevel.ERROR, { 
      //   transactionId: this.requestId,
      //   stack: err.stack
      // });
      
      // Track failed commit attempt
      this.metrics.failedTransactions++;
      
      throw err;
    }

    const startTime = Date.now();
    try {
      // Console.write(`Committing transaction`, LogLevel.INFO, { transactionId: this.requestId });
      await this.client.query('COMMIT');
      
      // Update metrics
      this.metrics.committedTransactions++;
      this.metrics.completedTransactions++;
      
      // Update transaction history
      const historyEntry = this.metrics.transactionHistory.find(t => t.transactionId === this.requestId);
      if (historyEntry) {
        historyEntry.status = 'committed';
        historyEntry.endTime = new Date();
        if (this.transactionStartTime) {
          historyEntry.duration = historyEntry.endTime.getTime() - historyEntry.startTime.getTime();
          this.metrics.transactionDurations.push(historyEntry.duration);
          
          // Keep only the last 1000 durations to avoid memory issues
          if (this.metrics.transactionDurations.length > 1000) {
            this.metrics.transactionDurations = this.metrics.transactionDurations.slice(-1000);
          }
        }
      }
      
      // Console.write(`Transaction committed successfully`, LogLevel.INFO, { 
      //   transactionId: this.requestId,
      //   durationMs: Date.now() - startTime,
      //   totalDurationMs: this.transactionStartTime ? (Date.now() - this.transactionStartTime.getTime()) : undefined
      // });
    } catch (error: any) {
      // Console.write(`Error committing transaction`, LogLevel.ERROR, { 
      //   transactionId: this.requestId,
      //   error: error.message,
      //   stack: error.stack
      // });
      
      // Update transaction history for failed commit
      const historyEntry = this.metrics.transactionHistory.find(t => t.transactionId === this.requestId);
      if (historyEntry) {
        historyEntry.status = 'failed';
        historyEntry.endTime = new Date();
        historyEntry.error = `Commit failed: ${error.message}`;
        if (this.transactionStartTime) {
          historyEntry.duration = historyEntry.endTime.getTime() - historyEntry.startTime.getTime();
        }
      }
      
      throw error;
    } finally {
      this.releaseClient();
    }
  }

  public async rollback(): Promise<void> {
    // Don't throw if there's no transaction - just log and return
    if (!this.isTransactionActive || !this.client) {
      // Console.write(`Attempted to rollback inactive transaction`, LogLevel.WARNING, { 
      //   transactionId: this.requestId,
      //   message: 'No active transaction to rollback - this is normal if beginTransaction failed'
      // });
      return;
    }

    const startTime = Date.now();
    try {
      // Console.write(`Rolling back transaction`, LogLevel.INFO, { transactionId: this.requestId });
      await this.client.query('ROLLBACK');
      
      // Update metrics
      this.metrics.rolledBackTransactions++;
      this.metrics.completedTransactions++;
      
      // Update transaction history
      const historyEntry = this.metrics.transactionHistory.find(t => t.transactionId === this.requestId);
      if (historyEntry) {
        historyEntry.status = 'rolled_back';
        historyEntry.endTime = new Date();
        if (this.transactionStartTime) {
          historyEntry.duration = historyEntry.endTime.getTime() - historyEntry.startTime.getTime();
          this.metrics.transactionDurations.push(historyEntry.duration);
        }
      }
      
      // Console.write(`Transaction rolled back successfully`, LogLevel.INFO, { 
      //   transactionId: this.requestId,
      //   durationMs: Date.now() - startTime,
      //   totalDurationMs: this.transactionStartTime ? (Date.now() - this.transactionStartTime.getTime()) : undefined
      // });
    } catch (error: any) {
      // Console.write(`Error rolling back transaction`, LogLevel.ERROR, { 
      //   transactionId: this.requestId,
      //   error: error.message,
      //   stack: error.stack
      // });
      
      // Update transaction history for failed rollback
      const historyEntry = this.metrics.transactionHistory.find(t => t.transactionId === this.requestId);
      if (historyEntry) {
        historyEntry.status = 'failed';
        historyEntry.endTime = new Date();
        historyEntry.error = `Rollback failed: ${error.message}`;
        if (this.transactionStartTime) {
          historyEntry.duration = historyEntry.endTime.getTime() - historyEntry.startTime.getTime();
        }
      }
      
      throw error;
    } finally {
      this.releaseClient();
    }
  }

  public getClient(): PoolClient {
    if (!this.client || !this.isTransactionActive) {
      const err = new InternalServerError('No active transaction client');
      // Console.write(`Attempted to get client from inactive transaction`, LogLevel.ERROR, { 
      //   transactionId: this.requestId,
      //   stack: err.stack
      // });
      throw err;
    }
    return this.client;
  }
  
  public getMetrics(): TransactionMetrics {
    return { ...this.metrics };
  }
  
  public getMetricsSummary(): any {
    const durations = this.metrics.transactionDurations;
    const avgDuration = durations.length > 0 
      ? durations.reduce((sum, val) => sum + val, 0) / durations.length 
      : 0;
      
    return {
      totalTransactions: this.metrics.totalTransactions,
      activeTransactions: this.metrics.activeTransactions,
      committedTransactions: this.metrics.committedTransactions,
      rolledBackTransactions: this.metrics.rolledBackTransactions,
      failedTransactions: this.metrics.failedTransactions,
      completedTransactions: this.metrics.completedTransactions,
      avgTransactionDurationMs: Math.round(avgDuration),
      maxTransactionDurationMs: durations.length > 0 ? Math.max(...durations) : 0,
      minTransactionDurationMs: durations.length > 0 ? Math.min(...durations) : 0,
      transactionCount: durations.length,
      longRunningTransactions: this.getLongRunningTransactions()
    };
  }
  
  public resetMetrics(): void {
    this.metrics = {
      totalTransactions: 0,
      activeTransactions: this.metrics.activeTransactions, // Keep track of currently active
      completedTransactions: 0,
      committedTransactions: 0,
      rolledBackTransactions: 0,
      failedTransactions: 0,
      transactionDurations: [],
      lastMetricsResetTime: new Date(),
      transactionHistory: this.metrics.transactionHistory.filter(t => t.status === 'active') // Keep active transactions
    };
    
    Console.write('Transaction metrics reset', LogLevel.INFO, {
      timestamp: new Date().toISOString(),
      activeTransactionsRemaining: this.metrics.activeTransactions
    });
  }
  
  private getLongRunningTransactions(): any[] {
    return this.metrics.transactionHistory
      .filter(txn => txn.status === 'active')
      .map(txn => {
        const durationMs = new Date().getTime() - txn.startTime.getTime();
        return {
          transactionId: txn.transactionId,
          durationMs,
          durationMinutes: Math.round(durationMs / (1000 * 60) * 10) / 10,
          isolationLevel: txn.isolationLevel,
          readOnly: txn.readOnly,
          startTime: txn.startTime.toISOString()
        };
      })
      .filter(txn => txn.durationMs > 30000); // Transactions running longer than 30 seconds
  }

  private releaseClient(): void {
    if (this.client) {
      Console.write(`Releasing database client`, LogLevel.INFO, { 
        transactionId: this.requestId
      });
      
      // Update metrics - decrement active transactions
      if (this.isTransactionActive) {
        this.metrics.activeTransactions = Math.max(0, this.metrics.activeTransactions - 1);
      }
      
      this.client.release();
      this.client = null;
      this.isTransactionActive = false;
      this.transactionStartTime = null;
    } else {
      // Console.write(`releaseClient called but no client exists`, LogLevel.WARNING, { 
      //   transactionId: this.requestId,
      //   isTransactionActive: this.isTransactionActive
      // });
    }
  }
  
  public dispose(): void {
    if (this.metricsLoggingInterval) {
      clearInterval(this.metricsLoggingInterval);
      this.metricsLoggingInterval = null;
    }
  }
}