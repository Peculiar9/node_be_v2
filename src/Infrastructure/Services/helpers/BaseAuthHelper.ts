import { VerificationRepository } from "../../Repository/SQL/auth/VerificationRepository";
import { UserRepository } from "../../Repository/SQL/users/UserRepository";
import { IVerification, VerificationType } from "../../../Core/Application/Interface/Entities/auth-and-user/IVerification";
import { ConflictError, ValidationError } from "../../../Core/Application/Error/AppError";
import { Console, LogLevel } from "../../Utils/Console";
import { ResponseMessage } from "../../../Core/Application/Response/ResponseFormat";
import { IUser, VerificationStatus } from "../../../Core/Application/Interface/Entities/auth-and-user/IUser";
import { UtilityService } from "../../../Core/Services/UtilityService";
import { User } from "../../../Core/Application/Entities/User";

export abstract class BaseAuthHelper {
    constructor(
        protected readonly userRepository: UserRepository,
        protected readonly verificationRepository: VerificationRepository
    ) {}

    protected async _handleExistingPhoneVerification(phoneNumber: string): Promise<IVerification | null> {
        try {
            const existingVerification = await this.verificationRepository.findByCondition({ identifier: phoneNumber, type: VerificationType.PHONE });
            if (existingVerification.length > 0) {
                Console.write(`Found existing verification for phone: ${phoneNumber}`, LogLevel.INFO);
                return existingVerification[0];
            }
            return null;
        } catch (error: any) {
            Console.error(error, {message: `Error handling existing phone verification: ${error}`, level: LogLevel.ERROR});
            throw error;
        }
    }

    protected async _ensureUserDoesNotExistByEmail(email: string): Promise<void> {
        try {
            const existingUser = await this.userRepository.findByEmail(email.trim());
            if (existingUser) {
                throw new ConflictError('A user with this email already exists.');
            }
        } catch (error: any) {
            if (error instanceof ConflictError) {
                throw error;
            }
            Console.error(error, {message: `Error checking user existence by email: ${error}`, level: LogLevel.ERROR});
            throw error;
        }
    }

    protected async ensureUserDoesNotExistByPhone(phoneNumber: string): Promise<void> {
        try {
            const existingUser = await this.userRepository.findByPhone(phoneNumber.trim());
            if (existingUser) {
                throw new ConflictError('A user with this phone number already exists.');
            }
        } catch (error: any) {
            if (error instanceof ConflictError) {
                throw error;
            }
            Console.error(error, {message: `Error checking user existence by phone: ${error}`, level: LogLevel.ERROR});
            throw error;
        }
    }

    protected async validateVerificationCode(
        verificationId: string,
        code: string,
        type: VerificationType
    ): Promise<IVerification> {
        const verification = await this.verificationRepository.findById(verificationId);
        
        if (!verification) {
            throw new ValidationError('Invalid verification ID.');
        }

        if (verification.type !== type) {
            throw new ValidationError('Invalid verification type.');
        }

        if (verification.code !== code) {
            throw new ValidationError('Invalid verification code.');
        }

        if (verification.expiresAt < new Date()) {
            throw new ValidationError('Verification code has expired.');
        }

        return verification;
    }


}
