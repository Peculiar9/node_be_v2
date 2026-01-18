import { injectable, inject } from "inversify";
import { TYPES } from "@Core/Types/Constants";
import { IUser, VerificationStatus } from "@Core/Application/Interface/Entities/auth-and-user/IUser";
import { UserResponseDTO } from "@Core/Application/DTOs/UserDTO";
import { UserRole } from "@Core/Application/Enums/UserRole";
import { VerificationRepository } from "../../Repository/SQL/auth/VerificationRepository";
import { IVerification, VerificationType } from "@Core/Application/Interface/Entities/auth-and-user/IVerification";
import { UtilityService } from "@Core/Services/UtilityService";
import { CryptoService } from "@Core/Services/CryptoService";
import { ValidationError, NotFoundError, ConflictError } from "@Core/Application/Error/AppError";
import { UserRepository } from "../../Repository/SQL/users/UserRepository";
import { IEmailVerificationResponse, IPhoneVerificationResponse } from "@Core/Application/DTOs/AuthDTO";

/**
 * Helper class for authentication-related operations
 * Provides utility methods for user object construction, verification handling, etc.
 */
@injectable()
export class AuthHelpers {
    constructor(
        @inject(TYPES.VerificationRepository) private readonly verificationRepository: VerificationRepository,
        @inject(TYPES.UserRepository) private readonly userRepository: UserRepository
    ) {}

    /**
     * Constructs a user object for response
     * @param user User entity
     * @returns User response DTO
     */
    public constructUserObject(user: IUser): UserResponseDTO {
        return {
            id: user._id as string,
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || '',
            phone: user.phone || '',
            profile_image: user.profile_image || '',
            roles: user.roles as UserRole[] || [],
            status: user.status || '',
            is_active: user.is_active || false,
            reference: '',
            expiry: 0,
            created_at: user.created_at || '',
            updated_at: user.updated_at || '',
        };
    }

    /**
     * Creates an email verification record
     * @param userId User ID
     * @param email Email address
     * @param code Verification code
     * @param salt Salt for hashing
     * @returns Verification record
     */
    public async createEmailVerificationRecord(userId: string, email: string, code: string, salt: string): Promise<IVerification> {
        const hashedCode = await CryptoService.hashString(code, salt);
        const verificationObject: IVerification = {
            user_id: userId,
            status: VerificationStatus.PENDING,
            type: VerificationType.EMAIL,
            identifier: email,
            reference: UtilityService.generateUUID(),
            otp: {
                code: hashedCode,
                attempts: 0,
                expiry: UtilityService.dateToUnix(Date.now() + 30 * 60 * 1000), // 30 minutes for email
                last_attempt: UtilityService.dateToUnix(new Date()),
                verified: false
            },
            expiry: UtilityService.dateToUnix(new Date(Date.now() + 180 * 60 * 1000)), // 3 hours for email verification process
        };

        return await this.verificationRepository.create(verificationObject);
    }

    /**
     * Creates a phone verification record
     * @param userId User ID
     * @param phoneNumber Phone number
     * @param code Verification code
     * @param salt Salt for hashing
     * @returns Verification record
     */
    public async createPhoneVerificationRecord(userId: string, phoneNumber: string, code: string, salt: string): Promise<IVerification> {
        const hashedCode = await CryptoService.hashString(code, salt);
        const verificationObject: IVerification = {
            user_id: userId,
            status: VerificationStatus.PENDING,
            type: VerificationType.PHONE,
            identifier: phoneNumber,
            reference: UtilityService.generateUUID(),
            otp: {
                code: hashedCode,
                attempts: 0,
                expiry: UtilityService.dateToUnix(Date.now() + 15 * 60 * 1000), // 15 minutes for phone
                last_attempt: UtilityService.dateToUnix(new Date()),
                verified: false
            },
            expiry: UtilityService.dateToUnix(new Date(Date.now() + 60 * 60 * 1000)), // 1 hour for phone verification process
        };

        return await this.verificationRepository.create(verificationObject);
    }

    /**
     * Checks if a verification has expired
     * @param expiry Expiry timestamp
     * @returns True if verification has expired
     */
    public isVerificationExpired(expiry: number): boolean {
        return UtilityService.dateToUnix(Date.now()) > expiry;
    }

    /**
     * Ensures that a user with the given identifier (email or phone) does not already exist
     * @param identifier The email or phone number to check
     * @throws ValidationError if a user with the identifier already exists
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
     * Ensures that a user with the given email does not already exist
     * @param email Email address to check
     * @throws ValidationError if a user with the email already exists
     */
    public async ensureUserDoesNotExistByEmail(email: string): Promise<void> {
        const existingUser = await this.userRepository.findByEmail(email.trim());
        if (existingUser) {
            throw new ValidationError('A user with this email already exists.');
        }
    }

    /**
     * Ensures that a user with the given phone number does not already exist
     * @param phone Phone number to check
     * @throws ValidationError if a user with the phone number already exists
     */
    public async ensureUserDoesNotExistByPhone(phone: string): Promise<void> {
        const existingUser = await this.userRepository.findByPhone(phone.trim());
        if (existingUser) {
            throw new ValidationError('A user with this phone number already exists.');
        }
    }

