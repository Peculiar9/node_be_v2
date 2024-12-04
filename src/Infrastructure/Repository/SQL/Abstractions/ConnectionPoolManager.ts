import { Pool, PoolClient } from 'pg';
import { EventEmitter } from 'events';
import { DatabaseError } from '../../../../Core/Application/Error/AppError';
import { DatabaseIsolationLevel } from '../../../../Core/Application/Enums/DatabaseIsolationLevel';
import { injectable } from 'inversify';

interface PoolOptions {
  user: string;
  password: string;
  host: string;
  port: number;
  database: string;
  max: number;
  connectionString: string | undefined;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  ssl?: boolean;
}

interface ConnectionOptions {
  isolationLevel?: DatabaseIsolationLevel;
  readOnly?: boolean;
}

@injectable()
export class ConnectionPoolManager {
  private pool: Pool;
  private activeConnections: number = 0;
  private readonly eventEmitter: EventEmitter;

  constructor(options: PoolOptions) {
    this.pool = new Pool(options);
    this.eventEmitter = new EventEmitter();
    this.setupPoolEvents();
  }

  private setupPoolEvents(): void {
    this.pool.on('connect', () => {
      this.activeConnections++;
      this.emitConnectionStatus();
    });

    this.pool.on('remove', () => {
      this.activeConnections--;
      this.emitConnectionStatus();
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      this.emitError(err);
    });
  }

  public async getConnection(options?: ConnectionOptions): Promise<PoolClient> {
    try {
      const client = await this.pool.connect();

      if (options?.isolationLevel) {
        await client.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`);
      }

      if (options?.readOnly !== undefined) {
        await client.query(options.readOnly ? 'SET TRANSACTION READ ONLY' : 'SET TRANSACTION READ WRITE');
      }

      return client;
    } catch (error: any) {
      throw new DatabaseError(`Failed to get database connection: ${error.message}`);
    }
  }

  public async releaseConnection(client: PoolClient): Promise<void> {
    if (client) {
      client.release();
      console.log("Connection pool released!!");
    }
  }

  public async dispose(): Promise<void> {
    try {
      await this.pool.end();
      this.eventEmitter.emit('disposed');
    } catch (error: any) {
      throw new DatabaseError(`Failed to dispose connection pool: ${error.message}`);
    }
  }

  public getActiveConnections(): number {
    return this.activeConnections;
  }

  public onConnectionStatusChange(listener: (connections: number) => void): void {
    this.eventEmitter.on('connectionStatus', listener);
  }

  public onError(listener: (error: Error) => void): void {
    this.eventEmitter.on('error', listener);
  }

  public onDisposed(listener: () => void): void {
    this.eventEmitter.on('disposed', listener);
  }

  private emitConnectionStatus(): void {
    this.eventEmitter.emit('connectionStatus', this.activeConnections);
  }

  private emitError(error: Error): void {
    this.eventEmitter.emit('error', error);
  }
}