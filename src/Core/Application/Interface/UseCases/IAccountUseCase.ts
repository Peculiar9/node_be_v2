import { LoginResponseDTO, PhoneSignUpDTO, VerifyOTPDTO, SetupPasswordDTO, EmailSignUpDTO, VerifyEmailDTO, IEmailVerificationResponse, EmailSetupPasswordDTO } from '../../DTOs/AuthDTO';
import { CreateUserDTO, UpdateUserDTO, UserResponseDTO } from '../../DTOs/UserDTO';
import { RegisterUserDTO } from '../../DTOs/AuthDTO';
import { IUser } from '../../Interface/Entities/auth-and-user/IUser';

export interface IAccountUseCase {
  register(dto: RegisterUserDTO, user: IUser): Promise<UserResponseDTO>;
  login(phone: string, password: string): Promise<LoginResponseDTO | undefined>;
  loginV2(identifier: string, password: string): Promise<LoginResponseDTO | undefined>;
  updateProfile(userId: string, dto: UpdateUserDTO, existingUser: IUser): Promise<UserResponseDTO>;
  getUserProfile(userId: string, existingUser: IUser): Promise<UserResponseDTO>;
  verifyEmail(token: string): Promise<boolean>;
  verifyEmailCode(data: VerifyEmailDTO): Promise<LoginResponseDTO>;
  verifyPhone(data: VerifyOTPDTO): Promise<LoginResponseDTO>;
  createAdmin(dto: CreateUserDTO): Promise<any>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<boolean>;
  refreshToken(userId: string): Promise<{ user: UserResponseDTO; accessToken: string; refreshToken: string }>;
  logout(userId: string): Promise<void>;
  getAllUsers(): Promise<any>;
  preSignUpPhone(data: PhoneSignUpDTO): Promise<any>;
  preSignUpEmail(data: EmailSignUpDTO): Promise<IEmailVerificationResponse>;
  resendVerification(data: VerifyOTPDTO): Promise<any>;
  oauth(data: any): Promise<any>;
  setupPassword(dto: SetupPasswordDTO): Promise<UserResponseDTO>;
  setupEmailPassword(dto: EmailSetupPasswordDTO): Promise<UserResponseDTO>;
  refresh(user: IUser, token: string): Promise<{ user: UserResponseDTO; token: string }>;
  decodeToken(token: string): Promise<any>;
  updateProfileImage(image: Express.Multer.File, user: IUser): Promise<UserResponseDTO>;
  removeUser(email: string): Promise<UserResponseDTO | undefined>;
  resendEmailVerification(email: string, reference: string): Promise<IEmailVerificationResponse>;
  resetPasswordWithOtp(email: string, otp: string, newPassword: string): Promise<boolean>;
  requestPasswordResetOTP(email: string): Promise<void>;
}