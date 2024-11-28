import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export class UtilityService {
    private static readonly SALT_ROUNDS = 10;
    private static readonly TOKEN_SALT_ROUNDS = 12;

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
}