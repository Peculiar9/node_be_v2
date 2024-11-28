import { CreateUserDTO, UpdateUserDTO, UserResponseDTO } from '../../DTOs/UserDTO';

export interface IAccountUseCase {
  register(dto: CreateUserDTO): Promise<UserResponseDTO>;
  login(email: string, password: string): Promise<{ token: string; user: UserResponseDTO }>;
  updateProfile(userId: string, dto: UpdateUserDTO): Promise<UserResponseDTO>;
  getUserProfile(userId: string): Promise<UserResponseDTO>;
  verifyEmail(token: string): Promise<boolean>;
  createAdmin(dto: any): Promise<any>; //change it to admin user create DTO
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<boolean>;
  refreshToken(userId: string): Promise<{ token: string }>;
  logout(userId: string): Promise<void>;
  getAllUsers(): Promise<any>;
}