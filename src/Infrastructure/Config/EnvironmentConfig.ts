import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

export class EnvironmentConfig {
    private static initialized = false;

    private static envFiles = {
        test: ['.env', '.env.staging', '.env.production'],
        staging: ['.env.staging', '.env.production'],
        production: ['.env.production']
    };

    static initialize(): void {
        // Prevent multiple initializations
        if (this.initialized) {
            return;
        }
        this.initialized = true;

        // Load env files first
        const nodeEnv = process.env.NODE_ENV || 'test';
        console.log("nodeEnv from EnvironmentConfig: ", nodeEnv);
        if (nodeEnv === 'production') {
            this.loadEnvFile('.env.production');
        } else {
            // For test/staging, try multiple env files in order
            const envFilesToTry = this.envFiles[nodeEnv as keyof typeof this.envFiles] || ['.env'];

            let loaded = false;
            for (const envFile of envFilesToTry) {
                if (this.loadEnvFile(envFile)) {
                    loaded = true;
                    console.log(`[Environment] Loaded configuration from ${envFile}`);
                    break;
                }
            }

            if (!loaded) {
                console.warn('[Environment] No environment file found. Using system environment variables.');
            }
        }

        // Log after loading env files
        console.log("EnvironmentConfig.initialize() called: ", process.env.NODE_ENV);
        const finalNodeEnv = this.get('NODE_ENV', 'test');
        console.log("nodeEnv from EnvironmentConfig final: ", finalNodeEnv);
    }

    private static loadEnvFile(filename: string): boolean {
        const envPath = path.resolve(process.cwd(), filename);

        try {
            if (fs.existsSync(envPath)) {
                const result = dotenv.config({ path: envPath });

                if (result.error) {
                    console.error(`[Environment] Error loading ${filename}:`, result.error);
                    return false;
                }

                // Validate required environment variables
                this.validateRequiredVariables();
                return true;
            }
        } catch (error) {
            console.error(`[Environment] Error checking/loading ${filename}:`, error);
        }

        return false;
    }

    private static validateRequiredVariables(): void {
        const requiredVariables = [
            'DB_HOST',
            'DB_PORT',
            'DB_NAME',
            'DB_USER',
            'DB_PASSWORD',
            'JWT_ACCESS_SECRET',
            'AWS_REGION',

            // Google
            'GOOGLE_CLIENT_ID',
            'GOOGLE_CLIENT_SECRET',
            'GOOGLE_REDIRECT_URI',

            // Cloudinary
            'CLOUDINARY_CLOUD_NAME',
            'CLOUDINARY_API_KEY',
            'CLOUDINARY_API_SECRET',

            // Twilio
            'TWILIO_ACCOUNT_SID',
            'TWILIO_AUTH_TOKEN',
            'TWILIO_VERIFY_SERVICE_SID',
            'TWILIO_PHONE_NUMBER',
            'TWILIO_WHATSAPP_NUMBER',

            // SendGrid
            'SENDGRID_API_KEY',
            'SENDGRID_FROM_EMAIL'
        ];

        const missingVariables = requiredVariables.filter(variable => !process.env[variable]);

        if (missingVariables.length > 0) {
            console.warn('[Environment] Missing required environment variables:', missingVariables);
        }
    }

    static get(key: string, defaultValue?: string): string {
        const value = process.env[key];

        if (value === undefined && defaultValue === undefined) {
            console.warn(`[Environment] Environment variable ${key} is not set and no default value provided`);
        }

        return value || defaultValue || '';
    }

    static getNumber(key: string, defaultValue: number): number {
        const value = process.env[key];
        if (value === undefined) {
            return defaultValue;
        }

        const numValue = parseInt(value, 10);
        if (isNaN(numValue)) {
            console.warn(`[Environment] Environment variable ${key} is not a valid number, using default:`, defaultValue);
            return defaultValue;
        }

        return numValue;
    }

    static getBoolean(key: string, defaultValue: boolean): boolean {
        const value = process.env[key]?.toLowerCase();

        if (value === undefined) {
            return defaultValue;
        }

        if (value !== 'true' && value !== 'false') {
            console.warn(`[Environment] Environment variable ${key} is not a valid boolean, using default:`, defaultValue);
            return defaultValue;
        }

        return value === 'true';
    }

    static isDevelopment(): boolean {
        return this.get('NODE_ENV', 'development') === 'development';
    }

    static isProduction(): boolean {
        return this.get('NODE_ENV') === 'production';
    }

    static isTest(): boolean {
        return this.get('NODE_ENV') === 'test';
    }

    static isStaging(): boolean {
        return this.get('NODE_ENV') === 'staging';
    }
} 