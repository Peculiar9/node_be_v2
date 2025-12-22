import { CreateUserDTO, UserResponseDTO, UpdateUserDTO } from '../../DTOs/UserDTO';
import { LoginResponseDTO, EmailSignUpDTO, VerifyEmailDTO, IEmailVerificationResponse } from '../../DTOs/AuthDTO';
import { IUser } from '../Entities/auth-and-user/IUser';


export interface IAuthService {
    preSignUpEmailInit(dto: EmailSignUpDTO, salt: string): Promise<IEmailVerificationResponse>;
    verifyEmailCode(data: VerifyEmailDTO): Promise<LoginResponseDTO>;
    createUser(dto: CreateUserDTO): Promise<UserResponseDTO| undefined>;
    authenticate(phone: string, password: string): Promise<LoginResponseDTO | undefined>;
    getUserFromToken(userId: string): Promise<UserResponseDTO | undefined>;
    updateUser(userId: string, dto: UpdateUserDTO, existingUser: IUser): Promise<UserResponseDTO | undefined>;
    verifyEmailToken(token: string): Promise<boolean>;
    requestPasswordReset(email: string): Promise<void>;
    validateUser(userId: string): Promise<IUser>;
    resetPassword(token: string, newPassword: string): Promise<boolean>;
    refreshAccessToken(refreshToken: string): Promise<{ user: IUser; accessToken: string }>;
    revokeRefreshToken(userId: string): Promise<void>;
    verifyToken(token: string): Promise<any>;
    verifyOTPCode(reference: string, otpCode: string, salt: string): Promise<LoginResponseDTO>;
    preSignUpPhoneInit(reference: string, otpCode: string, phoneNumber: string): Promise<any>;
    resendVerification(phoneNumber: string, reference: string): Promise<any>;
    handleExpiredVerification(phoneNumber: string): Promise<any>;
    oauth(data: CreateUserDTO): Promise<LoginResponseDTO | undefined>;
    setupPassword(phone: string, password: string, token: string): Promise<UserResponseDTO>;
    setupEmailPassword(email: string, password: string, reference: string): Promise<UserResponseDTO>;
    updateProfileImage(image: Express.Multer.File, user: IUser): Promise<UserResponseDTO>;
    removeUser(email: string): Promise<UserResponseDTO | undefined>;
    resendEmailVerification(email: string, reference: string): Promise<IEmailVerificationResponse>;
    resetPasswordWithOtp(email: string, otp: string, newPassword: string): Promise<boolean>;
    requestPasswordResetOTP(email: string): Promise<void>;
}
