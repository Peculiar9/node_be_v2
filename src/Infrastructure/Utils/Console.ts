import { LoggingConfig } from '../Config/LoggingConfig';

export enum LogLevel {
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error'
}

export class Console {
    private static loggingConfig = LoggingConfig.getInstance();

    /**
     * Writes a log message or object with optional severity level
     * @param message Message or object to log
     * @param level Severity level (info, warning, error)
     * @param context Additional context to include with the log
     */
    public static write(
        message: string | object,
        level: LogLevel = LogLevel.INFO,
        context?: Record<string, any>
    ): void {
        const environment = process.env.NODE_ENV || 'development';
        const messageStr = typeof message === 'string' ? message : JSON.stringify(message, null, 2);
        
        // Always log to console in development
        if (environment === 'test') {
            switch (level) {
                case 'warning':
                    console.log('\n')
                    console.warn(messageStr);
                    console.log('\n')
                    break;
                    case 'error':
                    console.log('\n')
                    console.error(messageStr);
                    console.log('\n')
                    break;
                    case 'info':
                    console.log('\n')
                    console.log(messageStr);
                    console.log('\n')
                    break;
                    default:
                    console.log('\n')
                    console.log(messageStr);
                    console.log('\n')
                    break;
            }
            if (context) {
                console.log('Context:', context);
            }
        }

        this.loggingConfig.captureMessage(messageStr, level, context);
    }

    /**
     * Logs an error with stack trace
     * @param error Error object to log
     * @param context Additional context to include with the error
     */
    public static error(error: Error, context?: Record<string, any>): void {
        const environment = process.env.NODE_ENV || 'development';

        // Always log to console in development
        if (environment === 'development') {
            console.log('\n')
            console.error(error);
            if (context) {
                console.error('Error Context:', context);
            }
                console.log('\n')
        }

        this.loggingConfig.captureException(error, context);
    }

    public static info(message: string | object, context?: Record<string, any>): void {
        this.write(message, LogLevel.INFO, context);
    }

    public static warn(message: string | object, context?: Record<string, any>): void {
        this.write(message, LogLevel.WARNING, context);
    }
}
