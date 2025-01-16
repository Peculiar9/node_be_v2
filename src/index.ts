import 'reflect-metadata';
import { EnvironmentConfig } from './Infrastructure/Config/EnvironmentConfig';

// Initialize environment configuration
EnvironmentConfig.initialize();

import App from './App';
import { DatabaseService } from './Infrastructure/Database/DatabaseService';
import { DIContainer } from './Core/DIContainer';
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';

interface ServerConfig {
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  rateLimit?: {
    windowMs: number;
    max: number;
  };
}

const getEnvironmentConfig = (): ServerConfig => {
  const environment: string = process.env.NODE_ENV!;
  console.log({environment});
  switch (environment) {
    case 'production':
      return {
        cors: {
          origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
          credentials: true
        },
        rateLimit: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 100 // limit each IP to 100 requests per windowMs
        }
      };
    case 'test':
      return {
        cors: {
          origin: '*',
          credentials: true
        }
      };
    default: // development
      return {
        cors: {
          origin: 'http://localhost:3000',
          credentials: true
        }
      };
  }
};

async function configureEnvironment(app: any) {
  const env = process.env.NODE_ENV || 'development';
  const config = getEnvironmentConfig();
  console.log({config});
  switch (env) {
    case 'production':
      // Production-specific middleware
      app.use(helmet());
      app.use(compression());
      app.use(morgan('combined'));
      
      // Enable detailed error logging for production
      app.on('error', (err: Error) => {
        console.error('[Production Error]:', {
          timestamp: new Date().toISOString(),
          error: err.message,
          stack: err.stack,
        });
      });
      break;

    case 'test':
      // Test-specific configuration
      app.use(morgan('dev'));
      
      // Disable certain security features for testing
      app.disable('x-powered-by');
      
      // Enable detailed logging for debugging tests
      app.use((req: any, _res: any, next: any) => {
        console.log('[Test Request]:', {
          timestamp: new Date().toISOString(),
          method: req.method,
          path: req.path,
          query: req.query,
          body: req.body,
        });
        next();
      });
      break;

    default: // development
      // Development-specific middleware
      app.use(morgan('dev'));
      
      // Enable detailed request logging
      app.use((req: any, _res: any, next: any) => {
        console.log('[Development Request]:', {
          timestamp: new Date().toISOString(),
          method: req.method,
          path: req.path,
        });
        next();
      });
      
      // Enable more detailed error messages
      app.use((err: Error, _req: any, res: any, next: any) => {
        console.error('[Development Error]:', err);
        res.status(500).json({
          error: err.message,
          stack: err.stack,
        });
        next();
      });
  }
}

async function startServer() {
  const app = await App.initialize();
  const container = DIContainer.getInstance();
  const port = process.env.PORT || 3000;

  try {
    // Configure environment-specific settings
    await configureEnvironment(app);

    // Initialize database with environment-specific options
    await DatabaseService.initialize(container);
    
    const server = app.listen(port, () => {
      console.log({
        level: 'info',
        message: `Server started successfully`,
        environment: process.env.NODE_ENV,
        port: port,
        timestamp: new Date().toISOString(),
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log({
        level: 'info',
        message: 'SIGTERM signal received. Starting graceful shutdown',
        timestamp: new Date().toISOString(),
      });

      try {
        await DatabaseService.shutdown(container);
        server.close(() => {
          console.log({
            level: 'info',
            message: 'Server shutdown completed',
            timestamp: new Date().toISOString(),
          });
          process.exit(0);
        });
      } catch (error) {
        console.error({
          level: 'error',
          message: 'Error during shutdown',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        process.exit(1);
      }
    });

  } catch (error) {
    console.error({
      level: 'error',
      message: 'Failed to start server',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
    process.exit(1);
  }
}

startServer();