import cors from 'cors'
import bodyParser from 'body-parser';
import 'reflect-metadata';
import { InversifyExpressServer } from 'inversify-express-utils';
import express, { Response, Request, NextFunction } from 'express';
import path from 'path';
import { DatabaseService } from './Infrastructure/Database/DatabaseService';
import { DIContainer } from './Core/DIContainer';

import './Controllers/ControllerShave';
import './Controllers/auth/AccountController';
import { Container } from 'inversify';

class App {
    public app: any;

    constructor() {
        this.app = express();
        this.initialize();
    }

    private async initialize() {
        try {
            
            // Get the DI container instance
            const container = DIContainer.getInstance();
            
            // Initialize database connection
            await DatabaseService.initialize(container);

            // Setup express server with inversify
            const server = new InversifyExpressServer(container);
            
            server.setConfig((app: any) => {
                app.use(express.json());
                app.use(bodyParser.json());
                app.use(bodyParser.urlencoded({ extended: false }));
                app.set('view engine', 'ejs');
                app.set('views', path.join(__dirname, '..', 'src', 'static'));
                app.use(cors());
            });

            this.app = server.build();
            this.initErrorHandling();
            // Graceful shutdown
            this.setupGracefulShutdown(container);
        } catch (error: any) {
            console.error("App initialization error:", error.message);
            process.exit(1);
        }
    }

    private initErrorHandling() {
        this.app.use((err: any, req: Request, res: Response, next: NextFunction) => {
            console.error(err.stack);
            res.status(err.status || 500).json({
                success: false,
                message: err.message || 'Internal Server Error',
            });
        });
    }

    private setupGracefulShutdown(container: Container) {
        const shutdown = async () => {
            console.log('Shutting down gracefully...');
            await DatabaseService.shutdown(container);
            process.exit(0);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    }
}

export default new App().app;
