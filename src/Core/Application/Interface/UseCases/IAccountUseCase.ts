import { IUser } from '../Entities/auth-and-user/IUser';
import { UserResponseDTO, UpdateUserDTO, CreateUserDTO, UserProfileResponseDTO } from '../../DTOs/UserDTO';
import { VerifyEmailDTO, IEmailVerificationResponse, LoginResponseDTO } from '../../DTOs/AuthDTO';

export interface IAccountUseCase {
  updateProfileImage(image: Express.Multer.File, user: IUser): Promise<UserResponseDTO>;
  resendEmailVerification(email: string, reference: string): Promise<IEmailVerificationResponse>;
  removeUser(email: string): Promise<UserResponseDTO | undefined>;
  verifyEmailCode(data: VerifyEmailDTO): Promise<LoginResponseDTO>;

  // Admin/User creation
  createAdmin(dto: CreateUserDTO): Promise<UserResponseDTO>;

  // Message profile
  updateProfile(userId: string, dto: UpdateUserDTO, existingUser: IUser): Promise<UserResponseDTO>;
  getUserProfile(userId: string): Promise<UserResponseDTO>;
}