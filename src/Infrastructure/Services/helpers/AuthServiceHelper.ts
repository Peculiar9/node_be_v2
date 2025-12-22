import { VerificationRepository } from "../../Repository/SQL/auth/VerificationRepository";
import { UserRepository } from "../../Repository/SQL/users/UserRepository";
import { BaseAuthHelper } from "./BaseAuthHelper";
import { inject, injectable } from 'inversify';
import { TYPES } from "../../../Core/Types/Constants";
import { IVerification, VerificationType } from "../../../Core/Application/Interface/Entities/auth-and-user/IVerification";
import { IUser } from "../../../Core/Application/Interface/Entities/auth-and-user/IUser";
import { ConflictError, NotFoundError, ValidationError } from "../../../Core/Application/Error/AppError"; // Assuming BadRequestError and NotFoundError exist
import { ResponseMessage } from "../../../Core/Application/Response/ResponseFormat"; // Kept as it was in original, though not used in this helper
import { UtilityService } from "../../../Core/Services/UtilityService";
import { UserRole } from "../../../Core/Application/Enums/UserRole";
import { AuthMethod } from "../../../Core/Application/Interface/Entities/auth-and-user/IUser"; // Added: Assuming path
import { UserStatus } from "../../../Core/Application/Enums/UserStatus";   // Added: Assuming path
import { VerificationStatus } from "../../../Core/Application/Interface/Entities/auth-and-user/IUser"; // Added: Assuming path
import * as jwt from 'jsonwebtoken';

@injectable()
export class AuthServiceHelper extends BaseAuthHelper {
    constructor(
        @inject(TYPES.UserRepository) protected readonly userRepository: UserRepository,
        @inject(TYPES.VerificationRepository) protected readonly verificationRepository: VerificationRepository
    ) {
        super(userRepository, verificationRepository);
    }

    // Public methods

    /**
     * Validates a phone verification code and handles the verification process.
     * @param phoneNumber The phone number being verified.
     * @param code The verification code submitted by the user.
     * @returns The validated verification record.
     * @throws NotFoundError if no verification record is found for the phone number.
     * @throws BadRequestError for invalid or expired codes (via validateVerificationCode).
     */
    public async validateAndHandlePhoneVerification(phoneNumber: string, code: string): Promise<IVerification> {
        // It's often better to fetch the most recent, pending verification.
        // Assuming findByCondition can be sorted or returns the most relevant one first.
        const existingVerifications = await this.verificationRepository.findByCondition({
            identifier: phoneNumber,
            type: VerificationType.PHONE,
        }); 

        if (!existingVerifications || existingVerifications.length === 0) {
            throw new NotFoundError('No pending verification found for this phone number.');
        }

        const verification = existingVerifications[0];
        return this.validateVerificationCode(verification._id as string, code, VerificationType.PHONE);
    }

    /**
     * Validates that a new user's email and optional phone number do not already exist.
     * @param email The email address to validate.
     * @param phoneNumber Optional phone number to validate.
     * @throws ConflictError if the email or phone number already exists.
     */
    public async validateNewUserData(email: string, phoneNumber?: string): Promise<void> {
        await this.ensureUserDoesNotExist(email);
        if (phoneNumber) {
            await this.ensureUserDoesNotExist(phoneNumber);
        }
    }

    /**
     * Ensures that a user with the given identifier (email or phone) does not already exist.
     * @param identifier The email or phone number to check.
     * @throws ConflictError if a user with the identifier already exists.
     */
    public async ensureUserDoesNotExist(identifier: string): Promise<void> {
        const isEmail = UtilityService.isValidEmail(identifier);
        const existingUser = isEmail
            ? await this.userRepository.findByEmail(identifier)
            : await this.userRepository.findByPhone(identifier);

        if (existingUser) {
            throw new ValidationError(`User with this ${isEmail ? 'email' : 'phone number'} already exists.`);
        }
    }

    /**
     * Creates a new user record.
     * @param identifier The user's email or phone number.
     * @returns The newly created user object.
     */
    public async createUser(identifier: string, salt: string): Promise<IUser> {
     throw new Error("Not implemented yet");
    }

