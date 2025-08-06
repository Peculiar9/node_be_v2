import * as Sentry from '@sentry/node';
import { Application, RequestHandler, ErrorRequestHandler } from 'express';

export class LoggingConfig {
    private static instance: LoggingConfig;
    private initialized: boolean = false;

    private constructor() {}

    public static getInstance(): LoggingConfig {
        if (!LoggingConfig.instance) {
            LoggingConfig.instance = new LoggingConfig();
        }
        return LoggingConfig.instance;
    }
   
    public initialize(app: Application): void {
        if (this.initialized) {
            return;
        }

        const environment = process.env.NODE_ENV || 'development';
        
        if (environment !== 'development') {
            if (!process.env.SENTRY_DSN) {
                console.warn('SENTRY_DSN not found in environment variables. Error tracking will be disabled.');
                return;
            }
            const dsn = process.env.SENTRY_DSN!;
            console.log('\n');
            console.log('SENTRY_DSN:', dsn);
            console.log('\n');
            Sentry.init({
                dsn,
                environment: environment,
                tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
                beforeSend(event) {
                    if (environment === 'test') {
                        return event;
                    }
                    return event;
                },
            });
        }

        this.initialized = true;
    }

    public isInitialized(): boolean {
        return this.initialized;
    }

    public getRequestHandler(): RequestHandler {
        return (req, res, next) => {
            if (this.initialized) {
                Sentry.addBreadcrumb({
                    category: 'http',
                    data: {
                        url: req.url,
                        method: req.method
                    }
                });
            }
            next();
        };
    }

    public getTracingHandler(): RequestHandler {
        return (req, res, next) => {
            if (this.initialized) {
                Sentry.addBreadcrumb({
                    category: 'http.tracing',
                    data: {
                        route: req.path,
                        method: req.method
                    }
                });
            }
            next();
        };
    }

    public getErrorHandler(): ErrorRequestHandler {
        return (error, req, res, next) => {
            if (this.initialized) {
                Sentry.captureException(error, {
                    extra: {
                        url: req.url,
                        method: req.method
                    }
                });
            }
            next(error);
        };
    }

    public captureException(error: Error, context?: Record<string, any>): void {
        const environment = process.env.NODE_ENV || 'development';
        
        if (environment !== 'development' && this.initialized) {
            Sentry.captureException(error, {
                extra: context
            });
        }
    }

    public captureMessage(message: string, level: 'info' | 'warning' | 'error' | 'debug' = 'info', context?: Record<string, any>): void {
        const environment = process.env.NODE_ENV || 'development';
        
        if (environment !== 'development' && this.initialized) {
            Sentry.captureMessage(message, {
                level,
                extra: context
            });
        }
    }
}
