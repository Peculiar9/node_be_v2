import dotenv from 'dotenv';

dotenv.config();

export interface DatabaseConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  database: string;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  ssl?: boolean;
}

export const getDatabaseConfig = (): DatabaseConfig => {
  return {
    user: process.env.DB_USER! as string || 'postgres',
    password: process.env.DB_PASSWORD! as string || '',
    host: process.env.DB_HOST! as string || 'localhost',
    port: parseInt(process.env.DB_PORT! as string || '5432'),
    database: process.env.DB_NAME! as string || 'postgres',
    max: parseInt(process.env.DB_POOL_MAX! as string || '10'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT! as string || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT! as string || '2000'),
    ssl: process.env.DB_SSL! as string === 'true'
  };
};