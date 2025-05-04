import { TYPES } from "../../Core/Types/Constants";
import { IEmailService } from "../../Core/Application/Interface/Services/IEmailService";
import { IAWSHelper } from "../../Core/Application/Interface/Services/IAWSHelper";
import { inject, injectable } from "inversify";

@injectable()
export class EmailService implements IEmailService {
    constructor(
        @inject(TYPES.AWSHelper) private readonly _awsHelper: IAWSHelper,
    ) {}

    async sendVerificationEmail(data: any, userSalt: string, next: string): Promise<any> {
        try {
            const emailResult = await this._awsHelper.sendVerificationEmail(data.email, data);
            return emailResult;
        } catch (error: any) {
            throw new Error(error.message);
        }
    }

    async sendPasswordResetEmail(data: any): Promise<any> {
        try {
            const emailResult = await this._awsHelper.sendForgotPasswordEmail(data.email, data);
            return emailResult;
        } catch (error: any) {
            throw new Error(error.message);
        }
    }

    async sendWelcomeEmail(data: any): Promise<any> {
        try {
            const emailResult = await this._awsHelper.sendWaitlistEmail(data.email, data);
            return emailResult;
        } catch (error: any) {
            throw new Error(error.message);
        }
    }

    async sendProfileUpdateEmail(data: any): Promise<any> {
        try {
            const emailResult = await this._awsHelper.sendProfileUpdateEmail(data.email, data);
            return emailResult;
        } catch (error: any) {
            throw new Error(error.message);
        }
    }
}