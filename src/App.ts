import 'reflect-metadata';
import cors from 'cors'
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
    public app: any;

    constructor() {
        this.app = express();
        this.initialize();
        console.log("App initialized")
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
                console.log("Setting config.....");
            });
            

            console.log("Building server.....");
            this.app = server.build();
            this.initErrorHandling();
            // Graceful shutdown
            this.setupGracefulShutdown(container);
            const routeInfo = getRouteInfo(container);
            console.log(JSON.stringify(routeInfo, null, 2));
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
