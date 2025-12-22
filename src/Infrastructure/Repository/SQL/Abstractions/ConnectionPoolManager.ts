import { Pool, PoolClient, PoolConfig } from 'pg'; // Using PoolConfig from 'pg' for better type safety
import { EventEmitter } from 'events';
import { DatabaseError } from '../../../../Core/Application/Error/AppError'; // Assuming path
import { DatabaseConnectionError } from '../../../../Core/Application/Error/DatabaseErrors'; // Assuming path
import { injectable } from 'inversify';
import { Console, LogLevel } from '../../../../Infrastructure/Utils/Console'; // Assuming path

// Interface for options passed to getConnection
interface ConnectionOptions {
  isolationLevel?: string; // e.g., 'READ COMMITTED', 'SERIALIZABLE'
  readOnly?: boolean;
}

// Use PoolConfig from 'pg' for the pool configuration.
// If you have custom options not covered by PoolConfig, you can extend it:
// interface CustomPoolOptions extends PoolConfig {
//   myCustomOption?: boolean;
// }
// For this example, we'll use PoolConfig directly for broader compatibility.

interface ConnectionPoolMetrics {
  totalConnectionsCreated: number;
  acquiredConnections: number;
  releasedConnections: number;
  failedAcquisitions: number;
  activeLeasedConnections: number;
  maxConcurrentLeasedConnections: number;
  connectionDurations: number[];
  connectionHistory: Array<{
    type: 'acquired' | 'released' | 'failed_acquire' | 'client_error_released';
    timestamp: Date;
    connectionId?: string;
    durationMs?: number;
    error?: string;
  }>;
  lastMetricsResetTime?: Date;
  poolTotalCount?: number;
  poolIdleCount?: number;
  poolWaitingCount?: number;
}

interface ConnectionTimestamp {
  acquiredAt: Date;
  options?: ConnectionOptions;
  processID?: number;
  queryTimeoutTimer?: NodeJS.Timeout;
}

const CONNECTION_ID_SYMBOL = Symbol('connectionId');

@injectable()
export class ConnectionPoolManager extends EventEmitter {
  private readonly pool: Pool;
  private readonly poolId: string;
  private readonly poolOptions: PoolConfig; // Using PoolConfig from 'pg'

  private metrics: ConnectionPoolMetrics;
  private readonly connectionTimestamps: Map<string, ConnectionTimestamp>;

  private readonly METRICS_LOG_INTERVAL_MS: number = 60 * 1000;
  private readonly CONNECTION_ACQUIRE_TIMEOUT_MS: number;
  private readonly QUERY_TIMEOUT_MS: number;
  private readonly LONG_RUNNING_CONNECTION_WARNING_MS: number = 30 * 60 * 1000;
  private readonly MAX_HISTORY_SIZE: number = 200;

  private metricsLoggingInterval?: NodeJS.Timeout;

