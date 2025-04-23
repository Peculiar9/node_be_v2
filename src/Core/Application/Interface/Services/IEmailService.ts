export interface IEmailService {
    sendVerificationEmail(data: any, userSalt: string, next: string): Promise<any>;
    sendPasswordResetEmail(data: any): Promise<any>;
    sendWelcomeEmail(data: any): Promise<any>;
    sendProfileUpdateEmail(data: any): Promise<any>;
}
