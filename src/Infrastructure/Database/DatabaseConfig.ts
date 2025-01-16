import { EnvironmentConfig } from '../Config/EnvironmentConfig';
import fs from 'fs';

type Environment = 'development' | 'test' | 'production';

interface SSLConfig {
  rejectUnauthorized: boolean;
  ca?: string;
  key?: string;
  cert?: string;
  sslmode?: string;
}

interface DatabaseConfig {
  connectionString?: string;
  user: string;
  password: string;
  host: string;
  port: number;
  database: string;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  ssl: SSLConfig | boolean;
}

const getSSLConfig = (env: Environment): SSLConfig | boolean => {
  switch (env) {
    case 'production':
      return {
        rejectUnauthorized: true,
        sslmode: 'verify-full',
        ca: EnvironmentConfig.get('SSL_CA') ? fs.readFileSync(EnvironmentConfig.get('SSL_CA')).toString() : undefined,
        key: EnvironmentConfig.get('SSL_KEY') ? fs.readFileSync(EnvironmentConfig.get('SSL_KEY')).toString() : undefined,
        cert: EnvironmentConfig.get('SSL_CERT') ? fs.readFileSync(EnvironmentConfig.get('SSL_CERT')).toString() : undefined,
      };
    case 'test':
      return {
        rejectUnauthorized: false
        // sslmode: 'prefer'
      };
    case 'development':
      return false;
    default:
      return false;
  }
};

export const getDatabaseConfig = (): DatabaseConfig => {
  const nodeEnv = (EnvironmentConfig.get('NODE_ENV', 'development')) as Environment;
  const dbHost = EnvironmentConfig.get('DB_HOST');

  const config: DatabaseConfig = {
    user: EnvironmentConfig.get('DB_USER', 'postgres'),
    password: EnvironmentConfig.get('DB_PASSWORD', ''),
    host: (!dbHost && nodeEnv === 'development')
      ? 'localhost'
      : (dbHost || 'service-db.cham6kcua19c.eu-west-2.rds.amazonaws.com'),
    port: EnvironmentConfig.getNumber('DB_PORT', 5432),
    database: EnvironmentConfig.get('DB_NAME', 'postgres'),
    max: EnvironmentConfig.getNumber('DB_POOL_MAX', 10),
    idleTimeoutMillis: EnvironmentConfig.getNumber('DB_IDLE_TIMEOUT', 30000),
    connectionTimeoutMillis: EnvironmentConfig.getNumber('DB_CONNECTION_TIMEOUT', 10000),
    ssl: getSSLConfig(nodeEnv)
  };

  // Build connection string for non-local environments
  if (nodeEnv !== 'development') {
    const sslMode = nodeEnv === 'production' ? 'verify-full' : 'prefer';
    console.log("sslMode: ", sslMode);
    config.connectionString = `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;
    // ?sslmode=${sslMode}`;
  }

  return config;
};