    public async generateTokens(user: IUser): Promise<{ accessToken: string; refreshToken: string }> {
            const payload = {
                sub: user._id,
                email: user.email,
                roles: user.roles,
                type: 'access',
            };
    
            const secret = process.env.JWT_ACCESS_SECRET!;
            console.log({ secret });
    
            const accessToken = jwt.sign(
                payload,
                secret,
                {
                    expiresIn: (process.env.JWT_ACCESS_EXPIRATION || '15m') as jwt.SignOptions['expiresIn'],
                    jwtid: UtilityService.generateUUID(),
                }
            );
    
            const refreshToken = jwt.sign(
                { ...payload, type: 'refresh' },
                process.env.JWT_REFRESH_SECRET!,
                {
                    expiresIn: (process.env.JWT_REFRESH_EXPIRATION || '7d') as jwt.SignOptions['expiresIn'],
                    jwtid: UtilityService.generateUUID(),
                }
            );
    
            return { accessToken, refreshToken };
        }
    // Protected/Helper methods

    /**
     * Handles existing email verification records before sending a new one.
     * If an active (non-expired) verification exists, it throws an error.
     * If an expired verification exists, it is deleted.
     * @param email The email address for which to handle existing verifications.
     * @throws ValidationError if an active verification code has already been sent.
     */
    public async _handleExistingEmailVerification(email: string): Promise<IVerification | null> {
        // findByIdentifierAndType is preferred if it's designed to get the single, most relevant record.
        const existingVerification = await this.verificationRepository.findByCondition(
            {
                identifier: email,
                type: VerificationType.EMAIL
            }
        );

        if (existingVerification && existingVerification.length > 0) {
            // Check if verification is expired (expiry is a timestamp in ms)
            const currentTime = UtilityService.dateToUnix(new Date());
            const latestVerification = existingVerification[0];
            const expiry = latestVerification.expiry!;
            console.log("AuthServiceHelper::_handleExistingEmailVerification:: verification: ", {latestVerification});
            const userId = latestVerification.user_id as string;
            const userExists = await this.userRepository.findById(userId);
            console.log("AuthServiceHelper::_handleExistingEmailVerification:: userExists: ", {userExists});
            if (userExists && expiry > currentTime) {
                throw new ValidationError('A verification code has already been sent to this email. Please check your inbox or try again later.');
            }
            if (latestVerification.status === VerificationStatus.PENDING) {
                const currentTime = UtilityService.dateToUnix(new Date());
                const expiryTime = latestVerification.otp?.expiry;
                console.log("AuthServiceHelper::_handleExistingEmailVerification:: userExists: ", {userExists});
                if (userExists && expiryTime && currentTime < expiryTime) {
                    throw new ConflictError('An active verification code for this email already exists.');
                }

                // Mark old verification as expired
                const verificationResult = await this.verificationRepository.update(latestVerification._id as string, {
                    status: VerificationStatus.EXPIRED
                });
                console.log("AuthServiceHelper::_handleExistingEmailVerification:: verificationResult: ", {verificationResult});
                return verificationResult;
            }
            await this.verificationRepository.delete(latestVerification._id!);
        }
        return null;
    }

    public async _ensureUserDoesNotExistByEmail(email: string): Promise<void> {
        const existingUser: IUser = await this.userRepository.findByEmail(email.trim()) as IUser;
        console.log("AuthService::_ensureUserDoesNotExistByEmail:: existingUser: ", {existingUser});
        if (existingUser) {
            throw new ValidationError('A user with this email already exists.');
        }
    }

