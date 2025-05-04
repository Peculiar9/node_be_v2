import { LoginResponseDTO, PhoneSignUpDTO, VerifyOTPDTO, SetupPasswordDTO } from '../../DTOs/AuthDTO';
import { CreateUserDTO, UpdateUserDTO, UserResponseDTO } from '../../DTOs/UserDTO';
import { RegisterUserDTO } from '../../DTOs/AuthDTO';
import { IUser } from '../../Interface/Entities/auth-and-user/IUser';

export interface IAccountUseCase {
  register(dto: RegisterUserDTO, user: IUser): Promise<UserResponseDTO>;
  login(phone: string, password: string): Promise<{ token: string; user: UserResponseDTO }>;
  updateProfile(userId: string, dto: UpdateUserDTO, existingUser: IUser): Promise<UserResponseDTO>;
  getUserProfile(userId: string, existingUser: IUser): Promise<UserResponseDTO>;
  verifyEmail(token: string): Promise<boolean>;
  verifyPhone(data: VerifyOTPDTO): Promise<LoginResponseDTO>;
  createAdmin(dto: CreateUserDTO): Promise<any>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<boolean>;
  refreshToken(userId: string): Promise<{ token: string }>;
  logout(userId: string): Promise<void>;
  getAllUsers(): Promise<any>;
  preSignUpPhone(data: PhoneSignUpDTO): Promise<any>;
  resendVerification(data: VerifyOTPDTO): Promise<any>;
  oauth(data: any): Promise<any>;
  setupPassword(dto: SetupPasswordDTO): Promise<UserResponseDTO>;
  refresh(user: IUser, token: string): Promise<{ user: UserResponseDTO; token: string }>;
  decodeToken(token: string): Promise<any>;
}