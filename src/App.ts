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

class App {
    public app: express.Application;
    private container: Container;

    constructor() {
        this.container = DIContainer.getInstance();
        this.app = express();
    }

    public async initialize(): Promise<express.Application> {
        try {
            // Initialize database first
            await DatabaseService.initialize(this.container);
            console.log('✅ Database initialized successfully');

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
            console.error("App initialization error:", error.message);
            throw error;
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