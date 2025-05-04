import 'reflect-metadata';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Container } from 'inversify';
import { InversifyExpressServer } from 'inversify-express-utils';
import { DatabaseService } from './Infrastructure/Database/DatabaseService';
import { getRouteInfo } from 'inversify-express-utils';

import './Controllers/InitController';
import './Controllers/auth/AccountController';

import { DIContainer } from './Core/DIContainer';

import express, { Response, Request, NextFunction } from 'express';
import path from 'path';
import { Console } from './Infrastructure/Utils/Console';
import { LoggingConfig } from './Infrastructure/Config/LoggingConfig';

class App {
    public app: express.Application;
    private container: Container;

    constructor() {
        this.container = DIContainer.getInstance();
        this.app = express();
    }

    public async initialize(): Promise<express.Application> {
        try {
            
            // Initialize logging first
            LoggingConfig.getInstance().initialize(this.app);
            Console.info('✅ Logging initialized successfully');
            
            // Initialize database
            await DatabaseService.initialize(this.container);
            Console.info('✅ Database initialized successfully');

            // Setup express server with inversify
            const server = new InversifyExpressServer(this.container);
            
            server.setConfig((app: express.Application) => {
                app.use(express.json());
                app.use(bodyParser.json());
                app.use(bodyParser.urlencoded({ extended: false }));
                app.set('view engine', 'ejs');
                app.set('views', path.join(__dirname, '..', 'src', 'static'));
                app.use(cors());
            });

            this.app = server.build();
            this.initErrorHandling();
            this.setupGracefulShutdown();

            // Log route information
            const routeInfo = getRouteInfo(this.container);
            console.log('Registered Routes:', JSON.stringify(routeInfo, null, 2));

            return this.app;
        } catch (error: any) {
            const errorMessage = error.message || 'Unknown error';
            Console.error(error, {message: errorMessage});
            throw error;
        }
    }

    private initErrorHandling() {
        // 404 handler - must be added after all routes are defined
        this.app.use((req: Request, res: Response, next: NextFunction) => {
            // Import and use the NotFoundMiddleware
            const { NotFoundMiddleware } = require('./Middleware/NotFoundMiddleware');
            return NotFoundMiddleware.handleNotFound(req, res, next);
        });

        // Global error handler - must be the last middleware
        this.app.use((err: any, req: Request, res: Response, next: NextFunction) => {
            // Import and use the ErrorHandlerMiddleware
            const { ErrorHandlerMiddleware } = require('./Middleware/ErrorHandlerMiddleware');
            return ErrorHandlerMiddleware.handleError(err, req, res, next);
        });
    }

    private setupGracefulShutdown() {
        const shutdown = async () => {
            console.log('Shutting down gracefully...');
            await DatabaseService.shutdown(this.container);
            process.exit(0);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    }
}

export default new App();