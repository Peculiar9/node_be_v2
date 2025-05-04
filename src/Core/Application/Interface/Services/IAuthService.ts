import { CreateUserDTO, UserResponseDTO, UpdateUserDTO } from '../../DTOs/UserDTO';
import { LoginResponseDTO, PhoneSignUpDTO } from '../../DTOs/AuthDTO';
import { IUser } from '../Entities/auth-and-user/IUser';

export interface IAuthService {
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
    // completeSignUpPhone(data: PhoneSignUpDTO, verificationId: string): Promise<{ reference: string, expiry: string, phone: string }>;
}
