import { LoginResponseDTO } from '../../DTOs/AuthDTO';
import { IUser } from '../Entities/auth-and-user/IUser';
import { RefreshTokenResultDTO } from '../../DTOs/AuthenticationDTO';

/**
 * Interface for authentication-related operations
 * Responsible for authenticating users and managing sessions
 */
export interface IAuthenticationService {
    /**
     * Authenticates a user with their identifier (email or phone) and password
     * @param identifier User's email or phone number
     * @param password User's password
     * @returns Login response with tokens and user data
     */
    authenticate(identifier: string, password: string): Promise<LoginResponseDTO | undefined>;
    
    /**
     * Authenticates a user with their identifier (email or phone) and password
     * @param identifier User's email or phone number
     * @param password User's password
     * @returns Login response with tokens and user data
     */
    authenticateV2(identifier: string, password: string): Promise<LoginResponseDTO | undefined>;

    /**
     * Verifies the validity of a token
     * @param token Token to verify
     * @returns Decoded token payload if valid
     */
    verifyToken(token: string): Promise<any>;
    
    /**
     * Refreshes an access token using a refresh token
     * @param refreshToken Refresh token
     * @returns New access token and user data
     */
    refreshAccessToken(refreshToken: string): Promise<RefreshTokenResultDTO>;
    
    /**
     * Revokes a user's refresh token
     * @param userId User ID
     */
    revokeRefreshToken(userId: string): Promise<void>;
    
  
    /**
     * Initiates password reset process
     * @param email User's email
     */
    requestPasswordReset(email: string): Promise<void>;
    
    /**
     * Resets a user's password using a reset token
     * @param token Password reset token
     * @param newPassword New password
     * @returns True if password was reset successfully
     */
    resetPassword(token: string, newPassword: string): Promise<boolean>;
    
    /**
     * Initiates password reset process using OTP
     * @param email User's email
     */
    requestPasswordResetOTP(email: string): Promise<void>;
    
    /**
     * Resets a user's password using an OTP
     * @param email User's email
     * @param otp One-time password
     * @param newPassword New password
     * @returns True if password was reset successfully
     */
    resetPasswordWithOtp(email: string, otp: string, newPassword: string): Promise<boolean>;
    
    /**
     * Validates a user exists by ID
     * @param userId User ID
     * @returns User object if found
     */
    validateUser(userId: string): Promise<IUser>;
}
