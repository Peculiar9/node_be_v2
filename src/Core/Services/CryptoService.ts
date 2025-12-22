import CryptoJS from "crypto-js";
import bcrypt from "bcryptjs";

export class CryptoService {
    constructor() {

    }

    public static hashString(password: string, salt: string): string {
        return CryptoJS.HmacSHA256(password, salt).toString();
    }
    
    public static generateValidSalt(): string {
        return bcrypt.genSaltSync(16);
    }    
    
    public static verifyHash(input: string, hashedValue: string, salt: string): boolean {
        const hashedInput = this.hashString(input, salt);
        return hashedInput === hashedValue;
    }
    
    public static generateRandomString(length: number): string {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return result;
    }
}

export default CryptoService;