  constructor(poolConfig: PoolConfig) { // Changed to PoolConfig from 'pg'
    super();

    this.poolId = `pool_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.poolOptions = poolConfig;

    this.CONNECTION_ACQUIRE_TIMEOUT_MS = poolConfig.connectionTimeoutMillis ?? 8000; // Use ?? for null/undefined
    this.QUERY_TIMEOUT_MS = 10000; // Default query timeout for our internal mechanism

    this.pool = new Pool({
      ...poolConfig,
      connectionTimeoutMillis: this.CONNECTION_ACQUIRE_TIMEOUT_MS,
    });

    this.connectionTimestamps = new Map();
    this.metrics = this.initializeMetrics();

    this.setupPoolEvents();
    this.startMetricsLogging();

    Console.write('Connection pool created', LogLevel.INFO, {
      context: 'ConnectionPoolManager.constructor',
      poolId: this.poolId,
      maxConnections: this.poolOptions.max ?? 10,
      host: this.poolOptions.host ?? 'localhost',
      database: this.poolOptions.database,
      connectionTimeoutMs: this.CONNECTION_ACQUIRE_TIMEOUT_MS,
    });
  }

  private initializeMetrics(): ConnectionPoolMetrics {
    return {
      totalConnectionsCreated: 0,
      acquiredConnections: 0,
      releasedConnections: 0,
      failedAcquisitions: 0,
      activeLeasedConnections: 0,
      maxConcurrentLeasedConnections: 0,
      connectionDurations: [],
      connectionHistory: [],
      lastMetricsResetTime: new Date(),
      poolTotalCount: 0,
      poolIdleCount: 0,
      poolWaitingCount: 0,
    };
  }

  private setupPoolEvents(): void {
    this.pool.on('connect', (client: PoolClient) => {
      this.metrics.totalConnectionsCreated++;
      const backendPID = (client as any).processID as number | undefined;
      Console.write('A new client has connected to the DB & joined the pool.', LogLevel.DEBUG, {
        context: 'ConnectionPoolManager.pool.on.connect',
        poolId: this.poolId,
        processID: backendPID,
        totalPhysicalConnections: this.pool.totalCount,
      });
      // this.updatePoolStatsMetrics();
    });

    this.pool.on('acquire', (client: PoolClient) => {
      const backendPID = (client as any).processID as number | undefined;
      Console.write('Client acquired from pg-pool internals.', LogLevel.DEBUG, {
        context: 'ConnectionPoolManager.pool.on.acquire',
        poolId: this.poolId,
        processID: backendPID,
        activeLeasedConnections: this.metrics.activeLeasedConnections,
        poolWaitingCount: this.pool.waitingCount,
      });
      // this.updatePoolStatsMetrics();
    });

    this.pool.on('remove', (client: PoolClient) => {
      const backendPID = (client as any).processID as number | undefined;
      Console.write('Client removed from pg-pool (returned to idle or destroyed).', LogLevel.DEBUG, {
        context: 'ConnectionPoolManager.pool.on.remove',
        poolId: this.poolId,
        processID: backendPID,
      });
      // this.updatePoolStatsMetrics();
    });

    this.pool.on('error', (err: Error, client?: PoolClient) => {
      const backendPID = client ? ((client as any).processID as number | undefined) : undefined;
      Console.write('Idle client in pool encountered an error.', LogLevel.ERROR, {
        context: 'ConnectionPoolManager.pool.on.error',
        poolId: this.poolId,
        processID: backendPID,
        error: err.message,
        stack: err.stack,
      });
      this.emit('error', err);
      // this.updatePoolStatsMetrics();
    });
  }

  private addHistory(
    type: ConnectionPoolMetrics['connectionHistory'][0]['type'],
    connectionId?: string,
    durationMs?: number,
    error?: string
  ): void {
    this.metrics.connectionHistory.push({ type, timestamp: new Date(), connectionId, durationMs, error });
    if (this.metrics.connectionHistory.length > this.MAX_HISTORY_SIZE) {
      this.metrics.connectionHistory.shift();
    }
  }

  public async getConnection(options?: ConnectionOptions): Promise<PoolClient> {
    const internalConnectionId = `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const acquisitionStartTime = Date.now();

       Console.write('Attempting to acquire database connection...', LogLevel.DEBUG, {
        context: 'ConnectionPoolManager.getConnection',
        poolId: this.poolId,
        internalConnectionId,
        options,
        currentLeased: this.metrics.activeLeasedConnections,
        poolMax: this.poolOptions.max,
        poolWaiting: this.pool.waitingCount,
    });

    try {
      const client = await this.pool.connect();
      const acquisitionDurationMs = Date.now() - acquisitionStartTime;
      const backendPID = (client as any).processID as number | undefined;

      (client as any)[CONNECTION_ID_SYMBOL] = internalConnectionId;

      this.metrics.acquiredConnections++;
      this.metrics.activeLeasedConnections++;
      if (this.metrics.activeLeasedConnections > this.metrics.maxConcurrentLeasedConnections) {
        this.metrics.maxConcurrentLeasedConnections = this.metrics.activeLeasedConnections;
      }
      this.addHistory('acquired', internalConnectionId, acquisitionDurationMs);

      const connectionDetails: ConnectionTimestamp = {
        acquiredAt: new Date(acquisitionStartTime),
        options,
        processID: backendPID,
      };
      this.connectionTimestamps.set(internalConnectionId, connectionDetails);

      Console.write('Database connection acquired successfully.', LogLevel.INFO, {
        context: 'ConnectionPoolManager.getConnection',
        poolId: this.poolId,
        internalConnectionId,
        processID: backendPID,
        durationMs: acquisitionDurationMs,
        activeLeased: this.metrics.activeLeasedConnections,
      });

      client.on('error', (err: Error) => {
        const currentConnectionId = (client as any)[CONNECTION_ID_SYMBOL] || 'unknown_after_error';
        const currentProcessID = (client as any).processID as number | undefined;
        Console.write('Error on active client. Connection will be forcibly released.', LogLevel.ERROR, {
          context: 'ConnectionPoolManager.client.on.error',
          poolId: this.poolId,
          internalConnectionId: currentConnectionId,
          processID: currentProcessID,
          error: err.message,
          stack: err.stack,
        });
        this.performClientRelease(client, err);
      });

      // Store original functions
      const originalQuery = client.query;
      const originalRelease = client.release.bind(client);
      (client as any)._originalQuery = originalQuery;
      (client as any)._originalRelease = originalRelease;

      // Patch the release method
      (client as any).release = (errOrBool?: Error | boolean): void => {
        this.performClientRelease(client, errOrBool instanceof Error ? errOrBool : undefined, typeof errOrBool === 'boolean' ? errOrBool : undefined);
      };

      // Query timeout handling (client-side attempt)
      let currentQueryTimeoutTimer: NodeJS.Timeout | undefined;
      (client as any).query = (...args: any[]) => {
          if (currentQueryTimeoutTimer) clearTimeout(currentQueryTimeoutTimer);

          const queryText = typeof args[0] === 'string' ? args[0] : (args[0] as { text: string }).text;
          const currentClientProcessID = (client as any).processID as number | undefined;
          const queryContext = {
              context: 'ConnectionPoolManager.client.query.timeoutHandler',
              poolId: this.poolId,
              internalConnectionId,
              processID: currentClientProcessID,
              query: queryText.substring(0, 200) + (queryText.length > 200 ? '...' : ''),
              queryTimeoutMs: this.QUERY_TIMEOUT_MS,
          };

          currentQueryTimeoutTimer = setTimeout(async () => {
              Console.write('Query timeout detected. Attempting pg_cancel_backend...', LogLevel.WARNING, queryContext);
              this.emit('error', new DatabaseConnectionError('Query timeout detected', { ...queryContext, type: 'QueryTimeout' }));

              if (currentClientProcessID) {
                  let cancelClient: PoolClient | null = null;
                  try {
                      Console.write(`Attempting to acquire separate client to cancel PID: ${currentClientProcessID}`, LogLevel.INFO, queryContext);
                      cancelClient = await this.pool.connect();
                      await cancelClient.query('SELECT pg_cancel_backend($1)', [currentClientProcessID]);
                      Console.write(`pg_cancel_backend for PID ${currentClientProcessID} sent.`, LogLevel.INFO, queryContext);
                  } catch (cancelError: any) {
                      Console.write(`Failed to execute pg_cancel_backend for PID ${currentClientProcessID}.`, LogLevel.ERROR, { ...queryContext, cancelError: cancelError.message });
                  } finally {
                      if (cancelClient) cancelClient.release();
                  }
              } else {
                  Console.write('Cannot attempt pg_cancel_backend: client.processID is not available.', LogLevel.WARNING, queryContext);
              }
              this.performClientRelease(client, new Error(`Query timed out after ${this.QUERY_TIMEOUT_MS}ms. Cancellation attempted.`));
          }, this.QUERY_TIMEOUT_MS);
          connectionDetails.queryTimeoutTimer = currentQueryTimeoutTimer;
          
          const originalQueryFunction = (client as any)._originalQuery || originalQuery;
          const result = originalQueryFunction.apply(client, args as any);
          if (result && typeof result.then === 'function') {
            result.then(() => {
                if (currentQueryTimeoutTimer) clearTimeout(currentQueryTimeoutTimer);
            }).catch(() => {
                if (currentQueryTimeoutTimer) clearTimeout(currentQueryTimeoutTimer);
            });
          } else {
             client.once('end', () => { if (currentQueryTimeoutTimer) clearTimeout(currentQueryTimeoutTimer); });
             client.once('error', () => { if (currentQueryTimeoutTimer) clearTimeout(currentQueryTimeoutTimer); });
          }
          return result;
      };


      if (options?.isolationLevel) {
        await client.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`);
      }
      if (options?.readOnly !== undefined) {
        await client.query(options.readOnly ? 'SET TRANSACTION READ ONLY' : 'SET TRANSACTION READ WRITE');
      }

      return client;

    } catch (error: any) {
      const acquisitionDurationMs = Date.now() - acquisitionStartTime;
      this.metrics.failedAcquisitions++;
      this.addHistory('failed_acquire', internalConnectionId, acquisitionDurationMs, error.message);
      Console.write('Failed to acquire database connection.', LogLevel.ERROR, {
        context: 'ConnectionPoolManager.getConnection.catch',
        poolId: this.poolId,
        internalConnectionId,
        durationMs: acquisitionDurationMs,
        error: error.message,
        stack: error.stack,
        poolTotal: this.pool.totalCount,
        poolIdle: this.pool.idleCount,
        poolWaiting: this.pool.waitingCount,
      });
      this.emit('error', error);
      throw new DatabaseConnectionError(
          `Failed to acquire connection (Pool: ${this.poolId}, Configured Timeout: ${this.CONNECTION_ACQUIRE_TIMEOUT_MS}ms): ${error.message}`,
          { cause: error, poolId: this.poolId }
      );
    }
  }

  private performClientRelease(client: PoolClient, errorIndication?: Error, forceDiscardOption?: boolean): void {
    const internalConnectionId = (client as any)[CONNECTION_ID_SYMBOL] as string | undefined;

    // Restore original query and release methods to prevent issues if this client somehow gets reused without re-patching
    // This is defensive. pg-pool should give new client objects or re-initialize them.
    if (typeof (client as any)._originalQuery === 'function') {
        (client as any).query = (client as any)._originalQuery;
        delete (client as any)._originalQuery;
    }
    // The original release is called at the end of this method.

    if (!internalConnectionId || !this.connectionTimestamps.has(internalConnectionId)) {
      const currentProcessID = (client as any).processID as number | undefined;
      Console.write('performClientRelease called on an untracked or already processed client.', LogLevel.INFO, {
        context: 'ConnectionPoolManager.performClientRelease',
        poolId: this.poolId,
        processID: currentProcessID,
        hasError: !!errorIndication,
        forceDiscardOption,
      });
      // Call original release directly to avoid recursion
      if (typeof (client as any)._originalRelease === 'function') {
        (client as any)._originalRelease(errorIndication || forceDiscardOption);
        delete (client as any)._originalRelease;
      } else {
        Console.write('CRITICAL: Original release function not found on untracked client.', LogLevel.ERROR, {
          context: 'ConnectionPoolManager.performClientRelease',
          poolId: this.poolId,
          processID: currentProcessID,
        });
      }
      return;
    }

    const connectionDetails = this.connectionTimestamps.get(internalConnectionId)!;
    if (connectionDetails.queryTimeoutTimer) {
        clearTimeout(connectionDetails.queryTimeoutTimer);
        connectionDetails.queryTimeoutTimer = undefined;
    }

    const durationMs = Date.now() - connectionDetails.acquiredAt.getTime();
    this.metrics.releasedConnections++;
    this.metrics.activeLeasedConnections = Math.max(0, this.metrics.activeLeasedConnections - 1);
    this.metrics.connectionDurations.push(durationMs);
    this.addHistory(errorIndication ? 'client_error_released' : 'released', internalConnectionId, durationMs, errorIndication?.message);

    this.connectionTimestamps.delete(internalConnectionId);
    delete (client as any)[CONNECTION_ID_SYMBOL];

    const finalProcessID = (client as any).processID as number | undefined;
    Console.write('Performing client release.', LogLevel.INFO, {
      context: 'ConnectionPoolManager.performClientRelease',
      poolId: this.poolId,
      internalConnectionId,
      processID: finalProcessID,
      durationMs,
      activeLeased: this.metrics.activeLeasedConnections,
      errorIndication: errorIndication?.message,
      forceDiscardOption,
    });
    
    // Call the original release function
    if (typeof (client as any)._originalRelease === 'function') {
      const shouldDiscard = !!errorIndication || forceDiscardOption === true;
      (client as any)._originalRelease(shouldDiscard ? (errorIndication || new Error("Connection forced to discard")) : undefined);
      delete (client as any)._originalRelease;
    } else {
      Console.write('CRITICAL: Original release function not found on client during performClientRelease.', LogLevel.ERROR, {
        context: 'ConnectionPoolManager.performClientRelease',
        poolId: this.poolId,
        internalConnectionId,
      });
    }

    this.emitConnectionStatus();
  }

  public async releaseConnection(client: PoolClient, options?: { error?: Error, forceDiscard?: boolean }): Promise<void> {
      const currentProcessID = (client as any).processID as number | undefined;
      Console.write('Explicit public releaseConnection called.', LogLevel.DEBUG, {
        context: 'ConnectionPoolManager.public.releaseConnection',
        poolId: this.poolId,
        processID: currentProcessID,
        hasError: !!options?.error,
        forceDiscard: !!options?.forceDiscard,
      });
      this.performClientRelease(client, options?.error, options?.forceDiscard);
  }

  private updatePoolStatsMetrics(): void {
    this.metrics.poolTotalCount = this.pool.totalCount;
    this.metrics.poolIdleCount = this.pool.idleCount;
    this.metrics.poolWaitingCount = this.pool.waitingCount;
  }

  private startMetricsLogging(): void {
    this.metricsLoggingInterval = setInterval(() => {
      this.updatePoolStatsMetrics();
      const summary = this.getMetricsSummary();
      Console.write('Database connection pool metrics', LogLevel.INFO, {
        context: 'ConnectionPoolManager.metricsLog',
        ...summary
      });

      if (summary.activeLeasedConnections >= ((this.poolOptions.max || 10) * 0.9)) {
        Console.write('WARNING: Database connection pool near capacity.', LogLevel.WARNING, {
          context: 'ConnectionPoolManager.metricsLog.warning.capacity',
          poolId: this.poolId,
          activeLeased: summary.activeLeasedConnections,
          maxConnections: this.poolOptions.max || 10,
          usagePercentage: Math.round((summary.activeLeasedConnections / (this.poolOptions.max || 10)) * 100),
          poolWaiting: summary.poolWaitingCount,
        });
      }

      const now = Date.now();
      for (const [connId, connInfo] of this.connectionTimestamps.entries()) {
        if (now - connInfo.acquiredAt.getTime() > this.LONG_RUNNING_CONNECTION_WARNING_MS) {
          Console.write('WARNING: Connection held for long duration.', LogLevel.WARNING, {
            context: 'ConnectionPoolManager.metricsLog.warning.longRunning',
            poolId: this.poolId,
            internalConnectionId: connId,
            processID: connInfo.processID,
            durationMinutes: Math.round((now - connInfo.acquiredAt.getTime()) / (60 * 1000)),
            acquiredAt: connInfo.acquiredAt.toISOString(),
            options: connInfo.options,
          });
        }
      }
    }, this.METRICS_LOG_INTERVAL_MS);
    if (this.metricsLoggingInterval?.unref) {
      this.metricsLoggingInterval.unref();
    }
  }

  public async dispose(): Promise<void> {
    Console.write('Disposing connection pool...', LogLevel.INFO, {
      context: 'ConnectionPoolManager.dispose',
      poolId: this.poolId,
      activeLeased: this.metrics.activeLeasedConnections,
    });
    if (this.metricsLoggingInterval) {
      clearInterval(this.metricsLoggingInterval);
    }
    await this.pool.end();
    this.metrics.activeLeasedConnections = 0;
    this.connectionTimestamps.clear();
    Console.write('Connection pool disposed.', LogLevel.INFO, {
      context: 'ConnectionPoolManager.dispose',
      poolId: this.poolId,
    });
    this.emit('disposed');
  }
  
  public getMetricsSummary(): any {
    const durations = this.metrics.connectionDurations;
    const avgDuration = durations.length > 0 
      ? durations.reduce((sum, val) => sum + val, 0) / durations.length 
      : 0;
      
    return {
      poolId: this.poolId,
      totalConnectionsCreated: this.metrics.totalConnectionsCreated,
      acquiredConnections: this.metrics.acquiredConnections,
      releasedConnections: this.metrics.releasedConnections,
      failedAcquisitions: this.metrics.failedAcquisitions,
      activeLeasedConnections: this.metrics.activeLeasedConnections,
      maxConcurrentLeasedConnections: this.metrics.maxConcurrentLeasedConnections,
      avgLeasedDurationMs: Math.round(avgDuration),
      connectionLeaseCount: durations.length,
      poolTotalCount: this.metrics.poolTotalCount,
      poolIdleCount: this.metrics.poolIdleCount,
      poolWaitingCount: this.metrics.poolWaitingCount,
      historyCount: this.metrics.connectionHistory.length,
      lastMetricsResetTime: this.metrics.lastMetricsResetTime?.toISOString(),
    };
  }
  
  public resetMetrics(): void {
    const oldMaxConcurrent = this.metrics.maxConcurrentLeasedConnections;
    this.metrics = this.initializeMetrics();
    this.metrics.maxConcurrentLeasedConnections = oldMaxConcurrent;
    this.metrics.lastMetricsResetTime = new Date();
    Console.write('Connection pool metrics reset.', LogLevel.INFO, {
      context: 'ConnectionPoolManager.resetMetrics',
      poolId: this.poolId,
    });
  }

  private emitConnectionStatus(): void { this.emit('connectionStatus', this.metrics.activeLeasedConnections); }

  public getConnectionAges(): Array<{connectionId: string, ageSeconds: number, acquiredAt: string, processID?: number, options?: ConnectionOptions}> {
    const now = Date.now();
    return Array.from(this.connectionTimestamps.entries()).map(([connId, info]) => ({
      connectionId: connId,
      ageSeconds: Math.round((now - info.acquiredAt.getTime()) / 1000),
      acquiredAt: info.acquiredAt.toISOString(),
      processID: info.processID,
      options: info.options,
    }));
  }
}