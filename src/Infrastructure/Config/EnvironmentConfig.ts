import dotenv from 'dotenv';
import path from 'path';

export class EnvironmentConfig {
    static initialize(): void {
        const nodeEnv = process.env.NODE_ENV || 'development';
        
        if (nodeEnv === 'development') {
            // Only load .env file in development
            const envFile = `.env${nodeEnv !== 'development' ? '.' + nodeEnv : ''}`;
            dotenv.config({ path: path.resolve(__dirname, '../../../', envFile) });
        }
        // In production/test, rely on environment variables already set in the system
    }

    static get(key: string, defaultValue?: string): string {
        return process.env[key] || defaultValue || '';
    }

    static getNumber(key: string, defaultValue: number): number {
        const value = process.env[key];
        return value ? parseInt(value, 10) : defaultValue;
    }

    static getBoolean(key: string, defaultValue: boolean): boolean {
        const value = process.env[key];
        if (value === undefined) return defaultValue;
        return value.toLowerCase() === 'true';
    }
} 