    /**
     * Handles existing phone verification records before sending a new OTP.
     * - If the phone number is already verified (COMPLETED), throws error.
     * - If an active PENDING OTP exists (not expired), throws error.
     * - If an expired PENDING OTP exists, marks it as EXPIRED.
     * @param phoneNumber The phone number for which to handle existing verifications.
     * @returns The existing verification record (possibly updated to EXPIRED) or null if no relevant PENDING/COMPLETED record was found.
     * @throws ValidationError if the number is already verified or an active OTP exists.
     */
    public async _handleExistingPhoneVerification(phoneNumber: string): Promise<IVerification | null> {
        // Assuming findByCondition can be sorted to get the latest verification first
        const existingVerifications = await this.verificationRepository.findByCondition(
            {
                identifier: phoneNumber,
                type: VerificationType.PHONE
            },
        );

        if (existingVerifications && existingVerifications.length > 0) {
            let latestVerification = existingVerifications[0];

            if (latestVerification.status === VerificationStatus.COMPLETED) {
                throw new ValidationError("This phone number has already been verified.");
            }

            if (latestVerification.status === VerificationStatus.PENDING) {
                // Assuming otp.expiry is a Unix timestamp in milliseconds, similar to Date.now()
                // Or if verification.expiry is the one to check for OTPs as well.
                // The original code used latestVerification.otp?.expiry.
                // Ensure IVerification has otp: { expiry: number } or that verification.expiry is used consistently.
                const expiryTime = latestVerification.otp?.expiry || latestVerification.expiry;

                if (expiryTime && expiryTime > UtilityService.dateToUnix(new Date())) {
                    throw new ValidationError("An active OTP for this phone number already exists. Please wait or try verifying with the existing OTP.");
                }

                // If pending but expired, mark the old verification as EXPIRED before issuing a new one.
                // It's generally better to update than delete for auditability.
                latestVerification = await this.verificationRepository.update(latestVerification._id as string, {
                    status: VerificationStatus.EXPIRED
                }) as IVerification;
            }
            return latestVerification; // Return the handled verification (could be the original if not updated, or the updated one)
        }
        return null; // No existing PENDING or COMPLETED verification found that needs handling.
    }

    /**
     * Validates a given verification code against the stored record.
     * @param id The ID of the verification record.
     * @param code The code submitted by the user.
     * @param type The type of verification (EMAIL or PHONE).
     * @returns The validated verification record.
     * @throws NotFoundError if the verification record is not found.
     * @throws BadRequestError if the code is invalid, expired, or the record is not in a verifiable state.
     */
    protected async validateVerificationCode(id: string, submittedCode: string, type: VerificationType): Promise<IVerification> {
        const verification = await this.verificationRepository.findById(id);

        if (!verification) {
            throw new NotFoundError('Verification record not found. It might have expired and been cleaned up.');
        }

        // Recommended: Check status first. Only PENDING codes should be verifiable.
        if (verification.status && verification.status !== VerificationStatus.PENDING) {
            let message = 'Verification code cannot be used.';
            if (verification.status === VerificationStatus.COMPLETED) {
                message = 'This item has already been verified.';
            } else if (verification.status === VerificationStatus.EXPIRED) {
                message = 'Verification code has expired.';
            }
            throw new ValidationError(message);
        }
        
        // Determine the correct expiry and code properties based on type or IVerification structure
        // Assuming verification.expiry and verification.code are standard.
        // If OTPs have specific fields like verification.otp.expiry, adjust accordingly.
        const expiryTimestamp = type === VerificationType.PHONE && verification.otp?.expiry ? verification.otp.expiry : verification.expiry;
        const storedCode = type === VerificationType.PHONE && verification.otp?.code ? verification.otp.code : verification.code;

        if (!expiryTimestamp || expiryTimestamp < UtilityService.dateToUnix(new Date())) {
            // Optionally, update status to EXPIRED here if not already handled
            // await this.verificationRepository.update(id, { status: VerificationStatus.EXPIRED });
            throw new ValidationError('Verification code has expired.');
        }

        if (!storedCode || storedCode !== submittedCode) {
            // Implement attempt tracking here if necessary (e.g., increment attempts, lock after too many)
            throw new ValidationError('Invalid verification code.');
        }

        // Important: The calling service/method (e.g., AuthService) should update the verification
        // record's status to VerificationStatus.COMPLETED after this method successfully returns.
        // And also update the user's email_verified or phone_verified status.
        return verification;
    }
}