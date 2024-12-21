import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export class UtilityService {
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

    static async verifyPassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
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

    static async hashPassword(password: string): Promise<{ hash: string; salt: string;}> {
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
}