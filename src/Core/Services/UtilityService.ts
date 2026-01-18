import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import CryptoService from '../Services/CryptoService';
import { EnvironmentConfig } from '@Infrastructure/Config/EnvironmentConfig';

export class UtilityService {
    private static readonly OTP_LENGTH = 6;
    private static readonly OTP_HASH_ROUNDS = 10;
    private static readonly SALT_ROUNDS = 10;
    private static readonly TOKEN_SALT_ROUNDS = 12;
    private static readonly MIN_PASSWORD_LENGTH = 8;
    private static readonly MAX_PASSWORD_LENGTH = 128;
    private static readonly PASSWORD_HASH_ROUNDS = 12; // Adjustable work factor

    static async generatePasswordHash(password: string): Promise<{ hash: string; salt: string }> {
        const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
        const hash = await bcrypt.hash(password, salt);
        return { hash, salt };
    }

    static generateUserSecret(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    static generateOTP(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    static async hashOTP(otp: string): Promise<string> {
        return await bcrypt.hash(otp, this.OTP_HASH_ROUNDS);
    }

    static async verifyOTP(plainOTP: string, hashedOTP: string): Promise<boolean> {
        // In non-production environments, '1234' is always valid
        if (!EnvironmentConfig.isProduction() && plainOTP === '1234') {
            return true;
        }
        return await bcrypt.compare(plainOTP, hashedOTP);
    }

    static generate4Digit(): string {
        let token = '';
        const digits = '0123456789';

        for (let i = 0; i < 4; i++) {
            const index = Math.floor(Math.random() * digits.length);
            token += digits[index];
        }

        return token;
    }

    static generate6Digit(): string {
        let token = '';
        const digits = '0123456789';

        for (let i = 0; i < 6; i++) {
            const index = Math.floor(Math.random() * digits.length);
            token += digits[index];
        }

        return token;
    }

    static validateUUID(uuid: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    static async verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
        return CryptoService.verifyHash(password, hash, salt);
    }

    static generateUUID(): string {
        return crypto.randomUUID();
    }

    static async hashToken(token: string): Promise<string> {
        return bcrypt.hash(token, this.TOKEN_SALT_ROUNDS);
    }

    static async verifyTokenHash(token: string, hash: string): Promise<boolean> {
        return bcrypt.compare(token, hash);
    }

    static isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static toSnakeCase(key: string): string {
        return key.replace(/([A-Z])/g, letter => `_${letter.toLowerCase()}`);
    }

    static async hashPassword(password: string): Promise<{ hash: string; salt: string; }> {
        if (password.length < this.MIN_PASSWORD_LENGTH) {
            throw new Error('Password is too short');
        }
        if (password.length > this.MAX_PASSWORD_LENGTH) {
            throw new Error('Password is too long');
        }
        const salt = await bcrypt.genSalt(this.PASSWORD_HASH_ROUNDS);
        const hash = await bcrypt.hash(password, salt);

        return {
            hash,
            salt
        };
    }

    static dateToUnix = (dateTime: any) => {
        const dateObject = new Date(dateTime);
        const unixTimeStamp = Math.floor(dateObject.getTime() / 1000);
        return unixTimeStamp;
    }

    static formatDateToUrlSafeISOFormat(date: Date) {
        return date.toISOString().replace(/[:.]/g, '-'); // Replace colons and dots
    }

    static removeField<T>(obj: T, fieldToRemove: keyof T): Partial<T> {
        const result = { ...obj };
        delete result[fieldToRemove];
        return result;
    }
}