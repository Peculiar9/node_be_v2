import { CreateUserDTO, UserResponseDTO } from '../../DTOs/UserDTO';
import { EmailSignUpDTO, VerifyEmailDTO, IEmailVerificationResponse } from '../../DTOs/AuthDTO';
import { RegisterUserDTOV2 } from '../../DTOs/AuthDTOV2';

/**
 * Interface for registration-related operations
 * Responsible for onboarding new users, phone/email verification, OTP handling, and password setup
 */
export interface IRegistrationService {
    /**
     * Initiates email signup process
     * @param dto Email signup data
     * @param salt Cryptographic salt for security
     * @returns Email verification response
     */
    preSignUpEmailInit(dto: EmailSignUpDTO, salt: string): Promise<IEmailVerificationResponse>;
    
    /**
     * Verifies email code during registration
     * @param data Email verification data
     * @returns Login response with tokens and user data
     */
    verifyEmailCode(data: VerifyEmailDTO): Promise<any>;
    
    /**
     * Creates a new user
     * @param dto User creation data
     * @returns Created user data
     */
    createUser(dto: CreateUserDTO): Promise<UserResponseDTO | undefined>;
    
    /**
     * Initiates phone signup process
     * @param reference Reference identifier
     * @param otpCode OTP code
     * @param phoneNumber User's phone number
     * @returns Verification data
     */
    preSignUpPhoneInit(phoneNumber: string, otpCode: string, salt: string): Promise<any>;
    
    /**
     * Verifies OTP code during registration
     * @param reference Reference identifier
     * @param otpCode OTP code
     * @param salt Cryptographic salt
     * @returns Login response with tokens and user data
     */
    verifyOTPCode(reference: string, otpCode: string, salt: string): Promise<any>;
    
    /**
     * Resends verification code
     * @param phoneNumber User's phone number
     * @param reference Reference identifier
     * @returns Verification data
     */
    resendVerification(phoneNumber: string, reference: string): Promise<any>;
    
    /**
     * Handles expired verification
     * @param phoneNumber User's phone number
     * @returns Updated verification data
     */
    handleExpiredVerification(phoneNumber: string): Promise<any>;
    
    /**
     * Sets up password for a user after phone verification
     * @param phone User's phone number
     * @param password User's password
     * @param token Verification token
     * @returns User data
     */
    setupPassword(phone: string, password: string, token: string): Promise<UserResponseDTO>;
    
    /**
     * Sets up password for a user after email verification
     * @param email User's email
     * @param password User's password
     * @param reference Reference identifier
     * @returns User data
     */
    setupEmailPassword(email: string, password: string, reference: string): Promise<UserResponseDTO>;
    
    /**
     * Resends email verification
     * @param email User's email
     * @param reference Reference identifier
     * @returns Email verification response
     */
    resendEmailVerification(email: string, reference: string): Promise<IEmailVerificationResponse>;



    // ==========================================================================//
    // CONSOLIDATED APP
    // ==========================================================================//

    /**
     * Initiates registration process for consolidated app
     * First, it does email check to see if the email is already registered
     * If it already does, it does role check to see if the user is either of renter, host or charger
     * If it does, then you onboard the user to context specific registration process and KYC, 
     * If not just create new user
     * @param dto Registration data
     * @returns User data
     */
     initRegistration(dto: RegisterUserDTOV2): Promise<UserResponseDTO>;
     
    /**
     * 
     */
    verifyEmail(reference: string, otpCode: string, email: string): Promise<{accessToken: string, refreshToken: string, user: UserResponseDTO}>;

    /**
     * 
     */
    logout(): Promise<UserResponseDTO>;
}