    /**
     * Handles existing email verification records before sending a new one
     * If an active (non-expired) verification exists, it throws an error
     * If an expired verification exists, it is deleted
     * @param email The email address for which to handle existing verifications
     * @throws ValidationError if an active verification code has already been sent
     * @returns The existing verification record (possibly updated) or null
     */
    public async handleExistingEmailVerification(email: string): Promise<IVerification | null> {
        const existingVerifications = await this.verificationRepository.findByCondition(
            {
                identifier: email,
                type: VerificationType.EMAIL
            }
        );

        if (existingVerifications && existingVerifications.length > 0) {
            const currentTime = UtilityService.dateToUnix(new Date());
            const latestVerification = existingVerifications[0];
            const expiry = latestVerification.expiry!;
            const userId = latestVerification.user_id as string;
            const userExists = await this.userRepository.findById(userId);
            
            if (userExists && expiry > currentTime) {
                throw new ValidationError('A verification code has already been sent to this email. Please check your inbox or try again later.');
            }
            
            if (latestVerification.status === VerificationStatus.PENDING) {
                const expiryTime = latestVerification.otp?.expiry;
                
                if (userExists && expiryTime && currentTime < expiryTime) {
                    throw new ConflictError('An active verification code for this email already exists.');
                }

                // Mark old verification as expired
                const verificationResult = await this.verificationRepository.update(latestVerification._id as string, {
                    status: VerificationStatus.EXPIRED
                });
                
                return verificationResult;
            }
            
            await this.verificationRepository.delete(latestVerification._id!);
        }
        
        return null;
    }

    /**
     * Handles existing phone verification records before sending a new OTP
     * - If the phone number is already verified (COMPLETED), throws error
     * - If an active PENDING OTP exists (not expired), throws error
     * - If an expired PENDING OTP exists, marks it as EXPIRED
     * @param phoneNumber The phone number for which to handle existing verifications
     * @returns The existing verification record (possibly updated) or null
     * @throws ValidationError if the number is already verified or an active OTP exists
     */
    public async handleExistingPhoneVerification(phoneNumber: string): Promise<IVerification | null> {
        const existingVerifications = await this.verificationRepository.findByCondition(
            {
                identifier: phoneNumber,
                type: VerificationType.PHONE
            }
        );

        if (existingVerifications && existingVerifications.length > 0) {
            let latestVerification = existingVerifications[0];

            if (latestVerification.status === VerificationStatus.COMPLETED) {
                throw new ValidationError("This phone number has already been verified.");
            }

            if (latestVerification.status === VerificationStatus.PENDING) {
                const expiryTime = latestVerification.otp?.expiry || latestVerification.expiry;

                if (expiryTime && expiryTime > UtilityService.dateToUnix(new Date())) {
                    throw new ValidationError("An active OTP for this phone number already exists. Please wait or try verifying with the existing OTP.");
                }

                // If pending but expired, mark the old verification as EXPIRED
                latestVerification = await this.verificationRepository.update(latestVerification._id as string, {
                    status: VerificationStatus.EXPIRED
                }) as IVerification;
            }
            
            return latestVerification;
        }
        
        return null;
    }

    /**
     * Validates a verification code
     * @param id Verification record ID
     * @param submittedCode Code submitted by the user
     * @param type Verification type (EMAIL or PHONE)
     * @returns Validated verification record
     * @throws NotFoundError if verification record not found
     * @throws ValidationError if code is invalid or expired
     */
    public async validateVerificationCode(id: string, submittedCode: string, type: VerificationType): Promise<IVerification> {
        const verification = await this.verificationRepository.findById(id);

        if (!verification) {
            throw new NotFoundError('Verification record not found. It might have expired and been cleaned up.');
        }

        // Check status first. Only PENDING codes should be verifiable
        if (verification.status && verification.status !== VerificationStatus.PENDING) {
            let message = 'Verification code cannot be used.';
            if (verification.status === VerificationStatus.COMPLETED) {
                message = 'This item has already been verified.';
            } else if (verification.status === VerificationStatus.EXPIRED) {
                message = 'Verification code has expired.';
            }
            throw new ValidationError(message);
        }
        
        // Determine the correct expiry and code properties based on type
        const expiryTimestamp = type === VerificationType.PHONE && verification.otp?.expiry 
            ? verification.otp.expiry 
            : verification.expiry;
            
        const storedCode = type === VerificationType.PHONE && verification.otp?.code 
            ? verification.otp.code 
            : verification.code;

        if (!expiryTimestamp || expiryTimestamp < UtilityService.dateToUnix(new Date())) {
            throw new ValidationError('Verification code has expired.');
        }

        if (!storedCode || storedCode !== submittedCode) {
            // Implement attempt tracking here if necessary
            throw new ValidationError('Invalid verification code.');
        }

        return verification;
    }

    /**
     * Formats an email verification response
     * @param verification Verification record
     * @returns Formatted email verification response
     */
    public formatEmailVerificationResponse(verification: IVerification): IEmailVerificationResponse {
        if (!verification.otp?.expiry) throw new ValidationError('Verification expiry is required');
        return {
            reference: verification.reference,
            expiry: verification.otp.expiry,
            email: verification.identifier
        };
    }

    /**
     * Formats a phone verification response
     * @param verification Verification record
     * @returns Formatted phone verification response
     */
    public formatPhoneVerificationResponse(verification: IVerification): IPhoneVerificationResponse {
        if (!verification.otp?.expiry) throw new ValidationError('Verification expiry is required');
        return {
            reference: verification.reference,
            expiry: verification.otp.expiry,
            phone: verification.identifier
        };
    }


    //============================CONSOLIDATED APP =====================//

    





    //============================CONSOLIDATED APP =====================//
}
